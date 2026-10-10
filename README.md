# Ouija

A web Ouija board that answers questions with an animated planchette and letter-by-letter text. This initial version uses deterministic local demo replies, for entertainment. It does not send questions to an external service.

## Development

Use Node.js 24 and npm.

```sh
npm ci --cache /workspace/.npm-cache
npm run dev
```

```sh
npm test
npm run build
```

Type into the question field or use your device keyboard’s dictation. The app has no microphone access or speech-to-text integration. Device dictation may use a service chosen by the device or operating system; offline behavior depends on its settings.

The answer appears below the board as the planchette moves across the letters. Reduced-motion preferences show the complete answer immediately, and screen readers receive a complete answer announcement.

## Next steps

Choose an answer provider and add a backend endpoint before using any private API key. Keep keys out of browser code and Git. Consider configurable spelling speed, sound that users can turn on, and conversation history with an explicit clear action.

## Deploy to Netlify

This app can run as a static site on Netlify's Free plan, within the plan's usage limits. No API keys, database, or paid services are needed for the current demo.

1. Sign in at https://app.netlify.com/ and choose **Add new project** → **Import an existing project** (the wording may vary).
2. Connect GitHub and select `lukstina/ouija`. Grant Netlify access to this repository if prompted.
3. Select the `main` branch. Leave the base directory empty. The committed `netlify.toml` sets the build command to `npm run build`, the publish directory to `dist`, and Node.js to version 24.
4. Deploy. Netlify supplies an HTTPS site address and automatically redeploys when changes are pushed to `main`.

For a one-off deployment without connecting GitHub, run `npm ci` and `npm run build`, then upload the generated `dist` folder at https://app.netlify.com/drop. Further updates require another upload.

Test the deployed site by submitting a question, watching the answer spell out, and confirming the complete reply appears below the board. On a phone, try the keyboard's dictation button in the question field. Replies remain local demo responses.
