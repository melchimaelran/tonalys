# @tonalys/nest

The Tonalys API and orchestration layer — NestJS + Prisma (PostgreSQL).
Handles uploads / YouTube submissions, auth, the analysis-job lifecycle
(publishing to RabbitMQ, exposing status), audio streaming from MinIO, and
the daily cleanup cron.

Not run on its own — see the [root README](../../README.md) for what Tonalys
is and how to run the stack. Copy `.env.example` to `.env` for native dev.

```bash
pnpm --filter nest start:dev   # watch mode, :3001
pnpm --filter nest test        # unit
pnpm --filter nest run test:e2e   # integration (needs infra up)
```
