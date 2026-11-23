import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { LRUCache } from 'lru-cache';
import { PinnedRepo } from '../types';
import { setupSwagger } from './swagger';
import { getPinnedRepos as defaultGetPinnedRepos } from './services/pinnedRepos';
import { HttpError } from './errors';

const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

export interface AppDependencies {
    /** Injectable for tests; defaults to the real GraphQL/scraper fetcher. */
    getPinnedRepos?: (username: string) => Promise<PinnedRepo[]>;
}

export function createApp(deps: AppDependencies = {}): Express {
    const app = express();
    const getPinnedRepos = deps.getPinnedRepos ?? defaultGetPinnedRepos;

    // Render / reverse proxies terminate TLS before the request reaches us.
    app.set('trust proxy', 1);

    const cache = new LRUCache<string, PinnedRepo[]>({ max: 500, ttl: 1000 * 60 * 5 });
    const updatingUsers = new Set<string>();

    // CORS: keep `*` as the default for backwards compatibility.
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
        : '*';
    app.use(cors({
        origin: allowedOrigins,
        methods: ['GET'],
        allowedHeaders: ['Content-Type'],
    }));

    // Generous by default; can be tuned with RATE_LIMIT_MAX.
    app.use('/api', rateLimit({
        windowMs: 60 * 1000,
        max: Number(process.env.RATE_LIMIT_MAX || 300),
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { error: 'Too many requests, please try again later.', status: 429 },
    }));

    app.use('/assets', express.static(path.resolve(__dirname, '../assets')));
    app.use('/client', express.static(path.resolve(__dirname, '../client')));

    app.get('/manifest.json', (_req, res) => {
        res.sendFile(path.resolve(__dirname, '../manifest.json'));
    });

    app.get('/', (_req, res) => {
        res.set('Content-Type', 'text/html');
        return res.sendFile(path.resolve(__dirname, '../view/index.html'));
    });

    app.get('/api/:username', async (req, res) => {
        const username = (req.params.username || '').trim();

        if (!USERNAME_PATTERN.test(username)) {
            res.set('Cache-Control', 'no-store');
            return res.status(422).json({ error: 'Invalid GitHub username.', status: 422 });
        }

        // GitHub usernames are case-insensitive, so share the cache entry.
        const key = username.toLowerCase();
        const cachedResult = cache.get(key);

        if (cachedResult) {
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
                'X-Cache': 'HIT',
            });
            res.send(JSON.stringify(cachedResult, null, 4));

            if (!updatingUsers.has(key)) {
                updatingUsers.add(key);
                console.log(`[Cache] Background updating for: ${username}`);
                getPinnedRepos(username)
                    .then((data) => cache.set(key, data))
                    .catch((error: any) => console.error(`[BG Update Error] ${username}:`, error.message))
                    .finally(() => updatingUsers.delete(key));
            }
            return;
        }

        try {
            console.log(`[Fresh] Fetching data for: ${username}`);
            const result = await getPinnedRepos(username);
            cache.set(key, result);
            res.set({
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
                'X-Cache': 'MISS',
            });
            return res.send(JSON.stringify(result, null, 4));
        } catch (error: any) {
            const status = error instanceof HttpError ? error.status : 500;
            console.error(`[API Error] ${username}:`, error.message);
            res.set('Cache-Control', 'no-store');
            return res.status(status).json({
                error: error.message || 'Failed to fetch GitHub data.',
                status,
            });
        }
    });

    setupSwagger(app);
    return app;
}
