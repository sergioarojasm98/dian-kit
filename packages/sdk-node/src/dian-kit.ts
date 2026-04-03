import {
  DianDocumentSchema,
  DocumentType,
  OperationType,
  buildCreditNoteXml,
  buildDebitNoteXml,
  buildInvoiceXml,
  generateCufe,
  generateSoftwareSecurityCode,
  getAcquirer,
  getNumberingRange,
  getStatus,
  getStatusZip,
  loadP12,
  sendBill,
  signXml,
  type DianAcquirerResponse,
  type DianDocument,
  type DianNumberingRangeResponse,
  type DianSendResponse,
  type DianStatusResponse,
} from "@dian-kit/core";

import type {
  CreditNoteInput,
  DebitNoteInput,
  DianKitConfig,
  DocumentResult,
  InvoiceInput,
  LookupBuyerOptions,
  ResolvedConfig,
  SendOptions,
} from "./types.js";

/**
 * High-level SDK for Colombian electronic invoicing (DIAN).
 *
 * DianKit provides a simple, type-safe API for creating, signing, and
 * submitting electronic documents to DIAN (Direccion de Impuestos y
 * Aduanas Nacionales de Colombia).
 *
 * Supports:
 * - Facturas Electronicas (Electronic Invoices, type 01)
 * - Documentos Equivalentes POS (POS Documents, type 20)
 * - Notas Credito (Credit Notes, type 91)
 * - Notas Debito (Debit Notes, type 92)
 *
 * The SDK orchestrates the full document lifecycle:
 * 1. **Assemble** -- Merges per-document input with emitter configuration
 * 2. **Validate** -- Validates the assembled document against Zod schemas
 * 3. **Compute CUFE/CUDE** -- Generates the unique document hash (SHA-384)
 * 4. **Build XML** -- Generates UBL 2.1 compliant XML
 * 5. **Sign** -- Applies XAdES-EPES digital signature
 * 6. **Send** -- Submits to DIAN's SOAP web service
 *
 * @example
 * ```typescript
 * import { DianKit } from 'dian-kit';
 * import { readFileSync } from 'node:fs';
 *
 * const kit = new DianKit({
 *   certificate: readFileSync('./empresa.p12'),
 *   certificatePassword: 'cert-password',
 *   supplier: {
 *     name: 'Mi Empresa SAS',
 *     identification: { number: '900123456', type: '31', dv: '3' },
 *     personType: '1',
 *     fiscalResponsibilities: ['O-13'],
 *     taxInfo: {
 *       registrationName: 'MI EMPRESA SAS',
 *       companyId: { number: '900123456', type: '31', dv: '3' },
 *       taxLevelCode: 'O-13',
 *       taxScheme: { code: '01' },
 *       address: { street: 'Calle 100 # 10-20', cityCode: '11001', cityName: 'Bogota', departmentCode: '11', departmentName: 'Bogota D.C.' },
 *     },
 *     address: { street: 'Calle 100 # 10-20', cityCode: '11001', cityName: 'Bogota', departmentCode: '11', departmentName: 'Bogota D.C.' },
 *     email: 'facturacion@miempresa.com',
 *   },
 *   software: { id: 'abc-123', pin: '12345', providerNit: '900123456', providerName: 'Mi Empresa SAS' },
 *   environment: '2', // sandbox
 *   numbering: {
 *     authorizationNumber: '18764000001',
 *     prefix: 'SETP',
 *     startNumber: 990000000,
 *     endNumber: 995000000,
 *     startDate: new Date('2024-01-01'),
 *     endDate: new Date('2025-12-31'),
 *     technicalKey: 'fc8eac422eba16e22ffd8c6f94b3f40a6e38571d',
 *   },
 * });
 *
 * // Create and sign an invoice
 * const invoice = await kit.createInvoice({
 *   id: 'SETP990000001',
 *   issueDate: new Date(),
 *   issueTime: new Date(),
 *   customer: { name: 'Cliente SAS', ... },
 *   lines: [{ id: '1', description: 'Servicio de consultoria', quantity: 1, price: 1000000, lineExtensionAmount: 1000000, taxTotals: [...] }],
 *   taxTotals: [{ taxAmount: 190000, subtotals: [{ taxableAmount: 1000000, taxAmount: 190000, percent: 19, taxScheme: { code: '01' } }] }],
 *   legalMonetaryTotal: { lineExtensionAmount: 1000000, taxExclusiveAmount: 1000000, taxInclusiveAmount: 1190000, allowanceTotalAmount: 0, chargeTotalAmount: 0, prepaidAmount: 0, payableAmount: 1190000 },
 *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
 * });
 *
 * // Send to DIAN
 * const response = await kit.send(invoice);
 * console.log(response.isValid);          // true
 * console.log(invoice.uuid);              // CUFE hash
 * console.log(invoice.documentNumber);    // "SETP990000001"
 * ```
 *
 * @see {@link https://github.com/sergioarojasm98/dian-kit | GitHub Repository}
 * @see {@link DianKitConfig} for configuration options
 */
