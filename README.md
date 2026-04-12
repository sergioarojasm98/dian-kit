# dian-kit

**El primer SDK open-source de facturacion electronica DIAN para TypeScript/Node.js.**

[![npm @dian-kit/core](https://img.shields.io/npm/v/@dian-kit/core?label=%40dian-kit%2Fcore&color=cb3837)](https://www.npmjs.com/package/@dian-kit/core)
[![npm @dian-kit/sdk-node](https://img.shields.io/npm/v/@dian-kit/sdk-node?label=%40dian-kit%2Fsdk-node&color=cb3837)](https://www.npmjs.com/package/@dian-kit/sdk-node)
[![CI](https://github.com/sergioarojasm98/dian-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/sergioarojasm98/dian-kit/actions)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

---

## Que es dian-kit?

dian-kit es el primer SDK open-source para facturacion electronica ante la DIAN (Direccion de Impuestos y Aduanas Nacionales de Colombia), escrito en TypeScript con soporte completo de tipos.

Cubre el pipeline completo de facturacion electronica:

**XML UBL 2.1** -- **Firma XAdES-EPES** -- **CUFE/CUDE** -- **WS-Security SOAP** -- **DIAN**

Ya fue validado contra el sandbox de la DIAN: factura aceptada con `isValid: true`, `statusCode: 00`.

---

## Caracteristicas

- **Generacion XML UBL 2.1** -- Factura Electronica, Documento POS, Nota Credito, Nota Debito
- **Firma digital XAdES-EPES** -- Con certificados .p12 de cualquier CA acreditada por ONAC
- **Calculo CUFE/CUDE** -- SHA-384 con truncamiento de montos segun especificacion DIAN
- **Transporte SOAP con WS-Security Signature** -- Los 7 metodos del web service DIAN
- **Validacion con Zod** -- Esquemas tipados para todos los tipos de documento
- **SDK de alto nivel** -- Clase `DianKit` que orquesta todo el pipeline en una sola llamada
- **Dual ESM/CJS** -- Funciona con `import` y `require`
- **215 tests** -- Cobertura completa del core y el SDK
- **Zero dependencias externas de red** -- Toda comunicacion es directamente con la DIAN, sin intermediarios

---

## Instalacion

```bash
npm install @dian-kit/core @dian-kit/sdk-node
```

O con pnpm:

```bash
pnpm add @dian-kit/core @dian-kit/sdk-node
```

---

## Inicio Rapido

```typescript
import { readFileSync } from "node:fs";
import { DianKit } from "@dian-kit/sdk-node";

// 1. Configurar el SDK
const kit = new DianKit({
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",
  environment: "2", // "1" = Produccion, "2" = Sandbox
  supplier: {
    name: "YOUR COMPANY NAME",
    identification: { number: "900123456", type: "31", dv: "7" },
    personType: "1",
    fiscalResponsibilities: ["O-13"],
    taxInfo: { /* ... */ },
    address: { /* ... */ },
    email: "facturacion@yourcompany.com",
  },
  software: {
    id: "your-software-id",
    pin: "your-software-pin",
    providerNit: "900123456",
    providerName: "YOUR COMPANY NAME",
  },
  numbering: {
    authorizationNumber: "18760000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date(2019, 0, 19),
    endDate: new Date(2030, 0, 19),
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
  },
});

// 2. Crear y enviar una factura
const invoice = await kit.createInvoice({
  id: "SETP990000001",
  issueDate: new Date(),
  issueTime: new Date(),
  customer: {
    name: "COMERCIALIZADORA ABC SAS",
    identification: { number: "800111222", type: "31", dv: "9" },
    personType: "1",
    fiscalResponsibilities: ["R-99-PN"],
    taxInfo: { /* ... */ },
    address: { /* ... */ },
    email: "contabilidad@abc.com",
  },
  lines: [
    {
      id: "1",
      quantity: 10,
      unitCode: "EA",
      description: "Servicio de consultoria",
      price: 150_000,
      lineExtensionAmount: 1_500_000,
      taxTotals: [{
        taxAmount: 285_000,
        subtotals: [{
          taxableAmount: 1_500_000,
          taxAmount: 285_000,
          percent: 19,
          taxScheme: { code: "01" }, // IVA
        }],
      }],
    },
  ],
  taxTotals: [{
    taxAmount: 285_000,
    subtotals: [{
      taxableAmount: 1_500_000,
      taxAmount: 285_000,
      percent: 19,
      taxScheme: { code: "01" },
    }],
  }],
  legalMonetaryTotal: {
    lineExtensionAmount: 1_500_000,
    taxExclusiveAmount: 1_500_000,
    taxInclusiveAmount: 1_785_000,
    allowanceTotalAmount: 0,
    chargeTotalAmount: 0,
    prepaidAmount: 0,
    payableAmount: 1_785_000,
  },
  paymentMeans: { paymentForm: "1", paymentMethod: "30" },
});

// 3. Enviar a la DIAN
const response = await kit.send(invoice);
console.log(response.isValid);        // true
console.log(response.statusCode);     // "00"
console.log(response.trackId);        // UUID para consultar estado
```

Para el ejemplo completo con multiples items, consulta [`examples/basic-invoice.ts`](./examples/basic-invoice.ts).

---

## Documentacion

- [Ejemplo completo](./examples/basic-invoice.ts) -- Factura con dos items, envio y consulta de estado
- [Guia de inicio rapido](./docs/guia-inicio-rapido.md) -- Paso a paso desde cero
- [Guia de certificado .p12](./docs/guia-certificado.md) -- Como obtener tu certificado digital
- [Errores comunes DIAN](./docs/errores-dian.md) -- 10+ errores con soluciones
- [Referencia tecnica DIAN](./docs/technical-reference/) -- Especificaciones oficiales

### Recursos externos

- [Documentacion tecnica DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/) -- Anexos tecnicos, esquemas XSD, catalogo de errores

---

## Paquetes

| Paquete | Descripcion | Version |
|---------|-------------|---------|
| [`@dian-kit/core`](./packages/core) | Motor principal: XML UBL 2.1, firma digital XAdES-EPES, CUFE/CUDE, transporte SOAP | [![npm](https://img.shields.io/npm/v/@dian-kit/core?color=cb3837)](https://www.npmjs.com/package/@dian-kit/core) |
| [`@dian-kit/sdk-node`](./packages/sdk-node) | SDK de alto nivel: clase `DianKit` que orquesta el pipeline completo con type safety y validacion Zod | [![npm](https://img.shields.io/npm/v/@dian-kit/sdk-node?color=cb3837)](https://www.npmjs.com/package/@dian-kit/sdk-node) |

---

## Requisitos Previos

- **Node.js >= 20** -- Se requieren APIs nativas (`fetch`, `crypto.webcrypto`)
- **Certificado digital .p12** -- Emitido por una CA acreditada por ONAC (GarKeM, Andes SCD, Certicamara, etc.)
- **Registro ante la DIAN** -- Software ID, PIN y resolucion de numeracion activa. Se configuran en el [portal de habilitacion de la DIAN](https://catalogo-vpfe-hab.dian.gov.co/)

---

## Documentos Soportados

| Tipo | Codigo DIAN | Hash |
|------|-------------|------|
| Factura Electronica de Venta | 01 | CUFE |
| Documento Equivalente POS | 102 | CUDE |
| Nota Credito | 91 | CUDE |
| Nota Debito | 92 | CUDE |

---

## Seguridad

- El certificado .p12 y las claves privadas **nunca** salen de tu maquina
- Las claves privadas **nunca** aparecen en logs ni en mensajes de error
- **dian-kit no envia datos a servidores propios** -- toda comunicacion es directamente con la DIAN
- Validacion de todos los inputs con Zod antes de generar XML o contactar la DIAN

---

## English

### What is dian-kit?

dian-kit is the first open-source TypeScript/Node.js SDK for Colombian electronic invoicing (DIAN -- Colombia's tax authority). It covers the full pipeline: **UBL 2.1 XML generation**, **XAdES-EPES digital signing**, **CUFE/CUDE hash computation**, and **WS-Security SOAP transport** to the DIAN web services.

Already validated against the DIAN sandbox: invoice accepted with `isValid: true`, `statusCode: 00`.

### Features

- UBL 2.1 XML generation for Invoice, POS, Credit Note, and Debit Note
- XAdES-EPES digital signing with .p12 certificates
- CUFE/CUDE SHA-384 computation per DIAN specification
- WS-Security Signature SOAP transport (all 7 DIAN web service methods)
- Full Zod validation schemas with TypeScript type safety
- High-level `DianKit` class orchestrating the entire pipeline
- Dual ESM/CJS output -- works with `import` and `require`
- 215 tests covering core engine and SDK

### Install

```bash
npm install @dian-kit/core @dian-kit/sdk-node
```

### Quick Start

```typescript
import { readFileSync } from "node:fs";
import { DianKit } from "@dian-kit/sdk-node";

const kit = new DianKit({
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-password",
  environment: "2", // "1" = Production, "2" = Sandbox
  supplier: { /* your company data */ },
  software: { id: "uuid", pin: "pin", providerNit: "900123456", providerName: "Your Co" },
  numbering: { /* DIAN numbering authorization */ },
});

const invoice = await kit.createInvoice({
  id: "SETP990000001",
  issueDate: new Date(),
  issueTime: new Date(),
  customer: { /* buyer data */ },
  lines: [{ id: "1", quantity: 1, description: "Service", price: 500_000,
    lineExtensionAmount: 500_000,
    taxTotals: [{ taxAmount: 95_000, subtotals: [{ taxableAmount: 500_000,
      taxAmount: 95_000, percent: 19, taxScheme: { code: "01" } }] }] }],
  taxTotals: [{ taxAmount: 95_000, subtotals: [{ taxableAmount: 500_000,
    taxAmount: 95_000, percent: 19, taxScheme: { code: "01" } }] }],
  legalMonetaryTotal: { lineExtensionAmount: 500_000, taxExclusiveAmount: 500_000,
    taxInclusiveAmount: 595_000, allowanceTotalAmount: 0, chargeTotalAmount: 0,
    prepaidAmount: 0, payableAmount: 595_000 },
  paymentMeans: { paymentForm: "1", paymentMethod: "30" },
});

const response = await kit.send(invoice);
console.log(response.isValid); // true
```

See [`examples/basic-invoice.ts`](./examples/basic-invoice.ts) for the full example with multiple line items.

### Prerequisites

- **Node.js >= 20**
- **.p12 digital certificate** from an ONAC-accredited CA
- **DIAN registration** -- Software ID, PIN, and active numbering resolution

### Documentation

- [DIAN Technical Documentation](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/)
- [Technical Reference](./docs/technical-reference/)

### Packages

| Package | Description |
|---------|-------------|
| `@dian-kit/core` | Core engine: UBL 2.1 XML, XAdES-EPES signing, CUFE/CUDE, SOAP transport |
| `@dian-kit/sdk-node` | High-level SDK: `DianKit` class with full type safety and Zod validation |

---

## Licencia

[MIT](./LICENSE) -- Usa dian-kit libremente en proyectos personales y comerciales.

---

## Contribuir

Las contribuciones son bienvenidas. Para comenzar:

```bash
git clone https://github.com/sergioarojasm98/dian-kit.git
cd dian-kit
pnpm install
pnpm build
pnpm test    # 215 tests
```

El proyecto usa [Conventional Commits](https://www.conventionalcommits.org/), [Biome](https://biomejs.dev/) para linting/formatting, y [Vitest](https://vitest.dev/) para testing.
