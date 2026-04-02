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

/**
 * Configuration for initializing the {@link DianKit} SDK.
 *
 * Contains all the static information about the invoicing entity (supplier),
 * its DIAN-registered software, authentication credentials, and the numbering
 * resolution. These values remain constant across all documents issued within
 * the same session.
 *
 * @remarks
 * The `.p12` certificate is loaded and parsed once during construction.
 * Ensure the certificate file is the one registered with DIAN for your
 * software and matches the environment (sandbox vs. production).
 *
 * @example
 * ```typescript
 * import { DianKit } from 'dian-kit';
 * import { readFileSync } from 'node:fs';
 *
 * const config: DianKitConfig = {
 *   certificate: readFileSync('./empresa.p12'),
 *   certificatePassword: 'cert-password',
 *   supplier: { name: 'Mi Empresa SAS', ... },
 *   software: { id: 'abc-123', pin: '12345', providerNit: '900123456', providerName: 'Mi Empresa SAS' },
 *   credentials: { nit: '900123456', password: 'dian-password' },
 *   environment: '2', // sandbox
 *   numbering: { authorizationNumber: '18764000001', prefix: 'SETP', startNumber: 990000000, endNumber: 995000000, startDate: new Date(), endDate: new Date() },
 * };
 * ```
 */
export interface DianKitConfig {
  /**
   * PKCS#12 (.p12) certificate as a binary buffer.
   *
   * This is the digital certificate issued by a trusted CA and registered
   * with DIAN. It is used for XAdES-EPES signing of UBL 2.1 XML documents.
   *
   * @remarks Load the file with `readFileSync('./cert.p12')` or equivalent.
   */
  certificate: Buffer;

  /**
   * Password for the PKCS#12 (.p12) certificate file.
   *
   * Required to extract the private key and certificate chain used during
   * XAdES-EPES digital signing.
   */
  certificatePassword: string;

  /**
   * Supplier (emitter) party information.
   *
   * Represents the company or individual issuing the electronic document.
   * Includes legal name, NIT, address, tax regime, and fiscal responsibilities
   * as registered with DIAN.
   */
  supplier: Party;

  /**
   * Software information registered with DIAN.
   *
   * Every electronic invoicing software must be registered in the DIAN portal
   * (Catalogo de Participantes). The `id` and `pin` are assigned during
   * registration and are required for CUFE/CUDE computation and API authentication.
   */
  software: SoftwareInfo;

  /**
   * WS-Security UsernameToken credentials for the DIAN SOAP API.
   *
   * These are the NIT and software password used to authenticate SOAP
   * requests to DIAN's `WcfDianCustomerServices` web service.
   */
  credentials: DianCredentials;

  /**
   * DIAN environment identifier.
   *
   * - `"1"` -- Production (Produccion)
   * - `"2"` -- Sandbox / Qualification (Habilitacion)
   *
   * @remarks The environment determines which DIAN SOAP endpoint is used
   * and affects CUFE/CUDE generation.
   */
  environment: EnvironmentValue;

  /**
   * Numbering authorization from the DIAN resolution.
   *
   * Each invoicing entity must obtain a numbering range authorization
   * (resolucion de numeracion) from DIAN. This includes the authorized
   * prefix, number range, validity dates, and technical key (clave tecnica).
   */
  numbering: NumberingAuthorization;

  /**
   * Default HTTP timeout in milliseconds for DIAN SOAP API calls.
   *
   * @defaultValue 30000 (30 seconds)
   */
  timeoutMs?: number;
}

/**
 * Internal resolved configuration with the loaded certificate.
 *
 * Created during {@link DianKit} construction by parsing the raw `.p12` buffer
 * from {@link DianKitConfig} into a {@link CertificateData} object containing
 * the extracted private key, certificate, and certificate chain.
 *
 * @internal
 */
export interface ResolvedConfig extends Omit<DianKitConfig, "certificate" | "certificatePassword"> {
  /** Parsed certificate data (private key, cert, and chain) extracted from the .p12 file. */
  certificateData: CertificateData;
}

