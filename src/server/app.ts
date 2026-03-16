import express from 'express';
import https from 'https';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import fetch from 'cross-fetch';
import * as cheerio from 'cheerio';
import * as dotenv from 'dotenv';
import { PinnedRepo } from '../types';
import { setupSwagger } from './swagger';
import { LRUCache } from 'lru-cache';
import { CronJob } from 'cron';

dotenv.config();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
console.log('Token Status:', GITHUB_TOKEN ? 'Success' : 'Read failure, make sure .env file is located in the outermost path.');

const app = express();
const port = 3000;

// --- Cache Configuration ---
const options = { max: 500, ttl: 1000 * 60 * 5 };
const cache = new LRUCache<string, PinnedRepo[]>(options);
const updatingUsers = new Set<string>();

// --- Cron Job: Keep Server Alive ---
const url = process.env.APP_URL || 'https://github-pinned-repo-api.onrender.com';
const cronJob = new CronJob('*/14 * * * *', function () {
    try {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                console.log('Response Message: Server self-ping success');
            }
        }).on('error', (err) => {
            console.error('Keep-alive error:', err.message);
        });
    } catch (e) {
        console.error(e);
    }
});
cronJob.start();

// --- Middlewares ---
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*';
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
}));

app.use('/assets', express.static(path.resolve(__dirname, '../assets')));
app.use('/client', express.static(path.resolve(__dirname, '../client')));
app.use(bodyParser.urlencoded({ extended: true }));
setupSwagger(app);

// --- Routes ---

app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html');
    return res.sendFile(path.resolve(__dirname, '../view/index.html'));
});

/**
 * @openapi
 * /api/{username}:
 * get:
 * summary: Get GitHub pinned repositories
 * description: Fetches pinned repositories for a specific GitHub user.
 * parameters:
 * - in: path
 * name: username
 * required: true
 * description: The GitHub username to fetch.
 * schema:
 * type: string
 * responses:
 * 200:
 * description: A JSON array of pinned repositories.
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * $ref: '#/components/schemas/PinnedRepo'
 * 404:
 * description: User not found.
 */
app.get('/api/:username', async (req, res) => {
    const { username } = req.params;

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const cachedResult = cache.get(username);
    res.set('Content-Type', 'application/json');

    if (cachedResult) {
        res.send(JSON.stringify(cachedResult, null, 4));
        if (!updatingUsers.has(username)) {
            updatingUsers.add(username);
            console.log(`[Cache] Background updating for: ${username}`);

            getPinnedRepos(username).then((data) => {
                cache.set(username, data);
            }).catch((error) => {
                console.error(`[BG Update Error] ${username}:`, error.message);
            }).finally(() => {
                updatingUsers.delete(username);
            });
        }
    } else {
        try {
            console.log(`[Fresh] Fetching data for: ${username}`);
            const result = await getPinnedRepos(username);
            cache.set(username, result);
            res.send(JSON.stringify(result, null, 4));
        } catch (error: any) {
            console.error(`[API Error] ${username}:`, error.message);
            const status = error.status || 500;
            let errorMessage = error.message || "Failed to fetch GitHub data";

            res.status(status).json({
                error: errorMessage,
                status: status
            });
        }
    }
});

/**
 * Core function to decide between GraphQL and Scraping.
 * @param username GitHub username
 * @returns Promise resolving to an array of PinnedRepo
 */
async function getPinnedRepos(username: string): Promise<PinnedRepo[]> {
    if (GITHUB_TOKEN) {
        try {
            console.log(`[GraphQL] Trying GraphQL for ${username}...`);
            return await getPinnedReposByGraphQL(username);
        } catch (error: any) {
            if (error.status === 404) throw error;
            console.warn(`[Fallback] GraphQL failed, using Scraper instead.`);
        }
    }
    console.log(`[Scraper] Fetching for ${username}...`);
    return await getPinnedReposByScraping(username);
}

/**
 * Fetches data using GitHub GraphQL API.
 */
