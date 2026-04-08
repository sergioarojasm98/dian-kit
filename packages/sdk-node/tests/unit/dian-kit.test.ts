import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DocumentType,
  Environment,
  FiscalResponsibility,
  IdentificationType,
  OperationType,
  PaymentForm,
  PaymentMethod,
  PersonType,
  TaxCode,
  type CertificateData,
  type DianDocument,
  type Party,
} from "@dian-kit/core";

import { DianKit } from "../../src/dian-kit.js";
import type { CreditNoteInput, DebitNoteInput, DianKitConfig, InvoiceInput } from "../../src/types.js";

// --- Mocks ---

const MOCK_CERTIFICATE: CertificateData = {
  privateKeyPem: "-----BEGIN RSA PRIVATE KEY-----\nMOCK\n-----END RSA PRIVATE KEY-----",
  certificatePem: "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----",
  certificateDerBase64: "MOCKDERBASE64",
  certDigestBase64: "MOCKDIGESTBASE64",
  issuerName: "CN=Test, O=Test, C=CO",
  serialNumber: "01",
  subjectName: "Test Certificate",
  notBefore: new Date(2025, 0, 1),
  notAfter: new Date(2026, 11, 31),
};

vi.mock("@dian-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dian-kit/core")>();
  return {
    ...actual,
    loadP12: vi.fn(() => MOCK_CERTIFICATE),
    generateCufe: vi.fn(() => "mock-cufe-sha384-hash"),
    generateSoftwareSecurityCode: vi.fn(() => "mock-software-security-code"),
    buildInvoiceXml: vi.fn(() => "<Invoice>mock</Invoice>"),
    buildCreditNoteXml: vi.fn(() => "<CreditNote>mock</CreditNote>"),
    buildDebitNoteXml: vi.fn(() => "<DebitNote>mock</DebitNote>"),
    signXml: vi.fn(async () => ({ signedXml: "<SignedXml>mock</SignedXml>" })),
    sendBill: vi.fn(async () => ({
      isValid: true,
      statusCode: "00",
      statusDescription: "Procesado Correctamente",
      trackId: "track-123",
      errors: [],
      rawResponse: "<soap>ok</soap>",
    })),
    getStatus: vi.fn(async () => ({
      isValid: true,
      statusCode: "00",
      statusDescription: "Procesado Correctamente",
      errors: [],
      rawResponse: "<soap>ok</soap>",
    })),
    getStatusZip: vi.fn(async () => ({
      isValid: true,
      statusCode: "00",
      statusDescription: "Procesado Correctamente",
      errors: [],
      rawResponse: "<soap>ok</soap>",
    })),
    getNumberingRange: vi.fn(async () => ({
      ranges: [
        {
          authorizationNumber: "18760000001",
          prefix: "SETP",
          fromNumber: 990000000,
          toNumber: 995000000,
          startDate: "2025-01-19",
          endDate: "2026-01-19",
          technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
        },
      ],
      rawResponse: "<soap>ok</soap>",
    })),
    getAcquirer: vi.fn(async () => ({
      receiverName: "EMPRESA XYZ SAS",
      receiverEmail: "facturacion@empresa.com",
      statusCode: "00",
      message: "Operación exitosa",
      rawResponse: "<soap>ok</soap>",
    })),
  };
});

// Import mocked functions for assertions
import {
  buildCreditNoteXml,
  buildDebitNoteXml,
  buildInvoiceXml,
  generateCufe,
  generateSoftwareSecurityCode,
  getAcquirer,
  getNumberingRange,
  getStatus,
  getStatusZip,
  loadP12,
  sendBill,
  signXml,
} from "@dian-kit/core";

// --- Test fixtures ---

