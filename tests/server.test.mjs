import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createAppServer } from '../server.mjs';

test('standalone host serves frontend and connects the same oracle handler', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ouija-server-'));
  await writeFile(join(dir, 'index.html'), '<title>Talk to the Other side</title>');
  let calls = 0;
  const server = createAppServer({ distDir: dir, handler: async request => {
    calls++;
    assert.deepEqual(await request.json(), { question: 'Who is calling?' });
    return Response.json({ answer: 'Your next brief is haunted.' });
  } });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Talk to the Other side/);
    assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
    const reply = await fetch(`${base}/api/oracle`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'Who is calling?' }),
    });
    assert.deepEqual(await reply.json(), { answer: 'Your next brief is haunted.' });
    assert.equal(calls, 1);
    assert.equal((await fetch(`${base}/api/oracle`)).status, 405);
    assert.equal((await fetch(`${base}/api/oracle`, { method: 'POST', body: 'x'.repeat(4097) })).status, 413);
    for (const path of ['/server.mjs', '/.env', '/../package.json', '/..%2fpackage.json', '/%zz']) {
      assert.equal((await fetch(`${base}${path}`)).status, 404);
    }
    assert.equal(calls, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
