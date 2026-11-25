# @dian-kit/core

## 1.0.2

### Patch Changes

- 8914fe4: Runtime dependency floors past their security advisories: node-forge ^1.4.4 (RSA PKCS#1 v1.5 signature forgery,
  PKCS#12 MAC forgery, ASN.1/PEM denial of service), @xmldom/xmldom ^0.8.15 (XML injection through serialization,
  quadratic parsing) and zod ^4.6.7 (memory exhaustion). Installing this version can no longer resolve a vulnerable
  one. No API change.

## 1.0.1

### Patch Changes

- Initial public release to npm

## 1.0.0

### Major Changes

- 9d3b492: First stable release — DIAN sandbox integration validated

  - Complete UBL 2.1 XML generation (Invoice, CreditNote, DebitNote, POS)
  - XAdES-EPES digital signing with .p12 certificates
  - CUFE/CUDE SHA-384 computation
  - WS-Security Signature SOAP transport
  - Zod validation schemas for all document types
  - High-level DianKit SDK with full pipeline orchestration
