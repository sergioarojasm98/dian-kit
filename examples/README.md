# dian-kit Examples

Practical, runnable examples for the [dian-kit](https://github.com/sergioarojasm98/dian-kit) SDK.

## Prerequisites

### 1. DIAN Sandbox Credentials

To test electronic invoicing you need a **DIAN sandbox (habilitacion)** account:

1. Go to [DIAN Muisca Portal](https://catalogo-vpfe-hab.dian.gov.co/)
2. Register as a technology provider or use the test company provided by DIAN
3. Note the following from the portal:
   - **Software ID** and **Software PIN** (assigned when you register your software)
   - **NIT** and **password** (WS-Security credentials for the SOAP API)
   - **Test Set ID** (for `SendTestSetAsync` during qualification)

### 2. Test Certificate (.p12)

You need a PKCS#12 (`.p12`) digital certificate:

- For sandbox testing, DIAN provides test certificates in their technical documentation
- For production, obtain a certificate from a trusted Colombian CA (e.g., Certicamara, GSE, Andes SCD)
- The certificate must be registered in the DIAN portal under your software configuration

Place the `.p12` file in this directory (it is git-ignored) and update the file path in the examples.

### 3. Numbering Resolution

Each example requires a numbering resolution (`resolucion de numeracion`):

- In sandbox, DIAN assigns test numbering ranges when you register your software
- The resolution includes: authorization number, prefix, number range, validity dates, and technical key

## Running the Examples

```bash
# Install dependencies (from the repo root)
pnpm install
pnpm build

# Run an example with tsx (TypeScript execution)
npx tsx examples/basic-invoice.ts
npx tsx examples/credit-note.ts
npx tsx examples/pos-document.ts
npx tsx examples/lookup-and-validate.ts
```

> **Note:** Replace all placeholder values (`your-certificate-password`, `your-software-id`, etc.) with your actual DIAN sandbox credentials before running.

## Examples

| File | Description |
|------|-------------|
| [`basic-invoice.ts`](./basic-invoice.ts) | Standard invoice (type 01) with 2 line items and IVA 19% |
| [`credit-note.ts`](./credit-note.ts) | Credit note (type 91) for a partial return referencing an original invoice |
| [`pos-document.ts`](./pos-document.ts) | POS equivalent document (type 20) with CONSUMIDOR_FINAL |
| [`lookup-and-validate.ts`](./lookup-and-validate.ts) | Utility operations: buyer lookup, numbering ranges, status checks |

## DIAN Documentation

- [DIAN Technical Annex (Anexo Tecnico)](https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta.pdf) -- Full specification for electronic invoicing
- [DIAN Sandbox Portal (Habilitacion)](https://catalogo-vpfe-hab.dian.gov.co/) -- Test environment registration
- [DIAN Production Portal](https://catalogo-vpfe.dian.gov.co/) -- Production environment
- [UBL 2.1 Standard](http://docs.oasis-open.org/ubl/UBL-2.1.html) -- XML schema reference

## Important Notes

- All examples use `environment: '2'` (sandbox). Change to `'1'` for production.
- Never commit real certificates or credentials to version control.
- The CUFE/CUDE values in examples are placeholders. Use real values from your documents.
- Tax calculations must be exact -- DIAN validates that line-level and document-level totals are consistent.
