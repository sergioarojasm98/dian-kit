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

/**
 * Represents a Colombian postal address used in party and tax registration data.
 * City and department codes follow the DANE (national statistics department) codification.
 */
export interface Address {
  /** Street address line (e.g., "Calle 100 #45-10") */
  street: string;
  /** DANE municipality code (e.g., "11001" for Bogota) */
  cityCode: string;
  /** Municipality name (e.g., "Bogota, D.C.") */
  cityName: string;
  /** DANE department code (e.g., "11" for Bogota) */
  departmentCode: string;
  /** Department name (e.g., "Bogota") */
  departmentName: string;
  /** ISO 3166-1 alpha-2 country code, defaults to "CO" */
  countryCode?: string;
  /** Country name, defaults to "Colombia" */
  countryName?: string;
  /** Postal zone code, if applicable */
  postalZone?: string;
}

/**
 * Identification data for a party (supplier or customer) in a DIAN electronic document.
 * Combines the document number with its type and optional verification digit.
 */
export interface PartyIdentification {
  /** Identification document number (e.g., NIT "900123456", CC "1234567890") */
  number: string;
  /** Type of identification document as per DIAN codification */
  type: IdentificationTypeValue;
  /** Verification digit (digito de verificacion), required only for NIT (type "31") */
  dv?: string;
}

/**
 * Tax scheme reference identifying a specific Colombian tax type.
 * Used within tax subtotals and party tax information.
 */
export interface TaxScheme {
  /** DIAN tax code (e.g., "01" for IVA, "04" for INC) */
  code: TaxCodeValue;
  /** Human-readable tax name; auto-resolved from TaxCodeName if omitted */
  name?: string;
}

/**
 * Tax registration information for a party as required by DIAN.
 * Populates the PartyTaxScheme UBL element with fiscal obligations and tax regime data.
 */
export interface PartyTaxInfo {
  /** Legal registration name as registered with DIAN (Razon Social or full name) */
  registrationName: string;
  /** Company identification matching the party's identification */
  companyId: PartyIdentification;
  /** Fiscal responsibility code (e.g., "O-13" for Gran Contribuyente, "R-99-PN" for N/A) */
  taxLevelCode: string;
  /** Primary tax scheme the party is registered under */
  taxScheme: TaxScheme;
  /** Tax registration address, if different from the party's physical address */
  address?: Address;
}

/**
 * Represents a party (supplier or customer) in a DIAN electronic document.
 * Contains all identification, tax, address, and contact information
 * required for AccountingSupplierParty and AccountingCustomerParty UBL elements.
 */
export interface Party {
  /** Legal or commercial name of the party */
  name: string;
  /** Tax identification number and document type */
  identification: PartyIdentification;
  /** Person type: "1" for legal entity, "2" for natural person */
  personType: PersonTypeValue;
  /** List of DIAN fiscal responsibility codes assigned to the party */
  fiscalResponsibilities: string[];
  /** Detailed tax registration information for PartyTaxScheme */
  taxInfo: PartyTaxInfo;
  /** Physical location address of the party */
  address: Address;
  /** Contact email address for electronic notifications */
  email?: string;
  /** Contact phone number */
  phone?: string;
  /** Person details — required when personType is "2" (natural person) */
  person?: PersonInfo;
  /** Corporate registration scheme — contains invoice prefix for supplier (FAB10a) */
  corporateRegistration?: CorporateRegistration;
}

/**
 * Corporate registration scheme for the supplier's PartyLegalEntity.
 * The prefix must match the DIAN numbering authorization prefix.
 * Required to avoid FAB10a rejection.
 */
export interface CorporateRegistration {
  /** Invoice prefix matching the numbering authorization (e.g., "SETP") */
  prefix: string;
  /** Commercial registration number (matrícula mercantil), optional */
  name?: string;
}

/**
 * Individual person identification for natural persons (personType "2").
 * Required by DIAN when the party is a natural person (FAK61 rule).
 */
export interface PersonInfo {
  /** First name (primer nombre) */
  firstName: string;
  /** Family name / last name (primer apellido) */
  familyName: string;
}

/**
 * Individual tax subtotal within a TaxTotal group.
 * Represents one tax calculation line (e.g., 19% IVA on a taxable base).
 */
export interface TaxSubtotal {
  /** Taxable base amount before tax is applied */
  taxableAmount: number;
  /** Calculated tax amount (taxableAmount * percent / 100) */
  taxAmount: number;
  /** Tax rate percentage (e.g., 19 for 19% IVA) */
  percent: number;
  /** Tax scheme identifying which tax this subtotal belongs to */
  taxScheme: TaxScheme;
}

