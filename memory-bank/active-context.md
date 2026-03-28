# Active Context

## Last Session

- **Date**: 2026-03-28
- **Summary**: Memory Bank populated with real project data after thorough codebase analysis

## Current State

### Completed

- [x] Monorepo setup (pnpm + Turborepo + Biome + Vitest + Changesets)
- [x] Core: UBL 2.1 XML generation for Invoice, POS, CreditNote, DebitNote
- [x] Core: XAdES-EPES digital signing with .p12 certificates
- [x] Core: CUFE/CUDE SHA-384 computation
- [x] Core: SoftwareSecurityCode generation
- [x] Core: DIAN SOAP/WCF transport client (SendBillSync, SendBillAsync, SendTestSetAsync, GetStatus, GetStatusZip, GetNumberingRange, GetAcquirer)
- [x] Core: Zod validation schemas for all document types
- [x] Core: ZIP packaging for DIAN transport
- [x] Core: SOAP response parsing (send, status, numbering range, acquirer)
- [x] SDK Node: `DianKit` class with full pipeline (create + sign + send)
- [x] SDK Node: CreditNote and DebitNote support
- [x] SDK Node: Buyer lookup (`lookupBuyer`)
- [x] Unit tests for core (cufe, xml-builder, signer, certificate, amount, schemas, transport, soap-builder, response-parser, zipper)
- [x] Unit tests for sdk-node (DianKit class with mocked core)
- [x] CI workflow (GitHub Actions, Node 20+22, Python 3.12)

### In Progress

- [ ] CLI implementation (package exists, only stub `console.log`)
- [ ] AI layer implementation (package exists, only exports VERSION)

### Blocked

- [ ] Python SDK (stub `__init__.py` only, no implementation yet)
- [ ] WhatsApp plugin (package.json only, no source)
- [ ] Framework plugins (Express, FastAPI, WooCommerce, Shopify - not started)

## Recent Decisions

| Decision | Justification |
|----------|---------------|
| Truncate (not round) amounts in CUFE | DIAN rejects rounded values with CAD06/FAD06 |
| Use xadesjs for signing | Only JS library supporting XAdES-EPES with policy |
| Pre-compute DIAN policy hash | Avoids downloading PDF on every sign operation |
| Spanish error messages | Target audience is Colombian developers |
| CONSUMIDOR_FINAL constant | POS documents need a well-known placeholder buyer |

## Next Steps

1. Implement CLI interactive commands (init, invoice create/send, pos create, validate, explain)
2. Implement AI layer (natural language to invoice, error explainer)
3. Build Python SDK with core feature parity
4. Add integration tests against DIAN sandbox
5. Write usage examples in `examples/` directories
6. Publish packages to npm and PyPI
