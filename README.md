# Yapindo Task Management API

REST API for a task management system with role-based access control
(admin / user) and an AI-assisted natural language command endpoint
(`POST /ai/command`) that translates free-text instructions into
validated, transactional CRUD operations on tasks.

Built for the Yapindo Jaya Abadi backend technical test.

## Tech Stack

| Concern        | Choice                    |
| -------------- | -------------------------- |
| Framework      | AdonisJS 7 (TypeScript)    |
| Database       | PostgreSQL (via Lucid ORM) |
| Authentication | JWT (`jsonwebtoken`)       |
| AI Integration | Gemini API (`@google/genai`) |
| Validation     | VineJS                     |

> **Note on framework version:** the technical test brief references
> AdonisJS 6. AdonisJS 7 is the current stable major release on npm
> and is used here instead — starting a new project on a superseded
> major version would itself be a poor engineering decision. The
> application architecture the test evaluates (controllers, models,
> migrations, middleware, validators) is unchanged between the two.

> **Note on Redis:** the brief lists Redis/MongoDB as an optional
> NoSQL component ("Redis / MongoDB"). Nothing in this project's
> functional requirements needs a cache or a NoSQL store — every
> requirement (users, projects, tasks, audit logs, AI command
> execution) is relational data with real referential-integrity needs
> (foreign keys, transactions), which is exactly what PostgreSQL is
> for. Adding Redis with nothing to cache would be exactly the kind
> of "unused dependency" this codebase otherwise avoids throughout.

## Prerequisites

