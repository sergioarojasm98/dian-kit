# Active Context

## Last Session

- **Date**: 2026-04-01
- **Summary**: Security audit with ruflo — 9 findings (0C, 2H, 4M, 3L), resolved all H and M. LOW items tracked as backlog.

## Current State

### Completed

- [x] Monorepo setup (pnpm + Turborepo + Biome + Vitest + Changesets)
- [x] Core: UBL 2.1 XML generation for Invoice, POS, CreditNote, DebitNote
- [x] Core: XAdES-EPES digital signing with .p12 certificates
- [x] Core: CUFE/CUDE SHA-384 computation
- [x] Core: SoftwareSecurityCode generation
- [x] Core: DIAN SOAP/WCF transport client (all 7 methods)
- [x] Core: Zod validation schemas for all document types
- [x] Core: ZIP packaging for DIAN transport
- [x] Core: SOAP response parsing
- [x] SDK Node: `DianKit` class with full pipeline
- [x] SDK Node: CreditNote, DebitNote, buyer lookup
- [x] Unit tests: 170 core + 31 sdk-node = 201 passing
- [x] CI workflow (GitHub Actions, Node 20+22, Python 3.12)
- [x] Security: Zod validation enforced at SDK entry point (H1)
- [x] Security: pnpm audit in CI pipeline (H2)
- [x] Security: DIAN endpoint hostname allowlist (M1)
- [x] Security: CodeQL SAST workflow (M2)
- [x] Security: rawResponse truncation in errors (M3)
- [x] Security: Integration test scaffold for DIAN sandbox (M4)

### In Progress

- [ ] CLI implementation (package exists, only stub `console.log`)
- [ ] AI layer implementation (package exists, only exports VERSION)

### Blocked

- [ ] Python SDK (stub only)
- [ ] WhatsApp plugin (package.json only)
- [ ] Framework plugins (Express, FastAPI, WooCommerce, Shopify - not started)

## Recent Decisions

| Decision | Justification |
|----------|---------------|
| Truncate (not round) amounts in CUFE | DIAN rejects rounded values with CAD06/FAD06 |
| Use xadesjs for signing | Only JS library supporting XAdES-EPES with policy |
| Pre-compute DIAN policy hash | Avoids downloading PDF on every sign operation |
| Spanish error messages | Target audience is Colombian developers |
| Endpoint allowlist over cert pinning | Simpler, less brittle, prevents misconfiguration |
| rawResponse truncated to 1000 chars | Prevents sensitive data in user logs |
| Integration tests skip without credentials | Allows scaffold to exist without blocking CI |

## Next Steps

1. Implement CLI interactive commands
2. Implement AI layer (natural language to invoice)
3. Build Python SDK with core feature parity
4. Run integration tests with real DIAN sandbox credentials
5. Write usage examples
6. Add JSDoc comments to public API surface
7. Publish packages to npm and PyPI
