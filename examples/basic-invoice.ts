/**
 * Basic Invoice Example — dian-kit v1.0
 *
 * Creates a standard electronic invoice (Factura Electrónica de Venta, type 01)
 * with two line items, sends it to the DIAN sandbox, and checks its status.
 *
 * Prerequisites:
 * - A .p12 certificate from an ONAC-accredited CA (GarKeM, Andes SCD, Certicámara, etc.)
 * - DIAN sandbox credentials (Software ID, PIN, Test Set ID)
 * - An active numbering resolution
 *
 * How to run:
 *   npm install @dian-kit/sdk-node
 *   npx tsx examples/basic-invoice.ts
 *
 * DIAN technical documentation:
 *   https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/
 */

import { readFileSync } from "node:fs";
import { DianKit } from "@dian-kit/sdk-node";

// =============================================================================
// Step 1: Configure the SDK
// =============================================================================

const kit = new DianKit({
  // PKCS#12 certificate (.p12) — purchased from an ONAC-accredited CA
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",

  // Environment: "1" = Production, "2" = Sandbox (Habilitación)
  environment: "2",

  // Your company/person information (supplier/emisor)
  supplier: {
    name: "YOUR COMPANY NAME",
    identification: { number: "900123456", type: "31", dv: "7" },
    personType: "1", // "1" = Persona Jurídica, "2" = Persona Natural
    fiscalResponsibilities: ["O-13"],
    // Required for Persona Natural (personType "2"):
    // person: { firstName: "JUAN", familyName: "PÉREZ" },
    taxInfo: {
      registrationName: "YOUR COMPANY NAME",
      companyId: { number: "900123456", type: "31", dv: "7" },
      taxLevelCode: "O-13",
      taxScheme: { code: "01" }, // 01 = IVA
      address: {
        street: "Calle 100 # 10-20 Oficina 501",
        cityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá",
        countryCode: "CO",
        countryName: "Colombia",
        postalZone: "110111",
      },
    },
    address: {
      street: "Calle 100 # 10-20 Oficina 501",
      cityCode: "11001",
      cityName: "Bogotá, D.C.",
      departmentCode: "11",
      departmentName: "Bogotá",
      countryCode: "CO",
      countryName: "Colombia",
      postalZone: "110111",
    },
    email: "facturacion@yourcompany.com",
  },

  // Software registered in DIAN's habilitación portal
  software: {
    id: "your-software-id-uuid",
    pin: "your-software-pin",
    providerNit: "900123456",
    providerName: "YOUR COMPANY NAME",
  },

  // Numbering resolution from DIAN
  // IMPORTANT: Use new Date(year, month-1, day) — NOT new Date("YYYY-MM-DD")
  // The string form creates UTC dates which shift in Colombia timezone (UTC-5)
  numbering: {
    authorizationNumber: "18760000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date(2019, 0, 19), // January 19, 2019
    endDate: new Date(2030, 0, 19), // January 19, 2030
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
  },
});

console.log("✓ DianKit initialized");

// =============================================================================
// Step 2: Create an invoice
// =============================================================================

async function main() {
  const now = new Date();

  // Line 1: 10 hours of consulting at $150,000 COP/hour
  const line1Base = 10 * 150_000; // 1,500,000
  const line1Tax = line1Base * 0.19; // 285,000

  // Line 2: 1 software license at $2,500,000 COP
  const line2Base = 2_500_000;
  const line2Tax = line2Base * 0.19; // 475,000

  const subtotal = line1Base + line2Base; // 4,000,000
  const totalTax = line1Tax + line2Tax; // 760,000
  const total = subtotal + totalTax; // 4,760,000

  const invoice = await kit.createInvoice({
    id: "SETP990000001", // Must match prefix + number within your authorized range
    issueDate: now,
    issueTime: now,

    // Customer (buyer)
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

    // Line items
    lines: [
      {
        id: "1",
        quantity: 10,
        unitCode: "EA",
        description: "Servicio de consultoría en transformación digital",
        price: 150_000,
        lineExtensionAmount: line1Base,
        taxTotals: [
          {
            taxAmount: line1Tax,
            subtotals: [
              {
                taxableAmount: line1Base,
                taxAmount: line1Tax,
                percent: 19,
                taxScheme: { code: "01" }, // IVA
              },
            ],
          },
        ],
      },
      {
        id: "2",
        quantity: 1,
        unitCode: "EA",
        description: "Licencia anual de software ERP en la nube",
        price: 2_500_000,
        lineExtensionAmount: line2Base,
        taxTotals: [
          {
            taxAmount: line2Tax,
            subtotals: [
              {
                taxableAmount: line2Base,
                taxAmount: line2Tax,
                percent: 19,
                taxScheme: { code: "01" },
              },
            ],
          },
        ],
      },
    ],

    // Aggregated tax totals
    taxTotals: [
      {
        taxAmount: totalTax,
        subtotals: [
          {
            taxableAmount: subtotal,
            taxAmount: totalTax,
            percent: 19,
            taxScheme: { code: "01" },
          },
        ],
      },
    ],

    // Monetary totals
    legalMonetaryTotal: {
      lineExtensionAmount: subtotal,
      taxExclusiveAmount: subtotal,
      taxInclusiveAmount: total,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: total,
    },

    // Payment: cash via wire transfer
    paymentMeans: {
      paymentForm: "1", // 1 = Contado, 2 = Crédito
      paymentMethod: "30", // 30 = Transferencia
    },
  });

  console.log("✓ Invoice created");
  console.log("  Document:", invoice.documentNumber);
  console.log("  CUFE:", invoice.uuid);

  // ===========================================================================
  // Step 3: Send to DIAN
  // ===========================================================================

  // For sandbox qualification (set de pruebas):
  const response = await kit.send(invoice, {
    method: "SendTestSetAsync",
    testSetId: "your-test-set-id",
  });

  // For production:
  // const response = await kit.send(invoice);

  console.log("\n✓ Sent to DIAN");
  console.log("  Valid:", response.isValid);
  console.log("  Status:", response.statusDescription);
  console.log("  TrackId:", response.trackId);

  if (!response.isValid && response.errors?.length) {
    console.log("  Errors:");
    for (const e of response.errors) {
      console.log(`    - ${e.description}`);
    }
  }

  // ===========================================================================
  // Step 4: Check status (optional — for async sends)
  // ===========================================================================

  if (response.trackId) {
    // Wait for DIAN to process
    await new Promise((r) => setTimeout(r, 15000));

    const status = await kit.getStatusZip(response.trackId);
    console.log("\n✓ Final status:");
    console.log("  Valid:", status.isValid);
    console.log("  Code:", status.statusCode);
    console.log("  Description:", status.statusDescription);
  }
}

main().catch(console.error);