/**
 * Aggregated tax total containing one or more tax subtotals.
 * Groups related tax calculations (e.g., all IVA subtotals) under a single TaxTotal element.
 */
export interface TaxTotal {
  /** Total tax amount, sum of all subtotal taxAmount values */
  taxAmount: number;
  /** Individual tax calculation lines within this group */
  subtotals: TaxSubtotal[];
}

/**
 * Represents an allowance (discount) or charge (surcharge) applied to a document or line.
 * Used in UBL AllowanceCharge elements at both document and line level.
 */
export interface AllowanceCharge {
  /** true for a charge (surcharge), false for an allowance (discount) */
  chargeIndicator: boolean;
  /** Textual reason for the allowance or charge */
  reason: string;
  /** Monetary amount of the allowance or charge */
  amount: number;
  /** Base amount on which the allowance/charge is calculated */
  baseAmount: number;
  /** Multiplier factor (percentage) used to calculate the amount from baseAmount */
  multiplierFactor?: number;
}

/**
 * Represents a single line item in a DIAN electronic document.
 * Maps to InvoiceLine, CreditNoteLine, or DebitNoteLine UBL elements
 * depending on the document type.
 */
export interface InvoiceLine {
  /** Sequential line identifier within the document (e.g., "1", "2") */
  id: string;
  /** Quantity of items (must be positive) */
  quantity: number;
  /** UN/ECE Recommendation 20 unit code (e.g., "EA" for each, "KGM" for kilogram), defaults to "EA" */
  unitCode?: string;
  /** Description of the good or service */
  description: string;
  /** Unit price before taxes */
  price: number;
  /** Total line amount before taxes (quantity * price, adjusted for allowances/charges) */
  lineExtensionAmount: number;
  /** Line-level allowances (discounts) and charges (surcharges) */
  allowanceCharges?: AllowanceCharge[];
  /** Tax totals applicable to this line item */
  taxTotals: TaxTotal[];
}

/**
 * Legal monetary totals summarizing all amounts in the electronic document.
 * Maps to the UBL LegalMonetaryTotal element with DIAN-required fields.
 */
export interface LegalMonetaryTotal {
  /** Sum of all line extension amounts (subtotal before taxes) */
  lineExtensionAmount: number;
  /** Total amount excluding taxes */
  taxExclusiveAmount: number;
  /** Total amount including all taxes */
  taxInclusiveAmount: number;
  /** Sum of all document-level and line-level allowances (discounts) */
  allowanceTotalAmount: number;
  /** Sum of all document-level and line-level charges (surcharges) */
  chargeTotalAmount: number;
  /** Amount already paid in advance */
  prepaidAmount: number;
  /** Final amount due for payment (taxInclusiveAmount - allowances + charges - prepaid) */
  payableAmount: number;
}

/**
 * Payment means information specifying how the document will be paid.
 * Maps to the UBL PaymentMeans element.
 */
export interface PaymentMeans {
  /** Payment form: "1" for cash/immediate, "2" for credit/deferred */
  paymentForm: (typeof PaymentForm)[keyof typeof PaymentForm];
  /** Payment method code (e.g., "10" for cash, "48" for credit card) */
  paymentMethod: (typeof PaymentMethod)[keyof typeof PaymentMethod];
  /** Payment due date, required when paymentForm is credit ("2") */
  dueDate?: Date;
  /** Payment reference identifier (e.g., bank reference number) */
  paymentId?: string;
}

/**
 * Billing period for the electronic document.
 * Used in the UBL InvoicePeriod element to specify the service or billing date range.
 */
export interface InvoicePeriod {
  /** Start date of the billing period */
  startDate: Date;
  /** End date of the billing period */
  endDate: Date;
}

/**
 * Reference to the original invoice being corrected by a credit or debit note.
 * Maps to the UBL BillingReference/InvoiceDocumentReference element.
 */
export interface BillingReference {
  /** Document number of the original invoice (e.g., "SETT1") */
  id: string;
  /** CUFE/CUDE of the original invoice */
  uuid: string;
  /** Issue date of the original invoice */
  issueDate: Date;
}

/**
 * Discrepancy response data for credit and debit notes.
 * Explains why the original invoice is being corrected, as required by DIAN.
 * Maps to the UBL DiscrepancyResponse element.
 */
export interface DiscrepancyResponse {
  /** Document number of the original invoice being corrected */
  referenceId: string;
  /** DIAN correction code (e.g., "1" = partial return, "2" = cancellation) */
  responseCode: string;
  /** Free-text description of the reason for the credit/debit note */
  description: string;
}

