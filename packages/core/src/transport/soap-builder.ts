import type { DianCredentials, GetAcquirerOptions, GetNumberingRangeOptions } from "./types.js";

/** SOAP 1.2 envelope namespace */
const NS_SOAP = "http://www.w3.org/2003/05/soap-envelope";
/** WS-Security Security Extensions 1.0 namespace */
const NS_WSSE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
/** WS-Security Utility 1.0 namespace */
const NS_WSU =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
/** WS-Security UsernameToken PasswordText profile URI */
const NS_PASSWORD_TYPE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText";
/** DIAN WCF service namespace */
const NS_WCF = "http://wcf.dian.colombia";

/**
 * Base URI for DIAN WCF SOAPAction headers.
 * Each SOAP method appends its name to this base (e.g., `.../SendBillSync`).
 *
 * @see {@link getSoapAction}
 */
export const DIAN_ACTION_BASE = "http://wcf.dian.colombia/IWcfDianCustomerServices";

/**
 * Builds the full SOAPAction URI for a given DIAN WCF method name.
 * The SOAPAction is included in the `Content-Type` header per the SOAP 1.2 specification.
 *
 * @param method - DIAN SOAP method name (e.g., `"SendBillSync"`, `"GetStatus"`)
 * @returns Full SOAPAction URI (e.g., `"http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync"`)
 *
 * @example
 * ```typescript
 * const action = getSoapAction('SendBillSync');
 * // "http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync"
 * ```
 *
 * @see {@link DIAN_ACTION_BASE}
 */
export function getSoapAction(method: string): string {
  return `${DIAN_ACTION_BASE}/${method}`;
}

/**
 * Escapes XML special characters in plain text to prevent injection.
 * Handles `&`, `<`, `>`, `"`, and `'`.
 *
 * @param value - Plain text string to escape
 * @returns XML-safe string with special characters replaced by entities
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Builds the WS-Security SOAP header with a UsernameToken element using the
 * PasswordText profile. The password is transmitted as plain text within the
 * XML, relying on TLS for transport-level encryption.
 *
 * @param credentials - DIAN WS-Security credentials (NIT + password)
 * @returns SOAP header XML string containing the WS-Security UsernameToken
 */
function buildSecurityHeader(credentials: DianCredentials): string {
  return `<soap:Header>
    <wsse:Security xmlns:wsse="${NS_WSSE}" xmlns:wsu="${NS_WSU}" soap:mustUnderstand="true">
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(credentials.nit)}</wsse:Username>
        <wsse:Password Type="${NS_PASSWORD_TYPE}">${escapeXml(credentials.password)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>`;
}

/**
 * Wraps a SOAP header and body into a complete SOAP 1.2 envelope with the
 * required XML declaration, SOAP namespace, and DIAN WCF namespace.
 *
 * @param header - SOAP header XML string (e.g., WS-Security header)
 * @param body - SOAP body XML string (e.g., method-specific content)
 * @returns Complete SOAP 1.2 envelope ready for HTTP transmission
 */
