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
 * High-level SDK for DIAN electronic invoicing in Colombia.
 *
 * Orchestrates the full document lifecycle: XML generation, CUFE/CUDE
 * calculation, XAdES-EPES digital signing, and DIAN SOAP API communication.
 *
 * @example
 * ```typescript
 * import { DianKit } from "@dian-kit/sdk-node";
 * import { readFileSync } from "node:fs";
 *
 * const kit = new DianKit({
 *   certificate: readFileSync("cert.p12"),
 *   certificatePassword: "secret",
 *   supplier: { ... },
 *   software: { id: "...", pin: "...", providerNit: "...", providerName: "..." },
 *   credentials: { nit: "900123456", password: "softwarePin" },
 *   environment: "2", // sandbox
 *   numbering: { ... },
 * });
 *
 * const invoice = await kit.createInvoice({
 *   id: "SETP990000001",
 *   issueDate: new Date(),
 *   issueTime: new Date(),
 *   customer: { ... },
 *   lines: [{ ... }],
 *   taxTotals: [{ ... }],
 *   legalMonetaryTotal: { ... },
 *   paymentMeans: { ... },
 * });
 *
 * const response = await kit.send(invoice);
 * console.log(response.isValid); // true
 * ```
 */
export class DianKit {
  private readonly config: ResolvedConfig;

  constructor(config: DianKitConfig) {
    const certificateData = loadP12(config.certificate, config.certificatePassword);

    this.config = {
      supplier: config.supplier,
      software: config.software,
      credentials: config.credentials,
      environment: config.environment,
      numbering: config.numbering,
      timeoutMs: config.timeoutMs,
      certificateData,
    };
  }

  /**
   * Creates a signed invoice (type 01) or POS document (type 20).
   *
   * Performs the full pipeline:
   * 1. Assembles the DianDocument from input + config
   * 2. Computes CUFE/CUDE (SHA-384)
   * 3. Computes SoftwareSecurityCode
   * 4. Generates UBL 2.1 XML
   * 5. Signs with XAdES-EPES
   */
  async createInvoice(input: InvoiceInput): Promise<DocumentResult> {
    const doc = this.assembleDocument(input, {
      documentType: input.documentType ?? DocumentType.FACTURA_VENTA,
      operationType: input.operationType ?? OperationType.ESTANDAR,
    });

    return this.processDocument(doc, buildInvoiceXml);
  }

  /**
   * Creates a signed credit note (type 91).
   *
   * Requires `billingReference` (original invoice) and `discrepancyResponse`
   * (reason for the credit note).
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
   * Creates a signed debit note (type 92).
   *
   * Requires `billingReference` (original invoice) and `discrepancyResponse`
   * (reason for the debit note).
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
   * Sends a signed document to DIAN.
   *
   * By default uses `SendBillSync`. For sandbox testing, pass
   * `{ method: "SendTestSetAsync", testSetId: "..." }`.
   */
  async send(document: DocumentResult, options?: SendOptions): Promise<DianSendResponse> {
    return sendBill({
      signedXml: document.signedXml,
      supplierNit: this.config.supplier.identification.number,
      documentNumber: document.documentNumber,
      credentials: this.config.credentials,
      environment: this.config.environment,
      method: options?.method,
      testSetId: options?.testSetId,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Checks the status of a document by its CUFE or CUDE.
   */
  async getStatus(trackId: string): Promise<DianStatusResponse> {
    return getStatus({
      trackId,
      credentials: this.config.credentials,
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Checks the status of a batch by its ZIP ID.
   * Use after `SendBillAsync` or `SendTestSetAsync`.
   */
  async getStatusZip(trackId: string): Promise<DianStatusResponse> {
    return getStatusZip({
      trackId,
      credentials: this.config.credentials,
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Queries the numbering ranges authorized by DIAN for this software.
   */
  async getNumberingRange(
    accountCodeT?: string,
  ): Promise<DianNumberingRangeResponse> {
    return getNumberingRange({
      accountCode: this.config.supplier.identification.number,
      accountCodeT: accountCodeT ?? this.config.supplier.identification.number,
      softwareCode: this.config.software.id,
      credentials: this.config.credentials,
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Looks up a buyer (acquirer) registered with DIAN.
   *
   * Useful for auto-completing buyer details when creating invoices.
   *
   * @example
   * ```typescript
   * const buyer = await kit.lookupBuyer({
   *   identificationType: "31",        // NIT
   *   identificationNumber: "900123456",
   * });
   * console.log(buyer.receiverName);  // "EMPRESA XYZ SAS"
   * console.log(buyer.receiverEmail); // "facturacion@empresa.com"
   * ```
   */
  async lookupBuyer(options: LookupBuyerOptions): Promise<DianAcquirerResponse> {
    return getAcquirer({
      identificationType: options.identificationType,
      identificationNumber: options.identificationNumber,
      credentials: this.config.credentials,
      environment: this.config.environment,
      timeoutMs: this.config.timeoutMs,
    });
  }

  /**
   * Assembles a DianDocument by merging per-document input with the
   * emitter's configuration (supplier, software, numbering, environment).
   *
   * Validates the assembled document against the Zod schema before returning.
   * Throws a ZodError with actionable messages if validation fails.
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
   * Processes a DianDocument through the full pipeline:
   * CUFE/CUDE → SoftwareSecurityCode → XML → Sign
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
