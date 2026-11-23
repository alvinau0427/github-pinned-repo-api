import { load, type CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';

export interface RawPinnedItem {
    owner: string;
    repo: string;
    link: string;
    description?: string;
    language?: string;
    languageColor?: string;
    stars: number;
    forks: number;
    isFork?: boolean;
    parentRepo?: { owner: string; repo: string; link: string };
    isArchived?: boolean;
}

/** Multiple selector strategies so a single GitHub markup change does not break everything. */
const PINNED_SELECTORS = [
    '.pinned-item-list-item',
    'li.js-pinned-item-list-item',
    '[data-testid="pinned-repo-item"]',
    '.pinned-item-list-item-content',
];

function selectItems($: CheerioAPI): { items: AnyNode[]; selector: string } {
    for (const selector of PINNED_SELECTORS) {
        const items = $(selector).toArray();
        if (items.length > 0) return { items, selector };
    }
    return { items: [], selector: '' };
}

function parseNumber(text: string): number {
    const value = Number(text.replace(/[^\d.-]/g, ''));
    return Number.isFinite(value) ? value : 0;
}

function findRepoLink($: CheerioAPI, item: AnyNode): { owner: string; repo: string } | undefined {
    const candidates = [
        $(item).find('a[data-hydro-click*="PINNED_REPO"]').first(),
        $(item).find('.pinned-item-list-item-content a.text-bold').first(),
        $(item).find('a[href]').filter((_, el) => /^\/[^/]+\/[^/]+/.test($(el).attr('href') || '')).first(),
    ];

    for (const link of candidates) {
        const href = link.attr('href') || '';
        const match = href.match(/^\/([^/]+)\/([^/]+)/);
        if (match) {
            return { owner: decodeURIComponent(match[1]), repo: decodeURIComponent(match[2]) };
        }
    }
    return undefined;
}

function findParentRepo($: CheerioAPI, item: AnyNode): RawPinnedItem['parentRepo'] {
    const forkParagraph = $(item).find('p').filter((_, el) => /forked from/i.test($(el).text())).first();
    if (!forkParagraph.length) return undefined;

    const href = forkParagraph.find('a[href^="/"]').first().attr('href') || '';
    const match = href.match(/^\/([^/]+)\/([^/]+)/);
    if (!match) return undefined;

    const owner = decodeURIComponent(match[1]);
    const repo = decodeURIComponent(match[2]);
    return { owner, repo, link: `https://github.com/${owner}/${repo}` };
}

function isForked($: CheerioAPI, item: AnyNode): boolean {
    return $(item).find('.Box.fork').length > 0
        || /forked from/i.test($(item).text());
}

function isArchived($: CheerioAPI, item: AnyNode): boolean {
    return $(item).find('.Label, [class*="Label"]').toArray()
        .some((el) => $(el).text().trim().toLowerCase() === 'archived');
}

function parseItem($: CheerioAPI, item: AnyNode, fallbackOwner: string): RawPinnedItem | undefined {
    const identity = findRepoLink($, item);
    if (!identity) return undefined;

    const owner = identity.owner || fallbackOwner;
    const repo = identity.repo;
    const parentRepo = findParentRepo($, item);

    const description = $(item).find('.pinned-item-desc, [class*="pinned-item-desc"]').first().text().trim();
    const language = $(item).find('[itemprop="programmingLanguage"]').first().text().trim();
    const colorNode = $(item).find('.repo-language-color').first();
    const languageColor = colorNode.css('background-color')
        || (colorNode.attr('style') || '').match(/background-color\s*:\s*([^;]+)/)?.[1]?.trim();

    const stars = parseNumber($(item).find('a[href$="/stargazers"]').first().text());
    const forks = parseNumber($(item).find('a[href$="/network/members"]').first().text());

    return {
        owner,
        repo,
        link: `https://github.com/${owner}/${repo}`,
        description: description || undefined,
        language: language || undefined,
        languageColor: languageColor || undefined,
        stars,
        forks,
        isFork: isForked($, item) || undefined,
        parentRepo,
        isArchived: isArchived($, item) || undefined,
    };
}

/**
 * Parse the pinned repository list from a GitHub profile page.
 * Returns an empty array when the user has no pinned repos or the markup changed
 * to something none of the strategies recognise.
 */
export function parseProfile(html: string, fallbackOwner: string): { items: RawPinnedItem[]; selector: string } {
    const $ = load(html);
    const { items, selector } = selectItems($);
    const parsed: RawPinnedItem[] = [];
    const seen = new Set<string>();

    for (const item of items) {
        const result = parseItem($, item, fallbackOwner);
        if (!result || seen.has(result.link)) continue;
        seen.add(result.link);
        parsed.push(result);
    }

    if (parsed.length === 0 && items.length > 0) {
        console.warn('[Scraper] Pinned items were found but none could be parsed — GitHub markup may have changed.');
    }
    return { items: parsed, selector };
}
