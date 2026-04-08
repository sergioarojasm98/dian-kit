import { describe, expect, it } from "vitest";

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
} from "../../src/constants/index.js";
import { generateCufe, generateSoftwareSecurityCode } from "../../src/security/cufe.js";
import type { DianDocument } from "../../src/types/common.js";
import { buildInvoiceXml, buildCreditNoteXml, buildDebitNoteXml } from "../../src/xml/builder.js";

function createTestDocument(
  docType: string = DocumentType.POS,
): DianDocument {
  const baseDate = new Date(2026, 2, 24, 14, 30, 0);

  return {
    documentType: docType,
    operationType: OperationType.ESTANDAR,
    environment: Environment.HABILITACION,
    id: docType === DocumentType.POS ? "POS990000001" : "SETP990000001",
    issueDate: baseDate,
    issueTime: baseDate,
    currency: "COP",
    supplier: {
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
        },
      },
      address: {
        street: "Calle 45 # 12-34",
        cityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá",
      },
      email: "contacto@estilototal.co",
    },
    customer: {
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
        street: "",
        cityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá",
      },
    },
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
      {
        id: "2",
        quantity: 1,
        unitCode: "EA",
        description: "Tinte completo",
        price: 80000,
        lineExtensionAmount: 80000,
        taxTotals: [
          {
            taxAmount: 15200,
            subtotals: [
              {
                taxableAmount: 80000,
                taxAmount: 15200,
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
        taxAmount: 19950,
        subtotals: [
          {
            taxableAmount: 105000,
            taxAmount: 19950,
            percent: 19,
            taxScheme: { code: TaxCode.IVA, name: "IVA" },
          },
        ],
      },
    ],
    legalMonetaryTotal: {
      lineExtensionAmount: 105000,
      taxExclusiveAmount: 105000,
      taxInclusiveAmount: 124950,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: 124950,
    },
    paymentMeans: {
      paymentForm: PaymentForm.CONTADO,
      paymentMethod: PaymentMethod.EFECTIVO,
    },
    software: {
      id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      pin: "12345",
      providerNit: "900123456",
      providerName: "Peluquería Estilo Total SAS",
    },
    numbering: {
      authorizationNumber: "18760000002",
      prefix: "POS",
      startNumber: 990000000,
      endNumber: 995000000,
      startDate: new Date(2025, 0, 19),
      endDate: new Date(2026, 0, 19),
      technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
    },
  };
}

describe("buildInvoiceXml — POS Document", () => {
  const doc = createTestDocument(DocumentType.POS);
  const uuid = generateCufe(doc);
  const ssc = generateSoftwareSecurityCode(doc.software.id, doc.software.pin, doc.id);
  const xml = buildInvoiceXml(doc, uuid, ssc);

  it("generates valid XML string", () => {
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain("<Invoice");
    expect(xml).toContain("</Invoice>");
  });

  it("includes all required namespaces", () => {
    expect(xml).toContain("xmlns:cac=");
    expect(xml).toContain("xmlns:cbc=");
    expect(xml).toContain("xmlns:ext=");
    expect(xml).toContain("xmlns:sts=");
    expect(xml).toContain("xmlns:ds=");
    expect(xml).toContain("xmlns:xsi=");
  });

  it("sets InvoiceTypeCode to 20 for POS", () => {
    expect(xml).toContain("<cbc:InvoiceTypeCode>20</cbc:InvoiceTypeCode>");
  });

  it("includes CUDE-SHA384 scheme name for POS", () => {
    expect(xml).toContain('schemeName="CUDE-SHA384"');
  });

  it("includes the CUDE value", () => {
    expect(xml).toContain(uuid);
  });

  it("includes consumidor final data", () => {
    expect(xml).toContain("222222222222");
    expect(xml).toContain("Consumidor Final");
  });

  it("includes supplier data", () => {
    expect(xml).toContain("900123456");
    expect(xml).toContain("Peluquería Estilo Total");
  });

  it("includes invoice lines", () => {
    expect(xml).toContain("Corte de cabello");
    expect(xml).toContain("Tinte completo");
    expect(xml).toContain("<cbc:InvoicedQuantity");
  });

  it("includes tax totals", () => {
    expect(xml).toContain("19950.00");
    expect(xml).toContain("<cbc:Percent>19.00</cbc:Percent>");
  });

  it("includes monetary totals", () => {
    expect(xml).toContain("<cbc:PayableAmount");
    expect(xml).toContain("124950.00");
  });

  it("includes DIAN extensions", () => {
    expect(xml).toContain("DianExtensions");
    expect(xml).toContain("InvoiceAuthorization");
    expect(xml).toContain("SoftwareSecurityCode");
    expect(xml).toContain("AuthorizationProvider");
    expect(xml).toContain("QRCode");
  });

  it("includes digital signature placeholder", () => {
    expect(xml).toContain("FIRMA DIGITAL");
  });

  it("includes document number", () => {
    expect(xml).toContain("<cbc:ID>POS990000001</cbc:ID>");
  });

  it("includes dates", () => {
    expect(xml).toContain("2026-03-24");
    expect(xml).toContain("14:30:00-05:00");
  });
});

describe("buildInvoiceXml — Factura Electrónica de Venta", () => {
  const doc = createTestDocument(DocumentType.FACTURA_VENTA);
  doc.id = "SETP990000001";
  doc.customer = {
    name: "Juan Pérez",
    identification: { number: "52123456", type: IdentificationType.CEDULA_CIUDADANIA },
    personType: PersonType.NATURAL,
    fiscalResponsibilities: [FiscalResponsibility.NO_APLICA],
    taxInfo: {
      registrationName: "Juan Pérez",
      companyId: { number: "52123456", type: IdentificationType.CEDULA_CIUDADANIA },
      taxLevelCode: FiscalResponsibility.NO_APLICA,
      taxScheme: { code: TaxCode.NO_APLICA, name: "No Aplica" },
    },
    address: {
      street: "Carrera 7 # 32-18",
      cityCode: "11001",
      cityName: "Bogotá, D.C.",
      departmentCode: "11",
      departmentName: "Bogotá",
    },
    email: "juan@example.com",
  };

  const uuid = generateCufe(doc);
  const ssc = generateSoftwareSecurityCode(doc.software.id, doc.software.pin, doc.id);
  const xml = buildInvoiceXml(doc, uuid, ssc);

  it("sets InvoiceTypeCode to 01 for Factura", () => {
    expect(xml).toContain("<cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>");
  });

  it("includes CUFE-SHA384 scheme name", () => {
    expect(xml).toContain('schemeName="CUFE-SHA384"');
  });

  it("includes buyer email", () => {
    expect(xml).toContain("juan@example.com");
  });

  it("includes buyer identification", () => {
    expect(xml).toContain("52123456");
    expect(xml).toContain("Juan Pérez");
  });
});

describe("buildCreditNoteXml — Nota Crédito (type 91)", () => {
  const baseDoc = createTestDocument(DocumentType.NOTA_CREDITO);
  const doc: DianDocument = {
    ...baseDoc,
    id: "NC990000001",
    operationType: OperationType.NOTA_CREDITO,
    numbering: {
      ...baseDoc.numbering,
      prefix: "NC",
    },
    billingReference: {
      id: "SETP990000001",
      uuid: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456",
      issueDate: new Date(2026, 2, 20),
    },
    discrepancyResponse: {
      referenceId: "SETP990000001",
      responseCode: "2",
      description: "Anulación de la factura",
    },
    notes: ["Nota crédito por anulación de factura SETP990000001"],
  };

  const uuid = generateCufe(doc);
  const ssc = generateSoftwareSecurityCode(doc.software.id, doc.software.pin, doc.id);
  const xml = buildCreditNoteXml(doc, uuid, ssc);

  it("generates CreditNote root element (not Invoice)", () => {
    expect(xml).toContain("<CreditNote");
    expect(xml).toContain("</CreditNote>");
    expect(xml).not.toContain("<Invoice");
  });

  it("uses CreditNote namespace", () => {
    expect(xml).toContain("urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2");
    expect(xml).not.toContain("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
  });

  it("uses CreditNote schema location", () => {
    expect(xml).toContain("UBL-CreditNote-2.1.xsd");
  });

  it("uses CreditNoteTypeCode instead of InvoiceTypeCode", () => {
    expect(xml).toContain("<cbc:CreditNoteTypeCode>91</cbc:CreditNoteTypeCode>");
    expect(xml).not.toContain("InvoiceTypeCode");
  });

  it("uses CreditNoteLine instead of InvoiceLine", () => {
    expect(xml).toContain("<cac:CreditNoteLine>");
    expect(xml).toContain("</cac:CreditNoteLine>");
    expect(xml).not.toContain("InvoiceLine");
  });

  it("uses CreditedQuantity instead of InvoicedQuantity", () => {
    expect(xml).toContain("<cbc:CreditedQuantity");
    expect(xml).not.toContain("InvoicedQuantity");
  });

  it("includes CUDE-SHA384 scheme name", () => {
    expect(xml).toContain('schemeName="CUDE-SHA384"');
  });

  it("includes BillingReference with original invoice", () => {
    expect(xml).toContain("InvoiceDocumentReference");
    expect(xml).toContain("<cbc:ID>SETP990000001</cbc:ID>");
    expect(xml).toContain('schemeName="CUFE-SHA384"');
  });

  it("includes DiscrepancyResponse", () => {
    expect(xml).toContain("<cac:DiscrepancyResponse>");
    expect(xml).toContain("<cbc:ReferenceID>SETP990000001</cbc:ReferenceID>");
    expect(xml).toContain("<cbc:ResponseCode>2</cbc:ResponseCode>");
    expect(xml).toContain("<cbc:Description>Anulación de la factura</cbc:Description>");
  });

  it("includes note text", () => {
    expect(xml).toContain("Nota crédito por anulación de factura SETP990000001");
  });

  it("includes ProfileID for Nota Crédito", () => {
    expect(xml).toContain("DIAN 2.1: Nota Crédito de Factura Electrónica de Venta");
  });

  it("includes all required namespaces", () => {
    expect(xml).toContain("xmlns:cac=");
    expect(xml).toContain("xmlns:cbc=");
    expect(xml).toContain("xmlns:ext=");
    expect(xml).toContain("xmlns:sts=");
    expect(xml).toContain("xmlns:ds=");
  });

  it("includes DIAN extensions", () => {
    expect(xml).toContain("DianExtensions");
    expect(xml).toContain("SoftwareSecurityCode");
    expect(xml).toContain("QRCode");
  });

  it("includes supplier and customer data", () => {
    expect(xml).toContain("900123456");
    expect(xml).toContain("Peluquería Estilo Total");
  });

  it("includes tax totals and monetary totals", () => {
    expect(xml).toContain("19950.00");
    expect(xml).toContain("<cbc:PayableAmount");
    expect(xml).toContain("124950.00");
  });
});

describe("buildDebitNoteXml — Nota Débito (type 92)", () => {
  const baseDoc = createTestDocument(DocumentType.NOTA_DEBITO);
  const doc: DianDocument = {
    ...baseDoc,
    id: "ND990000001",
    operationType: OperationType.NOTA_DEBITO,
    numbering: {
      ...baseDoc.numbering,
      prefix: "ND",
    },
    billingReference: {
      id: "SETP990000001",
      uuid: "abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456abc123def456",
      issueDate: new Date(2026, 2, 20),
    },
    discrepancyResponse: {
      referenceId: "SETP990000001",
      responseCode: "1",
      description: "Intereses por mora en el pago",
    },
    notes: ["Nota débito por intereses de mora sobre factura SETP990000001"],
  };

  const uuid = generateCufe(doc);
  const ssc = generateSoftwareSecurityCode(doc.software.id, doc.software.pin, doc.id);
  const xml = buildDebitNoteXml(doc, uuid, ssc);

  it("generates DebitNote root element (not Invoice or CreditNote)", () => {
    expect(xml).toContain("<DebitNote");
    expect(xml).toContain("</DebitNote>");
    expect(xml).not.toContain("<Invoice");
    expect(xml).not.toContain("<CreditNote");
  });

  it("uses DebitNote namespace", () => {
    expect(xml).toContain("urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2");
    expect(xml).not.toContain("urn:oasis:names:specification:ubl:schema:xsd:Invoice-2");
    expect(xml).not.toContain("urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2");
  });

  it("uses DebitNote schema location", () => {
    expect(xml).toContain("UBL-DebitNote-2.1.xsd");
  });

  it("uses DebitNoteTypeCode instead of InvoiceTypeCode", () => {
    expect(xml).toContain("<cbc:DebitNoteTypeCode>92</cbc:DebitNoteTypeCode>");
    expect(xml).not.toContain("InvoiceTypeCode");
    expect(xml).not.toContain("CreditNoteTypeCode");
  });

  it("uses DebitNoteLine instead of InvoiceLine", () => {
    expect(xml).toContain("<cac:DebitNoteLine>");
    expect(xml).toContain("</cac:DebitNoteLine>");
    expect(xml).not.toContain("InvoiceLine");
    expect(xml).not.toContain("CreditNoteLine");
  });

  it("uses DebitedQuantity instead of InvoicedQuantity", () => {
    expect(xml).toContain("<cbc:DebitedQuantity");
    expect(xml).not.toContain("InvoicedQuantity");
    expect(xml).not.toContain("CreditedQuantity");
  });

  it("includes CUDE-SHA384 scheme name", () => {
    expect(xml).toContain('schemeName="CUDE-SHA384"');
  });

  it("includes BillingReference with original invoice", () => {
    expect(xml).toContain("InvoiceDocumentReference");
    expect(xml).toContain("<cbc:ID>SETP990000001</cbc:ID>");
    expect(xml).toContain('schemeName="CUFE-SHA384"');
  });

  it("includes DiscrepancyResponse", () => {
    expect(xml).toContain("<cac:DiscrepancyResponse>");
    expect(xml).toContain("<cbc:ReferenceID>SETP990000001</cbc:ReferenceID>");
    expect(xml).toContain("<cbc:ResponseCode>1</cbc:ResponseCode>");
    expect(xml).toContain("<cbc:Description>Intereses por mora en el pago</cbc:Description>");
  });

  it("includes note text", () => {
    expect(xml).toContain("Nota débito por intereses de mora sobre factura SETP990000001");
  });

  it("includes ProfileID for Nota Débito", () => {
    expect(xml).toContain("DIAN 2.1: Nota Débito de Factura Electrónica de Venta");
  });

  it("includes all required namespaces", () => {
    expect(xml).toContain("xmlns:cac=");
    expect(xml).toContain("xmlns:cbc=");
    expect(xml).toContain("xmlns:ext=");
    expect(xml).toContain("xmlns:sts=");
    expect(xml).toContain("xmlns:ds=");
  });

  it("includes DIAN extensions", () => {
    expect(xml).toContain("DianExtensions");
    expect(xml).toContain("SoftwareSecurityCode");
    expect(xml).toContain("QRCode");
  });

  it("includes supplier and customer data", () => {
    expect(xml).toContain("900123456");
    expect(xml).toContain("Peluquería Estilo Total");
  });

  it("includes tax totals and monetary totals", () => {
    expect(xml).toContain("19950.00");
    expect(xml).toContain("<cbc:PayableAmount");
    expect(xml).toContain("124950.00");
  });
});