export class DianKit {
  /** @internal Resolved configuration with parsed certificate data. */
  private readonly config: ResolvedConfig;

  /**
   * Creates a new DianKit instance.
   *
   * Loads and parses the PKCS#12 (.p12) certificate during construction,
   * extracting the private key and certificate chain needed for XAdES-EPES
   * signing.
   *
   * @param config - SDK configuration including certificate, supplier info,
   *   software settings, DIAN environment, and numbering authorization.
   *
   * @throws {Error} If the `.p12` certificate cannot be loaded or the
   *   password is incorrect.
   *
   * @example
   * ```typescript
   * const kit = new DianKit({
   *   certificate: readFileSync('./empresa.p12'),
   *   certificatePassword: 'my-cert-password',
   *   supplier: { ... },
   *   software: { id: '...', pin: '...', providerNit: '...', providerName: '...' },
   *   environment: '2',
   *   numbering: { ... },
   * });
   * ```
   */
  constructor(config: DianKitConfig) {
    const certificateData = loadP12(config.certificate, config.certificatePassword);

    this.config = {
      supplier: config.supplier,
      software: config.software,
      environment: config.environment,
      numbering: config.numbering,
      timeoutMs: config.timeoutMs,
      certificateData,
    };
  }

  /**
   * Creates a signed electronic invoice (Factura Electronica, type 01) or
   * POS equivalent document (Documento Equivalente POS, type 20).
   *
   * Performs the full document pipeline:
   * 1. Assembles the `DianDocument` by merging the input with emitter config
   * 2. Validates the document against Zod schemas
   * 3. Computes the CUFE (for type 01) or CUDE (for type 20) as a SHA-384 hash
   * 4. Computes the SoftwareSecurityCode
   * 5. Generates UBL 2.1 compliant XML
   * 6. Signs the XML with XAdES-EPES using the configured certificate
   *
   * @param input - Invoice data including customer, line items, taxes, and totals.
   *   The supplier, software, and numbering info are taken from the SDK configuration.
   *
   * @returns A {@link DocumentResult} containing the signed XML, unsigned XML,
   *   CUFE/CUDE hash, and document number. Pass this to {@link send} to submit to DIAN.
   *
   * @throws {ZodError} If the assembled document fails schema validation.
   *   The error includes field-level messages indicating which fields are invalid.
   *
   * @remarks
   * - If `documentType` is not specified, defaults to `"01"` (Factura de Venta).
   * - If `operationType` is not specified, defaults to `"10"` (Estandar).
   * - The document `id` must fall within the authorized numbering range.
   * - Tax totals must be consistent with the per-line tax calculations.
   *
   * @example
   * ```typescript
   * const invoice = await kit.createInvoice({
   *   id: 'SETP990000001',
   *   issueDate: new Date(),
   *   issueTime: new Date(),
   *   customer: {
   *     name: 'Comprador SAS',
   *     identification: { number: '800111222', type: '31', dv: '9' },
   *     personType: '1',
   *     fiscalResponsibilities: ['R-99-PN'],
   *     taxInfo: { registrationName: 'COMPRADOR SAS', companyId: { number: '800111222', type: '31', dv: '9' }, taxLevelCode: 'R-99-PN', taxScheme: { code: '01' } },
   *     address: { street: 'Carrera 7 # 45-10', cityCode: '11001', cityName: 'Bogota', departmentCode: '11', departmentName: 'Bogota D.C.' },
   *   },
   *   lines: [{
   *     id: '1',
   *     quantity: 2,
   *     description: 'Servicio de consultoria',
   *     price: 500000,
   *     lineExtensionAmount: 1000000,
   *     taxTotals: [{ taxAmount: 190000, subtotals: [{ taxableAmount: 1000000, taxAmount: 190000, percent: 19, taxScheme: { code: '01' } }] }],
   *   }],
   *   taxTotals: [{ taxAmount: 190000, subtotals: [{ taxableAmount: 1000000, taxAmount: 190000, percent: 19, taxScheme: { code: '01' } }] }],
   *   legalMonetaryTotal: {
   *     lineExtensionAmount: 1000000,
   *     taxExclusiveAmount: 1000000,
   *     taxInclusiveAmount: 1190000,
   *     allowanceTotalAmount: 0,
   *     chargeTotalAmount: 0,
   *     prepaidAmount: 0,
   *     payableAmount: 1190000,
   *   },
   *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
   * });
   *
   * console.log(invoice.uuid); // CUFE: "a1b2c3..."
   * ```
   */
  async createInvoice(input: InvoiceInput): Promise<DocumentResult> {
    const doc = this.assembleDocument(input, {
      documentType: input.documentType ?? DocumentType.FACTURA_VENTA,
      operationType: input.operationType ?? OperationType.ESTANDAR,
    });

    return this.processDocument(doc, buildInvoiceXml);
  }

