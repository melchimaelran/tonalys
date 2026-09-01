# @tonalys/next

The Tonalys frontend — Next.js (App Router), TypeScript, Tailwind, shadcn/ui,
TanStack Query. The marketing homepage, the upload flow, and the player
(chords synced to playback, piano / guitar views, capo / transpose, A–B loop,
manual chord editing). Route Handlers under `src/app/api/` proxy to the Nest
API.

See the [root README](../../README.md) for the full picture and how to run
the stack. Copy `.env.example` to `.env.local` for native dev.

```bash
pnpm --filter next dev    # :3000
pnpm --filter next test   # Vitest + React Testing Library
```
