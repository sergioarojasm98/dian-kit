/**
 * DIAN document type codes as defined in the Colombian electronic invoicing technical annex.
 * Each code identifies a specific type of fiscal document accepted by the DIAN.
 *
 * @example
 * ```typescript
 * const docType = DocumentType.FACTURA_VENTA; // "01"
 * ```
 */
export const DocumentType = {
  /** 01 - Standard electronic sales invoice (Factura Electronica de Venta) */
  FACTURA_VENTA: "01",
  /** 02 - Export invoice */
  FACTURA_EXPORTACION: "02",
  /** 03 - Transmission document */
  DOCUMENTO_TRANSMISION: "03",
  /** 04 - Type 04 invoice */
  FACTURA_TIPO_04: "04",
  /** 05 - Support document for acquisitions from non-invoicing parties */
  DOCUMENTO_SOPORTE: "05",
  /** 20 - POS electronic equivalent document (tiquete de maquina registradora) */
  POS: "20",
  /** 25 - Cinema ticket equivalent document */
  BOLETA_CINE: "25",
  /** 27 - Entertainment/show ticket equivalent document */
  BOLETA_ESPECTACULOS: "27",
  /** 30 - Localized gaming equivalent document */
  JUEGOS_LOCALIZADOS: "30",
  /** 32 - Gaming sales control equivalent document */
  CONTROL_VENTAS_JUEGOS: "32",
  /** 35 - Land transport equivalent document */
  TRANSPORTE_TERRESTRE: "35",
  /** 40 - Toll equivalent document */
  PEAJES: "40",
  /** 45 - Financial statement equivalent document */
  EXTRACTO_FINANCIERO: "45",
  /** 50 - Air transport equivalent document */
  TRANSPORTE_AEREO: "50",
  /** 55 - Stock exchange equivalent document */
  BOLSA_VALORES: "55",
  /** 60 - Public utilities equivalent document */
  SERVICIOS_PUBLICOS: "60",
  /** 91 - Credit note for electronic sales invoice */
  NOTA_CREDITO: "91",
  /** 92 - Debit note for electronic sales invoice */
  NOTA_DEBITO: "92",
  /** 93 - Debit adjustment note for electronic equivalent document */
  NOTA_AJUSTE_DEBITO_DOC_EQUIV: "93",
  /** 94 - Credit adjustment note for electronic equivalent document */
  NOTA_AJUSTE_CREDITO_DOC_EQUIV: "94",
  /** 96 - Events document */
  EVENTOS: "96",
} as const;

/** Union type of all valid DIAN document type code values (e.g., "01", "91") */
export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType];

/** Documents that use CUFE (clave técnica) */
export const CUFE_DOCUMENTS: ReadonlySet<string> = new Set([
  DocumentType.FACTURA_VENTA,
  DocumentType.FACTURA_EXPORTACION,
  DocumentType.FACTURA_TIPO_04,
]);

/** Documents that use CUDE (PIN del software) */
export const CUDE_DOCUMENTS: ReadonlySet<string> = new Set([
  DocumentType.POS,
  DocumentType.NOTA_CREDITO,
  DocumentType.NOTA_DEBITO,
  DocumentType.NOTA_AJUSTE_DEBITO_DOC_EQUIV,
  DocumentType.NOTA_AJUSTE_CREDITO_DOC_EQUIV,
  DocumentType.DOCUMENTO_SOPORTE,
]);

/**
 * DIAN operation type codes used in the CustomizationID element.
 * Identifies the nature of the electronic document operation.
 *
 * @example
 * ```typescript
 * const op = OperationType.ESTANDAR; // "10"
 * ```
 */
export const OperationType = {
  /** 10 - Standard operation (invoices, POS, equivalent documents) */
  ESTANDAR: "10",
  /** 20 - Credit note operation */
  NOTA_CREDITO: "20",
  /** 30 - Debit note operation */
  NOTA_DEBITO: "30",
} as const;

/** Union type of all valid DIAN operation type code values */
export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

/**
 * DIAN execution environment codes used in ProfileExecutionID.
 * Determines whether documents are sent to production or the certification sandbox.
 *
 * @example
 * ```typescript
 * const env = Environment.HABILITACION; // "2" (sandbox)
 * ```
 */
export const Environment = {
  /** 1 - Production environment (live DIAN system) */
  PRODUCCION: "1",
  /** 2 - Certification/sandbox environment (habilitacion) for testing */
  HABILITACION: "2",
} as const;

/** Union type of valid DIAN environment values ("1" for production, "2" for sandbox) */
export type EnvironmentValue = (typeof Environment)[keyof typeof Environment];

/**
 * Colombian identification document type codes as defined by DIAN.
 * Used in party identification to specify the type of tax ID or personal document.
 *
 * @example
 * ```typescript
 * const idType = IdentificationType.NIT; // "31"
 * ```
 */
