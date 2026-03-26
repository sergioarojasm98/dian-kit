import { DianEndpoint, DianSoapMethod } from "../constants/dian-endpoints.js";
import { Environment } from "../constants/document-types.js";
import { postSoap } from "./http-client.js";
import { parseNumberingRangeResponse, parseSendResponse, parseStatusResponse } from "./response-parser.js";
import {
  buildGetNumberingRangeEnvelope,
  buildGetStatusEnvelope,
  buildGetStatusZipEnvelope,
  buildSendBillAsyncEnvelope,
  buildSendBillSyncEnvelope,
  buildSendTestSetAsyncEnvelope,
  getSoapAction,
} from "./soap-builder.js";
import type {
  DianNumberingRangeResponse,
  DianSendResponse,
  DianStatusResponse,
  GetNumberingRangeOptions,
  GetStatusOptions,
  SendBillOptions,
} from "./types.js";
import { DianTransportError } from "./types.js";
import { createXmlZip, getZipFileName } from "./zipper.js";

const DEFAULT_TIMEOUT_MS = 30_000;

/** Retorna la URL del servicio según el entorno */
function getServiceUrl(environment: string): string {
  return environment === Environment.PRODUCCION
    ? DianEndpoint.PRODUCTION.SERVICE
    : DianEndpoint.SANDBOX.SERVICE;
}

/**
 * Envía un documento electrónico al servicio DIAN.
 *
 * Flujo completo:
 * 1. XML firmado → ZIP (fflate)
 * 2. ZIP → Base64
 * 3. Base64 + credenciales → SOAP envelope
 * 4. POST al endpoint DIAN
 * 5. Parsear respuesta → DianSendResponse
 *
 * @example
 * ```typescript
 * const result = await sendBill({
 *   signedXml,
 *   supplierNit: "900123456",
 *   documentNumber: "SETP990000001",
 *   credentials: { nit: "900123456", password: "softwarePin" },
 *   environment: Environment.HABILITACION,
 *   method: DianSoapMethod.SEND_TEST_SET_ASYNC,
 *   testSetId: "abc123",
 * });
 * ```
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
 * Consulta el estado de un documento por su CUFE o CUDE.
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
 * Consulta el estado de un lote de documentos por su ZIP ID.
 * Útil para envíos realizados con `SendBillAsync` o `SendTestSetAsync`.
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
 * Consulta los rangos de numeración autorizados por DIAN para un software.
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
