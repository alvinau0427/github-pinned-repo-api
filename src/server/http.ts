import fetch from 'cross-fetch';
import { HttpError } from './errors';

const DEFAULT_TIMEOUT = 8000;
const USER_AGENT = 'Mozilla/5.0 (compatible; GitHubPinnedRepoApi/3.0; +https://github.com/alvinau0427/github-pinned-repo-api)';

export interface FetchOptions {
    timeoutMs?: number;
    retries?: number;
    headers?: Record<string, string>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch a URL with an AbortController timeout and limited retry/backoff.
 * Rate-limit and not-found responses are never retried.
 */
export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
    const { timeoutMs = DEFAULT_TIMEOUT, retries = 2, headers = {} } = options;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html', ...headers },
                signal: controller.signal as any,
            });

            if (response.status === 404) {
                throw new HttpError(404, 'GitHub user or repository not found.');
            }
            if (response.status === 403 || response.status === 429) {
                throw new HttpError(429, 'GitHub rate limit exceeded. Please try again later.');
            }
            if (!response.ok) {
                if (attempt < retries) {
                    await sleep(300 * (attempt + 1));
                    continue;
                }
                throw new HttpError(502, `GitHub returned status ${response.status}.`);
            }

            return await response.text();
        } catch (error: any) {
            if (error instanceof HttpError && (error.status === 404 || error.status === 429)) {
                throw error;
            }
            lastError = error;
            if (attempt < retries) {
                await sleep(300 * (attempt + 1));
                continue;
            }
            if (error?.name === 'AbortError') {
                throw new HttpError(504, 'GitHub request timed out.');
            }
            throw new HttpError(502, `Failed to reach GitHub: ${error?.message || 'unknown error'}`);
        } finally {
            clearTimeout(timer);
        }
    }

    throw lastError instanceof HttpError ? lastError : new HttpError(502, 'Failed to reach GitHub.');
}

/**
 * JSON variant used for the GitHub GraphQL endpoint.
 */
export async function fetchJson<T = any>(url: string, init: RequestInit, options: FetchOptions = {}): Promise<T> {
    const { timeoutMs = DEFAULT_TIMEOUT, headers = {} } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...init,
            headers: { 'User-Agent': USER_AGENT, ...headers, ...(init.headers as Record<string, string> | undefined) },
            signal: controller.signal as any,
        });

        if (response.status === 401) {
            throw new HttpError(401, 'GitHub GraphQL token was rejected (401).');
        }
        if (response.status === 403 || response.status === 429) {
            throw new HttpError(429, 'GitHub GraphQL rate limit exceeded.');
        }
        if (!response.ok) {
            throw new HttpError(502, `GitHub GraphQL returned status ${response.status}.`);
        }
        return (await response.json()) as T;
    } catch (error: any) {
        if (error instanceof HttpError) throw error;
        if (error?.name === 'AbortError') throw new HttpError(504, 'GitHub GraphQL request timed out.');
        throw new HttpError(502, `Failed to reach GitHub GraphQL: ${error?.message || 'unknown error'}`);
    } finally {
        clearTimeout(timer);
    }
}
