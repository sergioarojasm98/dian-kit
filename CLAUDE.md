# Project Instructions

## Language

- **Chat interaction**: Communicate with the user in **Spanish**
- **Code, commits, docs, variables, comments**: Everything in **English**

## Memory Bank

This project uses a Memory Bank system in `memory-bank/` to persist context between sessions.

**At the start of EVERY session**, read these files in order:
1. `memory-bank/project-brief.md` - What the project is
2. `memory-bank/tech-context.md` - Stack and environment
3. `memory-bank/system-patterns.md` - Architecture and conventions
4. `memory-bank/active-context.md` - Current state and next steps
5. `memory-bank/task-tracker.md` - Backlog and in-progress tasks

## Workflow: Plan First, Execute Second

NEVER improvise. Follow this flow:

1. **Understand** - Read the full memory bank before touching code
2. **Plan** - Propose a change plan with affected files
3. **Validate** - Wait for user approval before implementing
4. **Execute** - Make surgical, minimal changes
5. **Record** - Update `active-context.md` and `task-tracker.md`

## User Commands

- `read the memory bank` -> Read all context files
- `update the memory bank` -> Record what was worked on this session
- `show the plan` -> Present the plan before executing
- `project status` -> Summarize task-tracker + active-context

## Principles

- Surgical changes: only touch what is necessary
- No duplication: each piece of data lives in ONE file only
- Be factual: document what exists, not plans or wishes
- Be concise: each file should be readable in < 30 seconds
