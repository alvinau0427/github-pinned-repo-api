import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/server/server';
import { HttpError } from '../src/server/errors';
import { PinnedRepo } from '../src/types';

const sample: PinnedRepo[] = [{
    owner: 'alvinau0427',
    repo: 'github-pinned-repo-api',
    link: 'https://github.com/alvinau0427/github-pinned-repo-api',
    image: 'https://opengraph.githubassets.com/1/alvinau0427/github-pinned-repo-api',
    stars: 1,
    forks: 0,
    topics: ['api'],
    isFork: false,
    isArchived: false,
}];

test('GET /api/:username returns JSON with cache headers', async () => {
    const app = createApp({ getPinnedRepos: async () => sample });

    const first = await request(app).get('/api/alvinau0427');
    assert.equal(first.status, 200);
    assert.equal(first.headers['x-cache'], 'MISS');
    assert.equal(first.headers['cache-control'], 'public, max-age=300');
    assert.equal(first.body[0].repo, 'github-pinned-repo-api');

    const second = await request(app).get('/api/ALVINAU0427');
    assert.equal(second.status, 200);
    assert.equal(second.headers['x-cache'], 'HIT');
});

test('GET /api/:username rejects invalid usernames with 422', async () => {
    const app = createApp({ getPinnedRepos: async () => sample });
    const res = await request(app).get('/api/not%20a%20user');
    assert.equal(res.status, 422);
    assert.equal(res.headers['cache-control'], 'no-store');
});

test('GET /api/:username propagates a 404 from the fetcher', async () => {
    const app = createApp({
        getPinnedRepos: async () => { throw new HttpError(404, 'GitHub user ghost not found.'); },
    });
    const res = await request(app).get('/api/ghost');
    assert.equal(res.status, 404);
    assert.match(res.body.error, /not found/);
});

test('GET / serves the frontend and /manifest.json is available', async () => {
    const app = createApp();
    const home = await request(app).get('/');
    assert.equal(home.status, 200);
    assert.match(home.text, /input_form/);

    const manifest = await request(app).get('/manifest.json');
    assert.equal(manifest.status, 200);
});
