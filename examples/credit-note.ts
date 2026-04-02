/**
 * Credit Note Example
 *
 * Creates a credit note (Nota Credito, type 91) for a partial return of goods
 * from a previously issued invoice. The credit note references the original
 * invoice by its document number and CUFE.
 *
 * Use cases for credit notes:
 * - "1" = Partial return of goods (Devolucion parcial)
 * - "2" = Full cancellation (Anulacion de factura)
 * - "3" = Discount applied retroactively (Rebaja o descuento)
 * - "4" = Price adjustment (Ajuste de precio)
 *
 * Prerequisites:
 * - A .p12 certificate registered with DIAN
 * - DIAN sandbox credentials
 * - The CUFE of the original invoice being corrected
 *
 * @see https://github.com/sergioarojasm98/dian-kit
 */

import { readFileSync } from "node:fs";
import { DianKit } from "dian-kit";

// ---------------------------------------------------------------------------
// Step 1: Initialize the SDK (same config as your invoice setup)
// ---------------------------------------------------------------------------

const kit = new DianKit({
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",
  supplier: {
    name: "Soluciones Digitales SAS",
    identification: { number: "901234567", type: "31", dv: "1" },
    personType: "1",
    fiscalResponsibilities: ["O-13"],
    taxInfo: {
      registrationName: "SOLUCIONES DIGITALES SAS",
      companyId: { number: "901234567", type: "31", dv: "1" },
      taxLevelCode: "O-13",
      taxScheme: { code: "01" },
      address: {
        street: "Calle 100 # 10-20 Oficina 501",
        cityCode: "11001",
        cityName: "Bogota, D.C.",
        departmentCode: "11",
        departmentName: "Bogota",
      },
    },
    address: {
      street: "Calle 100 # 10-20 Oficina 501",
      cityCode: "11001",
      cityName: "Bogota, D.C.",
      departmentCode: "11",
      departmentName: "Bogota",
    },
    email: "facturacion@solucionesdigitales.com.co",
  },
  software: {
    id: "your-software-id",
    pin: "your-software-pin",
    providerNit: "901234567",
    providerName: "Soluciones Digitales SAS",
  },
  credentials: {
    nit: "901234567",
    password: "your-dian-password",
  },
  environment: "2", // Sandbox
  numbering: {
    authorizationNumber: "18764000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-12-31"),
    // Credit notes use CUDE (computed with the software PIN), so technicalKey
    // is not used in the hash -- but it is still part of the numbering config.
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
  },
});

// ---------------------------------------------------------------------------
// Step 2: Define the same customer from the original invoice
// ---------------------------------------------------------------------------

const customer = {
  name: "Comercializadora ABC SAS",
  identification: { number: "800111222", type: "31" as const, dv: "9" },
  personType: "1" as const,
  fiscalResponsibilities: ["R-99-PN"],
  taxInfo: {
    registrationName: "COMERCIALIZADORA ABC SAS",
    companyId: { number: "800111222", type: "31" as const, dv: "9" },
    taxLevelCode: "R-99-PN",
    taxScheme: { code: "01" as const },
    address: {
      street: "Carrera 7 # 45-10 Local 3",
      cityCode: "76001",
      cityName: "Cali",
      departmentCode: "76",
      departmentName: "Valle del Cauca",
    },
  },
  address: {
    street: "Carrera 7 # 45-10 Local 3",
    cityCode: "76001",
    cityName: "Cali",
    departmentCode: "76",
    departmentName: "Valle del Cauca",
  },
  email: "contabilidad@comercializadoraabc.com",
};

// ---------------------------------------------------------------------------
// Step 3: Create the credit note referencing the original invoice
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();

  // This credit note returns 5 units of the consulting service from the
  // original invoice SETP990000001 (partial return, response code "1").
  const creditSubtotal = 5 * 150_000; // 750,000 COP
  const creditTax = creditSubtotal * 0.19; // 142,500 COP (IVA 19%)
  const creditTotal = creditSubtotal + creditTax; // 892,500 COP

  const creditNote = await kit.createCreditNote({
    // Credit note document number (use your own numbering for credit notes)
    id: "NC001",
    issueDate: now,
    issueTime: now,
    customer,

    // Reference to the original invoice being partially reversed
    billingReference: {
      id: "SETP990000001", // Original invoice number
      uuid: "a1b2c3d4e5f6...replace-with-actual-cufe...", // CUFE of the original invoice
      issueDate: new Date("2026-03-15"), // Issue date of the original invoice
    },

    // Discrepancy reason: why the credit note is being issued
    discrepancyResponse: {
      referenceId: "SETP990000001",
      responseCode: "1", // 1 = Partial return (Devolucion parcial)
      description:
        "Devolucion parcial de 5 horas de consultoria no prestadas",
    },

    // Line items being credited
    lines: [
      {
        id: "1",
        quantity: 5,
        description:
          "Devolucion - Servicio de consultoria en transformacion digital",
        price: 150_000,
        lineExtensionAmount: creditSubtotal,
        taxTotals: [
          {
            taxAmount: creditTax,
            subtotals: [
              {
                taxableAmount: creditSubtotal,
                taxAmount: creditTax,
                percent: 19,
                taxScheme: { code: "01" }, // IVA
              },
            ],
          },
        ],
      },
    ],

    // Tax totals for the credited amount
    taxTotals: [
      {
        taxAmount: creditTax,
        subtotals: [
          {
            taxableAmount: creditSubtotal,
            taxAmount: creditTax,
            percent: 19,
            taxScheme: { code: "01" },
          },
        ],
      },
    ],

    // Monetary totals for the credit note
    legalMonetaryTotal: {
      lineExtensionAmount: creditSubtotal,
      taxExclusiveAmount: creditSubtotal,
      taxInclusiveAmount: creditTotal,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: creditTotal,
    },

    // Same payment method as the original invoice
    paymentMeans: {
      paymentForm: "1",
      paymentMethod: "30",
    },

    notes: [
      "Nota credito por devolucion parcial de servicios no prestados",
    ],
  });

  console.log("Credit note created successfully!");
  console.log("  Document number:", creditNote.documentNumber);
  // Credit notes use CUDE (not CUFE) because they are type 91
  console.log("  CUDE:", creditNote.uuid);

  // ---------------------------------------------------------------------------
  // Step 4: Send the credit note to DIAN
  // ---------------------------------------------------------------------------

  const response = await kit.send(creditNote);

  console.log("\nDIAN response:");
  console.log("  Valid:", response.isValid);
  console.log("  Status code:", response.statusCode);
  console.log("  Status:", response.statusDescription);

  if (!response.isValid && response.errors) {
    console.error("  Errors:");
    for (const error of response.errors) {
      console.error(`    - [${error.code}] ${error.message}`);
    }
  }
}

main().catch(console.error);
