// Live smoke check (network): builds the feed from the real sources and asserts shape.
import assert from 'node:assert/strict';
import { buildFeed } from '../workers/site-api/src/index.js';

const f = await buildFeed();
console.log(JSON.stringify({ columns: f.columns.length, guides: f.guides.length, videos: f.videos.length, errors: f.errors, firstColumn: f.columns[0]?.title, firstGuide: f.guides[0]?.title, firstVideo: f.videos[0]?.title }, null, 2));
assert.ok(f.columns.length >= 3, 'columns');
assert.ok(f.guides.length >= 3, 'guides');
assert.ok(f.videos.length >= 3, 'videos');
assert.equal(f.errors.length, 0);
console.log('LIVE FEED OK');
