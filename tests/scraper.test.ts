import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseProfile } from '../src/server/scraper/parseProfile';
import { parseRepo } from '../src/server/scraper/parseRepo';

const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

test('parseProfile extracts pinned repos, owner, language and fork metadata', () => {
    const { items, selector } = parseProfile(fixture('profile.html'), 'alvinau0427');

    assert.equal(selector, '.pinned-item-list-item');
    assert.equal(items.length, 2);

    assert.equal(items[0].owner, 'alvinau0427');
    assert.equal(items[0].repo, 'github-pinned-repo-api');
    assert.equal(items[0].link, 'https://github.com/alvinau0427/github-pinned-repo-api');
    assert.equal(items[0].language, 'TypeScript');
    assert.equal(items[0].stars, 1);
    assert.equal(items[0].forks, 0);
    assert.match(items[0].description || '', /without using personal access token/);

    assert.equal(items[1].isFork, true);
    assert.deepEqual(items[1].parentRepo, {
        owner: 'anuraghazra',
        repo: 'github-readme-stats',
        link: 'https://github.com/anuraghazra/github-readme-stats',
    });
});

test('parseProfile returns nothing for a page without pinned items', () => {
    const result = parseProfile('<html><body><h2>Repositories</h2></body></html>', 'nobody');
    assert.equal(result.items.length, 0);
    assert.equal(result.selector, '');
});

test('parseRepo extracts website and de-duplicated topics', () => {
    const extras = parseRepo(fixture('repo.html'));
    assert.equal(extras.website, 'https://example.com');
    assert.deepEqual(extras.topics, ['api', 'github-api']);
});
