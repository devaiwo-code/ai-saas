# Services

Business rules live here. A service depends on repository **interfaces** (injected through
`buildApp`), never on Fastify, HTTP types or a concrete storage implementation.

Routes call services; services call repositories.
