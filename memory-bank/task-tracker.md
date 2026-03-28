# Task Tracker

## Backlog

| ID | Task | Priority | Estimate | Notes |
|----|------|----------|----------|-------|
| T-010 | Implement CLI commands (init, invoice, pos, validate, explain) | high | large | `packages/cli/src/bin.ts` is a stub with `console.log` |
| T-011 | Implement AI layer (parseInvoice, explainError) | medium | large | `packages/ai/src/index.ts` only exports VERSION |
| T-012 | Implement Python SDK | medium | large | `packages/sdk-python/dian_kit/__init__.py` only has version |
| T-013 | Implement WhatsApp plugin | low | large | `plugins/whatsapp/` has package.json but no source |
| T-014 | Add integration tests against DIAN sandbox | high | medium | `tests/integration/` is empty |
| T-015 | Write usage examples | medium | small | All `examples/` dirs contain only `.gitkeep` |
| T-016 | Add Nomina Electronica support | low | large | Listed in roadmap, not started |
| T-017 | CI trigger: enable on push/PR (currently workflow_dispatch only) | medium | small | `.github/workflows/ci.yml` triggers only on `workflow_dispatch` |

## In Progress

| ID | Task | Started | Assigned To | Notes |
|----|------|---------|-------------|-------|

## Completed

| ID | Task | Started | Finished | Notes |
|----|------|---------|----------|-------|
| T-000 | Initialize monorepo | - | 2026-03-28 | pnpm + Turborepo + Biome + Vitest |
| T-001 | Core: XML UBL 2.1 generation | - | 2026-03-28 | Invoice, POS, CreditNote, DebitNote |
| T-002 | Core: CUFE/CUDE calculation | - | 2026-03-28 | SHA-384 with truncated amounts |
| T-003 | Core: XAdES-EPES digital signing | - | 2026-03-28 | .p12 loading + signXml |
| T-004 | Core: DIAN SOAP transport client | - | 2026-03-28 | All 7 SOAP methods |
| T-005 | Core: Zod validation schemas | - | 2026-03-28 | Full DianDocument schema |
| T-006 | SDK Node: DianKit class | - | 2026-03-28 | Facade over core pipeline |
| T-007 | Core unit tests | - | 2026-03-28 | 10 test files covering all modules |
| T-008 | SDK Node unit tests | - | 2026-03-28 | Full mock-based test suite |
| T-009 | CI pipeline | - | 2026-03-28 | GitHub Actions, Node 20+22 |

## Prioritization Decisions

- Integration tests (T-014) are high priority because core logic is tested in isolation but not validated against DIAN sandbox
- CLI (T-010) is high priority as it is the primary user-facing entry point
- CI trigger fix (T-017) is quick and unblocks automated testing on PRs

## Technical Debt

| Item | Reason for Postponement | Impact if Not Resolved |
|------|------------------------|----------------------|
| CI only triggers on workflow_dispatch | Initial setup phase | PRs are not automatically tested |
| No integration tests | Requires DIAN sandbox credentials | Cannot verify end-to-end correctness |
| Empty examples directory | Focus was on core implementation | New users lack onboarding material |
| Python SDK is a stub | TypeScript SDK prioritized first | Python users have no usable package |
