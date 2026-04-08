/**
 * @module common.schema
 *
 * Zod validation schemas for DIAN electronic document structures.
 * Each schema enforces DIAN business rules such as valid tax codes,
 * identification types, nonnegative monetary amounts, and required fields.
 */
import { z } from "zod/v4";

import {
  DocumentType,
  Environment,
  FiscalResponsibility,
  IdentificationType,
  OperationType,
  PaymentForm,
  PaymentMethod,
  PersonType,
} from "../constants/document-types.js";
import { TaxCode } from "../constants/tax-codes.js";

const documentTypeValues = Object.values(DocumentType) as [string, ...string[]];
const environmentValues = Object.values(Environment) as [string, ...string[]];
const operationTypeValues = Object.values(OperationType) as [string, ...string[]];
const identificationTypeValues = Object.values(IdentificationType) as [string, ...string[]];
const personTypeValues = Object.values(PersonType) as [string, ...string[]];
const taxCodeValues = Object.values(TaxCode) as [string, ...string[]];
const paymentFormValues = Object.values(PaymentForm) as [string, ...string[]];
const paymentMethodValues = Object.values(PaymentMethod) as [string, ...string[]];
const fiscalResponsibilityValues = Object.values(FiscalResponsibility) as [string, ...string[]];

/**
 * Validates a Colombian postal address with DANE municipality and department codes.
 * Requires street, city, and department fields; defaults country to "CO" / "Colombia".
 *
 * @example
 * ```typescript
 * const result = AddressSchema.safeParse({ street: "Calle 1", cityCode: "11001", ... });
 * ```
 */
export const AddressSchema = z.object({
  street: z.string().min(1),
  cityCode: z.string().min(1),
  cityName: z.string().min(1),
  departmentCode: z.string().min(1),
  departmentName: z.string().min(1),
  countryCode: z.string().default("CO"),
  countryName: z.string().default("Colombia"),
  postalZone: z.string().optional(),
});

/**
 * Validates party identification with a DIAN-recognized document type.
 * Ensures the identification number is non-empty and the type is a valid DIAN code.
 * The verification digit (dv) is optional and limited to 1 character.
 */
export const PartyIdentificationSchema = z.object({
  number: z.string().min(1),
  type: z.enum(identificationTypeValues),
  dv: z.string().max(1).optional(),
});

/**
 * Validates a tax scheme reference with a valid DIAN tax code.
 * The name is optional and will be auto-resolved from TaxCodeName if omitted.
 */
export const TaxSchemeSchema = z.object({
  code: z.enum(taxCodeValues),
  name: z.string().optional(),
});

/**
 * Validates party tax registration information for DIAN's PartyTaxScheme element.
 * Enforces a valid fiscal responsibility code and non-empty registration name.
 */
export const PartyTaxInfoSchema = z.object({
  registrationName: z.string().min(1),
  companyId: PartyIdentificationSchema,
  taxLevelCode: z.enum(fiscalResponsibilityValues),
  taxScheme: TaxSchemeSchema,
  address: AddressSchema.optional(),
});

/**
 * Validates person info for natural persons (personType "2").
 * Required by DIAN rule FAK61 when the party is an individual.
 */
export const PersonInfoSchema = z.object({
  firstName: z.string().min(1),
  familyName: z.string().min(1),
});

/**
 * Validates corporate registration scheme for the supplier's PartyLegalEntity.
 * The prefix must match the DIAN numbering authorization prefix (FAB10a).
 */
export const CorporateRegistrationSchema = z.object({
  prefix: z.string().min(1),
  name: z.string().optional(),
});

/**
 * Validates a complete party (supplier or customer) with identification,
 * person type, fiscal responsibilities, tax info, address, and optional contact data.
 * Email is validated as a proper email format when provided.
 */
export const PartySchema = z.object({
  name: z.string().min(1),
  identification: PartyIdentificationSchema,
  personType: z.enum(personTypeValues),
  fiscalResponsibilities: z.array(z.enum(fiscalResponsibilityValues)),
  taxInfo: PartyTaxInfoSchema,
  address: AddressSchema,
  email: z.email().optional(),
  phone: z.string().optional(),
  person: PersonInfoSchema.optional(),
  corporateRegistration: CorporateRegistrationSchema.optional(),
});

/**
 * Validates a single tax subtotal with nonnegative amounts and a valid tax scheme.
 * Enforces that taxableAmount, taxAmount, and percent are all zero or positive.
 */
export const TaxSubtotalSchema = z.object({
  taxableAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  percent: z.number().nonnegative(),
  taxScheme: TaxSchemeSchema,
});

/**
 * Validates a tax total group with at least one subtotal.
 * The taxAmount must be nonnegative and should equal the sum of subtotal amounts.
 */
export const TaxTotalSchema = z.object({
  taxAmount: z.number().nonnegative(),
  subtotals: z.array(TaxSubtotalSchema).min(1),
});

/**
 * Validates an allowance (discount) or charge (surcharge) entry.
 * Requires a boolean charge indicator, a non-empty reason, and nonnegative amounts.
 */