/**
 * Input for creating an electronic invoice (Factura Electronica, type 01)
 * or a POS equivalent document (Documento Equivalente POS, type 20).
 *
 * This interface captures all the per-document data that varies between
 * invoices. Static emitter information (supplier, software, numbering) is
 * provided once via {@link DianKitConfig}.
 *
 * @remarks
 * - The `id` must follow the prefix + number format from your DIAN numbering
 *   resolution (e.g., `"SETP990000001"`).
 * - If `documentType` is omitted, it defaults to `"01"` (Factura de Venta).
 * - If `operationType` is omitted, it defaults to `"10"` (Estandar).
 * - If `currency` is omitted, it defaults to `"COP"` (Colombian Peso).
 *
 * @example
 * ```typescript
 * const input: InvoiceInput = {
 *   id: 'SETP990000001',
 *   issueDate: new Date(),
 *   issueTime: new Date(),
 *   customer: { name: 'Cliente SAS', identification: { number: '800111222', type: '31', dv: '3' }, ... },
 *   lines: [{ id: '1', quantity: 2, description: 'Servicio de consultoría', price: 500000, lineExtensionAmount: 1000000, taxTotals: [...] }],
 *   taxTotals: [{ taxAmount: 190000, subtotals: [{ taxableAmount: 1000000, taxAmount: 190000, percent: 19, taxScheme: { code: '01' } }] }],
 *   legalMonetaryTotal: { lineExtensionAmount: 1000000, taxExclusiveAmount: 1000000, taxInclusiveAmount: 1190000, allowanceTotalAmount: 0, chargeTotalAmount: 0, prepaidAmount: 0, payableAmount: 1190000 },
 *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
 * };
 * ```
 */
export interface InvoiceInput {
  /**
   * Document number including the authorized prefix.
   *
   * Must follow the format `<prefix><number>` from the DIAN numbering
   * resolution (e.g., `"SETP990000001"`). The number must fall within the
   * authorized range.
   */
  id: string;

  /**
   * Date on which the document is issued.
   *
   * @remarks DIAN requires the issue date to match the actual date of issuance.
   * Backdating is not permitted.
   */
  issueDate: Date;

  /**
   * Time at which the document is issued.
   *
   * Used together with `issueDate` for CUFE/CUDE computation and included
   * in the UBL XML as `IssueTime`.
   */
  issueTime: Date;

  /**
   * DIAN document type code.
   *
   * - `"01"` -- Factura de Venta (standard electronic invoice)
   * - `"20"` -- Documento Equivalente POS
   *
   * @defaultValue `"01"` (Factura de Venta)
   */
  documentType?: DocumentTypeValue;

  /**
   * DIAN operation type code.
   *
   * - `"10"` -- Estandar (standard operation)
   *
   * @defaultValue `"10"` (Estandar)
   */
  operationType?: OperationTypeValue;

  /**
   * ISO 4217 currency code.
   *
   * @defaultValue `"COP"` (Colombian Peso)
   */
  currency?: string;

  /**
   * Customer (buyer / acquirer) party information.
   *
   * Includes the buyer's legal name, identification (NIT, CC, etc.), address,
   * tax information, and fiscal responsibilities.
   *
   * @remarks For anonymous retail sales, use the {@link CONSUMIDOR_FINAL} constant.
   */
  customer: Party;

  /**
   * Invoice line items.
   *
   * Each line represents a product or service being invoiced, including
   * quantity, unit price, extension amount, and per-line tax totals.
   * Line IDs must be sequential starting from `"1"`.
   */
  lines: InvoiceLine[];

  /**
   * Aggregated tax totals for the entire document.
   *
   * Each entry groups tax subtotals by tax scheme (e.g., IVA 19%, ICA, INC).
   * These values must be consistent with the per-line tax totals.
   */
  taxTotals: TaxTotal[];

  /**
   * Legal monetary total summarizing all amounts in the document.
   *
   * Includes line extension, tax-exclusive, tax-inclusive, allowances,
   * charges, prepaid amounts, and the final payable amount.
   *
   * @remarks The `payableAmount` is the net amount the buyer must pay and
   * must equal `taxInclusiveAmount - allowanceTotalAmount + chargeTotalAmount - prepaidAmount`.
   */
  legalMonetaryTotal: LegalMonetaryTotal;

  /**
   * Payment means describing how the invoice will be paid.
   *
   * Specifies the payment form (cash / credit) and payment method
   * (bank transfer, credit card, etc.) as defined by DIAN code lists.
   */
  paymentMeans: PaymentMeans;

