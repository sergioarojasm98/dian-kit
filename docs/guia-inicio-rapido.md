# Guia de inicio rapido

Esta guia le permite enviar su primera factura electronica a la DIAN
usando `@dian-kit/sdk-node` en menos de 30 minutos.

---

## Requisitos previos

| Requisito | Detalle |
|-----------|---------|
| **Node.js** | Version 20 o superior |
| **Certificado .p12** | Emitido por una CA acreditada ante la ONAC (ver [Guia de certificado](guia-certificado.md)) |
| **Registro en la DIAN** | Habilitacion como facturador electronico en el portal de la DIAN |
| **Credenciales de software** | Software ID y PIN generados en el portal de habilitacion |
| **Resolucion de numeracion** | Rango autorizado de numeracion (prefijo, numero inicial y final, fechas) |

---

## 1. Instalacion

```bash
npm install @dian-kit/sdk-node
```

El paquete incluye `@dian-kit/core` como dependencia transitiva.

---

## 2. Configuracion

```typescript
import { readFileSync } from "node:fs";
import { DianKit } from "@dian-kit/sdk-node";

const kit = new DianKit({
  // Certificado PKCS#12 (.p12)
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",

  // Ambiente: "1" = Produccion, "2" = Sandbox (Habilitacion)
  environment: "2",

  // Datos del emisor (su empresa)
  supplier: {
    name: "MI EMPRESA SAS",
    identification: { number: "900123456", type: "31", dv: "7" },
    personType: "1", // "1" = Persona Juridica, "2" = Persona Natural
    fiscalResponsibilities: ["O-13"],
    taxInfo: {
      registrationName: "MI EMPRESA SAS",
      companyId: { number: "900123456", type: "31", dv: "7" },
      taxLevelCode: "O-13",
      taxScheme: { code: "01" }, // 01 = IVA
      address: {
        street: "Calle 100 # 10-20 Oficina 501",
        cityCode: "11001",
        cityName: "Bogota, D.C.",
        departmentCode: "11",
        departmentName: "Bogota",
        countryCode: "CO",
        countryName: "Colombia",
        postalZone: "110111",
      },
    },
    address: {
      street: "Calle 100 # 10-20 Oficina 501",
      cityCode: "11001",
      cityName: "Bogota, D.C.",
      departmentCode: "11",
      departmentName: "Bogota",
      countryCode: "CO",
      countryName: "Colombia",
      postalZone: "110111",
    },
    email: "facturacion@miempresa.com",
  },

  // Software registrado en el portal de habilitacion
  software: {
    id: "deb9167c-e2f6-4796-9b4d-d102472e2397",
    pin: "12345",
    providerNit: "900123456",
    providerName: "MI EMPRESA SAS",
  },

  // Resolucion de numeracion
  numbering: {
    authorizationNumber: "18760000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date(2019, 0, 19),  // 19 de enero de 2019
    endDate: new Date(2030, 0, 19),    // 19 de enero de 2030
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
  },
});
```

---

## 3. Crear una factura

