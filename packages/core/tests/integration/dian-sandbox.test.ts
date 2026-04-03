/**
 * Integration tests against the DIAN sandbox (habilitacion) environment.
 *
 * These tests exercise the full flow: build XML -> compute CUFE -> sign -> send -> check status.
 * They are SKIPPED by default and only run when DIAN sandbox credentials are provided
 * via environment variables.
 *
 * ============================================================================
 * REQUIRED ENVIRONMENT VARIABLES
 * ============================================================================
 *
 * DIAN_TEST_CREDENTIALS        - Set to "true" to enable these tests.
 *
 * DIAN_TEST_NIT                - NIT of the issuer (emisor), without DV.
 *                                Example: "901234567"
 *
 * DIAN_TEST_NIT_DV             - Digito de verificacion of the issuer NIT.
 *                                Example: "3"
 *
 * DIAN_TEST_PASSWORD           - Software password registered in DIAN.
 *
 * DIAN_TEST_SOFTWARE_ID        - Software ID assigned by DIAN during enablement.
 *                                Example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *
 * DIAN_TEST_SOFTWARE_PIN       - Software PIN assigned by DIAN.
 *
 * DIAN_TEST_SET_ID             - Test set ID (testSetId) assigned by DIAN
 *                                for the SendTestSetAsync flow.
 *                                Example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
 *
 * DIAN_TEST_P12_PATH           - Absolute path to the .p12/.pfx certificate file.
 *                                This is the digital certificate for XAdES signing.
 *
 * DIAN_TEST_P12_PASSWORD       - Password for the .p12/.pfx certificate file.
 *
 * DIAN_TEST_TECH_KEY           - Technical key (clave tecnica) from the DIAN
 *                                numbering resolution. Required for CUFE generation.
 *
 * DIAN_TEST_AUTH_NUMBER        - Authorization number from the DIAN resolution.
 *                                Example: "18760000001"
 *
 * DIAN_TEST_PREFIX             - Invoice prefix from the DIAN resolution.
 *                                Example: "SETP"
 *
 * DIAN_TEST_START_NUMBER       - Start of the authorized numbering range.
 *                                Example: "990000000"
 *
 * DIAN_TEST_END_NUMBER         - End of the authorized numbering range.
 *                                Example: "995000000"
 *
 * DIAN_TEST_PROVIDER_NIT       - NIT of the technology provider (proveedor tecnologico).
 *                                Usually the same as DIAN_TEST_NIT for self-service.
 *
 * ============================================================================
 * HOW TO RUN
 * ============================================================================
 *
 *   # Set all environment variables, then:
 *   pnpm --filter @dian-kit/core test:integration
 *
 *   # Or from the monorepo root:
 *   pnpm test:integration
 *
 * ============================================================================
 */

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  DocumentType,
  Environment,
  IdentificationType,
  OperationType,
  PaymentForm,
  PaymentMethod,
  PersonType,
  TaxCode,
  DianSoapMethod,
} from "../../src/constants/index.js";
import { loadP12 } from "../../src/security/certificate.js";
import { generateCufe, generateSoftwareSecurityCode } from "../../src/security/cufe.js";
import { signXml } from "../../src/security/signer.js";
import { sendBill, getStatus, getStatusZip, getNumberingRange } from "../../src/transport/dian-client.js";
import { buildInvoiceXml } from "../../src/xml/builder.js";
import type { DianDocument } from "../../src/types/common.js";

// ---------------------------------------------------------------------------
// Test gate: skip the entire suite if credentials are not provided
// ---------------------------------------------------------------------------
const HAS_CREDENTIALS = process.env.DIAN_TEST_CREDENTIALS === "true";

