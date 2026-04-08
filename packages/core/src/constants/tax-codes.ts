/**
 * Colombian tax type codes as defined by DIAN for electronic invoicing.
 * Used in TaxScheme elements to identify the specific tax applied to invoice lines and totals.
 *
 * @example
 * ```typescript
 * const taxCode = TaxCode.IVA; // "01"
 * ```
 */
export const TaxCode = {
  /** 01 - Value Added Tax (Impuesto sobre las Ventas - IVA) */
  IVA: "01",
  /** 02 - Consumption Tax (Impuesto al Consumo - IC) */
  IC: "02",
  /** 03 - Industry and Commerce Tax (Impuesto de Industria y Comercio - ICA) */
  ICA: "03",
  /** 04 - National Consumption Tax (Impuesto Nacional al Consumo - INC) */
  INC: "04",
  /** 05 - IVA withholding (Retencion en la fuente por IVA - ReteIVA) */
  RETE_IVA: "05",
  /** 06 - Income withholding (Retencion en la fuente por Renta - ReteRenta) */
  RETE_RENTA: "06",
  /** 07 - ICA withholding (Retencion en la fuente por ICA - ReteICA) */
  RETE_ICA: "07",
  /** 08 - Percentage-based consumption tax (IC Porcentual) */
  IC_PORCENTUAL: "08",
  /** 20 - Horticulture fund contribution (Fondo de Fomento Hortifruticola) */
  FTO_HORTICULTURA: "20",
  /** 21 - Stamp tax (Impuesto de Timbre) */
  TIMBRE: "21",
  /** 22 - Plastic bag consumption tax (INC Bolsas Plasticas) */
  INC_BOLSAS: "22",
  /** 23 - Carbon tax (Impuesto Nacional al Carbono) */
  IN_CARBONO: "23",
  /** 24 - Fuel tax (Impuesto Nacional a Combustibles) */
  IN_COMBUSTIBLES: "24",
  /** 25 - Fuel surcharge (Sobretasa a los Combustibles) */
  SOBRETASA_COMBUSTIBLES: "25",
  /** 26 - SORDICOM contribution */
  SORDICOM: "26",
  /** 30 - Data consumption tax (IC Datos) */
  IC_DATOS: "30",
  /** 32 - Liquor consumption tax (ICL) */
  ICL: "32",
  /** 33 - National tax on production (INPP) */
  INPP: "33",
  /** 34 - Sweetened beverages tax (IBUA) */
  IBUA: "34",
  /** 35 - Ultra-processed food tax (ICUI) */
  ICUI: "35",
  /** 36 - Ad valorem tax */
  AD_VALOREM: "36",
  /** ZZ - No tax applicable */
  NO_APLICA: "ZZ",
} as const;

/** Union type of all valid DIAN tax code values (e.g., "01" for IVA, "04" for INC) */
export type TaxCodeValue = (typeof TaxCode)[keyof typeof TaxCode];

/**
 * Human-readable names for common DIAN tax codes.
 * Maps tax code values to their display names for use in TaxScheme Name elements.
 *
 * @example
 * ```typescript
 * const name = TaxCodeName["01"]; // "IVA"
 * ```
 */
export const TaxCodeName: Record<string, string> = {
  "01": "IVA",
  "02": "IC",
  "03": "ICA",
  "04": "INC",
  "05": "ReteIVA",
  "06": "ReteRenta",
  "07": "ReteICA",
  ZZ: "No Aplica",
};

/** Standard IVA (Value Added Tax) percentage rates allowed by Colombian tax law */
export const IVA_RATES = [0, 5, 16, 19] as const;

/** Standard INC (National Consumption Tax) percentage rates allowed by Colombian tax law */
export const INC_RATES = [2, 4, 8, 16] as const;

/**
 * Tax codes used in CUFE/CUDE formula (fixed positions).
 * Position 5-6: IVA (01) + amount
 * Position 7-8: INC (04) + amount
 * Position 9-10: ICA (03) + amount
 */
export const CUFE_TAX_ORDER = [TaxCode.IVA, TaxCode.INC, TaxCode.ICA] as const;
