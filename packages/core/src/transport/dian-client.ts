import { DianEndpoint, DianSoapMethod } from "../constants/dian-endpoints.js";
import { Environment } from "../constants/document-types.js";
import { postSoap } from "./http-client.js";
import { parseAcquirerResponse, parseNumberingRangeResponse, parseSendResponse, parseStatusResponse } from "./response-parser.js";
import {
  buildGetAcquirerEnvelope,
  buildGetNumberingRangeEnvelope,
  buildGetStatusEnvelope,
  buildGetStatusZipEnvelope,
  buildSendBillAsyncEnvelope,
  buildSendBillSyncEnvelope,
  buildSendTestSetAsyncEnvelope,
  getSoapAction,
} from "./soap-builder.js";
import type {
  DianAcquirerResponse,
  DianNumberingRangeResponse,
  DianSendResponse,
  DianStatusResponse,
  GetAcquirerOptions,
  GetNumberingRangeOptions,
  GetStatusOptions,
  SendBillOptions,
} from "./types.js";
import { DianTransportError } from "./types.js";
import { createXmlZip, getZipFileName } from "./zipper.js";

/** Default HTTP timeout in milliseconds for all DIAN SOAP requests */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Resolves the DIAN WCF service URL based on the target environment.
 *
 * @param environment - Environment value (`"1"` = production, `"2"` = sandbox)
 * @returns The full DIAN WCF service endpoint URL
 *
 * @see {@link DianEndpoint}
 */
function getServiceUrl(environment: string): string {
  return environment === Environment.PRODUCCION
    ? DianEndpoint.PRODUCTION.SERVICE
    : DianEndpoint.SANDBOX.SERVICE;
}

/**
 * Sends a signed electronic document (invoice, credit note, debit note) to the
 * DIAN web service for validation and acceptance.
 *
 * Performs the complete submission pipeline:
 * 1. ZIP-compresses the signed XML using DIAN naming conventions
 * 2. Base64-encodes the ZIP buffer
 * 3. Wraps the payload in a SOAP 1.2 envelope with WS-Security credentials
 * 4. POSTs the envelope to the appropriate DIAN WCF endpoint
 * 5. Parses the SOAP response into a structured {@link DianSendResponse}
 *
 * @param options - Configuration including the signed XML, credentials, environment, and SOAP method
 * @returns Parsed DIAN response with validation status, trackId, and any errors
 * @throws {DianTransportError} If `method` is `SendTestSetAsync` but `testSetId` is missing
 * @throws {DianTransportError} If the HTTP request fails, times out, or DIAN returns a SOAP Fault
 *
 * @example
 * ```typescript
 * const result = await sendBill({
 *   signedXml,
 *   supplierNit: '900123456',
 *   documentNumber: 'SETP990000001',
 *   credentials: { nit: '900123456', password: 'softwarePin' },
 *   environment: Environment.HABILITACION,
 *   method: DianSoapMethod.SEND_TEST_SET_ASYNC,
 *   testSetId: 'abc123',
 * });
 * console.log(result.isValid, result.trackId);
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WCF Service}
 * @see {@link DianSendResponse}
 */