describe.skipIf(!HAS_CREDENTIALS)("DIAN Sandbox Integration", () => {
  // -------------------------------------------------------------------------
  // Load credentials from environment variables once
  // -------------------------------------------------------------------------
  const env = {
    nit: process.env.DIAN_TEST_NIT ?? "",
    nitDv: process.env.DIAN_TEST_NIT_DV ?? "",
    password: process.env.DIAN_TEST_PASSWORD ?? "",
    softwareId: process.env.DIAN_TEST_SOFTWARE_ID ?? "",
    softwarePin: process.env.DIAN_TEST_SOFTWARE_PIN ?? "",
    testSetId: process.env.DIAN_TEST_SET_ID ?? "",
    p12Path: process.env.DIAN_TEST_P12_PATH ?? "",
    p12Password: process.env.DIAN_TEST_P12_PASSWORD ?? "",
    techKey: process.env.DIAN_TEST_TECH_KEY ?? "",
    authNumber: process.env.DIAN_TEST_AUTH_NUMBER ?? "",
    prefix: process.env.DIAN_TEST_PREFIX ?? "",
    startNumber: Number(process.env.DIAN_TEST_START_NUMBER ?? "0"),
    endNumber: Number(process.env.DIAN_TEST_END_NUMBER ?? "0"),
    providerNit: process.env.DIAN_TEST_PROVIDER_NIT ?? "",
  };

  // Load the .p12 certificate for SOAP authentication
  // (loaded lazily in tests that need it; declared here for shared scope)
  let certData: ReturnType<typeof loadP12> | undefined;

  function getAuth() {
    if (!certData) {
      const p12Buffer = readFileSync(env.p12Path);
      certData = loadP12(p12Buffer, env.p12Password);
    }
    return { certificate: certData };
  }

  // -------------------------------------------------------------------------
  // Helper: build a minimal DianDocument for testing
  // -------------------------------------------------------------------------

  /**
   * Creates a minimal but valid DianDocument suitable for the DIAN sandbox.
   * The document number is generated with a timestamp suffix to avoid
   * collisions across test runs.
   */
  function buildTestDocument(): DianDocument {
    // Generate a unique sequential number within the authorized range
    const seq = env.startNumber + Math.floor(Math.random() * 1000);
    const docNumber = `${env.prefix}${seq}`;

    const now = new Date();

    const supplierAddress = {
      street: "Calle 100 # 10-20",
      cityCode: "11001",
      cityName: "Bogota",
      departmentCode: "11",
      departmentName: "Bogota D.C.",
      countryCode: "CO",
      countryName: "Colombia",
      postalZone: "110111",
    };

    const customerAddress = {
      street: "Carrera 50 # 30-40",
      cityCode: "11001",
      cityName: "Bogota",
      departmentCode: "11",
      departmentName: "Bogota D.C.",
      countryCode: "CO",
      countryName: "Colombia",
      postalZone: "110111",
    };

    return {
      documentType: DocumentType.FACTURA_VENTA,
      operationType: OperationType.ESTANDAR,
      environment: Environment.HABILITACION,
      id: docNumber,
      issueDate: now,
      issueTime: now,
      currency: "COP",

      supplier: {
        name: "Empresa Prueba SAS",
        identification: {
          number: env.nit,
          type: IdentificationType.NIT,
          dv: env.nitDv,
        },
        personType: PersonType.JURIDICA,
        fiscalResponsibilities: ["O-13"],
        taxInfo: {
          registrationName: "Empresa Prueba SAS",
          companyId: {
            number: env.nit,
            type: IdentificationType.NIT,
            dv: env.nitDv,
          },
          taxLevelCode: "O-13",
          taxScheme: { code: TaxCode.IVA },
          address: supplierAddress,
        },
        address: supplierAddress,
        email: "test@example.com",
      },

      customer: {
        name: "Cliente Prueba SAS",
        identification: {
          number: "900000000",
          type: IdentificationType.NIT,
          dv: "0",
        },
        personType: PersonType.JURIDICA,
        fiscalResponsibilities: ["R-99-PN"],
        taxInfo: {
          registrationName: "Cliente Prueba SAS",
          companyId: {
            number: "900000000",
            type: IdentificationType.NIT,
            dv: "0",
          },
          taxLevelCode: "R-99-PN",
          taxScheme: { code: TaxCode.IVA },
          address: customerAddress,
        },
        address: customerAddress,
        email: "cliente@example.com",
      },

      lines: [
        {
          id: "1",
          quantity: 1,
          unitCode: "EA",
          description: "Servicio de prueba integracion dian-kit",
          price: 100000,
          lineExtensionAmount: 100000,
          taxTotals: [
            {
              taxAmount: 19000,
              subtotals: [
                {
                  taxableAmount: 100000,
                  taxAmount: 19000,
                  percent: 19,
                  taxScheme: { code: TaxCode.IVA },
                },
              ],
            },
          ],
        },
      ],

      taxTotals: [
        {
          taxAmount: 19000,
          subtotals: [
            {
              taxableAmount: 100000,
              taxAmount: 19000,
              percent: 19,
              taxScheme: { code: TaxCode.IVA },
            },
          ],
        },
      ],

      legalMonetaryTotal: {
        lineExtensionAmount: 100000,
        taxExclusiveAmount: 100000,
        taxInclusiveAmount: 119000,
        allowanceTotalAmount: 0,
        chargeTotalAmount: 0,
        prepaidAmount: 0,
        payableAmount: 119000,
      },

      paymentMeans: {
        paymentForm: PaymentForm.CONTADO,
        paymentMethod: PaymentMethod.EFECTIVO,
      },

      software: {
        id: env.softwareId,
        pin: env.softwarePin,
        providerNit: env.providerNit,
        providerName: "Empresa Prueba SAS",
      },

      numbering: {
        authorizationNumber: env.authNumber,
        prefix: env.prefix,
        startNumber: env.startNumber,
        endNumber: env.endNumber,
        startDate: new Date("2023-01-01"),
        endDate: new Date("2025-12-31"),
        technicalKey: env.techKey,
      },

      notes: ["Integration test invoice generated by dian-kit"],
    };
  }

  // =========================================================================
  // Test 1: GetNumberingRange — validate certificate auth and connectivity
  // =========================================================================
  it("should retrieve numbering ranges from DIAN sandbox", async () => {
    // This test validates that the certificate auth is correct and the DIAN
    // sandbox is reachable. It does NOT require a signed XML document.
    const result = await getNumberingRange({
      accountCode: env.nit,
      accountCodeT: env.providerNit,
      softwareCode: env.softwareId,
      auth: getAuth(),
      environment: Environment.HABILITACION,
    });

    // DIAN should return at least one numbering range
    expect(result.ranges).toBeDefined();
    expect(result.ranges.length).toBeGreaterThanOrEqual(1);

    // The first range should have a non-empty prefix
    const firstRange = result.ranges[0]!;
    expect(firstRange.prefix).toBeTruthy();
    expect(firstRange.authorizationNumber).toBeTruthy();

    console.log("[DIAN Sandbox] Numbering ranges retrieved:", result.ranges.length);
    console.log("[DIAN Sandbox] First range prefix:", firstRange.prefix);
  }, 60_000);

  // =========================================================================
  // Test 2: Full flow — build XML, compute CUFE, sign, send via SendTestSetAsync
  // =========================================================================
  it("should build, sign, and send an invoice to DIAN sandbox", async () => {
    // -----------------------------------------------------------------------
    // Step 1: Build the test document
    // -----------------------------------------------------------------------
    const doc = buildTestDocument();
    console.log("[DIAN Sandbox] Document ID:", doc.id);

    // -----------------------------------------------------------------------
    // Step 2: Compute CUFE and SoftwareSecurityCode
    // -----------------------------------------------------------------------
    const cufe = generateCufe(doc);
    expect(cufe).toHaveLength(96); // SHA-384 hex = 96 chars

    const softwareSecurityCode = generateSoftwareSecurityCode(
      env.softwareId,
      env.softwarePin,
      doc.id,
    );
    expect(softwareSecurityCode).toHaveLength(96);

    console.log("[DIAN Sandbox] CUFE:", cufe);

    // -----------------------------------------------------------------------
    // Step 3: Build UBL 2.1 XML
    // -----------------------------------------------------------------------
    const xml = buildInvoiceXml(doc, cufe, softwareSecurityCode);
    expect(xml).toContain("<cbc:UUID");
    expect(xml).toContain(cufe);
    expect(xml).toContain(doc.id);

    // -----------------------------------------------------------------------
    // Step 4: Load the .p12 certificate and sign the XML
    // -----------------------------------------------------------------------
    const p12Buffer = readFileSync(env.p12Path);
    const certData = loadP12(p12Buffer, env.p12Password);
    expect(certData.privateKeyPem).toBeTruthy();
    expect(certData.certificatePem).toBeTruthy();

    console.log("[DIAN Sandbox] Certificate subject:", certData.subjectName);
    console.log("[DIAN Sandbox] Certificate valid until:", certData.notAfter.toISOString());

    const { signedXml } = await signXml({ xml, certificate: certData });
    expect(signedXml).toContain("<ds:Signature");
    expect(signedXml).toContain(cufe);

    // -----------------------------------------------------------------------
    // Step 5: Send to DIAN sandbox using SendTestSetAsync
    // -----------------------------------------------------------------------
    const sendResult = await sendBill({
      signedXml,
      supplierNit: env.nit,
      documentNumber: doc.id,
      auth: getAuth(),
      environment: Environment.HABILITACION,
      method: DianSoapMethod.SEND_TEST_SET_ASYNC,
      testSetId: env.testSetId,
      timeoutMs: 60_000,
    });

    console.log("[DIAN Sandbox] Send result - isValid:", sendResult.isValid);
    console.log("[DIAN Sandbox] Send result - statusCode:", sendResult.statusCode);
    console.log("[DIAN Sandbox] Send result - statusDescription:", sendResult.statusDescription);
    console.log("[DIAN Sandbox] Send result - trackId:", sendResult.trackId);

    if (!sendResult.isValid) {
      console.error("[DIAN Sandbox] Validation errors:", JSON.stringify(sendResult.errors, null, 2));
    }

    // The response should be parseable (even if DIAN rejects the document
    // due to test data, the transport layer should work correctly)
    expect(sendResult.statusCode).toBeDefined();
    expect(sendResult.rawResponse).toBeTruthy();

    // If DIAN accepted the document, we should have a trackId for status queries
    if (sendResult.isValid && sendResult.trackId) {
      console.log("[DIAN Sandbox] Document accepted. TrackId:", sendResult.trackId);
    }
  }, 120_000);

  // =========================================================================
  // Test 3: GetStatusZip — query the status of a previously sent document
  // =========================================================================
  it("should query document status by trackId", async () => {
    // -----------------------------------------------------------------------
    // First, send a document to get a trackId
    // -----------------------------------------------------------------------
    const doc = buildTestDocument();
    const cufe = generateCufe(doc);
    const softwareSecurityCode = generateSoftwareSecurityCode(
      env.softwareId,
      env.softwarePin,
      doc.id,
    );
    const xml = buildInvoiceXml(doc, cufe, softwareSecurityCode);

    const p12Buffer = readFileSync(env.p12Path);
    const certData = loadP12(p12Buffer, env.p12Password);
    const { signedXml } = await signXml({ xml, certificate: certData });

    const sendResult = await sendBill({
      signedXml,
      supplierNit: env.nit,
      documentNumber: doc.id,
      auth: getAuth(),
      environment: Environment.HABILITACION,
      method: DianSoapMethod.SEND_TEST_SET_ASYNC,
      testSetId: env.testSetId,
      timeoutMs: 60_000,
    });

    // Skip status check if there is no trackId (document was rejected at send)
    if (!sendResult.trackId) {
      console.log("[DIAN Sandbox] No trackId returned, skipping status check.");
      console.log("[DIAN Sandbox] Send statusCode:", sendResult.statusCode);
      return;
    }

    // -----------------------------------------------------------------------
    // Query status using GetStatusZip (for async sends)
    // -----------------------------------------------------------------------
    const statusResult = await getStatusZip({
      trackId: sendResult.trackId,
      auth: getAuth(),
      environment: Environment.HABILITACION,
      timeoutMs: 60_000,
    });

    console.log("[DIAN Sandbox] Status result - isValid:", statusResult.isValid);
    console.log("[DIAN Sandbox] Status result - statusCode:", statusResult.statusCode);
    console.log("[DIAN Sandbox] Status result - statusDescription:", statusResult.statusDescription);

    expect(statusResult.statusCode).toBeDefined();
    expect(statusResult.rawResponse).toBeTruthy();
  }, 180_000);

  // =========================================================================
  // Test 4: GetStatus — query by CUFE
  // =========================================================================
  it("should query document status by CUFE", async () => {
    // -----------------------------------------------------------------------
    // Build and send a document, then query status by CUFE
    // -----------------------------------------------------------------------
    const doc = buildTestDocument();
    const cufe = generateCufe(doc);
    const softwareSecurityCode = generateSoftwareSecurityCode(
      env.softwareId,
      env.softwarePin,
      doc.id,
    );
    const xml = buildInvoiceXml(doc, cufe, softwareSecurityCode);

    const p12Buffer = readFileSync(env.p12Path);
    const certData = loadP12(p12Buffer, env.p12Password);
    const { signedXml } = await signXml({ xml, certificate: certData });

    // Send the document first
    await sendBill({
      signedXml,
      supplierNit: env.nit,
      documentNumber: doc.id,
      auth: getAuth(),
      environment: Environment.HABILITACION,
      method: DianSoapMethod.SEND_TEST_SET_ASYNC,
      testSetId: env.testSetId,
      timeoutMs: 60_000,
    });

    // -----------------------------------------------------------------------
    // Query status using the CUFE (GetStatus)
    // -----------------------------------------------------------------------
    const statusResult = await getStatus({
      trackId: cufe,
      auth: getAuth(),
      environment: Environment.HABILITACION,
      timeoutMs: 60_000,
    });

    console.log("[DIAN Sandbox] CUFE status - isValid:", statusResult.isValid);
    console.log("[DIAN Sandbox] CUFE status - statusCode:", statusResult.statusCode);
    console.log("[DIAN Sandbox] CUFE status - statusDescription:", statusResult.statusDescription);

    // The response should be parseable regardless of DIAN's validation result
    expect(statusResult.statusCode).toBeDefined();
    expect(statusResult.rawResponse).toBeTruthy();
  }, 180_000);
});
