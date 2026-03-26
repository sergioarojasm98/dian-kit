/**
 * @dian-kit/sdk-node
 *
 * High-level TypeScript/Node.js SDK for DIAN electronic invoicing.
 * Wraps @dian-kit/core with a simple class-based API.
 */

export { DianKit } from "./dian-kit.js";

export type {
  CreditNoteInput,
  DebitNoteInput,
  DianKitConfig,
  DocumentResult,
  InvoiceInput,
  LookupBuyerOptions,
  SendOptions,
} from "./types.js";

// Re-export commonly needed types from core so users don't need to install @dian-kit/core
export type {
  Address,
  AllowanceCharge,
  BillingReference,
  CertificateData,
  DianAcquirerResponse,
  DianCredentials,
  DianNumberingRange,
  DianNumberingRangeResponse,
  DianSendResponse,
  DianStatusResponse,
  DianValidationError,
  DiscrepancyResponse,
  InvoiceLine,
  InvoicePeriod,
  LegalMonetaryTotal,
  NumberingAuthorization,
  Party,
  PartyIdentification,
  PartyTaxInfo,
  PaymentMeans,
  SoftwareInfo,
  TaxScheme,
  TaxSubtotal,
  TaxTotal,
} from "@dian-kit/core";

// Re-export constants so users don't need @dian-kit/core for basic usage
export {
  DocumentType,
  Environment,
  FiscalResponsibility,
  IdentificationType,
  OperationType,
  PaymentForm,
  PaymentMethod,
  PersonType,
} from "@dian-kit/core";

export { DianTransportError } from "@dian-kit/core";

export { CONSUMIDOR_FINAL } from "@dian-kit/core";
