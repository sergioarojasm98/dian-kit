import type { DianSoapMethod } from "../constants/dian-endpoints.js";
import type { EnvironmentValue } from "../constants/document-types.js";

export type { EnvironmentValue };

export type DianSoapMethodValue = (typeof DianSoapMethod)[keyof typeof DianSoapMethod];

/** Credenciales WS-Security UsernameToken para el servicio DIAN */
export interface DianCredentials {
  /** NIT del emisor (sin dígito de verificación, sin guiones) */
  nit: string;
  /** Contraseña del software registrado en DIAN */
  password: string;
}

/** Opciones para enviar un documento a DIAN */
export interface SendBillOptions {
  /** XML firmado con XAdES-EPES (string UTF-8) */
  signedXml: string;
  /** NIT del emisor sin DV (ej: "900123456") — determina el nombre del ZIP */
  supplierNit: string;
  /** Número del documento (ej: "SETP990000001") — determina el nombre del ZIP */
  documentNumber: string;
  /** Credenciales WS-Security */
  credentials: DianCredentials;
  /** Entorno DIAN: "1" = producción, "2" = habilitación/sandbox */
  environment: EnvironmentValue;
  /**
   * Método SOAP a usar.
   * - `SendBillSync` — producción, respuesta inmediata (default)
   * - `SendBillAsync` — producción, respuesta diferida
   * - `SendTestSetAsync` — sandbox, requiere `testSetId`
   */
  method?: DianSoapMethodValue;
  /**
   * ID del set de pruebas asignado por DIAN.
   * Requerido cuando `method === "SendTestSetAsync"`.
   */
  testSetId?: string;
  /** Timeout HTTP en milisegundos (default: 30_000) */
  timeoutMs?: number;
}

/** Opciones para consultar el estado de un documento */
export interface GetStatusOptions {
  /** CUFE o CUDE del documento */
  trackId: string;
  /** Credenciales WS-Security */
  credentials: DianCredentials;
  /** Entorno DIAN */
  environment: EnvironmentValue;
  /** Timeout HTTP en milisegundos (default: 30_000) */
  timeoutMs?: number;
}

/** Opciones para consultar rangos de numeración */
export interface GetNumberingRangeOptions {
  /** NIT del emisor (sin DV) */
  accountCode: string;
  /** NIT del proveedor tecnológico (sin DV) */
  accountCodeT: string;
  /** ID del software registrado en DIAN */
  softwareCode: string;
  /** Credenciales WS-Security */
  credentials: DianCredentials;
  /** Entorno DIAN */
  environment: EnvironmentValue;
  /** Timeout HTTP en milisegundos (default: 30_000) */
  timeoutMs?: number;
}

/** Opciones para consultar datos de un adquiriente (comprador) */
export interface GetAcquirerOptions {
  /** Tipo de identificación del adquiriente (ej: "31" para NIT, "13" para CC) */
  identificationType: string;
  /** Número de identificación del adquiriente (sin DV, sin guiones) */
  identificationNumber: string;
  /** Credenciales WS-Security */
  credentials: DianCredentials;
  /** Entorno DIAN */
  environment: EnvironmentValue;
  /** Timeout HTTP en milisegundos (default: 30_000) */
  timeoutMs?: number;
}

/** Respuesta de DIAN para consulta de adquiriente (GetAcquirer) */
export interface DianAcquirerResponse {
  /** Nombre o razón social del adquiriente registrado en DIAN */
  receiverName: string;
  /** Email del adquiriente registrado en DIAN */
  receiverEmail: string;
  /** Código de estado (ej: "00" = encontrado) */
  statusCode: string;
  /** Mensaje de DIAN (descripción del resultado) */
  message: string;
  /** Respuesta SOAP raw para debugging */
  rawResponse: string;
}

/** Error individual de validación retornado por DIAN */
export interface DianValidationError {
  code: string;
  description: string;
}

/** Respuesta de DIAN al enviar un documento (SendBillSync / SendBillAsync / SendTestSetAsync) */
export interface DianSendResponse {
  /** true si DIAN aceptó el documento sin errores */
  isValid: boolean;
  /** Código de estado DIAN (ej: "00" = éxito, "99" = error) */
  statusCode: string;
  /** Descripción del estado (ej: "Procesado Correctamente") */
  statusDescription: string;
  /** UUID/ZipKey retornado por DIAN para tracking asíncrono */
  trackId?: string;
  /** Errores de validación (solo si isValid = false) */
  errors: DianValidationError[];
  /** Respuesta SOAP raw para debugging */
  rawResponse: string;
}

/** Respuesta de DIAN para consultas de estado (GetStatus / GetStatusZip) */
export interface DianStatusResponse {
  isValid: boolean;
  statusCode: string;
  statusDescription: string;
  errors: DianValidationError[];
  rawResponse: string;
}

/** Rango de numeración autorizado por DIAN */
export interface DianNumberingRange {
  authorizationNumber: string;
  prefix: string;
  fromNumber: number;
  toNumber: number;
  startDate: string;
  endDate: string;
  technicalKey: string;
}

/** Respuesta de GetNumberingRange */
export interface DianNumberingRangeResponse {
  ranges: DianNumberingRange[];
  rawResponse: string;
}

/**
 * Maximum length for rawResponse stored in DianTransportError.
 * Full response content is available via debug logging at the call site.
 */
const MAX_RAW_RESPONSE_LENGTH = 1000;

/**
 * Error lanzado cuando hay un fallo de transporte con el servicio DIAN
 * (HTTP, red, timeout) o cuando DIAN retorna un SOAP Fault.
 *
 * NOTE: rawResponse is truncated to {@link MAX_RAW_RESPONSE_LENGTH} characters
 * to prevent sensitive data leakage in logs and error reports.
 * Enable debug logging at the call site to capture the full response.
 */
export class DianTransportError extends Error {
  public readonly rawResponse?: string;

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
