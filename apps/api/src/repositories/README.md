# Repositories

Persistence only, no business rules. Each repository is an interface with two implementations:

- a `memory` implementation (used when `STORAGE=memory` and in unit tests)
- a `prisma` implementation (used when `STORAGE=prisma`)

The implementation is chosen at startup in `server.ts` and injected into `buildApp`.