  /**
   * Creates a signed credit note (Nota Credito, type 91).
   *
   * A credit note partially or fully reverses a previously issued invoice.
   * It references the original document and includes a discrepancy reason
   * code as defined by DIAN.
   *
   * @param input - Credit note data including the billing reference to the
   *   original invoice, the discrepancy reason, line items, taxes, and totals.
   *
   * @returns A {@link DocumentResult} containing the signed XML, unsigned XML,
   *   CUDE hash, and document number. Pass this to {@link send} to submit to DIAN.
   *
   * @throws {ZodError} If the assembled document fails schema validation.
   *
   * @remarks
   * - The `documentType` is automatically set to `"91"` (Nota Credito).
   * - The `operationType` is automatically set to `"20"` (Nota Credito).
   * - Credit notes use CUDE (not CUFE) since they are computed with the software PIN.
   * - The `billingReference.uuid` must be the CUFE/CUDE of the original invoice.
   * - Common discrepancy response codes: `"1"` (partial return), `"2"` (cancellation),
   *   `"3"` (discount), `"4"` (price adjustment).
   *
   * @example
   * ```typescript
   * const creditNote = await kit.createCreditNote({
   *   id: 'NC001',
   *   issueDate: new Date(),
   *   issueTime: new Date(),
   *   customer: originalCustomer,
   *   billingReference: {
   *     id: 'SETP990000001',
   *     uuid: 'a1b2c3...', // CUFE of the original invoice
   *     issueDate: new Date('2025-01-15'),
   *   },
   *   discrepancyResponse: {
   *     referenceId: 'SETP990000001',
   *     responseCode: '2', // Cancellation
   *     description: 'Anulacion de factura por error en datos del cliente',
   *   },
   *   lines: [{ id: '1', quantity: 1, description: 'Devolucion servicio', price: 500000, lineExtensionAmount: 500000, taxTotals: [...] }],
   *   taxTotals: [...],
   *   legalMonetaryTotal: { ... },
   *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
   * });
   * ```
   */
  async createCreditNote(input: CreditNoteInput): Promise<DocumentResult> {
    const doc = this.assembleDocument(input, {
      documentType: DocumentType.NOTA_CREDITO,
      operationType: OperationType.NOTA_CREDITO,
      billingReference: input.billingReference,
      discrepancyResponse: input.discrepancyResponse,
    });

    return this.processDocument(doc, buildCreditNoteXml);
  }

