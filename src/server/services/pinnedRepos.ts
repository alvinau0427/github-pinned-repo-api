import { PinnedRepo } from '../../types';
import { HttpError } from '../errors';
import { fetchJson } from '../http';
import { getPinnedReposByScraping } from '../scraper';

// Read lazily: dotenv.config() in app.ts runs after this module is imported,
// so a module-level snapshot would always be undefined.
const getToken = (): string | undefined => process.env.GITHUB_TOKEN;
let graphqlUsable = true;

const GRAPHQL_QUERY = `
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
                        nodes { topic { name } }
                    }
                }
            }
        }
    }
}`;

/**
 * Verify the token once at startup so the logs tell the truth about which mode is active.
 * A 401 permanently disables GraphQL for this process; other failures are only logged.
 */
export async function verifyGitHubToken(): Promise<void> {
    const token = getToken();
    if (!token) {
        console.log('[GraphQL] No GITHUB_TOKEN configured — scraper mode will be used.');
        return;
    }

    try {
        const result = await fetchJson<any>(
            'https://api.github.com/graphql',
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'query { viewer { login } }' }),
            },
            { timeoutMs: 3000 },
        );

        if (result.errors) {
            console.warn('[GraphQL] Token verification returned errors — scraper fallback may be used.');
            return;
        }
        const login = result?.data?.viewer?.login;
        if (login) {
            graphqlUsable = true;
            console.log(`[GraphQL] Token valid for ${login}.`);
        } else {
            console.warn('[GraphQL] Token verification returned no viewer — scraper fallback may be used.');
        }
    } catch (error: any) {
        if (error instanceof HttpError && error.status === 401) {
            graphqlUsable = false;
            console.warn('[GraphQL] Token rejected (401) — scraper fallback will be used.');
        } else {
            console.warn(`[GraphQL] Token verification failed (${error.message}) — will retry on requests.`);
        }
    }
}

/** GraphQL first (when a usable token exists), with the scraper as a transparent fallback. */
export async function getPinnedRepos(username: string): Promise<PinnedRepo[]> {
    if (graphqlUsable && getToken()) {
        try {
            console.log(`[GraphQL] Trying GraphQL for ${username}...`);
            return await getPinnedReposByGraphQL(username);
        } catch (error: any) {
            if (error instanceof HttpError && error.status === 404) throw error;
            if (error instanceof HttpError && error.status === 401) {
                graphqlUsable = false;
                console.warn('[GraphQL] Token rejected (401) — disabling GraphQL for this process.');
            }
            console.warn(`[Fallback] GraphQL failed (${error.message}), using scraper instead.`);
        }
    }
    console.log(`[Scraper] Fetching for ${username}...`);
    return getPinnedReposByScraping(username);
}

async function getPinnedReposByGraphQL(username: string): Promise<PinnedRepo[]> {
    const result = await fetchJson<any>(
        'https://api.github.com/graphql',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: GRAPHQL_QUERY, variables: { username } }),
        },
    );

    if (result.errors) {
        const notFound = result.errors.some((e: any) => e.type === 'NOT_FOUND' || e.path?.includes('user'));
        if (notFound) throw new HttpError(404, `GitHub user ${username} not found.`);
        throw new Error('GitHub GraphQL returned errors.');
    }

    const nodes = result.data?.user?.pinnedItems?.nodes || [];
    return nodes.map((repo: any): PinnedRepo => ({
        owner: repo.owner?.login || username,
        repo: repo.name,
        link: repo.url,
        description: repo.description || '',
        image: `https://opengraph.githubassets.com/1/${repo.owner?.login || username}/${repo.name}`,
        website: repo.homepageUrl || undefined,
        language: repo.primaryLanguage?.name || undefined,
        languageColor: repo.primaryLanguage?.color || undefined,
        stars: repo.stargazerCount || 0,
        forks: repo.forkCount || 0,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        parentRepo: repo.isFork && repo.parent ? {
            owner: repo.parent.owner?.login,
            repo: repo.parent.name,
            link: repo.parent.url,
        } : undefined,
        topics: (repo.repositoryTopics?.nodes || []).map((t: any) => t.topic?.name).filter(Boolean),
    }));
}