- **Node.js >= 24** (enforced by AdonisJS 7's toolchain)
- **PostgreSQL** (a local instance, or Docker — see below)
- A **Gemini API key** ([Google AI Studio](https://aistudio.google.com/app/apikey))

## Setup & Installation

```bash
git clone https://github.com/shennatsu/yapindo-backend.git
cd yapindo-backend
npm install
```

### Environment configuration

```bash
cp .env.example .env
node ace generate:key
```

`node ace generate:key` writes a fresh `APP_KEY` into `.env` automatically.

Open `.env` and fill in the two secrets that have no default:

| Variable         | Required | Notes                                                                 |
| ---------------- | -------- | ---------------------------------------------------------------------- |
| `JWT_SECRET`     | Yes      | Any long random string. Generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `GEMINI_API_KEY` | Yes      | From [Google AI Studio](https://aistudio.google.com/app/apikey). `POST /ai/command` will fail without it. |

Every other variable in `.env.example` already has a working local-dev default — see the table below for what each one does.

<details>
<summary>Full environment variable reference</summary>

| Variable          | Default (dev)                | Purpose                                                          |
| ------------------ | ----------------------------- | ------------------------------------------------------------------ |
| `PORT`             | `3333`                        | HTTP server port                                                 |
| `HOST`             | `localhost`                   | HTTP server bind host                                            |
| `NODE_ENV`         | `development`                 | Affects CORS default, SQL debug logging, error verbosity         |
| `LOG_LEVEL`        | `info`                        | Pino logger level                                                |
| `APP_KEY`          | *(generated)*                 | AdonisJS internal encryption key — set via `node ace generate:key` |
| `APP_URL`          | `http://localhost:3333`       | Base URL used internally for absolute link generation            |
| `APP_NAME`         | `yapindo-task-management`     | Logger name tag                                                  |
| `CORS_ORIGIN`      | *(unset)*                     | Comma-separated allowlist. Unset = allow-all in dev, block-all in prod |
| `DB_HOST`          | `localhost`                   | PostgreSQL host                                                  |
| `DB_PORT`          | `5432`                        | PostgreSQL port                                                  |
| `DB_USER`          | `postgres`                    | PostgreSQL user                                                  |
| `DB_PASSWORD`      | `postgres`                    | PostgreSQL password                                              |
| `DB_DATABASE`      | `yapindo_task_management`     | Database name — must exist before running migrations             |
| `JWT_SECRET`       | *(none — required)*           | Signing secret for issued JWTs                                   |
| `JWT_EXPIRES_IN`   | `1d`                          | Token lifetime (any [ms](https://github.com/vercel/ms) format)   |
| `GEMINI_API_KEY`   | *(none — required)*           | Gemini API key                                                   |
| `GEMINI_MODEL`     | `gemini-2.0-flash`            | Gemini model used for `POST /ai/command`                         |

</details>

### Database

If you don't already have a local PostgreSQL instance, the fastest option is Docker:

```bash
docker run --name yapindo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=yapindo_task_management \
  -p 5432:5432 -d postgres:16
```

(Skip this if you already have PostgreSQL running natively — just make sure a database named `yapindo_task_management` exists and `.env`'s `DB_*` values match your instance.)

Run migrations, then seed:

```bash
node ace migration:run
node ace db:seed
```

`db:seed` creates:

| Email                 | Password       | Role  |
| ---------------------- | -------------- | ----- |
| `admin@yapindo.test`   | `Password123!` | admin |
| `budi@yapindo.test`    | `Password123!` | user  |
| `citra@yapindo.test`   | `Password123!` | user  |

...plus 2 projects and 4 tasks with varied status/priority/assignee, so every endpoint (including `POST /ai/command`) has real data to work against immediately — no manual setup needed.

### Running the app

```bash
npm run dev
```

Verify it's up:

```bash
curl http://localhost:3333/health
# {"status":"ok","service":"yapindo-task-management-api"}
```

For a production build:

```bash
npm run build
cd build
npm ci --omit=dev
node bin/server.js
```

## API Overview

Full request/response examples are in [`postman_collection.json`](./postman_collection.json) — import it into Postman and run `Login` first; the token is captured automatically for every request after that.

| Method | Endpoint                | Auth           | Description                                  |
| ------ | ------------------------ | -------------- | --------------------------------------------- |
| POST   | `/register`              | none           | Create an account (`role`: `admin` or `user`, defaults to `user`) |
| POST   | `/login`                 | none           | Authenticate, returns a JWT                   |
| GET    | `/projects`              | any role       | List all projects                             |
| GET    | `/projects/:id`          | any role       | Get one project                               |
| GET    | `/projects/:id/tasks`    | any role       | List tasks in a project                       |
| POST   | `/projects`              | **admin**      | Create a project                              |
| PUT    | `/projects/:id`          | **admin**      | Update a project (full replace)               |
| DELETE | `/projects/:id`          | **admin**      | Delete a project (cascades to its tasks)      |
| POST   | `/ai/command`             | any role       | Natural-language task command (see below)     |

Authenticated requests: `Authorization: Bearer <token>` (from `/login`'s response).

## AI Command — Design Notes

`POST /ai/command` takes a free-text instruction and turns it into one or more `create_task` / `update_task` / `delete_task` operations, executed atomically. The design has four layers, each doing one job:

**1. System prompt + structured-output schema** (`app/ai/task_command_prompt.ts`)
The Gemini call uses native structured-output mode (`responseSchema`, not "please return JSON" in the prompt text) — the model is *constrained* to the schema's shape, not just asked nicely. The schema's `action` field is an enum of exactly three values (`create_task`/`update_task`/`delete_task`); there is no schema vocabulary for a user-table action at all, so the model structurally cannot express "delete a user" even if the prompt asks for it. The system prompt *also* states the User-table prohibition explicitly, as a second, independent layer — not because the schema constraint is trusted to fail, but because defense-in-depth means neither layer is a single point of failure.

One schema limitation drives the next layer's design: every per-action field is `nullable`, because Gemini's schema format has no way to express "these fields are required only when `action` is `create_task`." That means a `null` in the raw response is ambiguous — it always means "not specified by the instruction," never "the user explicitly wants this set to null."

**2. Response validation** (`app/ai/task_command_validator.ts`)
Before anything touches the database, the raw response is: (a) stripped of every `null`-valued field — treating null strictly as "not specified," per the schema limitation above; (b) re-checked against the same enum values the schema already constrains, not trusted blindly (the schema constraint is a strong signal, not a guarantee the API will honor forever); (c) checked for per-action completeness (`create_task` needs `project_id`+`title`; `update_task` needs `task_id` plus at least one other field; `delete_task` needs only `task_id`). One invalid command fails the *entire* batch with a specific reason — silently dropping a garbled instruction from a multi-instruction prompt would leave the caller believing it succeeded when it didn't.

**3. Transactional execution** (`app/services/task_command_executor.ts`)
Every command in the batch runs inside one `db.transaction()`. Existence checks (does this `project_id`/`task_id`/`assignee_id` actually exist?) run against the transaction's own client, so a check and its mutation always see the same snapshot — no race window. Any failure throws, and Lucid's managed transaction automatically rolls back everything in the batch — satisfying the spec's "one command fails, the whole request rolls back" requirement via the framework's own mechanism, not manual commit/rollback bookkeeping.

**4. Audit logging** (`app/controllers/ai_commands_controller.ts`)
Every call to this endpoint writes exactly one `audit_logs` row — success or failure — containing the original prompt, Gemini's raw response, and (on failure) a specific reason. This write happens *outside* the task-mutation transaction, on the main connection: if the task changes roll back, the record of that failure must not roll back with them, or the audit trail would erase its own failure history.

## Postman Collection

Import [`postman_collection.json`](./postman_collection.json). It includes:
- Register (as admin and as user)
- Login (auto-captures the JWT into a collection variable used by every other request)
- Full project CRUD + task listing
- The spec's own multi-instruction AI Command example
- A deliberately-failing AI Command request (nonexistent `project_id`, demonstrates the 400 + rollback)
- An adversarial AI Command request asking to delete a user (demonstrates the guardrail holds)

Set the collection variable `base_url` if your server isn't on `http://localhost:3333`.