async function getPinnedReposByGraphQL(username: string): Promise<PinnedRepo[]> {
    const query = `
    query($username: String!) {
        user(login: $username) {
            pinnedItems(first: 6, types: REPOSITORY) {
                nodes {
                    ... on Repository {
                        name
                        description
                        url
                        stargazerCount
                        forkCount
                        homepageUrl
                        owner { login }
                        primaryLanguage { name color }
                        isArchived
                        isFork
                        parent {
                            name
                            url
                            owner { login }
                        }
                        repositoryTopics(first: 10) {
                            nodes {
                                topic { name }
                            }
                        }
                    }
                }
            }
        }
    }`;

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { username } }),
    });

    const result: any = await response.json();

    if (result.errors) {
        if (result.errors.some((e: any) => e.type === 'NOT_FOUND' || e.path?.includes('user'))) {
            const error = new Error(`GitHub user ${username} not found.`);
            (error as any).status = 404;
            throw error;
        }
        throw new Error("GraphQL Internal Error");
    }

    const nodes = result.data?.user?.pinnedItems?.nodes || [];
    return nodes.map((repo: any) => ({
        owner: repo.owner?.login || username,
        repo: repo.name,
        link: repo.url,
        description: repo.description || "",
        image: `https://opengraph.githubassets.com/1/${repo.owner?.login || username}/${repo.name}`,
        website: repo.homepageUrl || undefined,
        language: repo.primaryLanguage?.name || undefined,
        languageColor: repo.primaryLanguage?.color || undefined,
        stars: repo.stargazerCount || 0,
        forks: repo.forkCount || 0,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        parentRepo: repo.isFork && repo.parent ? {
            owner: repo.parent.owner.login,
            repo: repo.parent.name,
            link: repo.parent.url
        } : undefined,
        topics: repo.repositoryTopics.nodes.map((t: any) => t.topic.name),
    }));
}

/**
 * Fallback method to fetch data using Cheerio scraping.
 */
async function getPinnedReposByScraping(username: string): Promise<PinnedRepo[]> {
    try {
        const user = await aimer(`https://github.com/${username}`);
        const isPinnedExist = user('h2:contains("Pinned")').length > 0;
        if (!isPinnedExist) {
            console.log(`[Info] User ${username} has no pinned repos.`);
            return [];
        }

        const pinned = user(".pinned-item-list-item").toArray();
        if (!pinned || pinned.length === 0) return [];

        return await Promise.all(pinned.map(async (item): Promise<PinnedRepo> => {
            const owner = getOwner(user, item) || username;
            const repo = getRepo(user, item) || "";
            const link = `https://github.com/${owner}/${repo}`;
            const description = getDescription(user, item) || "";
            const image = `https://opengraph.githubassets.com/1/${owner}/${repo}`;
            const website = await getWebsite(link);

            return {
                owner,
                repo,
                link,
                description,
                image,
                website: website || undefined,
                language: getLanguage(user, item) || undefined,
                languageColor: getLanguageColor(user, item) || undefined,
                stars: getStars(user, item) || 0,
                forks: getForks(user, item) || 0,
                topics: [],
                isArchived: false,
                isFork: false
            };
        }));
    } catch (error: any) {
        if (error.status === 404) throw error;
        throw error;
    }
}

/**
 * Loads a URL and returns a Cheerio instance.
 */
const aimer = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
        const error = new Error(`GitHub user not found or API error`);
        (error as any).status = res.status;
        throw error;
    }
    const html = await res.text();
    return cheerio.load(html);
}

// --- Helper Functions for Scraping ---
function getOwner(user: cheerio.Root, item: cheerio.Element) {
    return user(item).find(".owner").text().trim() || undefined;
}

function getRepo(user: cheerio.Root, item: cheerio.Element) {
    return user(item).find(".repo").text().trim() || undefined;
}

function getDescription(user: cheerio.Root, item: cheerio.Element) {
    return user(item).find(".pinned-item-desc").text().trim() || undefined;
}

/**
 * Fetches the project website URL by visiting the repository page.
 */
async function getWebsite(repoUrl: string): Promise<string | undefined> {
    try {
        const target = await aimer(repoUrl);
        const site = target(".BorderGrid-cell").first();
        return site.find('a[href^="https"]').attr("href")?.trim();
    } catch {
        return undefined;
    }
}

function getLanguage(user: cheerio.Root, item: cheerio.Element) {
    return user(item).find('[itemprop="programmingLanguage"]').text() || undefined;
}

function getLanguageColor(user: cheerio.Root, item: cheerio.Element) {
    return user(item).find(".repo-language-color").css("background-color") || undefined;
}

function getStars(user: cheerio.Root, item: cheerio.Element) {
    return Number(user(item).find('a[href$="/stargazers"]').text().trim()) || 0;
}

function getForks(user: cheerio.Root, item: cheerio.Element) {
    return Number(user(item).find('a[href$="/network/members"]').text().trim()) || 0;
}

app.listen(process.env.PORT || port, () => {
    console.log(`Server listening on port: ${process.env.PORT || port}`);
});