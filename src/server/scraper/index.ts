import { LRUCache } from 'lru-cache';
import { PinnedRepo } from '../../types';
import { fetchText } from '../http';
import { parseProfile } from './parseProfile';
import { parseRepo, RepoExtras } from './parseRepo';

/** Avoid re-fetching the same repo page when several users pin the same repository. */
const repoExtrasCache = new LRUCache<string, RepoExtras>({ max: 500, ttl: 1000 * 60 * 10 });

export async function getPinnedReposByScraping(username: string): Promise<PinnedRepo[]> {
    const profileHtml = await fetchText(`https://github.com/${encodeURIComponent(username)}`);
    const { items, selector } = parseProfile(profileHtml, username);

    if (items.length === 0) {
        console.log(`[Scraper] No pinned repositories found for ${username}.`);
        return [];
    }
    console.log(`[Scraper] Parsed ${items.length} pinned repos for ${username} using "${selector}".`);

    return Promise.all(items.map(async (item): Promise<PinnedRepo> => {
        let extras: RepoExtras = { topics: [] };
        try {
            const cached = repoExtrasCache.get(item.link);
            if (cached) {
                extras = cached;
            } else {
                const repoHtml = await fetchText(item.link, { timeoutMs: 6000, retries: 1 });
                extras = parseRepo(repoHtml);
                repoExtrasCache.set(item.link, extras);
            }
        } catch (error: any) {
            console.warn(`[Scraper] Could not enrich ${item.link}: ${error.message}`);
        }

        return {
            owner: item.owner,
            repo: item.repo,
            link: item.link,
            description: item.description || '',
            image: `https://opengraph.githubassets.com/1/${item.owner}/${item.repo}`,
            website: extras.website,
            language: item.language,
            languageColor: item.languageColor,
            stars: item.stars,
            forks: item.forks,
            topics: extras.topics,
            isArchived: item.isArchived ?? extras.isArchived ?? false,
            isFork: item.isFork ?? false,
            parentRepo: item.parentRepo,
        };
    }));
}