/**
 * DIAN-registered software provider information.
 * Required for the SoftwareProvider section of DianExtensions in the XML.
 */
export interface SoftwareInfo {
  /** Software identifier assigned by DIAN during registration */
  id: string;
  /** Software PIN (secret) assigned by DIAN, used in CUFE/CUDE and security code computation */
  pin: string;
  /** NIT of the software provider company */
  providerNit: string;
  /** Name of the software provider company */
  providerName: string;
}

/**
 * DIAN numbering authorization (resolucion de numeracion) for the electronic document.
 * Contains the authorized range of document numbers and validity period.
 * Maps to the InvoiceControl section of DianExtensions.
 */
export interface NumberingAuthorization {
  /** DIAN authorization resolution number */
  authorizationNumber: string;
  /** Invoice prefix (max 4 characters, e.g., "SETT") */
  prefix: string;
  /** First authorized document number in the range */
  startNumber: number;
  /** Last authorized document number in the range */
  endNumber: number;
  /** Start date of the authorization validity period */
  startDate: Date;
  /** End date of the authorization validity period */
  endDate: Date;
  /** Technical key assigned by DIAN, required only for CUFE-based documents */
  technicalKey?: string;
}

/**
 * Complete DIAN electronic document structure ready for XML generation.
 * Contains all data needed to build a UBL 2.1 Invoice, CreditNote, or DebitNote,
 * including parties, line items, taxes, monetary totals, and DIAN-specific metadata.
 *
 * @example
 * ```typescript
 * const doc: DianDocument = {
 *   documentType: DocumentType.FACTURA_VENTA,
 *   operationType: OperationType.ESTANDAR,
 *   environment: Environment.HABILITACION,
 *   id: "SETT1",
 *   // ...remaining fields
 * };
 * ```
 */
export interface DianDocument {
  /** DIAN document type code (e.g., "01" for invoice, "91" for credit note) */
  documentType: DocumentTypeValue;
  /** Operation type code (e.g., "10" for standard, "20" for credit note) */
  operationType: OperationTypeValue;
  /** Execution environment: "1" for production, "2" for sandbox */
  environment: EnvironmentValue;
  /** Document number including prefix (e.g., "SETT1") */
  id: string;
  /** Document issue date */
  issueDate: Date;
  /** Document issue time (hours, minutes, seconds are extracted) */
  issueTime: Date;
  /** ISO 4217 currency code, defaults to "COP" (Colombian Peso) */
  currency: string;
  /** Supplier (seller) party information */
  supplier: Party;
  /** Customer (buyer) party information */
  customer: Party;
  /** Invoice line items (at least one required) */
  lines: InvoiceLine[];
  /** Document-level tax totals */
  taxTotals: TaxTotal[];
  /** Summary of all monetary amounts in the document */
  legalMonetaryTotal: LegalMonetaryTotal;
  /** Payment form and method information */
  paymentMeans: PaymentMeans;
  /** Billing period, if applicable */
  period?: InvoicePeriod;
  /** Reference to original invoice, required for credit/debit notes */
  billingReference?: BillingReference;
  /** Discrepancy explanation, required for credit/debit notes */
  discrepancyResponse?: DiscrepancyResponse;
  /** DIAN-registered software provider information */
  software: SoftwareInfo;
  /** DIAN numbering authorization (resolucion) details */
  numbering: NumberingAuthorization;
  /** Free-text notes to include in the document */
  notes?: string[];
}

/**
 * Type-safe interface for the generic end consumer ("Consumidor Final").
 * Used in POS and equivalent documents when the buyer is not identified.
 */
export interface ConsumidorFinal {
  /** Fixed name: "Consumidor Final" */
  name: "Consumidor Final";
  /** Generic identification with CC "222222222222" as defined by DIAN */
  identification: {
    number: "222222222222";
    type: "13";
  };
  /** Natural person type */
  personType: "2";
}

/**
 * Pre-built generic end consumer constant for POS and equivalent documents.
 * DIAN mandates using this placeholder when the buyer is not individually identified.
 *
 * @example
 * ```typescript
 * const customer = { ...CONSUMIDOR_FINAL, fiscalResponsibilities: ["R-99-PN"] };
 * ```
 */
export const CONSUMIDOR_FINAL: ConsumidorFinal = {
  name: "Consumidor Final",
  identification: {
    number: "222222222222",
    type: "13",
  },
  personType: "2",
};
