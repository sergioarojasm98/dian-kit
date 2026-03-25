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
import { buildInvoiceXml } from "../../src/xml/builder.js";

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
