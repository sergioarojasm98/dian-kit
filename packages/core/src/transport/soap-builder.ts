import { createHash, randomUUID, sign } from "node:crypto";

import type { GetAcquirerOptions, GetNumberingRangeOptions, SoapAuthConfig } from "./types.js";

/** SOAP 1.2 envelope namespace */
const NS_SOAP = "http://www.w3.org/2003/05/soap-envelope";
/** DIAN WCF service namespace */
const NS_WCF = "http://wcf.dian.colombia";
/** WS-Addressing namespace */
const NS_WSA = "http://www.w3.org/2005/08/addressing";
/** WS-Security Security Extensions 1.0 namespace */
const NS_WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
/** WS-Security Utility 1.0 namespace */
const NS_WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
/** XML Digital Signature namespace */
const NS_DS = "http://www.w3.org/2000/09/xmldsig#";
/** Exclusive C14N namespace */
const NS_EC = "http://www.w3.org/2001/10/xml-exc-c14n#";
/** BinarySecurityToken encoding type */
const ENCODING_TYPE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary";
/** BinarySecurityToken value type for X.509v3 */
const VALUE_TYPE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3";

/** Timestamp TTL in milliseconds (60 seconds) */
const TIMESTAMP_TTL_MS = 60_000;

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
 * Generates a UUID-based identifier with a given prefix (e.g., "TS-", "X509-").
 */
function generateId(prefix: string): string {
  return `${prefix}${randomUUID()}`;
}

/**
 * Formats a Date as ISO 8601 UTC string (e.g., "2026-04-02T12:00:00.000Z").
 */
function toUtcIso(date: Date): string {
  return date.toISOString();
}

/**
 * Builds the canonical form of the wsa:To element for Exclusive C14N
 * with InclusiveNamespaces PrefixList="soap wcf".
 *
 * In Exclusive C14N, only visibly utilized namespaces are included by default.
 * The InclusiveNamespaces PrefixList forces additional namespace declarations
 * to be included even if not visibly utilized.
 *
 * For the wsa:To element:
 * - wsa and wsu are visibly utilized (used in element/attribute names)
 * - soap and wcf are forced by the InclusiveNamespaces PrefixList
 *
 * Namespace declarations are sorted lexicographically by prefix in Exclusive C14N.
 */
function canonicalizeToElement(toId: string, endpointUrl: string): string {
  // Exclusive C14N: namespace declarations first (sorted by prefix),
  // then attributes (sorted by namespace URI, then local name).
  // Namespaces included: wsa, wsu (visibly utilized) + soap, wcf (InclusiveNamespaces PrefixList)
  return (
    `<wsa:To` +
    ` xmlns:soap="${NS_SOAP}"` +
    ` xmlns:wcf="${NS_WCF}"` +
    ` xmlns:wsa="${NS_WSA}"` +
    ` xmlns:wsu="${NS_WSU}"` +
    ` wsu:Id="${toId}"` +
    `>${endpointUrl}</wsa:To>`
  );
}

/**
 * Builds the canonical form of the ds:SignedInfo element for Exclusive C14N
 * with InclusiveNamespaces PrefixList="wsa soap wcf".
 *
 * For SignedInfo:
 * - ds is visibly utilized (element names)
 * - ec is visibly utilized (InclusiveNamespaces child element)
 * - wsa, soap, wcf are forced by the InclusiveNamespaces PrefixList
 *
 * Namespace declarations are sorted lexicographically by prefix.
 */
function canonicalizeSignedInfo(toId: string, digestValue: string): string {
  // Exclusive C14N: namespace declarations sorted by prefix.
  // At SignedInfo level: ds (visibly utilized) + soap, wcf, wsa (InclusiveNamespaces PrefixList)
  // ec is NOT in PrefixList — it appears on each InclusiveNamespaces element where visibly utilized.
  return (
    `<ds:SignedInfo xmlns:ds="${NS_DS}" xmlns:soap="${NS_SOAP}" xmlns:wcf="${NS_WCF}" xmlns:wsa="${NS_WSA}">` +
    `<ds:CanonicalizationMethod Algorithm="${NS_EC}">` +
    `<ec:InclusiveNamespaces xmlns:ec="${NS_EC}" PrefixList="wsa soap wcf"></ec:InclusiveNamespaces>` +
    `</ds:CanonicalizationMethod>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></ds:SignatureMethod>` +
    `<ds:Reference URI="#${toId}">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="${NS_EC}">` +
    `<ec:InclusiveNamespaces xmlns:ec="${NS_EC}" PrefixList="soap wcf"></ec:InclusiveNamespaces>` +
    `</ds:Transform>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></ds:DigestMethod>` +
    `<ds:DigestValue>${digestValue}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>`
  );
}