export const AllowanceChargeSchema = z.object({
  chargeIndicator: z.boolean(),
  reason: z.string().min(1),
  amount: z.number().nonnegative(),
  baseAmount: z.number().nonnegative(),
  multiplierFactor: z.number().optional(),
});

/**
 * Validates a single invoice line item with positive quantity and price,
 * nonnegative line extension amount, and at least one tax total.
 * Unit code defaults to "EA" (each) if not specified.
 */
export const InvoiceLineSchema = z.object({
  id: z.string().min(1),
  quantity: z.number().positive(),
  unitCode: z.string().default("EA"),
  description: z.string().min(1),
  price: z.number().positive(),
  lineExtensionAmount: z.number().nonnegative(),
  allowanceCharges: z.array(AllowanceChargeSchema).optional(),
  taxTotals: z.array(TaxTotalSchema).min(1),
});

/**
 * Validates the legal monetary totals for the document.
 * All amounts must be nonnegative. Allowance, charge, and prepaid amounts default to 0.
 * Enforces DIAN business rules requiring payableAmount and taxInclusiveAmount.
 */
export const LegalMonetaryTotalSchema = z.object({
  lineExtensionAmount: z.number().nonnegative(),
  taxExclusiveAmount: z.number().nonnegative(),
  taxInclusiveAmount: z.number().nonnegative(),
  allowanceTotalAmount: z.number().nonnegative().default(0),
  chargeTotalAmount: z.number().nonnegative().default(0),
  prepaidAmount: z.number().nonnegative().default(0),
  payableAmount: z.number().nonnegative(),
});

/**
 * Validates payment means information with valid DIAN payment form and method codes.
 * Due date is optional (typically required for credit payments).
 */
export const PaymentMeansSchema = z.object({
  paymentForm: z.enum(paymentFormValues),
  paymentMethod: z.enum(paymentMethodValues),
  dueDate: z.date().optional(),
  paymentId: z.string().optional(),
});

/**
 * Validates an invoice billing period with start and end dates.
 * Both dates must be valid Date instances.
 */
export const InvoicePeriodSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

/**
 * Validates a billing reference to the original invoice for credit/debit notes.
 * Requires the original document ID, its CUFE/CUDE, and issue date.
 */
export const BillingReferenceSchema = z.object({
  id: z.string().min(1),
  uuid: z.string().min(1),
  issueDate: z.date(),
});

/**
 * Validates the discrepancy response data required for credit and debit notes.
 * Ensures all fields (reference ID, response code, description) are non-empty.
 */
export const DiscrepancyResponseSchema = z.object({
  referenceId: z.string().min(1),
  responseCode: z.string().min(1),
  description: z.string().min(1),
});

/**
 * Validates DIAN-registered software provider information.
 * All fields (ID, PIN, provider NIT, provider name) must be non-empty strings.
 */
export const SoftwareInfoSchema = z.object({
  id: z.string().min(1),
  pin: z.string().min(1),
  providerNit: z.string().min(1),
  providerName: z.string().min(1),
});

/**
 * Validates DIAN numbering authorization (resolucion de numeracion).
 * Enforces prefix max length of 4, positive integer number ranges,
 * and valid date range. Technical key is optional (only for CUFE documents).
 */
export const NumberingAuthorizationSchema = z.object({
  authorizationNumber: z.string().min(1),
  prefix: z.string().max(4),
  startNumber: z.number().int().positive(),
  endNumber: z.number().int().positive(),
  startDate: z.date(),
  endDate: z.date(),
  technicalKey: z.string().optional(),
});

/**
 * Validates a complete DIAN electronic document structure including
 * supplier, customer, line items, tax totals, and monetary amounts.
 * Enforces DIAN business rules like valid document/operation types,
 * positive amounts, valid tax codes, and at least one line item.
 * Currency defaults to "COP" (Colombian Peso) if not specified.
 *
 * @example
 * ```typescript
 * const result = DianDocumentSchema.safeParse(rawInput);
 * if (result.success) {
 *   const doc = result.data; // fully validated DianDocument
 * }
 * ```
 */
export const DianDocumentSchema = z.object({
  documentType: z.enum(documentTypeValues),
  operationType: z.enum(operationTypeValues),
  environment: z.enum(environmentValues),
  id: z.string().min(1),
  issueDate: z.date(),
  issueTime: z.date(),
  currency: z.string().default("COP"),
  supplier: PartySchema,
  customer: PartySchema,
  lines: z.array(InvoiceLineSchema).min(1),
  taxTotals: z.array(TaxTotalSchema),
  legalMonetaryTotal: LegalMonetaryTotalSchema,
  paymentMeans: PaymentMeansSchema,
  period: InvoicePeriodSchema.optional(),
  billingReference: BillingReferenceSchema.optional(),
  discrepancyResponse: DiscrepancyResponseSchema.optional(),
  software: SoftwareInfoSchema,
  numbering: NumberingAuthorizationSchema,
  notes: z.array(z.string()).optional(),
});
