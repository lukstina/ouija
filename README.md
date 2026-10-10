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

The answer appears below the board as the planchette moves across the letters. “Reveal answer” skips the animation. Reduced-motion preferences show the complete answer immediately, and screen readers receive a complete answer announcement.

## Next steps

Choose an answer provider and add a backend endpoint before using any private API key. Keep keys out of browser code and Git. Consider configurable spelling speed, sound that users can turn on, and conversation history with an explicit clear action.
