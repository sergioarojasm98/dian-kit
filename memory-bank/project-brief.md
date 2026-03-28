# Project Brief

## Project Name

dian-kit

## Description

Open-source SDK for Colombian electronic invoicing (DIAN). Provides a complete pipeline from document creation to DIAN submission: UBL 2.1 XML generation, CUFE/CUDE calculation, XAdES-EPES digital signing, and SOAP/WCF API communication. Targets TypeScript/Node.js as the primary runtime, with a Python SDK stub and planned AI/CLI layers.

## Objectives

1. Provide a zero-cost, open-source alternative to paid SaaS invoicing APIs (Factus, MATIAS)
2. Let businesses use their own DIAN credentials and certificates without third-party intermediaries
3. Support the full DIAN document lifecycle: Invoice, POS, Credit Note, Debit Note

## Scope

### Included

- UBL 2.1 XML generation for all supported document types
- XAdES-EPES digital signing with .p12 certificates
- CUFE (invoice) and CUDE (equivalent document) hash computation
- DIAN SOAP API client (send, status, numbering range, acquirer lookup)
- High-level SDK (`@dian-kit/sdk-node`) wrapping the full pipeline
- Zod validation schemas for all document structures
- CLI package (stub)
- AI layer package (stub)
- WhatsApp plugin package (stub)
- Python SDK package (stub)

### Excluded

- Nomina Electronica (payroll) - planned future
- LATAM expansion (Mexico CFDI, Chile SII, Peru SUNAT) - planned future
- Framework plugins (Express, FastAPI, WooCommerce, Shopify) - planned future

## Users / Audience

- Colombian developers building invoicing features
- SMBs needing electronic invoicing without SaaS costs
- Technology providers integrating DIAN compliance into their platforms

## Success Criteria

- [x] Monorepo setup with pnpm + Turborepo
- [x] Core XML UBL 2.1 generation (Invoice, POS, Credit Note, Debit Note)
- [x] XAdES-EPES digital signing
- [x] CUFE/CUDE computation
- [x] DIAN SOAP API client (sandbox + production)
- [x] High-level Node.js SDK with full type safety
- [ ] CLI interactive tool
- [ ] AI layer (BYOK)
- [ ] WhatsApp plugin
- [ ] Python SDK with feature parity
- [ ] npm publish of all packages

## Links and References

| Resource | URL |
|----------|-----|
| Repository | https://github.com/sergioarojasm98/dian-kit |
| npm (core) | https://www.npmjs.com/package/@dian-kit/core |
| PyPI | https://pypi.org/project/dian-kit/ |