const testSupplier: Party = {
  name: "Peluquería Estilo Total",
  identification: { number: "900123456", type: IdentificationType.NIT, dv: "7" },
  personType: PersonType.JURIDICA,
  fiscalResponsibilities: [FiscalResponsibility.NO_APLICA],
  taxInfo: {
    registrationName: "Peluquería Estilo Total SAS",
    companyId: { number: "900123456", type: IdentificationType.NIT, dv: "7" },
    taxLevelCode: FiscalResponsibility.NO_APLICA,
    taxScheme: { code: TaxCode.IVA, name: "IVA" },
    address: {
      street: "Calle 45 # 12-34",
      cityCode: "11001",
      cityName: "Bogotá, D.C.",
      departmentCode: "11",
      departmentName: "Bogotá",
      countryCode: "CO",
      countryName: "Colombia",
    },
  },
  address: {
    street: "Calle 45 # 12-34",
    cityCode: "11001",
    cityName: "Bogotá, D.C.",
    departmentCode: "11",
    departmentName: "Bogotá",
    countryCode: "CO",
    countryName: "Colombia",
  },
  email: "contacto@estilototal.co",
};

const testCustomer: Party = {
  name: "Consumidor Final",
  identification: { number: "222222222222", type: IdentificationType.CEDULA_CIUDADANIA },
  personType: PersonType.NATURAL,
  fiscalResponsibilities: [FiscalResponsibility.NO_APLICA],
  taxInfo: {
    registrationName: "Consumidor Final",
    companyId: { number: "222222222222", type: IdentificationType.CEDULA_CIUDADANIA },
    taxLevelCode: FiscalResponsibility.NO_APLICA,
    taxScheme: { code: TaxCode.NO_APLICA, name: "No Aplica" },
  },
  address: {
    street: "N/A",
    cityCode: "11001",
    cityName: "Bogotá, D.C.",
    departmentCode: "11",
    departmentName: "Bogotá",
    countryCode: "CO",
    countryName: "Colombia",
  },
};

const testConfig: DianKitConfig = {
  certificate: Buffer.from("mock-p12-data"),
  certificatePassword: "test-password",
  supplier: testSupplier,
  software: {
    id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    pin: "12345",
    providerNit: "900123456",
    providerName: "Peluquería Estilo Total SAS",
  },
  environment: Environment.HABILITACION,
  numbering: {
    authorizationNumber: "18760000001",
    prefix: "SETP",
    startNumber: 990000000,
    endNumber: 995000000,
    startDate: new Date(2025, 0, 19),
    endDate: new Date(2026, 0, 19),
    technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
  },
};

const baseDate = new Date(2026, 2, 24, 14, 30, 0);

const testInvoiceInput: InvoiceInput = {
  id: "SETP990000001",
  issueDate: baseDate,
  issueTime: baseDate,
  customer: testCustomer,
  lines: [
    {
      id: "1",
      quantity: 1,
      unitCode: "EA",
      description: "Corte de cabello",
      price: 25000,
      lineExtensionAmount: 25000,
      taxTotals: [
        {
          taxAmount: 4750,
          subtotals: [
            {
              taxableAmount: 25000,
              taxAmount: 4750,
              percent: 19,
              taxScheme: { code: TaxCode.IVA, name: "IVA" },
            },
          ],
        },
      ],
    },
  ],
  taxTotals: [
    {
      taxAmount: 4750,
      subtotals: [
        {
          taxableAmount: 25000,
          taxAmount: 4750,
          percent: 19,
          taxScheme: { code: TaxCode.IVA, name: "IVA" },
        },
      ],
    },
  ],
  legalMonetaryTotal: {
    lineExtensionAmount: 25000,
    taxExclusiveAmount: 25000,
    taxInclusiveAmount: 29750,
    allowanceTotalAmount: 0,
    chargeTotalAmount: 0,
    prepaidAmount: 0,
    payableAmount: 29750,
  },
  paymentMeans: {
    paymentForm: PaymentForm.CONTADO,
    paymentMethod: PaymentMethod.EFECTIVO,
  },
};

// --- Tests ---

