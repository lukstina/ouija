# Bite Halloween

A web Ouija board for Bite's Halloween office party. The AI character is the playful, mischievous ghost in Bite's network. Replies are short, 4–12 words, and appear letter by letter as the planchette moves. This is entertainment, not factual fortune-telling.

Questions are anonymous and independent: no accounts, guest introductions, or conversation history sent to the AI. When enabled, the backend sends the question and fixed event instructions to OpenAI. The app does not log or persist questions and requests `store: false`; OpenAI's own data handling still applies. Local scripted replies are used when AI is disabled, unconfigured, rate limited, or unavailable.

## Development

Use Node.js 24 and npm.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

For live AI locally, copy `.env.example` to `.env` and set `BITE_OPENAI_API_KEY` there. The file is ignored by Git. Restart the development server after changing it. Without a key, the full interface works with scripted fallbacks. Vite's local middleware runs the same function handler as Netlify; production rate limiting is enforced by Netlify and is not simulated locally.

For a local 502 error, inspect the response body for `/api/oracle` in browser developer tools. It contains a safe `code`, without the key or raw provider message. `api_key_rejected` means authentication failed; `api_billing_required` means the API quota or billing needs attention; `api_access_denied` or `api_model_unavailable` means provider/model access is unavailable; `api_rate_limited` means wait before retrying; `api_timeout` or `api_connection_failed` means the request timed out or connectivity failed. `reply_incomplete` or `reply_invalid` means the model's reply failed our board format checks. A 503 means AI is disabled or the server cannot see a key. The `.env` file must be beside `package.json`; restart Vite after edits. Local `.env` settings do not configure Netlify.

```sh
npm test
npm run build
```

Type into the question field or use your device keyboard’s dictation. The app has no microphone access or speech-to-text integration. Device dictation may use a service chosen by the device or operating system; offline behavior depends on its settings.

The question form shows first, with the board hidden. Submitting hides the form and shows the board; the answer appears below it as the planchette moves across the letters. After spelling finishes, **Ask another question** returns to the form. Completed questions and answers appear in newest-first history for the current page session. **Clear history** removes the entries; reloading also clears them. History stays in page memory and is never sent to the AI. Reduced-motion preferences show the complete answer immediately, and screen readers receive a complete answer announcement.

## Oracle configuration

The browser sends only `{ "question": "..." }` to `/api/oracle`. The Netlify function uses OpenAI's Responses API with `gpt-4.1-mini` by default. Edit the personality and confirmed event context in `netlify/functions/oracle.mjs`. Add verified inside jokes there, rather than invented facts about colleagues. Accented Latin letters move the planchette to their base letter while preserving accents in the displayed answer.

Server settings:

| Variable | Purpose |
| --- | --- |
| `BITE_OPENAI_API_KEY` | OpenAI API key; required for live AI. Keep it server-only. |
| `BITE_OPENAI_MODEL` | Optional model override; defaults to `gpt-4.1-mini`. |
| `BITE_AI_ENABLED` | Set to `false` to use scripted replies without calling OpenAI. |

Never put an API key in a `VITE_` variable, browser code, or Git. The endpoint limits questions to 300 characters, uses a 12-second provider timeout, limits output tokens, validates answer length and characters, and requests no stored conversation. Netlify's function configuration limits requests to 10 per minute per IP. Guests using the same office network share that allowance. It reduces abuse but is not a global spending cap; monitor provider usage and configure billing alerts for the party.

The browser waits for a complete reply before animating. A failed request uses a local themed fallback. No operator-control screen is implemented yet.

## Deploy to Netlify

The frontend and function can run on Netlify's Free plan within its usage limits. AI API usage is billed separately by OpenAI; a ChatGPT subscription does not include this API usage. No database is needed.

1. Sign in at https://app.netlify.com/ and choose **Add new project** → **Import an existing project** (the wording may vary).
2. Connect GitHub and select `lukstina/ouija`. Grant Netlify access to this repository if prompted.
3. Select the `main` branch. Leave the base directory empty. The committed `netlify.toml` sets the build command to `npm run build`, the publish directory to `dist`, and Node.js to version 24.
4. Deploy. Netlify supplies an HTTPS site address and automatically redeploys when changes are pushed to `main`.

To activate AI on the deployed site:

1. Create an OpenAI API key at https://platform.openai.com/api-keys with access to the chosen model and API billing enabled.
2. In the Netlify project's environment variable settings, add `BITE_OPENAI_API_KEY` securely. Make it available to **Functions** (or all scopes if your plan does not offer scope selection), in the production deploy context. Do not paste the value into chat or commit it.
3. Trigger a new production deploy after saving the variable.
4. Ask a distinctive event question. Check the `/api/oracle` request in browser developer tools: HTTP 200 with an `answer` means the AI path succeeded. HTTP 503 means the key is absent or AI is disabled; 502 means the provider failed or its reply was invalid; 429 means the rate limit was reached. These failures still animate scripted replies, so animation alone does not establish live AI is working.

To turn AI off, set `BITE_AI_ENABLED=false` and redeploy. Remove that setting or set it to `true` and redeploy to restore AI.

Uploading only `dist` with Netlify Drop runs the interface and scripted fallbacks, but does not deploy the AI function. Use a Git-connected deployment for the full oracle.

Test the deployed site by submitting a question, watching the answer spell out, and confirming the complete reply appears below the board. On a phone, try the keyboard's dictation button in the question field. Tests cover the backend with a simulated provider, client fallbacks, and validation; a live model check requires your configured key.
