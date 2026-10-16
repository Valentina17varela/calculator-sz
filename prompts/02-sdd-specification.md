# Prompt 02: Spec-Driven Development kickoff

## Role

You are a senior engineer who practices **Spec-Driven Development**. You write the contract first, make trade-offs explicit and keep the documents short, precise and reviewable.

## Context

I received a take-home technical challenge from Sezzle for a Software Engineer II role. The HR email is the source of truth for what must be delivered; keep it open as a checklist.

| From the HR email | Requirement |
|---|---|
| Product | Full-stack calculator, React frontend, backend microservice |
| Operations | Add, subtract, multiply, divide. Optional: power, square root, percent |
| Frontend | React (TypeScript preferred): intuitive input, validation, error handling, responsive |
| Backend | REST API (Go preferred): validate input, edge cases (division by zero, invalid data), JSON |
| Non-functional | Clean, idiomatic code; unit tests on both layers; documentation; optional Dockerfile |
| Deliverables | Git repository, README (setup, API examples, design decisions), tests and coverage report, optional Docker, **the prompts used** |
| Effort | About 2 to 4 hours, so prioritize correctness, clarity and maintainability over extra features |

Personal requirements:

- The calculator shows the name **Sezzle** and uses a Sezzle-inspired palette; my name appears as a quiet credit.
- The README is a **living document**: it records each decision as it is made (for example "we work with SDD", "the UI uses a design skill").
- The README looks like my other projects: badges, icons, color, Mermaid diagrams, tables.
- All work happens inside the `sezzle-calculator` folder. Do not run `git init` yet.

## Task

Write the specifications **before any code**, in `docs/sdd/`:

| File | Must contain |
|---|---|
| `00-overview.md` | Goal, scope table (in and out), **ADR log** with the reason for each decision, high-level architecture, document map, **HR checklist** |
| `01-api-spec.md` | Principles, endpoints, operations table, request and response examples, **error table** with stable machine-readable codes, `curl` examples |
| `02-backend-design.md` | Layout, layers, core contracts, **numeric rules**, **edge-case table** that will drive the tests, HTTP layer, testing approach |
| `03-frontend-design.md` | Layout, state machine and its rules, API client, components, keyboard map, responsive and accessibility rules, testing approach |
| `04-test-plan.md` | Strategy per layer with coverage targets, TDD order, commands, end-to-end acceptance scenarios |

Also create `.gitignore` (Go, Node, env, OS, editors) and a first `README.md`.

## Decisions to propose (and justify in the ADR log)

- Backend in Go with the **standard library** only.
- **Exact decimal arithmetic**, with numbers sent as **strings** in JSON, to avoid `0.1 + 0.2 = 0.30000000000000004`.
- Frontend in React, TypeScript and Vite, with a **pure reducer** for calculator behavior.
- Operations as pure functions behind a registry.
- One endpoint for all operations; `400` for malformed requests and `422` for mathematically invalid ones.
- Docker Compose to run everything with one command.

## Constraints

- Short documents with tables; no padding.
- Every behavior that can fail has a row in an edge-case table.
- Do not invent facts. If something is unspecified, list it under "open questions".
- Use no em-dashes or en-dashes anywhere.

## Acceptance criteria

- A reviewer can implement the backend from `01` and `02` alone, and the frontend from `01` and `03` alone.
- Every HR deliverable appears in the checklist.
- Each ADR row states a decision and its reason.
- The README already lists the decisions taken so far and links to the specs.

## Expected output

The files above, then a short summary of the decisions that need my approval. Stop and wait for my review of the API spec before writing code.
