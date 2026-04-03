# Active Context

## Last Session

- **Date**: 2026-04-02
- **Summary**: Security audit complete, Phase 2 (npm publish prep) done, discovered CRITICAL architecture issue — SOAP transport uses UsernameToken but DIAN requires WS-Security Signature with certificate. Transport module must be rewritten.

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
- [x] SDK Node: `DianKit` class with full pipeline
- [x] SDK Node: CreditNote, DebitNote, buyer lookup
- [x] Unit tests: 170 core + 31 sdk-node = 201 passing
- [x] CI workflow (GitHub Actions, Node 20+22, Python 3.12, pnpm audit, CodeQL)
- [x] Security audit: H1 (Zod enforcement), H2 (CI audit), M1-M4 resolved
- [x] JSDoc: Complete documentation across all 28 source files
- [x] Phase 2: CI trigger fix, examples, README update, publishConfig, release workflow

### BLOCKED — Transport Rewrite Required

- [ ] **SOAP transport uses WRONG authentication** — UsernameToken must be replaced with WS-Security Signature
- [ ] Integration test against DIAN sandbox (blocked by transport rewrite)
- [ ] npm publish (blocked by DIAN validation)

### In Progress

- [ ] CLI implementation (stub)
- [ ] AI layer implementation (stub)

## CRITICAL FINDING: SOAP Authentication Architecture

**Current (WRONG):** dian-kit sends UsernameToken (NIT + password) in SOAP header.
```xml
<wsse:UsernameToken>
  <wsse:Username>NIT</wsse:Username>
  <wsse:Password>password</wsse:Password>
</wsse:UsernameToken>
```

**Required (CORRECT):** DIAN expects WS-Security Signature — the SOAP envelope itself must be signed with the .p12 certificate. NO UsernameToken at all.
```xml
<wsse:Security>
  <wsu:Timestamp wsu:Id="TS-xxx">
    <wsu:Created>2026-04-02T12:00:00Z</wsu:Created>
    <wsu:Expires>2026-04-02T12:16:40Z</wsu:Expires>
  </wsu:Timestamp>
  <wsse:BinarySecurityToken>...X.509 cert base64...</wsse:BinarySecurityToken>
  <ds:Signature>
    <ds:SignedInfo>...RSA-SHA256 over wsa:To element...</ds:SignedInfo>
    <ds:SignatureValue>...</ds:SignatureValue>
    <ds:KeyInfo>...SecurityTokenReference to BinarySecurityToken...</ds:KeyInfo>
  </ds:Signature>
</wsse:Security>
<wsa:Action>http://wcf.dian.colombia/IWcfDianCustomerServices/METHOD</wsa:Action>
<wsa:To wsu:Id="ID-xxx">https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc</wsa:To>
```

**Key details (from Stenfrank/soap-dian PHP reference):**
- Authentication: purely certificate-based, NO UsernameToken
- Signed element: only `wsa:To` (the endpoint URI)
- Signature algorithm: RSA-SHA256
- Digest algorithm: SHA-256
- Canonicalization: Exclusive C14N
- Timestamp: Created + Expires (Created + 60000ms TTL), GMT ISO 8601
- WS-Addressing: `wsa:Action` + `wsa:To` headers required
- BinarySecurityToken: X.509v3 cert extracted from .p12, Base64-encoded
- KeyInfo: SecurityTokenReference pointing to BinarySecurityToken by wsu:Id

**Reference implementations:**
- PHP: https://github.com/Stenfrank/soap-dian (most complete)
- Python: https://github.com/FuriosoJack/pyWSSE-Dian2
- VB.NET example: https://www.example-code.com/vbnet/wcf_dian_colombia_soap_xml_signature.asp

## Files That Need Rewriting

| File | Change |
|------|--------|
| `packages/core/src/transport/soap-builder.ts` | Replace UsernameToken with WS-Security Signature + WS-Addressing |
| `packages/core/src/transport/http-client.ts` | May need adjustments for signed envelope |
| `packages/core/src/transport/types.ts` | Replace `DianCredentials {nit, password}` with certificate-based auth |
| `packages/core/src/transport/dian-client.ts` | Update all methods to pass certificate instead of credentials |
| `packages/sdk-node/src/dian-kit.ts` | Update to use certificate for SOAP auth |
| `packages/sdk-node/src/types.ts` | Update DianKitConfig |
| Tests | All transport tests need updating |

## Certificate Status

- **Self-signed certificate REJECTED** by DIAN sandbox (HTTP 500, s:Client fault — no reason given)
- **DIAN free certificate in progress**: switched to "Solución Gratuita" to request free cert, then will switch back to "Software propio" for testing
- Certificate is tied to NIT, not to operation mode — should work after switching back
- After switching back, Software ID / Test Set ID may change — re-register dian-kit and note new values

## Certificate Options (cheapest to most expensive)

1. **DIAN free certificate** — Switch to Solución Gratuita → get cert → switch back. IN PROGRESS.
2. **Andes SCD** — ~$80K COP (~$20 USD)/year
3. **GSE** — ~$130K COP (~$33 USD)/year
4. **Certicámara** — ~$180K COP (~$45 USD)/year

## DIAN Sandbox Credentials (habilitación)

- **NIT**: 1018506840 (persona natural, cédula)
- **Software ID**: 829e7513-5839-467a-9786-191d4b57d652
- **Software PIN**: 20261
- **Clave técnica**: fc8eac422eba16e22ffd8c6f94b3f40a6e38162c
- **Test Set ID**: da4d80ff-1a66-41fb-99fb-648067ba93cb
- **Prefijo**: SETP
- **Resolución**: 18760000001
- **Rango**: 990000000 — 995000000
- **Endpoint**: https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc

## Recent Decisions

| Decision | Justification |
|----------|---------------|
| Truncate (not round) amounts in CUFE | DIAN rejects rounded values with CAD06/FAD06 |
| Use xadesjs for signing | Only JS library supporting XAdES-EPES with policy |
| Pre-compute DIAN policy hash | Avoids downloading PDF on every sign operation |
| Spanish error messages | Target audience is Colombian developers |
| Endpoint allowlist over cert pinning | Simpler, less brittle, prevents misconfiguration |
| WS-Security Signature over UsernameToken | DIAN requires certificate-based SOAP auth (discovered 2026-04-02) |

## Next Steps

1. **Get .p12 certificate** from DIAN free solution (in progress, up to 3 business days)
2. **Switch back to "Software propio"**, re-register dian-kit, note new Software ID / Test Set ID
3. **Run integration tests** against DIAN sandbox with real certificate
4. **Publish to npm** once DIAN validates
5. CLI, AI layer, Python SDK (Phase 3)