```typescript
const now = new Date();

const baseImponible = 1_500_000;
const iva = baseImponible * 0.19; // 285,000
const total = baseImponible + iva; // 1,785,000

const invoice = await kit.createInvoice({
  id: "SETP990000001",
  issueDate: now,
  issueTime: now,

  customer: {
    name: "COMERCIALIZADORA ABC SAS",
    identification: { number: "800111222", type: "31", dv: "9" },
    personType: "1",
    fiscalResponsibilities: ["R-99-PN"],
    taxInfo: {
      registrationName: "COMERCIALIZADORA ABC SAS",
      companyId: { number: "800111222", type: "31", dv: "9" },
      taxLevelCode: "R-99-PN",
      taxScheme: { code: "01" },
      address: {
        street: "Carrera 7 # 45-10",
        cityCode: "76001",
        cityName: "Cali",
        departmentCode: "76",
        departmentName: "Valle del Cauca",
        countryCode: "CO",
        countryName: "Colombia",
        postalZone: "760001",
      },
    },
    address: {
      street: "Carrera 7 # 45-10",
      cityCode: "76001",
      cityName: "Cali",
      departmentCode: "76",
      departmentName: "Valle del Cauca",
      countryCode: "CO",
      countryName: "Colombia",
      postalZone: "760001",
    },
    email: "contabilidad@abc.com",
  },

  lines: [
    {
      id: "1",
      quantity: 1,
      unitCode: "EA",
      description: "Servicio de consultoria",
      price: 1_500_000,
      lineExtensionAmount: baseImponible,
      taxTotals: [
        {
          taxAmount: iva,
          subtotals: [
            {
              taxableAmount: baseImponible,
              taxAmount: iva,
              percent: 19,
              taxScheme: { code: "01" },
            },
          ],
        },
      ],
    },
  ],

  taxTotals: [
    {
      taxAmount: iva,
      subtotals: [
        {
          taxableAmount: baseImponible,
          taxAmount: iva,
          percent: 19,
          taxScheme: { code: "01" },
        },
      ],
    },
  ],

  legalMonetaryTotal: {
    lineExtensionAmount: baseImponible,
    taxExclusiveAmount: baseImponible,
    taxInclusiveAmount: total,
    allowanceTotalAmount: 0,
    chargeTotalAmount: 0,
    prepaidAmount: 0,
    payableAmount: total,
  },

  paymentMeans: {
    paymentForm: "1",   // 1 = Contado
    paymentMethod: "30", // 30 = Transferencia
  },
});

console.log("Factura creada:", invoice.documentNumber);
console.log("CUFE:", invoice.uuid);
```

---

## 4. Enviar a la DIAN

### Sandbox (set de pruebas)

```typescript
const response = await kit.send(invoice, {
  method: "SendTestSetAsync",
  testSetId: "bc9d9ca8-6778-477c-b898-65265d1dad1c",
});

console.log("Valida:", response.isValid);
console.log("TrackId:", response.trackId);
```

### Produccion

```typescript
const response = await kit.send(invoice);
```

---

## 5. Consultar estado

Para envios asincronos, consulte el estado con el `trackId`:

```typescript
// Esperar a que la DIAN procese (tipicamente 10-30 segundos)
await new Promise((r) => setTimeout(r, 15000));

const status = await kit.getStatusZip(response.trackId);
console.log("Valida:", status.isValid);
console.log("Codigo:", status.statusCode);
console.log("Descripcion:", status.statusDescription);
```

Un `statusCode` de `"00"` indica que la factura fue aceptada.

---

## Notas importantes

### Fechas: usar constructor, no strings

Use **siempre** el constructor `new Date(year, month - 1, day)` para las fechas
de la resolucion de numeracion. **Nunca** use `new Date("YYYY-MM-DD")`.

La forma con string crea la fecha en UTC. Como Colombia esta en UTC-5, la fecha
puede retroceder un dia al convertirla a hora local, provocando rechazo por la
DIAN (errores FAB07b/FAB08b).

```typescript
// Correcto
new Date(2019, 0, 19)  // 19 de enero de 2019, hora local

// Incorrecto — puede generar 18 de enero en Colombia
new Date("2019-01-19")
```

### Certificado .p12

El certificado debe ser de una CA acreditada ante la ONAC. El certificado
gratuito de la DIAN **no funciona** fuera de su plataforma porque la llave
privada no es exportable. Consulte la [guia de certificado](guia-certificado.md)
para opciones de compra.

### Errores comunes

Si la DIAN rechaza su factura, consulte la [referencia de errores](errores-dian.md)
con las causas y soluciones de los errores mas frecuentes.

---

## Recursos

- [Documentacion tecnica de la DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/)
- [Ejemplo completo](../examples/basic-invoice.ts)
- [Guia de certificado](guia-certificado.md)
- [Referencia de errores DIAN](errores-dian.md)
