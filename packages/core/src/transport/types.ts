import type { DianSoapMethod } from "../constants/dian-endpoints.js";
import type { EnvironmentValue } from "../constants/document-types.js";
import type { CertificateData } from "../security/certificate.js";

/**
 * Re-exported environment value type for transport consumers.
 *
 * @see {@link EnvironmentValue}
 */
export type { EnvironmentValue };

/**
 * Union type of all DIAN SOAP method name literals (e.g., `"SendBillSync"`, `"GetStatus"`).
 * Derived from the {@link DianSoapMethod} constant object.
 *
 * @see {@link DianSoapMethod}
 */
export type DianSoapMethodValue = (typeof DianSoapMethod)[keyof typeof DianSoapMethod];

/**
 * WS-Security Signature authentication configuration for the DIAN electronic
 * invoicing web service (WcfDianCustomerServices).
 *
 * The SOAP envelope is signed with the .p12 certificate using RSA-SHA256.
 * The BinarySecurityToken and XML Signature are included in the WS-Security
 * header as required by DIAN.
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WSDL}
 */
export interface SoapAuthConfig {
  /** Certificate data loaded from .p12 via loadP12() */
  certificate: CertificateData;
}

/**
 * Options for sending an electronic document (invoice, credit note, debit note)
 * to the DIAN web service.
 *
 * The signed XML is automatically ZIP-compressed, Base64-encoded, and wrapped
 * in a SOAP envelope before transmission.
 *
 * @example
 * ```typescript
 * const options: SendBillOptions = {
 *   signedXml: '<Invoice>...</Invoice>',
 *   supplierNit: '900123456',
 *   documentNumber: 'SETP990000001',
 *   auth: { certificate: loadP12(p12Buffer, password) },
 *   environment: Environment.HABILITACION,
 *   method: DianSoapMethod.SEND_TEST_SET_ASYNC,
 *   testSetId: 'abc123-test-set-id',
 * };
 * ```
 *
 * @see {@link sendBill}
 */
export interface SendBillOptions {
  /** XAdES-EPES signed UBL 2.1 XML document as a UTF-8 string */
  signedXml: string;
  /** Supplier NIT without verification digit (e.g., `"900123456"`) -- used for ZIP file naming */
  supplierNit: string;
  /** Document number (e.g., `"SETP990000001"`) -- used for ZIP file naming */
  documentNumber: string;
  /** WS-Security Signature authentication configuration */
  auth: SoapAuthConfig;
  /** DIAN environment: `"1"` = production, `"2"` = sandbox (habilitacion) */
  environment: EnvironmentValue;
  /**
   * SOAP method to invoke on the DIAN service.
   * - `"SendBillSync"` -- production, synchronous response (default)
   * - `"SendBillAsync"` -- production, deferred response
   * - `"SendTestSetAsync"` -- sandbox only, requires {@link testSetId}
   */
  method?: DianSoapMethodValue;
  /**
   * Test set ID assigned by DIAN during the software qualification process.
   * Required when `method` is `"SendTestSetAsync"`.
   */
  testSetId?: string;
  /** HTTP timeout in milliseconds (default: `30_000`) */
  timeoutMs?: number;
}

/**
 * Options for querying the processing status of a previously submitted document
 * via `GetStatus` or `GetStatusZip`.
 *
 * @example
 * ```typescript
 * const options: GetStatusOptions = {
 *   trackId: 'b4f7c2a1-3e5d-4f8a-9b2c-1d6e8f0a3c5b',
 *   auth: { certificate: loadP12(p12Buffer, password) },
 *   environment: Environment.PRODUCCION,
 * };
 * ```
 *
 * @see {@link getStatus}
 * @see {@link getStatusZip}
 */
export interface GetStatusOptions {
  /** CUFE (invoice hash) or CUDE (credit/debit note hash) of the document to query */
  trackId: string;
  /** WS-Security Signature authentication configuration */
  auth: SoapAuthConfig;
  /** DIAN environment: `"1"` = production, `"2"` = sandbox */
  environment: EnvironmentValue;
  /** HTTP timeout in milliseconds (default: `30_000`) */
  timeoutMs?: number;
}