  /**
   * Billing period for the invoice.
   *
   * Optional. When present, indicates the service period covered by this
   * invoice (e.g., a monthly utility bill from March 1 to March 31).
   */
  period?: InvoicePeriod;

  /**
   * Free-text notes to include in the document.
   *
   * Each string is rendered as a separate `<cbc:Note>` element in the UBL XML.
   * Useful for payment terms, disclaimers, or additional instructions.
   */
  notes?: string[];
}

/**
 * Input for creating a credit note (Nota Credito, type 91).
 *
 * A credit note partially or fully reverses a previously issued invoice.
 * It requires a reference to the original invoice and a discrepancy reason
 * explaining why the credit is being issued.
 *
 * @remarks
 * - The `documentType` is automatically set to `"91"` (Nota Credito).
 * - The `operationType` is automatically set to `"20"` (Nota Credito).
 * - The `billingReference.uuid` must be the CUFE/CUDE of the original invoice.
 * - Common discrepancy response codes:
 *   - `"1"` -- Devolucion parcial (partial return)
 *   - `"2"` -- Anulacion (cancellation)
 *   - `"3"` -- Rebaja o descuento (discount)
 *   - `"4"` -- Ajuste de precio (price adjustment)
 *
 * @example
 * ```typescript
 * const creditNote = await kit.createCreditNote({
 *   id: 'NC001',
 *   issueDate: new Date(),
 *   issueTime: new Date(),
 *   customer: originalInvoiceCustomer,
 *   billingReference: {
 *     id: 'SETP990000001',
 *     uuid: 'abc123...', // CUFE of the original invoice
 *     issueDate: originalInvoiceDate,
 *   },
 *   discrepancyResponse: {
 *     referenceId: 'SETP990000001',
 *     responseCode: '2',
 *     description: 'Anulacion de factura por error en datos del cliente',
 *   },
 *   lines: [...],
 *   taxTotals: [...],
 *   legalMonetaryTotal: { ... },
 *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
 * });
 * ```
 */
export interface CreditNoteInput extends Omit<InvoiceInput, "documentType" | "operationType"> {
  /**
   * Reference to the original invoice being corrected.
   *
   * Must include the invoice number (`id`), its CUFE/CUDE (`uuid`), and
   * the date it was issued (`issueDate`).
   */
  billingReference: BillingReference;

  /**
   * Discrepancy reason explaining why the credit note is being issued.
   *
   * Includes a DIAN-defined response code and a human-readable description.
   */
  discrepancyResponse: DiscrepancyResponse;
}

/**
 * Input for creating a debit note (Nota Debito, type 92).
 *
 * A debit note adjusts a previously issued invoice by increasing the amount
 * owed. It requires a reference to the original invoice and a discrepancy
 * reason explaining the adjustment.
 *
 * @remarks
 * - The `documentType` is automatically set to `"92"` (Nota Debito).
 * - The `operationType` is automatically set to `"30"` (Nota Debito).
 * - Common discrepancy response codes for debit notes:
 *   - `"1"` -- Intereses (interest charges)
 *   - `"2"` -- Gastos por cobrar (expenses to collect)
 *   - `"3"` -- Cambio de valor (value change)
 *
 * @example
 * ```typescript
 * const debitNote = await kit.createDebitNote({
 *   id: 'ND001',
 *   issueDate: new Date(),
 *   issueTime: new Date(),
 *   customer: originalInvoiceCustomer,
 *   billingReference: {
 *     id: 'SETP990000001',
 *     uuid: 'abc123...', // CUFE of the original invoice
 *     issueDate: originalInvoiceDate,
 *   },
 *   discrepancyResponse: {
 *     referenceId: 'SETP990000001',
 *     responseCode: '1',
 *     description: 'Cobro de intereses por mora en pago',
 *   },
 *   lines: [...],
 *   taxTotals: [...],
 *   legalMonetaryTotal: { ... },
 *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
 * });
 * ```
 */
export interface DebitNoteInput extends Omit<InvoiceInput, "documentType" | "operationType"> {
  /**
   * Reference to the original invoice being adjusted.
   *
   * Must include the invoice number (`id`), its CUFE/CUDE (`uuid`), and
   * the date it was issued (`issueDate`).
   */
  billingReference: BillingReference;

  /**
   * Discrepancy reason explaining why the debit note is being issued.
   *
   * Includes a DIAN-defined response code and a human-readable description.
   */
  discrepancyResponse: DiscrepancyResponse;
}

