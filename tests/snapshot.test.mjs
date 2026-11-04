import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refreshSnapshot } from '../workers/site-api/src/index.js';

const kv = (initial) => {
  const m = new Map(Object.entries(initial || {}));
  return { m, async get(k, t) { const v = m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); } };
};

test('refreshSnapshot stores fresh feed in KV', async () => {
  const env = { INBOX: kv() };
  const out = await refreshSnapshot(env, async () => ({ updated: 'now', columns: [{ t: 1 }], guides: [{ t: 2 }], videos: [{ t: 3 }], errors: [] }));
  assert.equal(out.columns.length, 1);
  assert.equal(JSON.parse(env.INBOX.m.get('feed:v2')).guides.length, 1);
});

test('refreshSnapshot keeps previous items when a source fails', async () => {
  const prev = { updated: 'old', columns: [{ t: 'c' }], guides: [{ t: 'g' }], videos: [{ t: 'v' }] };
  const env = { INBOX: kv({ 'feed:v2': JSON.stringify(prev) }) };
  const out = await refreshSnapshot(env, async () => ({ updated: 'now', columns: [{ t: 'c2' }], guides: [], videos: [], errors: ['guides', 'videos'] }));
  assert.deepEqual(out.columns, [{ t: 'c2' }]);
  assert.deepEqual(out.guides, [{ t: 'g' }]);
  assert.deepEqual(out.videos, [{ t: 'v' }]);
});

test('refreshSnapshot never overwrites a good snapshot with an empty one', async () => {
  const prev = { updated: 'old', columns: [{ t: 'c' }], guides: [], videos: [] };
  const env = { INBOX: kv({ 'feed:v2': JSON.stringify(prev) }) };
  await refreshSnapshot(env, async () => ({ updated: 'now', columns: [], guides: [], videos: [], errors: ['columns', 'guides', 'videos'] }));
  assert.equal(JSON.parse(env.INBOX.m.get('feed:v2')).columns[0].t, 'c');
});
