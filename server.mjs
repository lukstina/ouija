import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import oracle from './netlify/functions/oracle.mjs';

const projectDir = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > 4096) { reject(new Error('BODY_TOO_LARGE')); return; }
      chunks.push(chunk);
    });
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

export function createAppServer({ distDir = resolve(projectDir, 'dist'), handler = oracle } = {}) {
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'same-origin');
    const fail = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ error: message }));
    };
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname === '/api/oracle') {
        if (request.method !== 'POST') return fail(405, 'Use POST.');
        if (Number(request.headers['content-length']) > 4096) {
          request.resume();
          return fail(413, 'Question too large.');
        }
        const body = await readBody(request);
        const result = await handler(new Request(url, { method: 'POST', headers: request.headers, body }));
        response.writeHead(result.status, Object.fromEntries(result.headers));
        return response.end(await result.text());
      }
      if (!['GET', 'HEAD'].includes(request.method)) return fail(405, 'Use GET or HEAD.');
      if (url.pathname === '/health') {
        response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return response.end(request.method === 'HEAD' ? undefined : JSON.stringify({ status: 'ok' }));
      }
      const pathname = decodeURIComponent(url.pathname);
      const file = resolve(distDir, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(`${resolve(distDir)}${sep}`)) return fail(404, 'Not found.');
      const info = await stat(file);
      if (!info.isFile()) return fail(404, 'Not found.');
      const content = request.method === 'HEAD' ? undefined : await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        'Content-Length': info.size,
      });
      response.end(content);
    } catch (error) {
      if (error.message === 'BODY_TOO_LARGE') return fail(413, 'Question too large.');
      if (['ENOENT', 'ENOTDIR'].includes(error.code) || error instanceof URIError) return fail(404, 'Not found.');
      // No credentials, question bodies, or upstream messages in logs/responses.
      fail(500, 'Server error.');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  await stat(resolve(projectDir, 'dist/index.html'));
  createAppServer().listen(port, '127.0.0.1', () => console.log(`Oracle server listening on 127.0.0.1:${port}`));
}
