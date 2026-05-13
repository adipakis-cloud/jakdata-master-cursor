This root-level folder is intentionally not a Prisma project.

JAKDATA uses `backend/prisma/schema.prisma` as the single database schema source of truth because the backend package owns Prisma generation, `db:push`, and seed scripts.

Use:

```bash
cd backend
npm run db:generate
npm run db:push
npm run db:seed:dev
```
