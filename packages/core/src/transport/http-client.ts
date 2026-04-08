import { DianTransportError } from "./types.js";

/**
 * Allowlist of trusted DIAN hostnames. Only official DIAN SOAP endpoints are
 * permitted to prevent accidental or malicious redirection to non-DIAN servers.
 *
 * - `vpfe.dian.gov.co` -- production environment
 * - `vpfe-hab.dian.gov.co` -- sandbox (habilitacion) environment
 */
const ALLOWED_DIAN_HOSTS = ["vpfe.dian.gov.co", "vpfe-hab.dian.gov.co"];

/**
 * Validates that the target URL belongs to an official DIAN endpoint by checking
 * its hostname against the {@link ALLOWED_DIAN_HOSTS} allowlist.
 *
 * @param url - The full URL to validate
 * @throws {DianTransportError} If the hostname is not in the trusted allowlist
 */
function validateEndpoint(url: string): void {
  const { hostname } = new URL(url);
  if (!ALLOWED_DIAN_HOSTS.includes(hostname)) {
    throw new DianTransportError(
      `Untrusted DIAN endpoint: ${hostname}. Only official DIAN hosts are allowed.`,
    );
  }
}

/**
 * Configuration options for sending a SOAP 1.2 POST request to the DIAN
 * WCF service endpoint.
 *
 * @see {@link postSoap}
 */
export interface PostSoapOptions {
  /** Full URL of the DIAN WCF service endpoint (must be an allowed DIAN host) */
  url: string;
  /** SOAPAction URI included in the Content-Type header per SOAP 1.2 spec */
  soapAction: string;
  /** Complete SOAP 1.2 envelope XML as a UTF-8 string */
  body: string;
  /** HTTP request timeout in milliseconds */
  timeoutMs: number;
}

/**
 * Sends a SOAP 1.2 POST request to the DIAN WCF electronic invoicing service
 * and returns the raw XML response body.
 *
 * Uses the Node.js 20+ global `fetch` API with an `AbortController` for timeout
 * management. The `SOAPAction` is embedded in the `Content-Type` header per the
 * SOAP 1.2 specification.
 *
 * **Security:**
 * - Validates the target hostname against an allowlist before connecting
 * - Never logs the request body (contains WS-Security credentials)
 * - Only logs URL and SOAPAction in error messages
 *
 * @param options - SOAP request configuration (URL, action, body, timeout)
 * @returns Raw XML response body as a string
 * @throws {DianTransportError} If the hostname is not a trusted DIAN endpoint
 * @throws {DianTransportError} If the server returns a non-2xx HTTP status
 * @throws {DianTransportError} If the request times out (AbortError)
 * @throws {DianTransportError} If a network error occurs (DNS, connection refused, etc.)
 *
 * @example
 * ```typescript
 * const rawXml = await postSoap({
 *   url: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
 *   soapAction: 'http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync',
 *   body: soapEnvelope,
 *   timeoutMs: 30_000,
 * });
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN Production Endpoint}
 * @see {@link https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc | DIAN Sandbox Endpoint}
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
        Accept: "application/soap+xml, text/xml",
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