export async function sendBill(options: SendBillOptions): Promise<DianSendResponse> {
  const {
    signedXml,
    supplierNit,
    documentNumber,
    credentials,
    environment,
    method = DianSoapMethod.SEND_BILL_SYNC,
    testSetId,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  if (method === DianSoapMethod.SEND_TEST_SET_ASYNC && !testSetId) {
    throw new DianTransportError(
      "El método SendTestSetAsync requiere el campo `testSetId`. " +
      "Este ID lo asigna DIAN durante el proceso de habilitación del software.",
    );
  }

  const zipBuffer = createXmlZip(signedXml, supplierNit, documentNumber);
  const fileBase64 = zipBuffer.toString("base64");
  const fileName = getZipFileName(supplierNit, documentNumber);
  const url = getServiceUrl(environment);

  let envelope: string;
  switch (method) {
    case DianSoapMethod.SEND_BILL_ASYNC:
      envelope = buildSendBillAsyncEnvelope(fileName, fileBase64, credentials);
      break;
    case DianSoapMethod.SEND_TEST_SET_ASYNC:
      envelope = buildSendTestSetAsyncEnvelope(fileName, fileBase64, testSetId!, credentials);
      break;
    default:
      envelope = buildSendBillSyncEnvelope(fileName, fileBase64, credentials);
  }

  const soapAction = getSoapAction(method);
  const rawResponse = await postSoap({ url, soapAction, body: envelope, timeoutMs });

  return parseSendResponse(rawResponse);
}

/**
 * Queries the processing status of a previously submitted document using its
 * CUFE (invoice) or CUDE (credit/debit note) via the DIAN `GetStatus` SOAP method.
 *
 * @param options - Configuration including the trackId (CUFE/CUDE), credentials, and environment
 * @returns Parsed DIAN response with the current validation status and any errors
 * @throws {DianTransportError} If the HTTP request fails, times out, or DIAN returns a SOAP Fault
 *
 * @example
 * ```typescript
 * const status = await getStatus({
 *   trackId: 'b4f7c2a1-3e5d-4f8a-9b2c-1d6e8f0a3c5b',
 *   credentials: { nit: '900123456', password: 'softwarePin' },
 *   environment: Environment.PRODUCCION,
 * });
 * console.log(status.isValid, status.statusDescription);
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WCF Service}
 * @see {@link DianStatusResponse}
 */
export async function getStatus(options: GetStatusOptions): Promise<DianStatusResponse> {
  const { trackId, credentials, environment, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = getServiceUrl(environment);
  const envelope = buildGetStatusEnvelope(trackId, credentials);
  const soapAction = getSoapAction(DianSoapMethod.GET_STATUS);
  const rawResponse = await postSoap({ url, soapAction, body: envelope, timeoutMs });

  return parseStatusResponse(rawResponse);
}

/**
 * Queries the processing status of a document batch by its ZIP ID via the
 * DIAN `GetStatusZip` SOAP method. Use this for documents submitted
 * asynchronously through `SendBillAsync` or `SendTestSetAsync`.
 *
 * @param options - Configuration including the ZIP trackId, credentials, and environment
 * @returns Parsed DIAN response with the current batch validation status and any errors
 * @throws {DianTransportError} If the HTTP request fails, times out, or DIAN returns a SOAP Fault
 *
 * @example
 * ```typescript
 * const status = await getStatusZip({
 *   trackId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
 *   credentials: { nit: '900123456', password: 'softwarePin' },
 *   environment: Environment.HABILITACION,
 * });
 * if (status.isValid) {
 *   console.log('Batch accepted:', status.statusDescription);
 * }
 * ```
 *
 * @see {@link sendBill} - Use with `DianSoapMethod.SEND_BILL_ASYNC` or `SEND_TEST_SET_ASYNC`
 * @see {@link DianStatusResponse}
 */
export async function getStatusZip(options: GetStatusOptions): Promise<DianStatusResponse> {
  const { trackId, credentials, environment, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = getServiceUrl(environment);
  const envelope = buildGetStatusZipEnvelope(trackId, credentials);
  const soapAction = getSoapAction(DianSoapMethod.GET_STATUS_ZIP);
  const rawResponse = await postSoap({ url, soapAction, body: envelope, timeoutMs });

  return parseStatusResponse(rawResponse);
}

/**
 * Queries the authorized numbering ranges (resolutions) for a registered software
 * from the DIAN `GetNumberingRange` SOAP method.
 *
 * Numbering ranges define which prefixes and consecutive number intervals the
 * supplier is authorized to use for electronic invoicing.
 *
 * @param options - Configuration including accountCode, softwareCode, credentials, and environment
 * @returns Parsed response containing the list of authorized numbering ranges
 * @throws {DianTransportError} If the HTTP request fails, times out, or DIAN returns a SOAP Fault
 *
 * @example
 * ```typescript
 * const result = await getNumberingRange({
 *   accountCode: '900123456',
 *   accountCodeT: '900654321',
 *   softwareCode: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
 *   credentials: { nit: '900123456', password: 'softwarePin' },
 *   environment: Environment.PRODUCCION,
 * });
 * for (const range of result.ranges) {
 *   console.log(`${range.prefix}: ${range.fromNumber}-${range.toNumber}`);
 * }
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WCF Service}
 * @see {@link DianNumberingRangeResponse}
 */
export async function getNumberingRange(
  options: GetNumberingRangeOptions,
): Promise<DianNumberingRangeResponse> {
  const { environment, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = getServiceUrl(environment);
  const envelope = buildGetNumberingRangeEnvelope(options);
  const soapAction = getSoapAction(DianSoapMethod.GET_NUMBERING_RANGE);
  const rawResponse = await postSoap({ url, soapAction, body: envelope, timeoutMs });

  return parseNumberingRangeResponse(rawResponse);
}

/**
 * Queries acquirer (buyer) information from the DIAN registry via the
 * `GetAcquirer` SOAP method. Returns the buyer's registered legal name
 * and email address.
 *
 * Useful for auto-completing buyer details when creating an invoice,
 * ensuring the legal name and email match DIAN's official records.
 *
 * @param options - Configuration including identification type/number, credentials, and environment
 * @returns Parsed response with the acquirer's registered name and email
 * @throws {DianTransportError} If the HTTP request fails, times out, or DIAN returns a SOAP Fault
 *
 * @example
 * ```typescript
 * const buyer = await getAcquirer({
 *   identificationType: '31',         // NIT
 *   identificationNumber: '900123456',
 *   credentials: { nit: '800456789', password: 'softwarePin' },
 *   environment: Environment.HABILITACION,
 * });
 * console.log(buyer.receiverName);  // "EMPRESA XYZ SAS"
 * console.log(buyer.receiverEmail); // "facturacion@empresa.com"
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WCF Service}
 * @see {@link DianAcquirerResponse}
 */
export async function getAcquirer(
  options: GetAcquirerOptions,
): Promise<DianAcquirerResponse> {
  const { environment, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = getServiceUrl(environment);
  const envelope = buildGetAcquirerEnvelope(options);
  const soapAction = getSoapAction(DianSoapMethod.GET_ACQUIRER);
  const rawResponse = await postSoap({ url, soapAction, body: envelope, timeoutMs });

  return parseAcquirerResponse(rawResponse);
}
