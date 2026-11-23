import { load } from 'cheerio';

export interface RepoExtras {
    website?: string;
    topics: string[];
    isArchived?: boolean;
}

/**
 * Parse the extra metadata that is only available on the repository page.
 * These selectors deliberately avoid hashed CSS-module class names where possible.
 */
export function parseRepo(html: string): RepoExtras {
    const $ = load(html);

    let website = $('[class*="websiteLink"] a[href^="http"]').first().attr('href')?.trim();
    if (!website) {
        website = $('a[target="_blank"][rel*="nofollow"][href^="http"]').first().attr('href')?.trim();
    }

    const topics = new Set<string>();
    $('a[href^="/topics/"]').each((_, el) => {
        const topic = $(el).text().trim();
        if (topic) topics.add(topic);
    });

    const isArchived = $('.Label, [class*="Label"]').toArray()
        .some((el) => $(el).text().trim().toLowerCase() === 'archived');

    return {
        website: website || undefined,
        topics: Array.from(topics),
        isArchived: isArchived || undefined,
    };
}
