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
import {
  buildCufeInput,
  concatenateCufeFields,
  generateCufe,
  generateSoftwareSecurityCode,
  sha384,
} from "../../src/security/cufe.js";
import type { DianDocument } from "../../src/types/common.js";

function createTestInvoice(overrides?: Partial<DianDocument>): DianDocument {
  const baseDate = new Date(2026, 2, 24, 14, 30, 0);

  return {
    documentType: DocumentType.FACTURA_VENTA,
    operationType: OperationType.ESTANDAR,
    environment: Environment.HABILITACION,
    id: "SETP990000001",
    issueDate: baseDate,
    issueTime: baseDate,
    currency: "COP",
    supplier: {
      name: "Empresa Test SAS",
      identification: { number: "900123456", type: IdentificationType.NIT, dv: "7" },
      personType: PersonType.JURIDICA,
      fiscalResponsibilities: [FiscalResponsibility.GRAN_CONTRIBUYENTE],
      taxInfo: {
        registrationName: "Empresa Test SAS",
        companyId: { number: "900123456", type: IdentificationType.NIT, dv: "7" },
        taxLevelCode: FiscalResponsibility.GRAN_CONTRIBUYENTE,
        taxScheme: { code: TaxCode.IVA, name: "IVA" },
      },
      address: {
        street: "Calle 100 # 45-67",
        cityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá",
      },
      email: "test@empresa.com",
    },
    customer: {
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
    },
    lines: [
      {
        id: "1",
        quantity: 1,
        unitCode: "EA",
        description: "Consultoría de infraestructura",
        price: 500000,
        lineExtensionAmount: 500000,
        taxTotals: [
          {
            taxAmount: 95000,
            subtotals: [
              {
                taxableAmount: 500000,
                taxAmount: 95000,
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
        taxAmount: 95000,
        subtotals: [
          {
            taxableAmount: 500000,
            taxAmount: 95000,
            percent: 19,
            taxScheme: { code: TaxCode.IVA, name: "IVA" },
          },
        ],
      },
    ],
    legalMonetaryTotal: {
      lineExtensionAmount: 500000,
      taxExclusiveAmount: 500000,
      taxInclusiveAmount: 595000,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      prepaidAmount: 0,
      payableAmount: 595000,
    },
    paymentMeans: {
      paymentForm: PaymentForm.CONTADO,
      paymentMethod: PaymentMethod.EFECTIVO,
    },
    software: {
      id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      pin: "12345",
      providerNit: "900123456",
      providerName: "Empresa Test SAS",
    },
    numbering: {
      authorizationNumber: "18760000001",
      prefix: "SETP",
      startNumber: 990000000,
      endNumber: 995000000,
      startDate: new Date(2025, 0, 19),
      endDate: new Date(2026, 0, 19),
      technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
    },
    ...overrides,
  };
}

function createTestPOS(overrides?: Partial<DianDocument>): DianDocument {
  return createTestInvoice({
    documentType: DocumentType.POS,
    id: "POS990000001",
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
    numbering: {
      authorizationNumber: "18760000002",
      prefix: "POS",
      startNumber: 990000000,
      endNumber: 995000000,
      startDate: new Date(2025, 0, 19),
      endDate: new Date(2026, 0, 19),
    },
    ...overrides,
  });
}

describe("sha384", () => {
  it("generates correct SHA-384 hash", () => {
    const hash = sha384("hello");
    expect(hash).toHaveLength(96);
    expect(hash).toBe(
      "59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f",
    );
  });

  it("generates lowercase hex output", () => {
    const hash = sha384("test");
    expect(hash).toMatch(/^[0-9a-f]{96}$/);
  });
});

describe("buildCufeInput", () => {
  it("extracts correct fields from invoice", () => {
    const doc = createTestInvoice();
    const input = buildCufeInput(doc);

    expect(input.numFac).toBe("SETP990000001");
    expect(input.fecFac).toBe("2026-03-24");
    expect(input.horFac).toBe("14:30:00-05:00");
    expect(input.valFac).toBe("500000.00");
    expect(input.codImp1).toBe("01");
    expect(input.valImp1).toBe("95000.00");
    expect(input.codImp2).toBe("04");
    expect(input.valImp2).toBe("0.00");
    expect(input.codImp3).toBe("03");
    expect(input.valImp3).toBe("0.00");
    expect(input.valTot).toBe("595000.00");
    expect(input.nitOFE).toBe("900123456");
    expect(input.numAdq).toBe("52123456");
    expect(input.clTecOrPin).toBe("fc8eac422eba16e22ffd8c6f94b3f40a6e38571d");
    expect(input.tipoAmb).toBe("2");
  });

  it("uses PIN for POS documents (CUDE)", () => {
    const doc = createTestPOS();
    const input = buildCufeInput(doc);

    expect(input.clTecOrPin).toBe("12345");
    expect(input.numAdq).toBe("222222222222");
  });

  it("throws if technicalKey missing for CUFE document", () => {
    const doc = createTestInvoice({
      numbering: {
        authorizationNumber: "18760000001",
        prefix: "SETP",
        startNumber: 990000000,
        endNumber: 995000000,
        startDate: new Date(2025, 0, 19),
        endDate: new Date(2026, 0, 19),
        technicalKey: undefined,
      },
    });

    expect(() => buildCufeInput(doc)).toThrow("clave técnica");
  });
});

describe("concatenateCufeFields", () => {
  it("concatenates all 15 fields in order", () => {
    const raw = concatenateCufeFields({
      numFac: "SETP990000001",
      fecFac: "2026-03-24",
      horFac: "14:30:00-05:00",
      valFac: "500000.00",
      codImp1: "01",
      valImp1: "95000.00",
      codImp2: "04",
      valImp2: "0.00",
      codImp3: "03",
      valImp3: "0.00",
      valTot: "595000.00",
      nitOFE: "900123456",
      numAdq: "52123456",
      clTecOrPin: "fc8eac422eba16e22ffd8c6f94b3f40a6e38571d",
      tipoAmb: "2",
    });

    expect(raw).toBe(
      "SETP9900000012026-03-2414:30:00-05:00500000.000195000.00040.00030.00595000.0090012345652123456fc8eac422eba16e22ffd8c6f94b3f40a6e38571d2",
    );
  });
});

describe("generateCufe", () => {
  it("generates a 96-char lowercase hex string", () => {
    const doc = createTestInvoice();
    const cufe = generateCufe(doc);

    expect(cufe).toHaveLength(96);
    expect(cufe).toMatch(/^[0-9a-f]{96}$/);
  });

  it("is deterministic (same input = same output)", () => {
    const doc = createTestInvoice();
    expect(generateCufe(doc)).toBe(generateCufe(doc));
  });

  it("differs between invoice and POS", () => {
    const invoice = createTestInvoice();
    const pos = createTestPOS();

    expect(generateCufe(invoice)).not.toBe(generateCufe(pos));
  });
});

describe("generateSoftwareSecurityCode", () => {
  it("generates SHA-384 of SoftwareID + PIN + NumFac", () => {
    const code = generateSoftwareSecurityCode(
      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "12345",
      "SETP990000001",
    );

    expect(code).toHaveLength(96);
    expect(code).toMatch(/^[0-9a-f]{96}$/);

    const expected = sha384("xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx12345SETP990000001");
    expect(code).toBe(expected);
  });
});
