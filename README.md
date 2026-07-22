# Yapindo Task Management API

A REST API for task management with an AI-powered natural-language command endpoint, built for the Yapindo Jaya Abadi backend technical test.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Database Seeding](#database-seeding)
- [AI Prompt Design](#ai-prompt-design)
- [Why Redis?](#why-redis)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)

## Tech Stack

| Concern | Choice |
|---|---|
| Framework | AdonisJS 6 (TypeScript) |
| Database | PostgreSQL |
| Cache | Redis |
| Authentication | JWT (`jsonwebtoken`) |
| ORM | Lucid |
| AI | Gemini API (`@google/genai`) |

## Setup & Installation

**Prerequisites:** Node.js 20+, PostgreSQL 14+, Redis 7+ (or Docker for either), npm.

```bash
git clone <this-repo-url>
cd yapindo
npm install
```

## Environment Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Most variables are self-explanatory from `.env.example`'s inline comments. Two require action before the app will boot:

- **`JWT_SECRET`** — has no safe default and must be a real random value. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- **`GEMINI_API_KEY`** — get a free key from [Google AI Studio](https://aistudio.google.com/apikey). `GEMINI_MODEL` defaults to `gemini-flash-latest`, an alias that always points at Google's current stable Flash model, so it won't break when a specific model version is eventually retired.

If you don't have a local PostgreSQL/Redis install, the fastest path is Docker:

```bash
docker run -d --name yapindo-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine
docker run -d --name yapindo-redis -p 6379:6379 redis:7-alpine
```

Then set `DB_*` and `REDIS_*` in `.env` to match (defaults in `.env.example` already assume these exact containers).

## Running the Application

```bash
node ace migration:run
node ace db:seed
node ace serve --watch
```

The API is now available at `http://localhost:3333`.

## Database Seeding

`node ace db:seed` populates the database with enough data to exercise every endpoint immediately, with no manual setup:

- **3 users**: 1 admin (`admin@yapindo.test`), 2 regular users (`budi@yapindo.test`, `citra@yapindo.test`) — all with password `Password123!`
- **2 projects**, both created by the seeded admin
- **4 tasks** spread across both projects, with varied `status`/`priority` and one deliberately unassigned task

The seeder is idempotent — re-running `db:seed` never creates duplicate rows.

## AI Prompt Design

`POST /ai/command` converts a natural-language instruction into task CRUD operations. The design has three layers, each addressing a specific requirement from the spec.

### 1. Structured output, not "please reply in JSON"

Rather than asking Gemini to format its reply as JSON via plain prompt text — which still allows markdown fences, commentary, or inconsistent formatting to slip in — the request uses Gemini's native `responseSchema` + `responseMimeType: 'application/json'` mode. The model's output is constrained to a specific shape at the API level, which is a meaningfully stronger guarantee against malformed output than string-based instructions alone.

The schema is an **array** of command objects (not a single object), because a single user prompt can contain multiple instructions — exactly like the spec's own example ("buatkan task baru... Terus sekalian ubah status task ID 5..."). Each element has a required `action` field (`create_task` | `update_task` | `delete_task`) and the relevant fields for that action, all nullable except `action` itself (Gemini's structured output has no native per-action-variant required-field support, so completeness is checked server-side instead — see layer 2).

### 2. The User-table guardrail — two independent layers

The spec requires that the AI can never modify the `users` table. This is enforced twice, deliberately not relying on either layer alone:

- **Structural (schema-level):** the response schema's `action` enum only contains `create_task`, `update_task`, and `delete_task` — there is no vocabulary for a user-table operation at all. Gemini is not just instructed not to touch `users`; it has no way to express that action in a schema-conformant response.
- **Instructional (prompt-level):** the system prompt explicitly states the restriction, and instructs the model to silently omit any user-related part of an instruction rather than inventing a workaround.

Constrained decoding is a model/API behavior, not a contractual guarantee — it can vary across model versions or have edge cases. So a third, independent layer exists in the response validator (`app/ai/task_command_validator.ts`), which only ever constructs `create_task`/`update_task`/`delete_task` commands from a closed `switch` statement — there is no code path in the entire request lifecycle capable of producing a user-table mutation from AI output, even if both prompt layers above were somehow bypassed.

### 3. Safe parsing — turning AI unpredictability into a clean 400

Two properties of LLM output are treated as expected, not exceptional:

- **`null` means "not specified," never "set this column to null."** Because every per-action field is nullable at the schema level, an `update_task` that only means to change `title` may still come back with `"status": null`. The response validator strips every `null`-valued key from each command *before* any other check runs, so the executor only ever sees fields that were actually meant to change.
- **One invalid command fails the whole batch, with a specific reason** (e.g. `"command #2 (update_task): missing required field \"task_id\""`), rather than silently dropping just the bad one and executing the rest. Silently dropping a garbled instruction from a multi-instruction prompt would leave the caller believing more happened than actually did.

Execution itself runs inside a single Lucid-managed DB transaction (`db.transaction(async (trx) => {...})`), with existence checks (does this project/task/assignee actually exist?) running against the transaction's own client to avoid a check-then-mutate race. Any failure — a validation failure *or* a business-rule failure discovered mid-execution (e.g. an AI-hallucinated task ID) — throws, and Lucid's managed transaction rolls back everything in that batch automatically. Every call, success or failure, writes exactly one row to `audit_logs`, on the main connection (outside the transaction), so a rolled-back batch's own failure record survives independently of what it was recording.

## Why Redis?

Redis caches the three read-heavy, unauthenticated-by-role endpoints — `GET /projects`, `GET /projects/:id`, and `GET /projects/:id/tasks` — with a 60-second TTL as a safety net and explicit invalidation as the primary freshness mechanism. Every write that could make one of these stale invalidates exactly the keys it affects:

- Creating a project invalidates only the list.
- Updating a project invalidates the list and that project (not its task list, which a name/description change can't affect).
- Deleting a project invalidates all three keys for it (its tasks cascade-delete at the DB level).
- `POST /ai/command` invalidates the task-list cache for every distinct project a successful batch touched — the only place in the API that mutates tasks outside direct project CRUD, and the one non-obvious invalidation path in the system.

## API Documentation

Import `postman/yapindo-task-management.postman_collection.json` into Postman. Set the collection variable `base_url` to `http://localhost:3333` (default). 

The collection is designed to be fully executable via **Postman Runner (Run Collection)** from top to bottom, resulting in 100% green checks:
- The **Login** request automatically captures the returned JWT into the `{{token}}` collection variable via a test script, so every other request authenticates automatically.
- The **Create Project** request captures its response ID into a `{{new_project_id}}` variable, which the subsequent Update and Delete requests use. This deliberately leaves the original seeded Project 1 untouched, ensuring that the AI Command endpoints (which explicitly target Project 1 and Task 5 per the technical spec) have the required data to pass successfully.
## Project Structure

```
app/
  ai/              # System prompt, response schema, response validator
  controllers/      # Thin HTTP handlers
  enums/            # Shared role/status/priority values (DB + app agree)
  exceptions/        # Business-rule exceptions
  middleware/        # auth, role
  models/            # Lucid models
  services/           # JwtService, GeminiService, CacheService, TaskCommandExecutor
  validators/        # VineJS request validators
config/               # jwt, gemini, redis, database
database/
  migrations/
  seeders/
start/routes.ts        # Full route + middleware map
```
