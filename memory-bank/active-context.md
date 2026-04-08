# Active Context

## Last Session

- **Date**: 2026-04-07
- **Summary**: DIAN integration complete. First invoice accepted (isValid: true, statusCode: 00). Fixed 11+ bugs, all 215 tests passing. SDK updated with auto-populate of corporateRegistration and signingTime. Set de pruebas aceptado by DIAN. Ready for npm publish.

## Current State

### Completed

- [x] Monorepo setup (pnpm + Turborepo + Biome + Vitest + Changesets)
- [x] Core: UBL 2.1 XML generation for Invoice, POS, CreditNote, DebitNote
- [x] Core: XAdES-EPES digital signing with .p12 certificates
- [x] Core: CUFE/CUDE SHA-384 computation
- [x] Core: SoftwareSecurityCode generation
- [x] Core: Zod validation schemas for all document types
- [x] Core: ZIP packaging for DIAN transport
- [x] Core: SOAP response parsing
- [x] Core: WS-Security Signature transport (replaced UsernameToken)
- [x] SDK Node: `DianKit` class with full pipeline
- [x] SDK Node: CreditNote, DebitNote, buyer lookup
- [x] Unit tests: 182 core + 33 sdk-node = 215 passing
- [x] CI workflow (GitHub Actions, Node 20+22, Python 3.12, pnpm audit, CodeQL)
- [x] Security audit: H1 (Zod enforcement), H2 (CI audit), M1-M4 resolved
- [x] JSDoc: Complete documentation across all 28 source files
- [x] Phase 2: CI trigger fix, examples, README update, publishConfig, release workflow
- [x] DIAN sandbox integration: Invoice accepted (isValid: true, statusCode: 00)
- [x] WS-Security Signature C14N fixed and validated
- [x] XAdES-EPES signature accepted by DIAN (ZE02 resolved)
- [x] All XML validation errors resolved (11 bugs fixed)
- [x] Set de pruebas DIAN: ACEPTADO

### Ready for Publish

- [ ] npm publish
- [ ] CLI implementation (stub)
- [ ] AI layer implementation (stub)

## Certificate Status — RESOLVED

- Purchased .p12 from **GarKeM** ($190K COP, ~$47 USD/year) — delivered same day
- DIAN free certificate: private key locked inside platform, cannot export
- Certificate pricing reality (2026): GarKeM $190K, Andes SCD $389K

## DIAN Sandbox Credentials (habilitación)

- **NIT**: 1018506840 (persona natural, cédula, DV: 1)
- **Software ID**: deb9167c-e2f6-4796-9b4d-d102472e2397
- **Software PIN**: 20261
- **Clave técnica**: fc8eac422eba16e22ffd8c6f94b3f40a6e38162c
- **Test Set ID**: bc9d9ca8-6778-477c-b898-65265d1dad1c (ACEPTADO)
- **Prefijo**: SETP
- **Resolución**: 18760000001
- **Rango**: 990000000 — 995000000

## Recent Decisions

| Decision | Justification |
|----------|---------------|
| Truncate (not round) amounts in CUFE | DIAN rejects rounded values with CAD06/FAD06 |
| Use xadesjs for signing | Only JS library supporting XAdES-EPES with policy |
| Pre-compute DIAN policy hash | Avoids downloading PDF on every sign operation |
| String insertion for XAdES signature | DOM re-serialization via XMLSerializer breaks signature (ZE02) |
| Auto-populate corporateRegistration.prefix | Prevents FAB10a rejection, DX improvement |
| Pass issueDate as signingTime | Prevents FAD09e timezone mismatch |
| Must use ONAC-accredited CA cert | Self-signed rejected; DIAN requires accredited CA |

## Next Steps

1. **npm publish** v1.0
2. CLI, AI layer, Python SDK (Phase 3)
