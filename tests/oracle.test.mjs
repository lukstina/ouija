import test from 'node:test';
import assert from 'node:assert/strict';
import { createOracle, config } from '../netlify/functions/oracle.mjs';

const env = { BITE_OPENAI_API_KEY: 'test-key' };
const request = (question = 'Will we survive Monday?') => new Request('http://localhost/api/oracle', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }),
});
const providerReply = answer => Response.json({ status: 'completed', output: [{
  type: 'message', role: 'assistant', content: [{ type: 'output_text', text: answer }],
}] });

test('sends anonymous event context and returns the provider answer', async () => {
  const handler = createOracle({ env, fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.input, 'Will we survive Monday?');
    assert.match(body.instructions, /Bite.*Halloween office party/);
    assert.match(body.instructions, /do not know who is asking/);
    assert.equal(body.store, false);
    assert.equal(body.model, 'gpt-4.1-mini');
    assert.equal(body.max_output_tokens, 120);
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    return providerReply('Your spirits will reconnect after the second coffee.');
  } });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { answer: 'Your spirits will reconnect after the second coffee.' });
});

test('invalid requests do not call the provider', async () => {
  const handler = createOracle({ env, fetchImpl: () => assert.fail('Provider should not be called') });
  for (const question of ['', '  ', 'a'.repeat(301), null, 42]) {
    assert.equal((await handler(request(question))).status, 400);
  }
  assert.equal((await handler(new Request('http://localhost/api/oracle'))).status, 405);
  assert.equal((await handler(new Request('http://localhost/api/oracle', { method: 'POST', body: '{}' }))).status, 415);
  assert.equal((await handler(new Request('http://localhost/api/oracle', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  }))).status, 400);
  assert.equal((await handler(request('a'.repeat(5000)))).status, 413);
});

test('missing key or host switch disables AI without calling the provider', async () => {
  for (const settings of [{}, { ...env, BITE_AI_ENABLED: 'false' }]) {
    const handler = createOracle({ env: settings, fetchImpl: () => assert.fail('AI is disabled') });
    assert.equal((await handler(request())).status, 503);
  }
});

test('unavailable provider and malformed replies return safe errors', async () => {
  const providers = [
    async () => new Response('sensitive provider error', { status: 401 }),
    async () => { throw new Error('sensitive provider error'); },
    async () => providerReply(''),
    async () => providerReply('x'.repeat(161)),
    async () => providerReply('word '.repeat(21)),
    async () => providerReply('👻'),
    async () => Response.json({ status: 'incomplete', output: [] }),
    async () => new Response('not json'),
  ];
  for (const fetchImpl of providers) {
    const response = await createOracle({ env, fetchImpl })(request());
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /sensitive|test-key/);
  }
});

test('a stalled provider is aborted', async () => {
  const fetchImpl = async (_, { signal }) => new Promise((resolve, reject) => {
    const keepAlive = setTimeout(() => reject(new Error('No abort received')), 1000);
    signal.addEventListener('abort', () => { clearTimeout(keepAlive); reject(signal.reason); }, { once: true });
  });
  assert.equal((await createOracle({ env, fetchImpl, timeoutMs: 10 })(request())).status, 502);
});

test('accented Latin answers are accepted and endpoint is rate limited', async () => {
  const response = await createOracle({ env, fetchImpl: async () => providerReply('Spoki šovakar gaida tavu zvanu.') })(request());
  assert.equal(response.status, 200);
  assert.equal(config.path, '/api/oracle');
  assert.deepEqual(config.rateLimit.aggregateBy, ['ip']);
});
