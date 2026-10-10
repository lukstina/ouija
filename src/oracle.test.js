import test from 'node:test';
import assert from 'node:assert/strict';
import { getReply } from './oracle.js';
import { getDemoReply } from './replies.js';

test('client sends only the question and uses the AI answer', async () => {
  const reply = await getReply('Hello', { fetchImpl: async (url, options) => {
    assert.equal(url, '/api/oracle');
    assert.deepEqual(JSON.parse(options.body), { question: 'Hello' });
    assert.equal(options.method, 'POST');
    return Response.json({ answer: 'A new signal stirs.' });
  } });
  assert.equal(reply, 'A new signal stirs.');
});

test('client falls back for rate limits, outages, and invalid responses', async () => {
  for (const fetchImpl of [
    async () => new Response('', { status: 429 }),
    async () => new Response('', { status: 503 }),
    async () => { throw new Error('Offline'); },
    async () => Response.json({ answer: null }),
    async () => Response.json({ answer: 'x'.repeat(161) }),
    async () => new Response('not JSON'),
  ]) {
    assert.equal(await getReply('Hello', { fetchImpl }), getDemoReply('Hello'));
  }
});
