/**
 * Lookup and Validate Example
 *
 * Demonstrates the utility operations available in DianKit:
 * - lookupBuyer: Query DIAN's database for a buyer by NIT or CC
 * - getNumberingRange: Retrieve authorized numbering resolutions
 * - getStatus: Check document validation status by CUFE/CUDE
 * - getStatusZip: Check async submission status by track ID
 *
 * These operations do not require creating or signing documents.
 * They are useful for:
 * - Auto-completing customer data before creating an invoice
 * - Validating that your numbering resolution is correctly configured
 * - Checking whether a previously sent document was accepted or rejected
 *
 * Prerequisites:
 * - A .p12 certificate registered with DIAN
 * - DIAN sandbox credentials
 *
 * @see https://github.com/sergioarojasm98/dian-kit
 */

import { readFileSync } from "node:fs";
import { DianKit } from "dian-kit";

// ---------------------------------------------------------------------------
// Initialize the SDK
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
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
  },
});

// ---------------------------------------------------------------------------
// 1. Look up a buyer by NIT
// ---------------------------------------------------------------------------

async function lookupByNit() {
  console.log("=== Lookup buyer by NIT ===\n");

  try {
    const buyer = await kit.lookupBuyer({
      identificationType: "31", // NIT
      identificationNumber: "800111222", // Replace with a real NIT
    });

    console.log("  Receiver name:", buyer.receiverName);
    console.log("  Receiver email:", buyer.receiverEmail);
    console.log("  Status code:", buyer.statusCode);
    console.log("  Message:", buyer.statusMessage);
  } catch (error) {
    console.error("  Lookup failed:", error);
  }
}

// ---------------------------------------------------------------------------
// 2. Look up a buyer by Cedula de Ciudadania
// ---------------------------------------------------------------------------

async function lookupByCedula() {
  console.log("\n=== Lookup buyer by Cedula ===\n");

  try {
    const individual = await kit.lookupBuyer({
      identificationType: "13", // Cedula de Ciudadania
      identificationNumber: "1234567890", // Replace with a real CC number
    });

    console.log("  Receiver name:", individual.receiverName);
    console.log("  Receiver email:", individual.receiverEmail);
    console.log("  Status code:", individual.statusCode);
    console.log("  Message:", individual.statusMessage);
  } catch (error) {
    console.error("  Lookup failed:", error);
  }
}

// ---------------------------------------------------------------------------
// 3. Query authorized numbering ranges
// ---------------------------------------------------------------------------

async function queryNumberingRanges() {
  console.log("\n=== Numbering ranges ===\n");

  try {
    const result = await kit.getNumberingRange();

    if (result.ranges.length === 0) {
      console.log("  No numbering ranges found for this software.");
      return;
    }

    for (const range of result.ranges) {
      console.log(`  Prefix: ${range.prefix}`);
      console.log(`    Range: ${range.fromNumber} - ${range.toNumber}`);
      console.log(`    Valid: ${range.startDate} to ${range.endDate}`);
      console.log(`    Resolution: ${range.resolutionNumber}`);
      console.log(`    Technical key: ${range.technicalKey || "N/A"}`);
      console.log();
    }
  } catch (error) {
    console.error("  Numbering range query failed:", error);
  }
}

// ---------------------------------------------------------------------------
// 4. Check document status by CUFE
// ---------------------------------------------------------------------------

async function checkStatusByCufe() {
  console.log("\n=== Document status by CUFE ===\n");

  // Replace with a real CUFE from a previously sent document
  const cufe =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4";

  try {
    const status = await kit.getStatus(cufe);

    console.log("  Valid:", status.isValid);
    console.log("  Status code:", status.statusCode);
    console.log("  Description:", status.statusDescription);

    if (status.errors && status.errors.length > 0) {
      console.log("  Validation errors:");
      for (const error of status.errors) {
        console.log(`    - [${error.code}] ${error.message}`);
      }
    }
  } catch (error) {
    console.error("  Status check failed:", error);
  }
}

// ---------------------------------------------------------------------------
// 5. Check async submission status by track ID (zip key)
// ---------------------------------------------------------------------------

async function checkStatusZip() {
  console.log("\n=== Async submission status ===\n");

  // Replace with a real trackId from a SendBillAsync or SendTestSetAsync response
  const trackId = "replace-with-actual-track-id";

  try {
    const status = await kit.getStatusZip(trackId);

    console.log("  Valid:", status.isValid);
    console.log("  Status code:", status.statusCode);
    console.log("  Description:", status.statusDescription);

    if (status.errors && status.errors.length > 0) {
      console.log("  Validation errors:");
      for (const error of status.errors) {
        console.log(`    - [${error.code}] ${error.message}`);
      }
    }
  } catch (error) {
    console.error("  Status zip check failed:", error);
  }
}

// ---------------------------------------------------------------------------
// Run all examples
// ---------------------------------------------------------------------------

async function main() {
  await lookupByNit();
  await lookupByCedula();
  await queryNumberingRanges();
  await checkStatusByCufe();
  await checkStatusZip();
}

main().catch(console.error);