/**
 * Builds a complete signed SOAP 1.2 envelope for DIAN WS-Security Signature
 * authentication. The envelope includes:
 *
 * - wsu:Timestamp with Created/Expires
 * - wsse:BinarySecurityToken with the X.509v3 certificate
 * - ds:Signature signing the wsa:To element with RSA-SHA256
 * - wsa:Action and wsa:To WS-Addressing headers
 *
 * @param body - The SOAP body XML content (without the soap:Body wrapper)
 * @param method - The DIAN SOAP method name (e.g., "SendBillSync")
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope as an XML string
 */
export function buildSignedSoapEnvelope(
  body: string,
  method: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const { certificate } = auth;

  // Generate unique IDs for wsu:Id attributes
  const tsId = generateId("TS-");
  const x509Id = generateId("X509-");
  const sigId = generateId("SIG-");
  const kiId = generateId("KI-");
  const strId = generateId("STR-");
  const toId = generateId("ID-");

  // Build timestamp
  const now = new Date();
  const expires = new Date(now.getTime() + TIMESTAMP_TTL_MS);
  const createdStr = toUtcIso(now);
  const expiresStr = toUtcIso(expires);

  // Compute SHA-256 digest of the canonicalized wsa:To element
  const canonicalTo = canonicalizeToElement(toId, endpointUrl);
  const digestValue = createHash("sha256").update(canonicalTo, "utf8").digest("base64");

  // Build canonical SignedInfo and sign it with RSA-SHA256
  const canonicalSignedInfo = canonicalizeSignedInfo(toId, digestValue);
  const signatureValue = sign(
    "sha256",
    Buffer.from(canonicalSignedInfo, "utf8"),
    certificate.privateKeyPem,
  ).toString("base64");

  // SOAPAction URI for wsa:Action
  const soapAction = getSoapAction(method);

  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="${NS_SOAP}" xmlns:wcf="${NS_WCF}">` +
    `<soap:Header xmlns:wsa="${NS_WSA}">` +
    `<wsse:Security xmlns:wsse="${NS_WSSE}" xmlns:wsu="${NS_WSU}">` +
    `<wsu:Timestamp wsu:Id="${tsId}">` +
    `<wsu:Created>${createdStr}</wsu:Created>` +
    `<wsu:Expires>${expiresStr}</wsu:Expires>` +
    `</wsu:Timestamp>` +
    `<wsse:BinarySecurityToken EncodingType="${ENCODING_TYPE}" ValueType="${VALUE_TYPE}" wsu:Id="${x509Id}">${certificate.certificateDerBase64}</wsse:BinarySecurityToken>` +
    `<ds:Signature Id="${sigId}" xmlns:ds="${NS_DS}">` +
    `<ds:SignedInfo>` +
    `<ds:CanonicalizationMethod Algorithm="${NS_EC}">` +
    `<ec:InclusiveNamespaces PrefixList="wsa soap wcf" xmlns:ec="${NS_EC}"/>` +
    `</ds:CanonicalizationMethod>` +
    `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<ds:Reference URI="#${toId}">` +
    `<ds:Transforms>` +
    `<ds:Transform Algorithm="${NS_EC}">` +
    `<ec:InclusiveNamespaces PrefixList="soap wcf" xmlns:ec="${NS_EC}"/>` +
    `</ds:Transform>` +
    `</ds:Transforms>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${digestValue}</ds:DigestValue>` +
    `</ds:Reference>` +
    `</ds:SignedInfo>` +
    `<ds:SignatureValue>${signatureValue}</ds:SignatureValue>` +
    `<ds:KeyInfo Id="${kiId}">` +
    `<wsse:SecurityTokenReference wsu:Id="${strId}">` +
    `<wsse:Reference URI="#${x509Id}" ValueType="${VALUE_TYPE}"/>` +
    `</wsse:SecurityTokenReference>` +
    `</ds:KeyInfo>` +
    `</ds:Signature>` +
    `</wsse:Security>` +
    `<wsa:Action>${soapAction}</wsa:Action>` +
    `<wsa:To wsu:Id="${toId}" xmlns:wsu="${NS_WSU}">${endpointUrl}</wsa:To>` +
    `</soap:Header>` +
    `<soap:Body>` +
    body +
    `</soap:Body>` +
    `</soap:Envelope>`
  );
}

/**
 * Builds the SOAP 1.2 envelope for the `SendBillSync` WCF method.
 * Used in production for synchronous submission of invoices, credit notes,
 * and debit notes. DIAN processes the document and returns the result immediately.
 *
 * @param fileName - ZIP file name following DIAN conventions (e.g., `"900123456SETP990000001.xml.zip"`)
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link buildSendBillAsyncEnvelope}
 * @see {@link buildSendTestSetAsyncEnvelope}
 */
export function buildSendBillSyncEnvelope(
  fileName: string,
  fileBase64: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const body =
    `<wcf:SendBillSync>` +
    `<wcf:fileName>${escapeXml(fileName)}</wcf:fileName>` +
    `<wcf:contentFile>${fileBase64}</wcf:contentFile>` +
    `</wcf:SendBillSync>`;
  return buildSignedSoapEnvelope(body, "SendBillSync", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `SendBillAsync` WCF method.
 * Used in production for asynchronous document submission. DIAN queues the
 * document for processing and returns a ZipKey for later status polling.
 *
 * @param fileName - ZIP file name following DIAN conventions (e.g., `"900123456FV001.xml.zip"`)
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link buildSendBillSyncEnvelope}
 * @see {@link buildGetStatusZipEnvelope}
 */
export function buildSendBillAsyncEnvelope(
  fileName: string,
  fileBase64: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const body =
    `<wcf:SendBillAsync>` +
    `<wcf:fileName>${escapeXml(fileName)}</wcf:fileName>` +
    `<wcf:contentFile>${fileBase64}</wcf:contentFile>` +
    `</wcf:SendBillAsync>`;
  return buildSignedSoapEnvelope(body, "SendBillAsync", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `SendTestSetAsync` WCF method.
 * Used exclusively in the DIAN sandbox (habilitacion) environment for submitting
 * test documents during the software qualification process.
 *
 * @param fileName - ZIP file name following DIAN conventions
 * @param fileBase64 - Base64-encoded ZIP file content containing the signed XML
 * @param testSetId - Test set ID assigned by DIAN during the qualification process
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link buildGetStatusZipEnvelope} - Poll status after async submission
 */
export function buildSendTestSetAsyncEnvelope(
  fileName: string,
  fileBase64: string,
  testSetId: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const body =
    `<wcf:SendTestSetAsync>` +
    `<wcf:fileName>${escapeXml(fileName)}</wcf:fileName>` +
    `<wcf:contentFile>${fileBase64}</wcf:contentFile>` +
    `<wcf:testSetId>${escapeXml(testSetId)}</wcf:testSetId>` +
    `</wcf:SendTestSetAsync>`;
  return buildSignedSoapEnvelope(body, "SendTestSetAsync", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetStatus` WCF method.
 * Queries the processing status of a single document using its CUFE or CUDE.
 *
 * @param trackId - CUFE or CUDE of the document to query
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link buildGetStatusZipEnvelope}
 */