/**
 * Options for querying authorized numbering ranges (resolution ranges) from DIAN
 * via the `GetNumberingRange` SOAP method.
 *
 * Numbering ranges define the prefixes and number sequences a supplier is
 * authorized to use for electronic invoicing.
 *
 * @example
 * ```typescript
 * const options: GetNumberingRangeOptions = {
 *   accountCode: '900123456',
 *   accountCodeT: '900654321',
 *   softwareCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 *   auth: { certificate: loadP12(p12Buffer, password) },
 *   environment: Environment.PRODUCCION,
 * };
 * ```
 *
 * @see {@link getNumberingRange}
 */
export interface GetNumberingRangeOptions {
  /** Supplier NIT without verification digit (e.g., `"900123456"`) */
  accountCode: string;
  /** Technology provider NIT without verification digit */
  accountCodeT: string;
  /** Software ID registered in the DIAN portal (UUID format) */
  softwareCode: string;
  /** WS-Security Signature authentication configuration */
  auth: SoapAuthConfig;
  /** DIAN environment: `"1"` = production, `"2"` = sandbox */
  environment: EnvironmentValue;
  /** HTTP timeout in milliseconds (default: `30_000`) */
  timeoutMs?: number;
}

/**
 * Options for querying acquirer (buyer) information from the DIAN registry
 * via the `GetAcquirer` SOAP method.
 *
 * Useful for auto-completing buyer details (legal name, registered email)
 * when creating an invoice.
 *
 * @example
 * ```typescript
 * const options: GetAcquirerOptions = {
 *   identificationType: '31',         // NIT
 *   identificationNumber: '900123456',
 *   auth: { certificate: loadP12(p12Buffer, password) },
 *   environment: Environment.HABILITACION,
 * };
 * ```
 *
 * @see {@link getAcquirer}
 */
export interface GetAcquirerOptions {
  /** Acquirer identification type code (e.g., `"31"` for NIT, `"13"` for Cedula de Ciudadania) */
  identificationType: string;
  /** Acquirer identification number without verification digit or dashes */
  identificationNumber: string;
  /** WS-Security Signature authentication configuration */
  auth: SoapAuthConfig;
  /** DIAN environment: `"1"` = production, `"2"` = sandbox */
  environment: EnvironmentValue;
  /** HTTP timeout in milliseconds (default: `30_000`) */
  timeoutMs?: number;
}

/**
 * Parsed response from the DIAN `GetAcquirer` SOAP method.
 * Contains the acquirer's registered legal name and email address.
 *
 * @see {@link getAcquirer}
 */
export interface DianAcquirerResponse {
  /** Legal name or business name of the acquirer as registered with DIAN */
  receiverName: string;
  /** Email address of the acquirer as registered with DIAN */
  receiverEmail: string;
  /** DIAN status code (e.g., `"00"` = found, `"99"` = error) */
  statusCode: string;
  /** Human-readable message from DIAN describing the result */
  message: string;
  /** Raw SOAP XML response for debugging purposes */
  rawResponse: string;
}

/**
 * A single validation error returned by DIAN when a document fails validation.
 * DIAN returns errors as strings in the format `"Code: Description"`, which are
 * parsed into this structured representation.
 *
 * @example
 * ```typescript
 * // Typical DIAN validation error
 * const error: DianValidationError = {
 *   code: 'FAD06',
 *   description: 'El CUFE informado no corresponde al esperado',
 * };
 * ```
 */
export interface DianValidationError {
  /** DIAN error code (e.g., `"FAD06"`, `"FAD08"`) or `"DIAN_ERROR"` if unparseable */
  code: string;
  /** Human-readable description of the validation failure */
  description: string;
}

/**
 * Parsed response from DIAN after submitting a document via
 * `SendBillSync`, `SendBillAsync`, or `SendTestSetAsync`.
 *
 * @see {@link sendBill}
 */
export interface DianSendResponse {
  /** Whether DIAN accepted the document without validation errors */
  isValid: boolean;
  /** DIAN status code (e.g., `"00"` = success, `"99"` = error) */
  statusCode: string;
  /** Human-readable status description (e.g., `"Procesado Correctamente"`) */
  statusDescription: string;
  /** UUID or ZipKey returned by DIAN for asynchronous tracking; `undefined` for sync responses */
  trackId?: string;
  /** Validation errors (populated only when `isValid` is `false`) */
  errors: DianValidationError[];
  /** Raw SOAP XML response for debugging purposes */
  rawResponse: string;
}