/**
 * Result returned after creating and signing an electronic document.
 *
 * Contains the generated XML (both unsigned and signed), the unique
 * document identifier (CUFE or CUDE), and the document number. This
 * object is ready to be passed to {@link DianKit.send} for submission
 * to DIAN.
 *
 * @example
 * ```typescript
 * const result = await kit.createInvoice({ ... });
 *
 * console.log(result.uuid);           // CUFE hash (SHA-384)
 * console.log(result.documentNumber); // "SETP990000001"
 *
 * // Send to DIAN
 * const response = await kit.send(result);
 * ```
 */
export interface DocumentResult {
  /**
   * Unsigned UBL 2.1 XML string.
   *
   * Useful for debugging, auditing, or archival purposes. This is the XML
   * before XAdES-EPES signing is applied.
   */
  xml: string;

  /**
   * Signed XML string with XAdES-EPES digital signature.
   *
   * This is the final document ready to be sent to DIAN via the SOAP API.
   * The signature includes the certificate, signing time, and policy
   * identifier as required by DIAN's technical annex.
   */
  signedXml: string;

  /**
   * Unique document identifier: CUFE (Codigo Unico de Factura Electronica) or
   * CUDE (Codigo Unico de Documento Equivalente).
   *
   * A SHA-384 hash computed from document fields (amounts, dates, NIT, etc.)
   * that uniquely identifies the document within DIAN's system.
   *
   * @remarks
   * - Invoices (type 01, 02, 04) use CUFE, which includes the `technicalKey` from the numbering resolution.
   * - POS documents (type 20), credit notes (type 91), and debit notes (type 92) use CUDE, which includes the software PIN.
   */
  uuid: string;

  /**
   * Full document number including prefix (e.g., `"SETP990000001"`).
   *
   * Matches the `id` provided in the input and is used as the ZIP filename
   * when sending to DIAN.
   */
  documentNumber: string;
}

/**
 * Options for sending a signed document to DIAN's SOAP web service.
 *
 * @remarks
 * In production, use `SendBillSync` (the default) for immediate validation.
 * During the DIAN qualification (habilitacion) process, use `SendTestSetAsync`
 * with the assigned test set ID to submit test documents.
 *
 * @example
 * ```typescript
 * // Production (default)
 * await kit.send(invoice);
 *
 * // Sandbox qualification with test set
 * await kit.send(invoice, {
 *   method: 'SendTestSetAsync',
 *   testSetId: 'your-test-set-id',
 * });
 * ```
 */
export interface SendOptions {
  /**
   * SOAP method to use when submitting the document.
   *
   * - `"SendBillSync"` -- Production, returns validation result immediately (default).
   * - `"SendBillAsync"` -- Production, returns a `trackId` for deferred status checking.
   * - `"SendTestSetAsync"` -- Sandbox, submits to a test set; requires `testSetId`.
   */
  method?: DianSoapMethodValue;

  /**
   * Test set ID assigned by DIAN during the qualification (habilitacion) process.
   *
   * Required when `method` is `"SendTestSetAsync"`. Obtained from the DIAN
   * portal under the software qualification section.
   */
  testSetId?: string;
}

/**
 * Options for looking up a buyer (acquirer) registered with DIAN.
 *
 * Use this to retrieve a buyer's registered name and email before creating
 * an invoice, which helps ensure the customer data matches DIAN's records.
 *
 * @example
 * ```typescript
 * const buyer = await kit.lookupBuyer({
 *   identificationType: '31',         // NIT
 *   identificationNumber: '900123456',
 * });
 * console.log(buyer.receiverName);  // "EMPRESA XYZ SAS"
 * ```
 */
export interface LookupBuyerOptions {
  /**
   * DIAN identification type code for the buyer.
   *
   * Common values:
   * - `"13"` -- Cedula de Ciudadania (CC)
   * - `"31"` -- NIT (Numero de Identificacion Tributaria)
   * - `"22"` -- Cedula de Extranjeria
   * - `"41"` -- Pasaporte
   *
   * @see {@link IdentificationType} for the full list of supported codes.
   */
  identificationType: string;

  /**
   * Buyer's identification number without verification digit (DV) or dashes.
   *
   * @example `"900123456"` (NIT), `"1234567890"` (CC)
   */
  identificationNumber: string;
}
