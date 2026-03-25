export const DocumentType = {
  FACTURA_VENTA: "01",
  FACTURA_EXPORTACION: "02",
  DOCUMENTO_TRANSMISION: "03",
  FACTURA_TIPO_04: "04",
  DOCUMENTO_SOPORTE: "05",
  POS: "20",
  BOLETA_CINE: "25",
  BOLETA_ESPECTACULOS: "27",
  JUEGOS_LOCALIZADOS: "30",
  CONTROL_VENTAS_JUEGOS: "32",
  TRANSPORTE_TERRESTRE: "35",
  PEAJES: "40",
  EXTRACTO_FINANCIERO: "45",
  TRANSPORTE_AEREO: "50",
  BOLSA_VALORES: "55",
  SERVICIOS_PUBLICOS: "60",
  NOTA_CREDITO: "91",
  NOTA_DEBITO: "92",
  NOTA_AJUSTE_DEBITO_DOC_EQUIV: "93",
  NOTA_AJUSTE_CREDITO_DOC_EQUIV: "94",
  EVENTOS: "96",
} as const;

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

export const OperationType = {
  ESTANDAR: "10",
  NOTA_CREDITO: "20",
  NOTA_DEBITO: "30",
} as const;

export type OperationTypeValue = (typeof OperationType)[keyof typeof OperationType];

export const Environment = {
  PRODUCCION: "1",
  HABILITACION: "2",
} as const;

export type EnvironmentValue = (typeof Environment)[keyof typeof Environment];

export const IdentificationType = {
  REGISTRO_CIVIL: "11",
  TARJETA_IDENTIDAD: "12",
  CEDULA_CIUDADANIA: "13",
  TARJETA_EXTRANJERIA: "21",
  CEDULA_EXTRANJERIA: "22",
  NIT: "31",
  PASAPORTE: "41",
  DOCUMENTO_EXTRANJERO: "42",
  PEP: "47",
  PPT: "48",
  NIT_OTRO_PAIS: "50",
  NUIP: "91",
} as const;

export type IdentificationTypeValue =
  (typeof IdentificationType)[keyof typeof IdentificationType];

export const PersonType = {
  JURIDICA: "1",
  NATURAL: "2",
} as const;

export type PersonTypeValue = (typeof PersonType)[keyof typeof PersonType];

export const FiscalResponsibility = {
  GRAN_CONTRIBUYENTE: "O-13",
  AUTORRETENEDOR: "O-15",
  AGENTE_RETENCION_IVA: "O-23",
  REGIMEN_SIMPLE: "O-47",
  NO_APLICA: "R-99-PN",
} as const;

export const PaymentForm = {
  CONTADO: "1",
  CREDITO: "2",
} as const;

export const PaymentMethod = {
  EFECTIVO: "10",
  CHEQUE: "20",
  TRANSFERENCIA_CREDITO: "30",
  CONSIGNACION_BANCARIA: "42",
  TRANSFERENCIA_DEBITO: "47",
  TARJETA_CREDITO: "48",
  TARJETA_DEBITO: "49",
  OTRO: "ZZZ",
} as const;