/**
 * Parsed response from DIAN for document status queries via
 * `GetStatus` (by CUFE/CUDE) or `GetStatusZip` (by ZIP batch ID).
 *
 * @see {@link getStatus}
 * @see {@link getStatusZip}
 */
export interface DianStatusResponse {
  /** Whether the queried document was accepted by DIAN */
  isValid: boolean;
  /** DIAN status code (e.g., `"00"` = accepted, `"66"` = in process, `"99"` = error) */
  statusCode: string;
  /** Human-readable status description from DIAN */
  statusDescription: string;
  /** Validation errors (populated only when `isValid` is `false`) */
  errors: DianValidationError[];
  /** Raw SOAP XML response for debugging purposes */
  rawResponse: string;
}

/**
 * A single authorized numbering range (resolution) returned by DIAN.
 * Each range defines a prefix and numeric interval that the supplier
 * is authorized to use for electronic document numbering.
 *
 * @see {@link DianNumberingRangeResponse}
 */
export interface DianNumberingRange {
  /** DIAN authorization (resolution) number */
  authorizationNumber: string;
  /** Invoice prefix authorized by DIAN (e.g., `"SETT"`, `"FV"`) */
  prefix: string;
  /** Start of the authorized numbering sequence (inclusive) */
  fromNumber: number;
  /** End of the authorized numbering sequence (inclusive) */
  toNumber: number;
  /** Authorization start date (ISO 8601 format, e.g., `"2024-01-01"`) */
  startDate: string;
  /** Authorization end date (ISO 8601 format, e.g., `"2025-12-31"`) */
  endDate: string;
  /** Technical key assigned by DIAN for CUFE calculation */
  technicalKey: string;
}

/**
 * Parsed response from the DIAN `GetNumberingRange` SOAP method.
 * Contains all authorized numbering ranges for the queried software.
 *
 * @see {@link getNumberingRange}
 */
export interface DianNumberingRangeResponse {
  /** List of authorized numbering ranges; empty if none are active */
  ranges: DianNumberingRange[];
  /** Raw SOAP XML response for debugging purposes */
  rawResponse: string;
}

/**
 * Maximum number of characters stored in {@link DianTransportError.rawResponse}.
 * Responses exceeding this limit are truncated to prevent sensitive data
 * leakage in logs and error reporting systems. Enable debug logging at the
 * call site to capture the full response when needed.
 */
const MAX_RAW_RESPONSE_LENGTH = 1000;

/**
 * Error thrown when communication with the DIAN electronic invoicing web service
 * fails due to network issues, HTTP errors, timeouts, or when DIAN returns a
 * SOAP Fault in its response.
 *
 * The `rawResponse` property is automatically truncated to
 * {@link MAX_RAW_RESPONSE_LENGTH} characters to prevent sensitive data leakage.
 *
 * @example
 * ```typescript
 * try {
 *   await sendBill(options);
 * } catch (error) {
 *   if (error instanceof DianTransportError) {
 *     console.error('DIAN error:', error.message);
 *     console.error('HTTP status:', error.statusCode);
 *     console.error('Raw response:', error.rawResponse);
 *   }
 * }
 * ```
 *
 * @see {@link sendBill}
 * @see {@link getStatus}
 */
export class DianTransportError extends Error {
  /** Truncated raw SOAP XML response body, if available; `undefined` for network/timeout errors */
  public readonly rawResponse?: string;

  /**
   * Creates a new DianTransportError instance.
   *
   * @param message - Human-readable error description (prefixed with `[DIAN-KIT]`)
   * @param statusCode - HTTP status code returned by the DIAN server, if applicable
   * @param rawResponse - Raw SOAP XML response body; automatically truncated if too long
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    rawResponse?: string,
  ) {
    super(`[DIAN-KIT] ${message}`);
    this.name = "DianTransportError";

    if (rawResponse != null) {
      this.rawResponse =
        rawResponse.length > MAX_RAW_RESPONSE_LENGTH
          ? `${rawResponse.slice(0, MAX_RAW_RESPONSE_LENGTH)}... [truncated, ${rawResponse.length} chars total]`
          : rawResponse;
    }
  }
}