describe("DianKit", () => {
  let kit: DianKit;

  beforeEach(() => {
    vi.clearAllMocks();
    kit = new DianKit(testConfig);
  });

  describe("constructor", () => {
    it("loads the .p12 certificate on initialization", () => {
      expect(loadP12).toHaveBeenCalledWith(testConfig.certificate, testConfig.certificatePassword);
    });

    it("stores resolved config with certificate data", () => {
      expect(kit).toBeDefined();
    });
  });

  describe("createInvoice", () => {
    it("returns xml, signedXml, uuid, and documentNumber", async () => {
      const result = await kit.createInvoice(testInvoiceInput);

      expect(result).toEqual({
        xml: "<Invoice>mock</Invoice>",
        signedXml: "<SignedXml>mock</SignedXml>",
        uuid: "mock-cufe-sha384-hash",
        documentNumber: "SETP990000001",
      });
    });

    it("generates CUFE from assembled DianDocument", async () => {
      await kit.createInvoice(testInvoiceInput);

      expect(generateCufe).toHaveBeenCalledTimes(1);
      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.documentType).toBe(DocumentType.FACTURA_VENTA);
      expect(doc.operationType).toBe(OperationType.ESTANDAR);
      expect(doc.environment).toBe(Environment.HABILITACION);
      expect(doc.id).toBe("SETP990000001");
      expect(doc.supplier).toEqual({
        ...testSupplier,
        corporateRegistration: { prefix: "SETP" },
      });
      expect(doc.customer).toEqual(testCustomer);
    });

    it("computes SoftwareSecurityCode with software.id, software.pin, and document id", async () => {
      await kit.createInvoice(testInvoiceInput);

      expect(generateSoftwareSecurityCode).toHaveBeenCalledWith(
        "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "12345",
        "SETP990000001",
      );
    });

    it("builds XML with CUFE and SoftwareSecurityCode", async () => {
      await kit.createInvoice(testInvoiceInput);

      expect(buildInvoiceXml).toHaveBeenCalledWith(
        expect.objectContaining({ id: "SETP990000001" }),
        "mock-cufe-sha384-hash",
        "mock-software-security-code",
      );
    });

    it("signs XML with loaded certificate and signingTime from issueDate", async () => {
      await kit.createInvoice(testInvoiceInput);

      expect(signXml).toHaveBeenCalledWith({
        xml: "<Invoice>mock</Invoice>",
        certificate: MOCK_CERTIFICATE,
        signingTime: baseDate,
      });
    });

    it("defaults documentType to FACTURA_VENTA (01)", async () => {
      await kit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.documentType).toBe(DocumentType.FACTURA_VENTA);
    });

    it("allows overriding documentType to POS (20)", async () => {
      await kit.createInvoice({ ...testInvoiceInput, documentType: DocumentType.POS });

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.documentType).toBe(DocumentType.POS);
    });

    it("defaults currency to COP", async () => {
      await kit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.currency).toBe("COP");
    });

    it("allows overriding currency", async () => {
      await kit.createInvoice({ ...testInvoiceInput, currency: "USD" });

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.currency).toBe("USD");
    });

    it("merges supplier from config into DianDocument", async () => {
      await kit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.supplier.identification.number).toBe("900123456");
      expect(doc.supplier.name).toBe("Peluquería Estilo Total");
    });

    it("auto-populates corporateRegistration.prefix from numbering config", async () => {
      await kit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.supplier.corporateRegistration).toEqual({ prefix: "SETP" });
    });

    it("preserves user-provided corporateRegistration.prefix", async () => {
      const customConfig: DianKitConfig = {
        ...testConfig,
        supplier: {
          ...testSupplier,
          corporateRegistration: { prefix: "CUSTOM", name: "My Corp" },
        },
      };
      const customKit = new DianKit(customConfig);
      await customKit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.supplier.corporateRegistration).toEqual({ prefix: "CUSTOM", name: "My Corp" });
    });

    it("merges software and numbering from config", async () => {
      await kit.createInvoice(testInvoiceInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.software.id).toBe("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
      expect(doc.numbering.authorizationNumber).toBe("18760000001");
    });
  });

  describe("createCreditNote", () => {
    const creditNoteInput: CreditNoteInput = {
      ...testInvoiceInput,
      id: "NC990000001",
      billingReference: {
        id: "SETP990000001",
        uuid: "original-cufe-hash",
        issueDate: baseDate,
      },
      discrepancyResponse: {
        referenceId: "SETP990000001",
        responseCode: "2",
        description: "Anulación de la factura",
      },
    };

    it("uses DocumentType NOTA_CREDITO (91) and OperationType NOTA_CREDITO (20)", async () => {
      await kit.createCreditNote(creditNoteInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.documentType).toBe(DocumentType.NOTA_CREDITO);
      expect(doc.operationType).toBe(OperationType.NOTA_CREDITO);
    });

    it("includes billingReference and discrepancyResponse", async () => {
      await kit.createCreditNote(creditNoteInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.billingReference).toEqual(creditNoteInput.billingReference);
      expect(doc.discrepancyResponse).toEqual(creditNoteInput.discrepancyResponse);
    });

    it("calls buildCreditNoteXml", async () => {
      await kit.createCreditNote(creditNoteInput);

      expect(buildCreditNoteXml).toHaveBeenCalledTimes(1);
      expect(buildInvoiceXml).not.toHaveBeenCalled();
    });

    it("returns correct result structure", async () => {
      const result = await kit.createCreditNote(creditNoteInput);

      expect(result).toEqual({
        xml: "<CreditNote>mock</CreditNote>",
        signedXml: "<SignedXml>mock</SignedXml>",
        uuid: "mock-cufe-sha384-hash",
        documentNumber: "NC990000001",
      });
    });
  });

  describe("createDebitNote", () => {
    const debitNoteInput: DebitNoteInput = {
      ...testInvoiceInput,
      id: "ND990000001",
      billingReference: {
        id: "SETP990000001",
        uuid: "original-cufe-hash",
        issueDate: baseDate,
      },
      discrepancyResponse: {
        referenceId: "SETP990000001",
        responseCode: "1",
        description: "Intereses por mora",
      },
    };

    it("uses DocumentType NOTA_DEBITO (92) and OperationType NOTA_DEBITO (30)", async () => {
      await kit.createDebitNote(debitNoteInput);

      const doc = vi.mocked(generateCufe).mock.calls[0]![0] as DianDocument;
      expect(doc.documentType).toBe(DocumentType.NOTA_DEBITO);
      expect(doc.operationType).toBe(OperationType.NOTA_DEBITO);
    });

    it("calls buildDebitNoteXml", async () => {
      await kit.createDebitNote(debitNoteInput);

      expect(buildDebitNoteXml).toHaveBeenCalledTimes(1);
      expect(buildInvoiceXml).not.toHaveBeenCalled();
    });

    it("returns correct result structure", async () => {
      const result = await kit.createDebitNote(debitNoteInput);

      expect(result).toEqual({
        xml: "<DebitNote>mock</DebitNote>",
        signedXml: "<SignedXml>mock</SignedXml>",
        uuid: "mock-cufe-sha384-hash",
        documentNumber: "ND990000001",
      });
    });
  });

  describe("send", () => {
    const mockDocumentResult = {
      xml: "<Invoice>mock</Invoice>",
      signedXml: "<SignedXml>mock</SignedXml>",
      uuid: "mock-cufe-sha384-hash",
      documentNumber: "SETP990000001",
    };

    it("sends with default SendBillSync method", async () => {
      await kit.send(mockDocumentResult);

      expect(sendBill).toHaveBeenCalledWith({
        signedXml: "<SignedXml>mock</SignedXml>",
        supplierNit: "900123456",
        documentNumber: "SETP990000001",
        auth: { certificate: MOCK_CERTIFICATE },
        environment: Environment.HABILITACION,
        method: undefined,
        testSetId: undefined,
        timeoutMs: undefined,
      });
    });

    it("passes SendTestSetAsync method and testSetId", async () => {
      await kit.send(mockDocumentResult, {
        method: "SendTestSetAsync" as any,
        testSetId: "test-set-abc",
      });

      expect(sendBill).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "SendTestSetAsync",
          testSetId: "test-set-abc",
        }),
      );
    });

    it("returns DianSendResponse", async () => {
      const response = await kit.send(mockDocumentResult);

      expect(response.isValid).toBe(true);
      expect(response.statusCode).toBe("00");
      expect(response.trackId).toBe("track-123");
    });

    it("uses timeoutMs from config", async () => {
      const kitWithTimeout = new DianKit({ ...testConfig, timeoutMs: 60_000 });
      await kitWithTimeout.send(mockDocumentResult);

      expect(sendBill).toHaveBeenCalledWith(
        expect.objectContaining({ timeoutMs: 60_000 }),
      );
    });
  });

  describe("getStatus", () => {
    it("queries status by CUFE/CUDE", async () => {
      const result = await kit.getStatus("mock-cufe-sha384-hash");

      expect(getStatus).toHaveBeenCalledWith({
        trackId: "mock-cufe-sha384-hash",
        auth: { certificate: MOCK_CERTIFICATE },
        environment: Environment.HABILITACION,
        timeoutMs: undefined,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("getStatusZip", () => {
    it("queries batch status by ZIP ID", async () => {
      const result = await kit.getStatusZip("zip-track-id");

      expect(getStatusZip).toHaveBeenCalledWith({
        trackId: "zip-track-id",
        auth: { certificate: MOCK_CERTIFICATE },
        environment: Environment.HABILITACION,
        timeoutMs: undefined,
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe("getNumberingRange", () => {
    it("queries numbering ranges with supplier NIT and software ID", async () => {
      await kit.getNumberingRange();

      expect(getNumberingRange).toHaveBeenCalledWith({
        accountCode: "900123456",
        accountCodeT: "900123456",
        softwareCode: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        auth: { certificate: MOCK_CERTIFICATE },
        environment: Environment.HABILITACION,
        timeoutMs: undefined,
      });
    });

    it("allows overriding accountCodeT for technology providers", async () => {
      await kit.getNumberingRange("800456789");

      expect(getNumberingRange).toHaveBeenCalledWith(
        expect.objectContaining({ accountCodeT: "800456789" }),
      );
    });

    it("returns numbering ranges", async () => {
      const result = await kit.getNumberingRange();

      expect(result.ranges).toHaveLength(1);
      expect(result.ranges[0]!.prefix).toBe("SETP");
    });
  });

  describe("lookupBuyer", () => {
    it("queries acquirer by identification type and number", async () => {
      const result = await kit.lookupBuyer({
        identificationType: "31",
        identificationNumber: "900654321",
      });

      expect(getAcquirer).toHaveBeenCalledWith({
        identificationType: "31",
        identificationNumber: "900654321",
        auth: { certificate: MOCK_CERTIFICATE },
        environment: Environment.HABILITACION,
        timeoutMs: undefined,
      });
      expect(result.receiverName).toBe("EMPRESA XYZ SAS");
      expect(result.receiverEmail).toBe("facturacion@empresa.com");
    });
  });

  describe("end-to-end flow", () => {
    it("create → send pipeline works", async () => {
      const invoice = await kit.createInvoice(testInvoiceInput);
      const response = await kit.send(invoice);

      expect(invoice.uuid).toBe("mock-cufe-sha384-hash");
      expect(invoice.signedXml).toBe("<SignedXml>mock</SignedXml>");
      expect(response.isValid).toBe(true);
      expect(response.statusCode).toBe("00");
    });
  });
});