export function buildGetStatusEnvelope(
  trackId: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const body = `<wcf:GetStatus><wcf:trackId>${escapeXml(trackId)}</wcf:trackId></wcf:GetStatus>`;
  return buildSignedSoapEnvelope(body, "GetStatus", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetStatusZip` WCF method.
 * Queries the processing status of a document batch by its ZIP ID.
 *
 * @param trackId - ZIP batch ID (ZipKey) returned by the async send operation
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @param auth - WS-Security Signature authentication configuration
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link buildGetStatusEnvelope}
 * @see {@link buildSendBillAsyncEnvelope}
 */
export function buildGetStatusZipEnvelope(
  trackId: string,
  endpointUrl: string,
  auth: SoapAuthConfig,
): string {
  const body =
    `<wcf:GetStatusZip>` +
    `<wcf:trackId>${escapeXml(trackId)}</wcf:trackId>` +
    `</wcf:GetStatusZip>`;
  return buildSignedSoapEnvelope(body, "GetStatusZip", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetAcquirer` WCF method.
 * Queries acquirer (buyer) information by identification type and number.
 *
 * @param options - Acquirer identification data and authentication configuration
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link DianAcquirerResponse}
 */
export function buildGetAcquirerEnvelope(
  options: Pick<GetAcquirerOptions, "identificationType" | "identificationNumber" | "auth">,
  endpointUrl: string,
): string {
  const { identificationType, identificationNumber, auth } = options;
  const body =
    `<wcf:GetAcquirer>` +
    `<wcf:identificationType>${escapeXml(identificationType)}</wcf:identificationType>` +
    `<wcf:identificationNumber>${escapeXml(identificationNumber)}</wcf:identificationNumber>` +
    `</wcf:GetAcquirer>`;
  return buildSignedSoapEnvelope(body, "GetAcquirer", endpointUrl, auth);
}

/**
 * Builds the SOAP 1.2 envelope for the `GetNumberingRange` WCF method.
 * Queries the authorized numbering ranges (resolutions) for a specific software.
 *
 * @param options - Account codes, software code, and authentication configuration
 * @param endpointUrl - The full DIAN WCF service endpoint URL
 * @returns Complete signed SOAP 1.2 envelope XML string
 *
 * @see {@link DianNumberingRangeResponse}
 */
export function buildGetNumberingRangeEnvelope(
  options: Pick<GetNumberingRangeOptions, "accountCode" | "accountCodeT" | "softwareCode" | "auth">,
  endpointUrl: string,
): string {
  const { accountCode, accountCodeT, softwareCode, auth } = options;
  const body =
    `<wcf:GetNumberingRange>` +
    `<wcf:accountCode>${escapeXml(accountCode)}</wcf:accountCode>` +
    `<wcf:accountCodeT>${escapeXml(accountCodeT)}</wcf:accountCodeT>` +
    `<wcf:softwareCode>${escapeXml(softwareCode)}</wcf:softwareCode>` +
    `</wcf:GetNumberingRange>`;
  return buildSignedSoapEnvelope(body, "GetNumberingRange", endpointUrl, auth);
}
