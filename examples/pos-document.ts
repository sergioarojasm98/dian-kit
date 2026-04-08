/**
 * POS Document Example
 *
 * Creates a POS electronic equivalent document (Documento Equivalente POS,
 * type 20) for a retail point-of-sale transaction.
 *
 * Key differences from a standard invoice (type 01):
 * - Uses document type "20" instead of "01"
 * - Uses CUDE instead of CUFE for the unique identifier hash
 *   - CUFE uses the numbering resolution's technicalKey in the hash
 *   - CUDE uses the software PIN in the hash
 * - Typically uses CONSUMIDOR_FINAL as the customer when the buyer is anonymous
 * - Common for retail, restaurants, and small-value transactions
 *
 * Prerequisites:
 * - A .p12 certificate registered with DIAN
 * - DIAN sandbox credentials
 * - A POS numbering resolution (may differ from invoice resolution)
 *
 * @see https://github.com/sergioarojasm98/dian-kit
 */

import { readFileSync } from "node:fs";
import { DianKit, CONSUMIDOR_FINAL, DocumentType } from "dian-kit";

// ---------------------------------------------------------------------------
// Step 1: Initialize the SDK
// ---------------------------------------------------------------------------

const kit = new DianKit({
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",
  supplier: {
    name: "Tienda Express SAS",
    identification: { number: "900987654", type: "31", dv: "5" },
    personType: "1",
    fiscalResponsibilities: ["R-99-PN"],
    taxInfo: {
      registrationName: "TIENDA EXPRESS SAS",
      companyId: { number: "900987654", type: "31", dv: "5" },
      taxLevelCode: "R-99-PN",
      taxScheme: { code: "01" },
      address: {
        street: "Avenida El Poblado # 10A-25 Local 102",
        cityCode: "05001",
        cityName: "Medellin",
        departmentCode: "05",
        departmentName: "Antioquia",
      },
    },
    address: {
      street: "Avenida El Poblado # 10A-25 Local 102",
      cityCode: "05001",
      cityName: "Medellin",
      departmentCode: "05",
      departmentName: "Antioquia",
    },
    email: "ventas@tiendaexpress.com.co",
  },
  software: {
    id: "your-software-id",
    pin: "your-software-pin",
    providerNit: "900987654",
    providerName: "Tienda Express SAS",
  },
  credentials: {
    nit: "900987654",
    password: "your-dian-password",
  },
  environment: "2", // Sandbox
  numbering: {
    authorizationNumber: "18764000099",
    prefix: "POS",
    startNumber: 1,
    endNumber: 5000000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-12-31"),
    // technicalKey is NOT used in CUDE computation (POS documents use the
    // software PIN instead), but you can still include it in the config.
  },
});

// ---------------------------------------------------------------------------
// Step 2: Build the anonymous customer using CONSUMIDOR_FINAL
// ---------------------------------------------------------------------------

// CONSUMIDOR_FINAL provides the DIAN-mandated placeholder for anonymous buyers:
//   name: "Consumidor Final"
//   identification: { number: "222222222222", type: "13" }
//   personType: "2" (Natural person)
//
// You need to add the remaining required fields (fiscalResponsibilities,
// taxInfo, address) to complete the Party interface.

const anonymousCustomer = {
  ...CONSUMIDOR_FINAL,
  fiscalResponsibilities: ["R-99-PN"],
  taxInfo: {
    registrationName: "Consumidor Final",
    companyId: { number: "222222222222", type: "13" as const },
    taxLevelCode: "R-99-PN",
    taxScheme: { code: "ZZ" as const }, // No tax applicable for anonymous buyer
    address: {
      street: "N/A",
      cityCode: "05001",
      cityName: "Medellin",
      departmentCode: "05",
      departmentName: "Antioquia",
    },
  },
  address: {
    street: "N/A",
    cityCode: "05001",
    cityName: "Medellin",
    departmentCode: "05",
    departmentName: "Antioquia",
  },
};

// ---------------------------------------------------------------------------
// Step 3: Create the POS document
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();

  // A simple retail sale: 2 items
  // Item 1: T-shirt x3 at $45,000 each
  const item1Subtotal = 3 * 45_000; // 135,000 COP
  const item1Tax = item1Subtotal * 0.19; // 25,650 COP

  // Item 2: Sneakers x1 at $189,000
  const item2Subtotal = 1 * 189_000; // 189,000 COP
  const item2Tax = item2Subtotal * 0.19; // 35,910 COP

  const totalSubtotal = item1Subtotal + item2Subtotal; // 324,000 COP
  const totalTax = item1Tax + item2Tax; // 61,560 COP
  const totalWithTax = totalSubtotal + totalTax; // 385,560 COP

  const posDocument = await kit.createInvoice({
    id: "POS1",
    issueDate: now,
    issueTime: now,

    // Set document type to POS (type 20) -- this triggers CUDE computation
    // instead of CUFE.
    documentType: DocumentType.POS, // "20"

    customer: anonymousCustomer,

    lines: [
      {
        id: "1",
        quantity: 3,
        description: "Camiseta deportiva talla M",
        price: 45_000,
        lineExtensionAmount: item1Subtotal,
        taxTotals: [
          {
            taxAmount: item1Tax,
            subtotals: [
              {
                taxableAmount: item1Subtotal,
                taxAmount: item1Tax,
                percent: 19,
                taxScheme: { code: "01" },
              },
            ],
          },
        ],
      },
      {
        id: "2",
        quantity: 1,
        description: "Zapatillas running talla 42",
        price: 189_000,
        lineExtensionAmount: item2Subtotal,
        taxTotals: [
          {
            taxAmount: item2Tax,
            subtotals: [
              {
                taxableAmount: item2Subtotal,
                taxAmount: item2Tax,
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
        taxAmount: totalTax,
        subtotals: [
          {
            taxableAmount: totalSubtotal,
            taxAmount: totalTax,
            percent: 19,
            taxScheme: { code: "01" },
          },
        ],
      },
    ],

    legalMonetaryTotal: {
      lineExtensionAmount: totalSubtotal,
      taxExclusiveAmount: totalSubtotal,
      taxInclusiveAmount: totalWithTax,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: totalWithTax,
    },

    // Debit card payment at the POS terminal
    paymentMeans: {
      paymentForm: "1", // Contado (immediate)
      paymentMethod: "49", // Tarjeta debito (debit card)
    },
  });

  // ---------------------------------------------------------------------------
  // CUFE vs CUDE
  // ---------------------------------------------------------------------------
  // Standard invoices (type 01) produce a CUFE -- the hash includes the
  // numbering resolution's technicalKey.
  //
  // POS documents (type 20) produce a CUDE -- the hash includes the
  // software PIN instead of the technicalKey. This is because POS documents
  // may not always have a technicalKey in their numbering resolution.
  //
  // Both are SHA-384 hashes and serve as the unique document identifier
  // within DIAN's system. The SDK handles this automatically based on
  // the documentType.
  // ---------------------------------------------------------------------------

  console.log("POS document created successfully!");
  console.log("  Document number:", posDocument.documentNumber);
  console.log("  CUDE:", posDocument.uuid);

  // Send to DIAN
  const response = await kit.send(posDocument);

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
