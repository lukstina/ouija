import { defineConfig, loadEnv } from 'vite';
import { createOracle } from './netlify/functions/oracle.mjs';

// Run the same backend locally; server secrets are never exposed through VITE_ variables.
export default defineConfig(({ mode }) => ({
  plugins: [{
    name: 'local-oracle',
    configureServer(server) {
      const env = { ...loadEnv(mode, process.cwd(), 'BITE_'), ...process.env };
      const oracle = createOracle({ env });
      server.middlewares.use('/api/oracle', async (req, res) => {
        try {
          let body = '';
          for await (const chunk of req) {
            body += chunk;
            if (body.length > 4096) { res.writeHead(413); res.end(); return; }
          }
          const response = await oracle(new Request('http://localhost/api/oracle', {
            method: req.method,
            headers: req.headers,
            ...(req.method !== 'GET' && req.method !== 'HEAD' ? { body } : {}),
          }));
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch { res.writeHead(500); res.end(); }
      });
    },
  }],
}));
