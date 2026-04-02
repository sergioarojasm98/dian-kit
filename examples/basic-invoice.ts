/**
 * Basic Invoice Example
 *
 * Creates a standard electronic invoice (Factura Electronica de Venta, type 01)
 * with two line items, sends it to the DIAN sandbox, and checks its status.
 *
 * This example uses realistic Colombian business data including:
 * - NIT identification for both supplier and customer
 * - IVA 19% tax calculation
 * - Colombian addresses with DANE codes
 * - DIAN numbering resolution format
 *
 * Prerequisites:
 * - A .p12 certificate registered with DIAN
 * - DIAN sandbox credentials (software ID, PIN, NIT password)
 * - An active numbering resolution (resolucion de numeracion)
 *
 * @see https://github.com/sergioarojasm98/dian-kit
 */

import { readFileSync } from "node:fs";
import { DianKit, type DianKitConfig } from "dian-kit";

// ---------------------------------------------------------------------------
// Step 1: Configure the SDK with your company and DIAN credentials
// ---------------------------------------------------------------------------

const config: DianKitConfig = {
  // Load your PKCS#12 certificate (registered with DIAN for your software)
  certificate: readFileSync("./your-certificate.p12"),
  certificatePassword: "your-certificate-password",

  // Supplier (your company) information
  supplier: {
    name: "Soluciones Digitales SAS",
    identification: { number: "901234567", type: "31", dv: "1" },
    personType: "1", // 1 = Persona Juridica (legal entity)
    fiscalResponsibilities: ["O-13"], // Gran Contribuyente
    taxInfo: {
      registrationName: "SOLUCIONES DIGITALES SAS",
      companyId: { number: "901234567", type: "31", dv: "1" },
      taxLevelCode: "O-13",
      taxScheme: { code: "01" }, // IVA regime
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

  // Software registered in DIAN's Catalogo de Participantes
  software: {
    id: "your-software-id",
    pin: "your-software-pin",
    providerNit: "901234567",
    providerName: "Soluciones Digitales SAS",
  },

  // WS-Security credentials for the DIAN SOAP API
  credentials: {
    nit: "901234567",
    password: "your-dian-password",
  },

  // Environment: "1" = Production, "2" = Sandbox (Habilitacion)
  environment: "2",

  // Numbering resolution from DIAN
  numbering: {
    authorizationNumber: "18764000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2026-12-31"),
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
  },
};

const kit = new DianKit(config);

// ---------------------------------------------------------------------------
// Step 2: Define the customer (buyer) information
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
// Step 3: Create an invoice with two line items
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();

  // Line 1: Consulting services - 10 hours at $150,000 COP/hour
  const line1Subtotal = 10 * 150_000; // 1,500,000 COP
  const line1Tax = line1Subtotal * 0.19; // 285,000 COP (IVA 19%)

  // Line 2: Software license - 1 unit at $2,500,000 COP
  const line2Subtotal = 1 * 2_500_000; // 2,500,000 COP
  const line2Tax = line2Subtotal * 0.19; // 475,000 COP (IVA 19%)

  // Totals
  const totalSubtotal = line1Subtotal + line2Subtotal; // 4,000,000 COP
  const totalTax = line1Tax + line2Tax; // 760,000 COP
  const totalWithTax = totalSubtotal + totalTax; // 4,760,000 COP

  const invoice = await kit.createInvoice({
    // Document ID must match the numbering resolution prefix + number
    id: "SETP990000001",
    issueDate: now,
    issueTime: now,
    customer,

    // Line items
    lines: [
      {
        id: "1",
        quantity: 10,
        unitCode: "EA", // Each (default)
        description: "Servicio de consultoria en transformacion digital",
        price: 150_000,
        lineExtensionAmount: line1Subtotal,
        taxTotals: [
          {
            taxAmount: line1Tax,
            subtotals: [
              {
                taxableAmount: line1Subtotal,
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
        description: "Licencia anual de software ERP en la nube",
        price: 2_500_000,
        lineExtensionAmount: line2Subtotal,
        taxTotals: [
          {
            taxAmount: line2Tax,
            subtotals: [
              {
                taxableAmount: line2Subtotal,
                taxAmount: line2Tax,
                percent: 19,
                taxScheme: { code: "01" }, // IVA
              },
            ],
          },
        ],
      },
    ],

    // Aggregated tax totals for the entire document
    taxTotals: [
      {
        taxAmount: totalTax,
        subtotals: [
          {
            taxableAmount: totalSubtotal,
            taxAmount: totalTax,
            percent: 19,
            taxScheme: { code: "01" }, // IVA
          },
        ],
      },
    ],

    // Legal monetary totals
    legalMonetaryTotal: {
      lineExtensionAmount: totalSubtotal,
      taxExclusiveAmount: totalSubtotal,
      taxInclusiveAmount: totalWithTax,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: totalWithTax,
    },

    // Payment: cash / bank transfer
    paymentMeans: {
      paymentForm: "1", // Contado (cash/immediate)
      paymentMethod: "30", // Transferencia de credito (wire transfer)
    },

    notes: ["Pago a 30 dias calendario a partir de la fecha de emision"],
  });

  console.log("Invoice created successfully!");
  console.log("  Document number:", invoice.documentNumber);
  console.log("  CUFE:", invoice.uuid);

  // ---------------------------------------------------------------------------
  // Step 4: Send the invoice to DIAN
  // ---------------------------------------------------------------------------

  // For sandbox qualification, use SendTestSetAsync with your test set ID:
  // const response = await kit.send(invoice, {
  //   method: 'SendTestSetAsync',
  //   testSetId: 'your-test-set-id',
  // });

  // For production or basic sandbox testing, use synchronous send:
  const response = await kit.send(invoice);

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

  // ---------------------------------------------------------------------------
  // Step 5: Check document status by CUFE
  // ---------------------------------------------------------------------------

  const status = await kit.getStatus(invoice.uuid);

  console.log("\nDocument status:");
  console.log("  Valid:", status.isValid);
  console.log("  Description:", status.statusDescription);
}

main().catch(console.error);
