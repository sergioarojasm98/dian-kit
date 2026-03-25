export const TaxCode = {
  IVA: "01",
  IC: "02",
  ICA: "03",
  INC: "04",
  RETE_IVA: "05",
  RETE_RENTA: "06",
  RETE_ICA: "07",
  IC_PORCENTUAL: "08",
  FTO_HORTICULTURA: "20",
  TIMBRE: "21",
  INC_BOLSAS: "22",
  IN_CARBONO: "23",
  IN_COMBUSTIBLES: "24",
  SOBRETASA_COMBUSTIBLES: "25",
  SORDICOM: "26",
  IC_DATOS: "30",
  ICL: "32",
  INPP: "33",
  IBUA: "34",
  ICUI: "35",
  AD_VALOREM: "36",
  NO_APLICA: "ZZ",
} as const;

export type TaxCodeValue = (typeof TaxCode)[keyof typeof TaxCode];

export const TaxCodeName: Record<string, string> = {
  "01": "IVA",
  "02": "IC",
  "03": "ICA",
  "04": "INC",
  "05": "ReteIVA",
  "06": "ReteRenta",
  "07": "ReteICA",
  "ZZ": "No Aplica",
};

export const IVA_RATES = [0, 5, 16, 19] as const;
export const INC_RATES = [2, 4, 8, 16] as const;

/**
 * Tax codes used in CUFE/CUDE formula (fixed positions).
 * Position 5-6: IVA (01) + amount
 * Position 7-8: INC (04) + amount
 * Position 9-10: ICA (03) + amount
 */
export const CUFE_TAX_ORDER = [TaxCode.IVA, TaxCode.INC, TaxCode.ICA] as const;
