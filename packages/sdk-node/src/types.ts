import type {
  BillingReference,
  CertificateData,
  DianCredentials,
  DianSoapMethodValue,
  DiscrepancyResponse,
  DocumentTypeValue,
  EnvironmentValue,
  InvoiceLine,
  InvoicePeriod,
  LegalMonetaryTotal,
  NumberingAuthorization,
  OperationTypeValue,
  Party,
  PaymentMeans,
  SoftwareInfo,
  TaxTotal,
} from "@dian-kit/core";

/** Configuration for initializing the DianKit SDK */
export interface DianKitConfig {
  /** PKCS#12 (.p12) certificate buffer */
  certificate: Buffer;
  /** Password for the .p12 certificate */
  certificatePassword: string;
  /** Supplier (emitter) party information */
  supplier: Party;
  /** Software registered with DIAN */
  software: SoftwareInfo;
  /** WS-Security credentials for DIAN SOAP API */
  credentials: DianCredentials;
  /** DIAN environment: "1" = production, "2" = sandbox */
  environment: EnvironmentValue;
  /** Numbering authorization from DIAN resolution */
  numbering: NumberingAuthorization;
  /** Default HTTP timeout in milliseconds (default: 30_000) */
  timeoutMs?: number;
}

/** Internal resolved config with loaded certificate */
export interface ResolvedConfig extends Omit<DianKitConfig, "certificate" | "certificatePassword"> {
  certificateData: CertificateData;
}

/** Input for creating an invoice (type 01) or POS document (type 20) */
export interface InvoiceInput {
  /** Document number (e.g., "SETP990000001") */
  id: string;
  /** Issue date */
  issueDate: Date;
  /** Issue time */
  issueTime: Date;
  /** Document type — defaults to "01" (Factura de Venta) */
  documentType?: DocumentTypeValue;
  /** Operation type — defaults to "10" (Estándar) */
  operationType?: OperationTypeValue;
  /** Currency code — defaults to "COP" */
  currency?: string;
  /** Customer (buyer) party */
  customer: Party;
  /** Invoice lines */
  lines: InvoiceLine[];
  /** Tax totals */
  taxTotals: TaxTotal[];
  /** Legal monetary total */
  legalMonetaryTotal: LegalMonetaryTotal;
  /** Payment means */
  paymentMeans: PaymentMeans;
  /** Invoice period */
  period?: InvoicePeriod;
  /** Free-text notes */
  notes?: string[];
}

/** Input for creating a credit note (type 91) */
export interface CreditNoteInput extends Omit<InvoiceInput, "documentType" | "operationType"> {
  /** Reference to the original invoice being corrected */
  billingReference: BillingReference;
  /** Reason for the credit note */
  discrepancyResponse: DiscrepancyResponse;
}

/** Input for creating a debit note (type 92) */
export interface DebitNoteInput extends Omit<InvoiceInput, "documentType" | "operationType"> {
  /** Reference to the original invoice being adjusted */
  billingReference: BillingReference;
  /** Reason for the debit note */
  discrepancyResponse: DiscrepancyResponse;
}

/** Result of document creation (XML generation + signing) */
export interface DocumentResult {
  /** Unsigned XML (for debugging/auditing) */
  xml: string;
  /** Signed XML with XAdES-EPES (ready to send) */
  signedXml: string;
  /** CUFE or CUDE hash (SHA-384) */
  uuid: string;
  /** Document number */
  documentNumber: string;
}

/** Options for sending a document to DIAN */
export interface SendOptions {
  /**
   * SOAP method to use:
   * - `SendBillSync` — production, immediate response (default)
   * - `SendBillAsync` — production, deferred response
   * - `SendTestSetAsync` — sandbox, requires `testSetId`
   */
  method?: DianSoapMethodValue;
  /** Test set ID assigned by DIAN (required for SendTestSetAsync) */
  testSetId?: string;
}

/** Options for looking up a buyer (acquirer) */
export interface LookupBuyerOptions {
  /** Identification type (e.g., "31" for NIT, "13" for CC) */
  identificationType: string;
  /** Identification number (without DV or dashes) */
  identificationNumber: string;
}