  /**
   * Creates a signed debit note (Nota Debito, type 92).
   *
   * A debit note increases the amount owed on a previously issued invoice.
   * Common use cases include interest charges, additional expenses, or value
   * adjustments.
   *
   * @param input - Debit note data including the billing reference to the
   *   original invoice, the discrepancy reason, line items, taxes, and totals.
   *
   * @returns A {@link DocumentResult} containing the signed XML, unsigned XML,
   *   CUDE hash, and document number. Pass this to {@link send} to submit to DIAN.
   *
   * @throws {ZodError} If the assembled document fails schema validation.
   *
   * @remarks
   * - The `documentType` is automatically set to `"92"` (Nota Debito).
   * - The `operationType` is automatically set to `"30"` (Nota Debito).
   * - Debit notes use CUDE (not CUFE) since they are computed with the software PIN.
   * - Common discrepancy response codes: `"1"` (interest), `"2"` (expenses to collect),
   *   `"3"` (value change).
   *
   * @example
   * ```typescript
   * const debitNote = await kit.createDebitNote({
   *   id: 'ND001',
   *   issueDate: new Date(),
   *   issueTime: new Date(),
   *   customer: originalCustomer,
   *   billingReference: {
   *     id: 'SETP990000001',
   *     uuid: 'a1b2c3...', // CUFE of the original invoice
   *     issueDate: new Date('2025-01-15'),
   *   },
   *   discrepancyResponse: {
   *     referenceId: 'SETP990000001',
   *     responseCode: '1', // Interest charges
   *     description: 'Cobro de intereses por mora en pago',
   *   },
   *   lines: [{ id: '1', quantity: 1, description: 'Intereses de mora', price: 50000, lineExtensionAmount: 50000, taxTotals: [...] }],
   *   taxTotals: [...],
   *   legalMonetaryTotal: { ... },
   *   paymentMeans: { paymentForm: '1', paymentMethod: '10' },
   * });
   * ```
   */
  async createDebitNote(input: DebitNoteInput): Promise<DocumentResult> {
    const doc = this.assembleDocument(input, {
      documentType: DocumentType.NOTA_DEBITO,
      operationType: OperationType.NOTA_DEBITO,
      billingReference: input.billingReference,
      discrepancyResponse: input.discrepancyResponse,
    });

    return this.processDocument(doc, buildDebitNoteXml);
  }