export const IdentificationType = {
  /** 11 - Civil registry (Registro Civil) */
  REGISTRO_CIVIL: "11",
  /** 12 - Identity card for minors (Tarjeta de Identidad) */
  TARJETA_IDENTIDAD: "12",
  /** 13 - Colombian citizenship ID (Cedula de Ciudadania) */
  CEDULA_CIUDADANIA: "13",
  /** 21 - Foreigner card (Tarjeta de Extranjeria) */
  TARJETA_EXTRANJERIA: "21",
  /** 22 - Foreigner ID (Cedula de Extranjeria) */
  CEDULA_EXTRANJERIA: "22",
  /** 31 - Tax Identification Number for businesses (NIT) */
  NIT: "31",
  /** 41 - Passport */
  PASAPORTE: "41",
  /** 42 - Foreign document */
  DOCUMENTO_EXTRANJERO: "42",
  /** 47 - Special Permanence Permit (PEP) */
  PEP: "47",
  /** 48 - Temporary Protection Permit (PPT) */
  PPT: "48",
  /** 50 - NIT from another country */
  NIT_OTRO_PAIS: "50",
  /** 91 - Unique Personal Identification Number (NUIP) */
  NUIP: "91",
} as const;

/** Union type of all valid Colombian identification document type codes */
export type IdentificationTypeValue = (typeof IdentificationType)[keyof typeof IdentificationType];

/**
 * Person type codes for DIAN electronic invoicing.
 * Distinguishes between legal entities (companies) and natural persons (individuals).
 *
 * @example
 * ```typescript
 * const personType = PersonType.JURIDICA; // "1" (company)
 * ```
 */
export const PersonType = {
  /** 1 - Legal entity / company (Persona Juridica) */
  JURIDICA: "1",
  /** 2 - Natural person / individual (Persona Natural) */
  NATURAL: "2",
} as const;

/** Union type of valid person type values ("1" for legal entity, "2" for natural person) */
export type PersonTypeValue = (typeof PersonType)[keyof typeof PersonType];

/**
 * DIAN fiscal responsibility codes (obligaciones fiscales).
 * Assigned to taxpayers and reported in the TaxLevelCode element of party information.
 *
 * @example
 * ```typescript
 * const responsibility = FiscalResponsibility.GRAN_CONTRIBUYENTE; // "O-13"
 * ```
 */
export const FiscalResponsibility = {
  /** O-13 - Large taxpayer (Gran Contribuyente) as designated by DIAN */
  GRAN_CONTRIBUYENTE: "O-13",
  /** O-15 - Self-withholding agent (Autorretenedor) */
  AUTORRETENEDOR: "O-15",
  /** O-23 - IVA withholding agent (Agente de Retencion IVA) */
  AGENTE_RETENCION_IVA: "O-23",
  /** O-47 - Simple tax regime (Regimen Simple de Tributacion) */
  REGIMEN_SIMPLE: "O-47",
  /** R-99-PN - Not applicable (typically for natural persons with no special responsibility) */
  NO_APLICA: "R-99-PN",
} as const;

/**
 * Payment form codes for DIAN electronic documents.
 * Indicates whether the payment is immediate (cash) or deferred (credit).
 *
 * @example
 * ```typescript
 * const form = PaymentForm.CONTADO; // "1" (cash/immediate)
 * ```
 */
export const PaymentForm = {
  /** 1 - Cash / immediate payment (Contado) */
  CONTADO: "1",
  /** 2 - Credit / deferred payment (Credito) */
  CREDITO: "2",
} as const;

/**
 * Payment method codes for DIAN electronic documents.
 * Specifies the instrument or channel used for payment.
 *
 * @example
 * ```typescript
 * const method = PaymentMethod.TRANSFERENCIA_CREDITO; // "30"
 * ```
 */
export const PaymentMethod = {
  /** 10 - Cash payment (Efectivo) */
  EFECTIVO: "10",
  /** 20 - Check payment (Cheque) */
  CHEQUE: "20",
  /** 30 - Credit transfer / wire transfer (Transferencia Credito) */
  TRANSFERENCIA_CREDITO: "30",
  /** 42 - Bank deposit (Consignacion Bancaria) */
  CONSIGNACION_BANCARIA: "42",
  /** 47 - Debit transfer (Transferencia Debito) */
  TRANSFERENCIA_DEBITO: "47",
  /** 48 - Credit card payment (Tarjeta de Credito) */
  TARJETA_CREDITO: "48",
  /** 49 - Debit card payment (Tarjeta Debito) */
  TARJETA_DEBITO: "49",
  /** ZZZ - Other payment method not listed above */
  OTRO: "ZZZ",
} as const;