function buildEnvelope(header: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="${NS_SOAP}" xmlns:wcf="${NS_WCF}">
  ${header}
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds the SOAP 1.2 envelope for the `SendBillSync` WCF method.
 * Used in production for synchronous submission of invoices, credit notes,
 * and debit notes. DIAN processes the document and returns the result immediately.
 *
 * @param fileName - ZIP file name following DIAN conventions (e.g., `"900123456SETP990000001.xml.zip"`)
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param credentials - WS-Security credentials for DIAN authentication
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildSendBillSyncEnvelope(
 *   '900123456FV001.xml.zip',
 *   zipBase64Content,
 *   { nit: '900123456', password: 'softwarePin' },
 * );
 * ```
 *
 * @see {@link buildSendBillAsyncEnvelope}
 * @see {@link buildSendTestSetAsyncEnvelope}
 */
export function buildSendBillSyncEnvelope(
  fileName: string,
  fileBase64: string,
  credentials: DianCredentials,
): string {
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:SendBillSync>
      <wcf:fileName>${escapeXml(fileName)}</wcf:fileName>
      <wcf:contentFile>${fileBase64}</wcf:contentFile>
    </wcf:SendBillSync>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `SendBillAsync` WCF method.
 * Used in production for asynchronous document submission. DIAN queues the
 * document for processing and returns a ZipKey for later status polling
 * via {@link buildGetStatusZipEnvelope}.
 *
 * @param fileName - ZIP file name following DIAN conventions (e.g., `"900123456FV001.xml.zip"`)
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param credentials - WS-Security credentials for DIAN authentication
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildSendBillAsyncEnvelope(
 *   '900123456FV001.xml.zip',
 *   zipBase64Content,
 *   { nit: '900123456', password: 'softwarePin' },
 * );
 * ```
 *
 * @see {@link buildSendBillSyncEnvelope}
 * @see {@link buildGetStatusZipEnvelope}
 */
export function buildSendBillAsyncEnvelope(
  fileName: string,
  fileBase64: string,
  credentials: DianCredentials,
): string {
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:SendBillAsync>
      <wcf:fileName>${escapeXml(fileName)}</wcf:fileName>
      <wcf:contentFile>${fileBase64}</wcf:contentFile>
    </wcf:SendBillAsync>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `SendTestSetAsync` WCF method.
 * Used exclusively in the DIAN sandbox (habilitacion) environment for submitting
 * test documents during the software qualification process. Requires the test set
 * ID assigned by DIAN when the qualification process was initiated.
 *
 * @param fileName - ZIP file name following DIAN conventions (e.g., `"900123456SETP990000001.xml.zip"`)
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param testSetId - Test set ID assigned by DIAN during the qualification process
 * @param credentials - WS-Security credentials for DIAN authentication
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildSendTestSetAsyncEnvelope(
 *   '900123456SETP990000001.xml.zip',
 *   zipBase64Content,
 *   'abc123-test-set-id',
 *   { nit: '900123456', password: 'softwarePin' },
 * );
 * ```
 *
 * @see {@link buildGetStatusZipEnvelope} - Poll status after async submission
 */
export function buildSendTestSetAsyncEnvelope(
  fileName: string,
  fileBase64: string,
  testSetId: string,
  credentials: DianCredentials,
): string {
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:SendTestSetAsync>
      <wcf:fileName>${escapeXml(fileName)}</wcf:fileName>
      <wcf:contentFile>${fileBase64}</wcf:contentFile>
      <wcf:testSetId>${escapeXml(testSetId)}</wcf:testSetId>
    </wcf:SendTestSetAsync>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetStatus` WCF method.
 * Queries the processing status of a single document using its CUFE (invoice)
 * or CUDE (credit/debit note) identifier.
 *
 * @param trackId - CUFE or CUDE of the document to query
 * @param credentials - WS-Security credentials for DIAN authentication
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildGetStatusEnvelope(
 *   'b4f7c2a1-3e5d-4f8a-9b2c-1d6e8f0a3c5b',
 *   { nit: '900123456', password: 'softwarePin' },
 * );
 * ```
 *
 * @see {@link buildGetStatusZipEnvelope}
 */
export function buildGetStatusEnvelope(
  trackId: string,
  credentials: DianCredentials,
): string {
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:GetStatus>
      <wcf:trackId>${escapeXml(trackId)}</wcf:trackId>
    </wcf:GetStatus>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetStatusZip` WCF method.
 * Queries the processing status of a document batch by its ZIP ID, which is
 * returned by asynchronous submission methods (`SendBillAsync`, `SendTestSetAsync`).
 *
 * @param trackId - ZIP batch ID (ZipKey) returned by the async send operation
 * @param credentials - WS-Security credentials for DIAN authentication
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildGetStatusZipEnvelope(
 *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   { nit: '900123456', password: 'softwarePin' },
 * );
 * ```
 *
 * @see {@link buildGetStatusEnvelope}
 * @see {@link buildSendBillAsyncEnvelope}
 */
export function buildGetStatusZipEnvelope(
  trackId: string,
  credentials: DianCredentials,
): string {
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:GetStatusZip>
      <wcf:trackId>${escapeXml(trackId)}</wcf:trackId>
    </wcf:GetStatusZip>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetAcquirer` WCF method.
 * Queries acquirer (buyer) information by identification type and number
 * from the DIAN registry.
 *
 * @param options - Acquirer identification data and WS-Security credentials
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildGetAcquirerEnvelope({
 *   identificationType: '31',         // NIT
 *   identificationNumber: '900123456',
 *   credentials: { nit: '800456789', password: 'softwarePin' },
 * });
 * ```
 *
 * @see {@link DianAcquirerResponse}
 */
export function buildGetAcquirerEnvelope(
  options: Pick<GetAcquirerOptions, "identificationType" | "identificationNumber" | "credentials">,
): string {
  const { identificationType, identificationNumber, credentials } = options;
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:GetAcquirer>
      <wcf:identificationType>${escapeXml(identificationType)}</wcf:identificationType>
      <wcf:identificationNumber>${escapeXml(identificationNumber)}</wcf:identificationNumber>
    </wcf:GetAcquirer>`;
  return buildEnvelope(header, body);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetNumberingRange` WCF method.
 * Queries the authorized numbering ranges (resolutions) for a specific
 * registered software from the DIAN service.
 *
 * @param options - Account codes, software code, and WS-Security credentials
 * @returns Complete SOAP 1.2 envelope XML string
 *
 * @example
 * ```typescript
 * const envelope = buildGetNumberingRangeEnvelope({
 *   accountCode: '900123456',
 *   accountCodeT: '900654321',
 *   softwareCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 *   credentials: { nit: '900123456', password: 'softwarePin' },
 * });
 * ```
 *
 * @see {@link DianNumberingRangeResponse}
 */
export function buildGetNumberingRangeEnvelope(
  options: Pick<GetNumberingRangeOptions, "accountCode" | "accountCodeT" | "softwareCode" | "credentials">,
): string {
  const { accountCode, accountCodeT, softwareCode, credentials } = options;
  const header = buildSecurityHeader(credentials);
  const body = `<wcf:GetNumberingRange>
      <wcf:accountCode>${escapeXml(accountCode)}</wcf:accountCode>
      <wcf:accountCodeT>${escapeXml(accountCodeT)}</wcf:accountCodeT>
      <wcf:softwareCode>${escapeXml(softwareCode)}</wcf:softwareCode>
    </wcf:GetNumberingRange>`;
  return buildEnvelope(header, body);
}