  /**
   * Sends a signed document to DIAN's SOAP web service.
   *
   * Packages the signed XML into a ZIP file (named `{nit}{documentNumber}.zip`)
   * and submits it to the configured DIAN endpoint.
   *
   * @param document - The {@link DocumentResult} returned by {@link createInvoice},
   *   {@link createCreditNote}, or {@link createDebitNote}.
   * @param options - Optional send configuration. Controls the SOAP method
   *   and test set ID.
   *
   * @returns A {@link DianSendResponse} with the validation result, status code,
   *   and any errors reported by DIAN.
   *
   * @throws {DianTransportError} If the SOAP request fails due to network
   *   errors, timeouts, or DIAN returning a SOAP fault.
   *
   * @remarks
   * - Default method is `SendBillSync` (production, synchronous validation).
   * - For the DIAN qualification (habilitacion) process, use
   *   `{ method: "SendTestSetAsync", testSetId: "..." }`.
   * - After `SendBillAsync` or `SendTestSetAsync`, use {@link getStatusZip}
   *   with the returned `trackId` to poll for the result.
   *
   * @example
   * ```typescript
   * // Synchronous send (production)
   * const response = await kit.send(invoice);
   * if (response.isValid) {
   *   console.log('Invoice accepted by DIAN');
   * } else {
   *   console.error('Rejected:', response.errors);
   * }
   *
   * // Async send for sandbox qualification
   * const testResponse = await kit.send(invoice, {
   *   method: 'SendTestSetAsync',
   *   testSetId: 'your-test-set-id',
   * });
   * // Poll with getStatusZip(testResponse.trackId)
   * ```
   */
  async send(document: DocumentResult, options?: SendOptions): Promise<DianSendResponse> {
    return sendBill({
      signedXml: document.signedXml,
      supplierNit: this.config.supplier.identification.number,
      documentNumber: document.documentNumber,
      auth: { certificate: this.config.certificateData },
      environment: this.config.environment,
      method: options?.method,
      testSetId: options?.testSetId,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Checks the validation status of a document by its CUFE or CUDE.
   *
   * Use this to verify whether a previously sent document was accepted
   * or rejected by DIAN, or to retrieve the current status of a document
   * sent synchronously.
   *
   * @param trackId - The CUFE or CUDE of the document to check. This is
   *   the `uuid` field from the {@link DocumentResult}.
   *
   * @returns A {@link DianStatusResponse} with the validation result,
   *   status code, description, and any validation errors.
   *
   * @throws {DianTransportError} If the SOAP request fails due to network
   *   errors, timeouts, or DIAN returning a SOAP fault.
   *
   * @example
   * ```typescript
   * const status = await kit.getStatus(invoice.uuid);
   * if (status.isValid) {
   *   console.log('Document is valid:', status.statusDescription);
   * } else {
   *   console.error('Validation errors:', status.errors);
   * }
   * ```
   */
  async getStatus(trackId: string): Promise<DianStatusResponse> {
    return getStatus({
      trackId,
      auth: { certificate: this.config.certificateData },
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Checks the status of an asynchronous batch submission by its ZIP key.
   *
   * Use this after sending a document with `SendBillAsync` or
   * `SendTestSetAsync`, passing the `trackId` returned by {@link send}.
   *
   * @param trackId - The ZIP key / track ID returned by DIAN from an
   *   asynchronous send operation (available as `response.trackId`).
   *
   * @returns A {@link DianStatusResponse} with the validation result,
   *   status code, description, and any validation errors.
   *
   * @throws {DianTransportError} If the SOAP request fails due to network
   *   errors, timeouts, or DIAN returning a SOAP fault.
   *
   * @remarks
   * DIAN may take several seconds to process asynchronous submissions.
   * If the status is not yet available, retry after a short delay.
   *
   * @example
   * ```typescript
   * // After an async send
   * const sendResult = await kit.send(invoice, {
   *   method: 'SendTestSetAsync',
   *   testSetId: 'test-set-id',
   * });
   *
   * // Poll for the result
   * const status = await kit.getStatusZip(sendResult.trackId!);
   * console.log(status.isValid, status.statusDescription);
   * ```
   */
  async getStatusZip(trackId: string): Promise<DianStatusResponse> {
    return getStatusZip({
      trackId,
      auth: { certificate: this.config.certificateData },
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Queries the numbering ranges authorized by DIAN for the configured software.
   *
   * Returns all active numbering resolutions (prefixes, number ranges, validity
   * dates, and technical keys) assigned to the supplier's NIT and software ID.
   *
   * @param accountCodeT - NIT of the technology provider. Defaults to the
   *   supplier's NIT if not specified (i.e., when the supplier is also the
   *   technology provider).
   *
   * @returns A {@link DianNumberingRangeResponse} containing an array of
   *   authorized ranges and the raw SOAP response.
   *
   * @throws {DianTransportError} If the SOAP request fails due to network
   *   errors, timeouts, or DIAN returning a SOAP fault.
   *
   * @remarks
   * This is useful for validating that your configured numbering resolution
   * matches what DIAN has on record, or for auto-discovery of available ranges.
   *
   * @example
   * ```typescript
   * const { ranges } = await kit.getNumberingRange();
   * for (const range of ranges) {
   *   console.log(`${range.prefix}: ${range.fromNumber}-${range.toNumber} (valid until ${range.endDate})`);
   * }
   * ```
   */
  async getNumberingRange(
    accountCodeT?: string,
  ): Promise<DianNumberingRangeResponse> {
    return getNumberingRange({
      accountCode: this.config.supplier.identification.number,
      accountCodeT: accountCodeT ?? this.config.supplier.identification.number,
      softwareCode: this.config.software.id,
      auth: { certificate: this.config.certificateData },
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Looks up a buyer (acquirer) registered with DIAN by their identification.
   *
   * Retrieves the buyer's registered name and email address from DIAN's
   * database. Useful for auto-completing customer data when creating invoices
   * and for validating that the buyer's information matches DIAN records.
   *
   * @param options - The buyer's identification type and number.
   *
   * @returns A {@link DianAcquirerResponse} with the buyer's registered name,
   *   email, status code, and descriptive message.
   *
   * @throws {DianTransportError} If the SOAP request fails due to network
   *   errors, timeouts, or DIAN returning a SOAP fault.
   *
   * @example
   * ```typescript
   * // Look up a company by NIT
   * const buyer = await kit.lookupBuyer({
   *   identificationType: '31',         // NIT
   *   identificationNumber: '900123456',
   * });
   * console.log(buyer.receiverName);  // "EMPRESA XYZ SAS"
   * console.log(buyer.receiverEmail); // "facturacion@empresa.com"
   *
   * // Look up an individual by Cedula
   * const individual = await kit.lookupBuyer({
   *   identificationType: '13',          // Cedula de Ciudadania
   *   identificationNumber: '1234567890',
   * });
   * ```
   */
  async lookupBuyer(options: LookupBuyerOptions): Promise<DianAcquirerResponse> {
    return getAcquirer({
      identificationType: options.identificationType,
      identificationNumber: options.identificationNumber,
      auth: { certificate: this.config.certificateData },
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Assembles a complete `DianDocument` by merging per-document input with
   * the emitter's static configuration (supplier, software, numbering, environment).
   *
   * The assembled document is validated against the Zod schema before returning.
   * This catches invalid data early, before it reaches XML generation or DIAN.
   *
   * @param input - Per-document input data (customer, lines, totals, etc.).
   * @param overrides - Document type, operation type, and optional credit/debit
   *   note fields that are determined by the calling method.
   *
   * @returns A fully validated {@link DianDocument} ready for processing.
   *
   * @throws {ZodError} If the assembled document fails schema validation.
   *   The error contains detailed, field-level messages indicating exactly
   *   which fields are invalid and why.
   *
   * @internal
   */
  private assembleDocument(
    input: InvoiceInput | CreditNoteInput | DebitNoteInput,
    overrides: {
      documentType: DianDocument["documentType"];
      operationType: DianDocument["operationType"];
      billingReference?: DianDocument["billingReference"];
      discrepancyResponse?: DianDocument["discrepancyResponse"];
    },
  ): DianDocument {
    const raw = {
      documentType: overrides.documentType,
      operationType: overrides.operationType,
      environment: this.config.environment,
      id: input.id,
      issueDate: input.issueDate,
      issueTime: input.issueTime,
      currency: input.currency ?? "COP",
      supplier: this.config.supplier,
      customer: input.customer,
      lines: input.lines,
      taxTotals: input.taxTotals,
      legalMonetaryTotal: input.legalMonetaryTotal,
      paymentMeans: input.paymentMeans,
      period: input.period,
      notes: input.notes,
      software: this.config.software,
      numbering: this.config.numbering,
      billingReference: overrides.billingReference,
      discrepancyResponse: overrides.discrepancyResponse,
    };

    // Validate the assembled document against the Zod schema.
    // Throws ZodError with detailed field-level messages on invalid input,
    // preventing malformed data from reaching XML generation or DIAN.
    return DianDocumentSchema.parse(raw) as DianDocument;
  }

  /**
   * Processes a validated `DianDocument` through the full generation pipeline:
   * CUFE/CUDE computation, SoftwareSecurityCode generation, UBL 2.1 XML
   * building, and XAdES-EPES digital signing.
   *
   * @param doc - A validated {@link DianDocument} (output of {@link assembleDocument}).
   * @param buildXml - The XML builder function specific to the document type
   *   (invoice, credit note, or debit note).
   *
   * @returns A {@link DocumentResult} containing both the unsigned and signed XML,
   *   the CUFE/CUDE hash, and the document number.
   *
   * @internal
   */
  private async processDocument(
    doc: DianDocument,
    buildXml: (doc: DianDocument, uuid: string, softwareSecurityCode: string) => string,
  ): Promise<DocumentResult> {
    const uuid = generateCufe(doc);
    const softwareSecurityCode = generateSoftwareSecurityCode(
      doc.software.id,
      doc.software.pin,
      doc.id,
    );

    const xml = buildXml(doc, uuid, softwareSecurityCode);

    const { signedXml } = await signXml({
      xml,
      certificate: this.config.certificateData,
    });

    return {
      xml,
      signedXml,
      uuid,
      documentNumber: doc.id,
    };
  }
}
