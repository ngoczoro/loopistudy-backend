---
description: Mandatory modular monolith architecture rules for the Loopi Study backend
alwaysApply: true
---

# Architecture Rule

The backend **MUST** follow a **Modular Monolith** architecture.

This rule is **architectural guidance only**. Do not generate feature implementation, move files, or create modules unless explicitly requested in a separate task.

---

# High-Level Principles

- Domain-first organization
- Strong module boundaries
- Shared infrastructure separated from business modules
- Feature-based structure instead of layer-based structure
- Backend must remain a **single deployable application**
- Avoid premature microservices

---

# Required Backend Structure

Use this structure as the standard target layout:

```txt
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── subjects/
│   ├── content/
│   ├── tasks/
│   ├── planner/
│   ├── focus/
│   ├── quiz/
│   ├── goals/
│   ├── notifications/
│   ├── admin/
│   └── ai/
│
├── shared/
│   ├── config/
│   ├── database/
│   ├── middleware/
│   ├── utils/
│   ├── constants/
│   ├── errors/
│   └── serializers/
│
├── app.js
└── server.js
```

- **`modules/`** — business domains; each module owns its HTTP surface and domain logic
- **`shared/`** — cross-cutting infrastructure only; no domain-specific business rules
- **`app.js`** — Express app wiring (middleware, route mounting)
- **`server.js`** — process entry point (listen, graceful shutdown)

---

# Module Rules

Each module should contain:

- `routes`
- `controllers`
- `services`
- `repositories`
- `validations`
- `serializers`

Example:

```txt
modules/subjects/
├── subject.routes.js
├── subject.controller.js
├── subject.service.js
├── subject.repository.js
├── subject.validation.js
└── subject.serializer.js
```

## Module boundaries

- A module **owns** its domain logic and HTTP handlers for that domain
- Modules communicate through **service interfaces**, not by reaching into another module's repository or models directly
- Shared types, enums, and infrastructure live in `shared/`, not duplicated per module
- Prefer **one public entry per module** (e.g. routes file) for wiring; keep internals private to the module folder

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **routes** | HTTP method + path mapping only; no business logic |
| **controllers** | Request/response orchestration; call services; never touch Sequelize directly |
| **services** | Business rules, authorization checks, orchestration across repositories |
| **repositories** | Data access only (Sequelize queries); no HTTP or response shaping |
| **validations** | Input schemas (e.g. Joi) aligned with frontend contracts |
| **serializers** | Map DB/domain objects to API response shapes |

---

# Forbidden Patterns

Do **NOT** use:

- Global `controllers/` folder at `src/` root
- Global `services/` folder at `src/` root
- Global `repositories/` folder at `src/` root
- Tightly coupled cross-module imports (e.g. `subjects` importing `content` repository internals)
- Direct DB access from controllers
- Business logic inside routes
- Duplicated enums/constants across modules

## Cross-module interaction

```js
// ❌ BAD — direct repository import across modules
import { contentRepository } from "../content/content.repository.js";

// ✅ GOOD — call the owning module's service
import { contentService } from "../content/content.service.js";
```

```js
// ❌ BAD — Sequelize in controller
const subject = await Subject.findByPk(req.params.id);

// ✅ GOOD — controller delegates to service
const subject = await subjectService.getById(req.user.userId, req.params.id);
```

---

# Database Rules

- **UUID everywhere** — primary keys and foreign keys use UUID, not BIGINT
- **Ownership** — enforce via `req.user.userId`; every user-scoped query must filter by owner
- **Soft delete** — use paranoid / `deleted_at` for user-facing entities (subjects, content, quizzes, etc.)
- **Centralized models** — Sequelize models live in `shared/database/models/`
- **Migrations only** — schema changes via migration files; **no `sequelize.sync()`** in production or dev workflows
- **Associations** — defined centrally in `shared/database/models/index.js`, not scattered per module

---

# API Rules

- **Frontend contract-first** — design endpoints and payloads to match approved frontend contracts before implementation
- **Serializer layer required** — never return raw Sequelize instances or snake_case DB columns to the client
- **Response consistency** — use a shared success/error envelope from `shared/errors/` or equivalent
- **No schema leakage** — hide internal fields (`password_hash`, `deleted_at`, raw JSONB internals) from API responses
- **Ownership in every mutation** — create/update/delete must verify `req.user.userId` owns the resource

---

# Scalability Principles

- Modules should be **independently maintainable** — a developer can work in one module without breaking others
- **Minimize coupling** between modules; depend on stable service interfaces, not implementation details
- **Prepare for future extraction** — module boundaries should be clear enough to split into microservices later if needed, without redesigning now
- **Keep shared logic in `shared/`** — only genuinely cross-cutting code belongs there; resist turning `shared/` into a junk drawer

---

# Migration from Legacy Layout

The codebase may still contain legacy layer-based folders (`src/controllers/`, `src/services/`, `src/models/`, etc.). When refactoring is explicitly requested:

1. Move domain code into the appropriate `modules/<domain>/` folder
2. Move infrastructure into `shared/`
3. Update imports module-by-module; do not big-bang refactor unless asked
4. Do not delete legacy files until the replacement module is wired and verified

**Until a migration task is assigned: treat this file as the target architecture; do not move or refactor existing code.**

---

# Checklist Before Adding New Backend Code

- [ ] Code lives in the correct `modules/<domain>/` folder (or `shared/` if infrastructure)
- [ ] Controller does not import Sequelize models directly
- [ ] Route has no business logic
- [ ] Response goes through a serializer
- [ ] Enums/constants imported from `shared/constants/` (single source of truth)
- [ ] User ownership checked via `req.user.userId`
- [ ] New tables/columns added via migration, not sync
