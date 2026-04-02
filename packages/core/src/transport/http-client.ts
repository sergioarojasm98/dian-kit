import { DianTransportError } from "./types.js";

/**
 * Allowlist of trusted DIAN hostnames.
 * Only official DIAN SOAP endpoints are permitted to prevent
 * accidental or malicious redirection to non-DIAN servers.
 */
const ALLOWED_DIAN_HOSTS = [
  "vpfe.dian.gov.co",
  "vpfe-hab.dian.gov.co",
];

/**
 * Validates that the target URL belongs to an official DIAN endpoint.
 * Throws DianTransportError if the hostname is not in the allowlist.
 */
function validateEndpoint(url: string): void {
  const { hostname } = new URL(url);
  if (!ALLOWED_DIAN_HOSTS.includes(hostname)) {
    throw new DianTransportError(
      `Untrusted DIAN endpoint: ${hostname}. Only official DIAN hosts are allowed.`,
    );
  }
}

export interface PostSoapOptions {
  url: string;
  /** SOAPAction — se incluye en el Content-Type (SOAP 1.2) */
  soapAction: string;
  /** Envelope SOAP 1.2 completo como string */
  body: string;
  /** Timeout en milisegundos */
  timeoutMs: number;
}

/**
 * Envía un POST SOAP 1.2 al servicio WCF de DIAN y retorna el body de la respuesta.
 *
 * Usa el `fetch` global de Node.js 20+ con `AbortController` para el timeout.
 * El header `SOAPAction` va dentro del `Content-Type` siguiendo la especificación SOAP 1.2.
 *
 * SEGURIDAD: Esta función NO loguea el body del request (contiene credenciales).
 * Solo loguea la URL y el SOAPAction en caso de error.
 * SEGURIDAD: Validates the target hostname against an allowlist before connecting.
 */
export async function postSoap(options: PostSoapOptions): Promise<string> {
  const { url, soapAction, body, timeoutMs } = options;

  validateEndpoint(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": `application/soap+xml; charset=utf-8; action="${soapAction}"`,
        "Accept": "application/soap+xml, text/xml",
      },
      body,
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new DianTransportError(
        `El servidor DIAN retornó HTTP ${response.status}. ` +
        `Verifique las credenciales y el entorno. URL: ${url}`,
        response.status,
        responseText,
      );
    }

    return responseText;
  } catch (error) {
    if (error instanceof DianTransportError) throw error;

    if (error instanceof Error && error.name === "AbortError") {
      throw new DianTransportError(
        `Timeout: el servicio DIAN no respondió en ${timeoutMs}ms. URL: ${url}`,
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new DianTransportError(
      `Error de red al conectar con el servicio DIAN: ${message}. URL: ${url}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
