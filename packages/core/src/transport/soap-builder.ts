import type { DianCredentials, GetAcquirerOptions, GetNumberingRangeOptions } from "./types.js";

const NS_SOAP = "http://www.w3.org/2003/05/soap-envelope";
const NS_WSSE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
const NS_WSU =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
const NS_PASSWORD_TYPE =
  "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText";
const NS_WCF = "http://wcf.dian.colombia";

/** SOAPAction base para los métodos WCF de DIAN */
export const DIAN_ACTION_BASE = "http://wcf.dian.colombia/IWcfDianCustomerServices";

/**
 * Construye el SOAPAction (va en el Content-Type para SOAP 1.2).
 */
export function getSoapAction(method: string): string {
  return `${DIAN_ACTION_BASE}/${method}`;
}

/** Escapa caracteres especiales XML en texto plano */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Construye el header WS-Security con UsernameToken (PasswordText).
 * La contraseña va en texto claro dentro del XML que ya viaja por TLS.
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

/** Envuelve un header y un body en un envelope SOAP 1.2 */
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
 * Construye el envelope para `SendBillSync`.
 * Usado en producción para envío síncrono de facturas, NC y ND.
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
 * Construye el envelope para `SendBillAsync`.
 * Usado en producción para envío asíncrono.
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
 * Construye el envelope para `SendTestSetAsync`.
 * Usado en el ambiente de habilitación (sandbox) DIAN.
 * Requiere el `testSetId` que DIAN asigna durante el proceso de habilitación.
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
 * Construye el envelope para `GetStatus`.
 * Consulta el estado de un documento por su CUFE o CUDE.
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
 * Construye el envelope para `GetStatusZip`.
 * Consulta el estado de un lote por su ZIP ID (para envíos asíncronos).
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
 * Construye el envelope para `GetAcquirer`.
 * Consulta datos del adquiriente (comprador) por tipo y número de identificación.
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
 * Construye el envelope para `GetNumberingRange`.
 * Consulta los rangos de numeración autorizados para un software.
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
