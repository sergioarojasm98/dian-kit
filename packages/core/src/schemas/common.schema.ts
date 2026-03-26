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

export const PartyIdentificationSchema = z.object({
  number: z.string().min(1),
  type: z.enum(identificationTypeValues),
  dv: z.string().max(1).optional(),
});

export const TaxSchemeSchema = z.object({
  code: z.enum(taxCodeValues),
  name: z.string().optional(),
});

export const PartyTaxInfoSchema = z.object({
  registrationName: z.string().min(1),
  companyId: PartyIdentificationSchema,
  taxLevelCode: z.enum(fiscalResponsibilityValues),
  taxScheme: TaxSchemeSchema,
  address: AddressSchema.optional(),
});

export const PartySchema = z.object({
  name: z.string().min(1),
  identification: PartyIdentificationSchema,
  personType: z.enum(personTypeValues),
  fiscalResponsibilities: z.array(z.enum(fiscalResponsibilityValues)),
  taxInfo: PartyTaxInfoSchema,
  address: AddressSchema,
  email: z.email().optional(),
  phone: z.string().optional(),
});

export const TaxSubtotalSchema = z.object({
  taxableAmount: z.number().nonnegative(),
  taxAmount: z.number().nonnegative(),
  percent: z.number().nonnegative(),
  taxScheme: TaxSchemeSchema,
});

export const TaxTotalSchema = z.object({
  taxAmount: z.number().nonnegative(),
  subtotals: z.array(TaxSubtotalSchema).min(1),
});

export const AllowanceChargeSchema = z.object({
  chargeIndicator: z.boolean(),
  reason: z.string().min(1),
  amount: z.number().nonnegative(),
  baseAmount: z.number().nonnegative(),
  multiplierFactor: z.number().optional(),
});

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

export const LegalMonetaryTotalSchema = z.object({
  lineExtensionAmount: z.number().nonnegative(),
  taxExclusiveAmount: z.number().nonnegative(),
  taxInclusiveAmount: z.number().nonnegative(),
  allowanceTotalAmount: z.number().nonnegative().default(0),
  chargeTotalAmount: z.number().nonnegative().default(0),
  prepaidAmount: z.number().nonnegative().default(0),
  payableAmount: z.number().nonnegative(),
});

export const PaymentMeansSchema = z.object({
  paymentForm: z.enum(paymentFormValues),
  paymentMethod: z.enum(paymentMethodValues),
  dueDate: z.date().optional(),
  paymentId: z.string().optional(),
});

export const InvoicePeriodSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export const BillingReferenceSchema = z.object({
  id: z.string().min(1),
  uuid: z.string().min(1),
  issueDate: z.date(),
});

export const DiscrepancyResponseSchema = z.object({
  referenceId: z.string().min(1),
  responseCode: z.string().min(1),
  description: z.string().min(1),
});

export const SoftwareInfoSchema = z.object({
  id: z.string().min(1),
  pin: z.string().min(1),
  providerNit: z.string().min(1),
  providerName: z.string().min(1),
});

export const NumberingAuthorizationSchema = z.object({
  authorizationNumber: z.string().min(1),
  prefix: z.string().max(4),
  startNumber: z.number().int().positive(),
  endNumber: z.number().int().positive(),
  startDate: z.date(),
  endDate: z.date(),
  technicalKey: z.string().optional(),
});

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
