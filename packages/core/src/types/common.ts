import type {
  DocumentTypeValue,
  EnvironmentValue,
  IdentificationTypeValue,
  OperationTypeValue,
  PaymentForm,
  PaymentMethod,
  PersonTypeValue,
} from "../constants/document-types.js";
import type { TaxCodeValue } from "../constants/tax-codes.js";

export interface Address {
  street: string;
  cityCode: string;
  cityName: string;
  departmentCode: string;
  departmentName: string;
  countryCode?: string;
  countryName?: string;
  postalZone?: string;
}

export interface PartyIdentification {
  number: string;
  type: IdentificationTypeValue;
  /** Dígito de verificación (solo para NIT) */
  dv?: string;
}

export interface TaxScheme {
  code: TaxCodeValue;
  name?: string;
}

export interface PartyTaxInfo {
  registrationName: string;
  companyId: PartyIdentification;
  taxLevelCode: string;
  taxScheme: TaxScheme;
  address?: Address;
}

export interface Party {
  name: string;
  identification: PartyIdentification;
  personType: PersonTypeValue;
  fiscalResponsibilities: string[];
  taxInfo: PartyTaxInfo;
  address: Address;
  email?: string;
  phone?: string;
}

export interface TaxSubtotal {
  taxableAmount: number;
  taxAmount: number;
  percent: number;
  taxScheme: TaxScheme;
}

export interface TaxTotal {
  taxAmount: number;
  subtotals: TaxSubtotal[];
}

export interface AllowanceCharge {
  chargeIndicator: boolean;
  reason: string;
  amount: number;
  baseAmount: number;
  multiplierFactor?: number;
}

export interface InvoiceLine {
  id: string;
  quantity: number;
  unitCode?: string;
  description: string;
  price: number;
  lineExtensionAmount: number;
  allowanceCharges?: AllowanceCharge[];
  taxTotals: TaxTotal[];
}

export interface LegalMonetaryTotal {
  lineExtensionAmount: number;
  taxExclusiveAmount: number;
  taxInclusiveAmount: number;
  allowanceTotalAmount: number;
  chargeTotalAmount: number;
  prepaidAmount: number;
  payableAmount: number;
}

export interface PaymentMeans {
  paymentForm: (typeof PaymentForm)[keyof typeof PaymentForm];
  paymentMethod: (typeof PaymentMethod)[keyof typeof PaymentMethod];
  dueDate?: Date;
  paymentId?: string;
}

export interface InvoicePeriod {
  startDate: Date;
  endDate: Date;
}

export interface BillingReference {
  id: string;
  uuid: string;
  issueDate: Date;
}

export interface DiscrepancyResponse {
  /** ID de la factura original que se está corrigiendo */
  referenceId: string;
  /** Código de corrección DIAN (ej: "1" = devolución parcial, "2" = anulación) */
  responseCode: string;
  /** Descripción de la razón de la nota crédito/débito */
  description: string;
}

export interface SoftwareInfo {
  id: string;
  pin: string;
  providerNit: string;
  providerName: string;
}

export interface NumberingAuthorization {
  authorizationNumber: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  startDate: Date;
  endDate: Date;
  /** Clave técnica asignada por DIAN (solo para CUFE) */
  technicalKey?: string;
}

export interface DianDocument {
  documentType: DocumentTypeValue;
  operationType: OperationTypeValue;
  environment: EnvironmentValue;
  id: string;
  issueDate: Date;
  issueTime: Date;
  currency: string;
  supplier: Party;
  customer: Party;
  lines: InvoiceLine[];
  taxTotals: TaxTotal[];
  legalMonetaryTotal: LegalMonetaryTotal;
  paymentMeans: PaymentMeans;
  period?: InvoicePeriod;
  billingReference?: BillingReference;
  discrepancyResponse?: DiscrepancyResponse;
  software: SoftwareInfo;
  numbering: NumberingAuthorization;
  notes?: string[];
}

export interface ConsumidorFinal {
  name: "Consumidor Final";
  identification: {
    number: "222222222222";
    type: "13";
  };
  personType: "2";
}

export const CONSUMIDOR_FINAL: ConsumidorFinal = {
  name: "Consumidor Final",
  identification: {
    number: "222222222222",
    type: "13",
  },
  personType: "2",
};
