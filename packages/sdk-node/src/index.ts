/**
 * @dian-kit/sdk-node -- High-level TypeScript/Node.js SDK for Colombian
 * electronic invoicing with DIAN.
 *
 * This is the main entry point for the SDK. It exports:
 *
 * - **{@link DianKit}** -- The primary class for creating, signing, and
 *   submitting electronic documents.
 * - **Input types** -- {@link InvoiceInput}, {@link CreditNoteInput},
 *   {@link DebitNoteInput}, {@link DianKitConfig}, etc.
 * - **Response types** -- {@link DianSendResponse}, {@link DianStatusResponse},
 *   {@link DianAcquirerResponse}, etc.
 * - **Domain types** -- {@link Party}, {@link InvoiceLine}, {@link TaxTotal},
 *   {@link LegalMonetaryTotal}, etc.
 * - **Constants** -- {@link DocumentType}, {@link OperationType},
 *   {@link IdentificationType}, {@link PaymentForm}, {@link PaymentMethod}, etc.
 * - **Utilities** -- {@link CONSUMIDOR_FINAL} (pre-built anonymous buyer),
 *   {@link DianTransportError} (SOAP/HTTP error class).
 *
 * All commonly needed types from `@dian-kit/core` are re-exported here so
 * users do not need to install or import from the core package directly.
 *
 * @example
 * ```typescript
 * import {
 *   DianKit,
 *   DocumentType,
 *   IdentificationType,
 *   PersonType,
 *   PaymentForm,
 *   PaymentMethod,
 *   CONSUMIDOR_FINAL,
 * } from 'dian-kit';
 * ```
 *
 * @packageDocumentation
 */

export { DianKit } from "./dian-kit.js";

export type {
  /** Input for creating an invoice (type 01) or POS document (type 20). */
  CreditNoteInput,
  /** Input for creating a credit note (type 91). */
  DebitNoteInput,
  /** Configuration for initializing the DianKit SDK. */
  DianKitConfig,
  /** Result of document creation (XML + signing). */
  DocumentResult,
  /** Input for creating a debit note (type 92). */
  InvoiceInput,
  /** Options for looking up a buyer in DIAN's database. */
  LookupBuyerOptions,
  /** Options for sending a document to DIAN. */
  SendOptions,
} from "./types.js";

// ---------------------------------------------------------------------------
// Re-export commonly needed types from core so users don't need to install
// @dian-kit/core separately.
// ---------------------------------------------------------------------------

export type {
  /** Physical or postal address. */
  Address,
  /** Line-level allowance or charge (discount / surcharge). */
  AllowanceCharge,
  /** Reference to the original invoice (for credit/debit notes). */
  BillingReference,
  /** Parsed PKCS#12 certificate data (private key, cert, chain). */
  CertificateData,
  /** Corporate registration scheme (prefix for FAB10a compliance). */
  CorporateRegistration,
  /** Response from DIAN's GetAcquirer SOAP method. */
  DianAcquirerResponse,
  /** Single numbering range returned by DIAN. */
  DianNumberingRange,
  /** Response from DIAN's GetNumberingRange SOAP method. */
  DianNumberingRangeResponse,
  /** Response from DIAN when sending a document (SendBillSync, etc.). */
  DianSendResponse,
  /** Response from DIAN status queries (GetStatus, GetStatusZip). */
  DianStatusResponse,
  /** Individual validation error returned by DIAN. */
  DianValidationError,
  /** Discrepancy reason for credit/debit notes. */
  DiscrepancyResponse,
  /** Single line item in an invoice or note. */
  InvoiceLine,
  /** Billing period covered by the document. */
  InvoicePeriod,
  /** Summary of all monetary amounts in the document. */
  LegalMonetaryTotal,
  /** DIAN numbering resolution authorization details. */
  NumberingAuthorization,
  /** Company or individual party (supplier or customer). */
  Party,
  /** Identification details for a party (NIT, CC, etc.). */
  PartyIdentification,
  /** Tax registration information for a party. */
  PartyTaxInfo,
  /** Payment form and method for the document. */
  PaymentMeans,
  /** Individual person info for natural persons (FAK61 compliance). */
  PersonInfo,
  /** WS-Security Signature authentication configuration for DIAN SOAP API. */
  SoapAuthConfig,
  /** DIAN-registered software information. */
  SoftwareInfo,
  /** Tax scheme (IVA, ICA, INC, etc.). */
  TaxScheme,
  /** Individual tax subtotal within a tax total. */
  TaxSubtotal,
  /** Aggregated tax total for a document or line. */
  TaxTotal,
} from "@dian-kit/core";

// ---------------------------------------------------------------------------
// Re-export constants so users don't need @dian-kit/core for basic usage.
// ---------------------------------------------------------------------------

/**
 * Error class thrown when DIAN SOAP communication fails.
 *
 * Covers HTTP errors, network timeouts, and SOAP faults returned by
 * DIAN's `WcfDianCustomerServices` web service.
 *
 * @see {@link DianTransportError.rawResponse} for the (truncated) SOAP response body.
 */
/**
 * Pre-built anonymous buyer (Consumidor Final) for retail / POS invoices.
 *
 * Use this as the `customer` when the buyer's identity is not required
 * (e.g., point-of-sale transactions under the legal threshold).
 *
 * @example
 * ```typescript
 * import { CONSUMIDOR_FINAL } from 'dian-kit';
 *
 * const invoice = await kit.createInvoice({
 *   ...invoiceData,
 *   customer: { ...CONSUMIDOR_FINAL, fiscalResponsibilities: ['R-99-PN'], ... },
 * });
 * ```
 */
export {
  CONSUMIDOR_FINAL,
  DianTransportError,
  /**
   * DIAN document type codes (e.g., `"01"` for Factura de Venta, `"91"` for Nota Credito).
   *
   * @see {@link https://www.dian.gov.co/ | DIAN}
   */
  DocumentType,
  /**
   * DIAN environment identifiers: `"1"` (Produccion) and `"2"` (Habilitacion/Sandbox).
   */
  Environment,
  /**
   * Fiscal responsibility codes (e.g., `"O-13"` Gran Contribuyente, `"O-15"` Autorretenedor).
   */
  FiscalResponsibility,
  /**
   * Identification type codes (e.g., `"31"` NIT, `"13"` Cedula de Ciudadania).
   */
  IdentificationType,
  /**
   * Operation type codes: `"10"` Estandar, `"20"` Nota Credito, `"30"` Nota Debito.
   */
  OperationType,
  /**
   * Payment form codes: `"1"` Contado (cash), `"2"` Credito (credit).
   */
  PaymentForm,
  /**
   * Payment method codes (e.g., `"10"` Efectivo, `"48"` Tarjeta Credito, `"49"` Tarjeta Debito).
   */
  PaymentMethod,
  /**
   * Person type codes: `"1"` Juridica (legal entity), `"2"` Natural (individual).
   */
  PersonType,
} from "@dian-kit/core";
