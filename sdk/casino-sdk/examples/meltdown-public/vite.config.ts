import { defineConfig } from 'vite';

// The game runs inside the host's iframe on a different origin, and the host
// fetches /game.manifest.json cross-origin — CORS must stay open.
export default defineConfig({
  server: { port: 3200, cors: true },
  preview: { port: 3200, cors: true },
});
