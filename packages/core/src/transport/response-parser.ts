import { DOMParser } from "@xmldom/xmldom";

import type {
  DianAcquirerResponse,
  DianNumberingRange,
  DianNumberingRangeResponse,
  DianSendResponse,
  DianStatusResponse,
  DianValidationError,
} from "./types.js";
import { DianTransportError } from "./types.js";

/**
 * Parses a raw XML string into a DOM Document using `@xmldom/xmldom`.
 * Creates a new `DOMParser` instance per call to capture parse errors in a
 * thread-safe manner.
 *
 * @param rawXml - Raw XML string to parse
 * @returns Parsed DOM Document
 * @throws {DianTransportError} If the XML is malformed or the document element is missing
 */
function parseXml(rawXml: string): Document {
  let parseErrorMessage: string | undefined;

  // @xmldom/xmldom requiere el errorHandler en el constructor del DOMParser,
  // NO como argumento de parseFromString. Creamos una instancia por llamada
  // para capturar errores de forma thread-safe.
  const parser = new DOMParser({
    errorHandler: {
      error: (msg: string) => {
        parseErrorMessage ??= msg;
      },
      fatalError: (msg: string) => {
        parseErrorMessage ??= msg;
      },
      warning: () => {
        /* ignorar warnings */
      },
    },
  });

  const doc = parser.parseFromString(rawXml, "text/xml");

  if (parseErrorMessage || !doc.documentElement) {
    throw new DianTransportError(
      `La respuesta DIAN no es XML válido: ${parseErrorMessage ?? "documento vacío"}`,
      undefined,
      rawXml,
    );
  }

  return doc;
}

/**
 * Extracts the trimmed text content of the first element matching the given
 * local name, regardless of XML namespace. Returns an empty string if not found.
 *
 * @param doc - Parsed DOM Document to search
 * @param localName - Element local name to match (e.g., `"IsValid"`, `"StatusCode"`)
 * @returns Trimmed text content of the first matching element, or `""` if not found
 */
function getText(doc: Document, localName: string): string {
  const nodes = doc.getElementsByTagNameNS("*", localName);
  return nodes[0]?.textContent?.trim() ?? "";
}

/**
 * Extracts the trimmed text content of all elements matching the given local name,
 * regardless of XML namespace. Skips elements with empty or whitespace-only content.
 *
 * @param doc - Parsed DOM Document to search
 * @param localName - Element local name to match
 * @returns Array of non-empty trimmed text values from all matching elements
 */
function getTextAll(doc: Document, localName: string): string[] {
  const nodes = doc.getElementsByTagNameNS("*", localName);
  const result: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const text = nodes[i]?.textContent?.trim();
    if (text) result.push(text);
  }
  return result;
}

/**
 * Inspects the parsed XML document for SOAP Fault elements and throws a
 * {@link DianTransportError} if one is found. Extracts the fault code and
 * reason text from both SOAP 1.1 and 1.2 fault structures.
 *
 * @param doc - Parsed DOM Document to inspect
 * @param rawXml - Original raw XML string (included in the error for debugging)
 * @throws {DianTransportError} If the document contains a SOAP Fault element
 */
function checkForFault(doc: Document, rawXml: string): void {
  const faultNodes = doc.getElementsByTagNameNS("*", "Fault");
  if (faultNodes.length === 0) return;

  const code = getText(doc, "Value") || getText(doc, "faultcode") || "SOAP_FAULT";
  const reason = getText(doc, "Text") || getText(doc, "faultstring") || "Error desconocido";
  throw new DianTransportError(
    `SOAP Fault recibido de DIAN. Código: ${code}. Razón: ${reason}`,
    undefined,
    rawXml,
  );
}

/**
 * Extracts DIAN validation errors from the `ErrorMessage` field in the response.
 * DIAN returns errors as an array of `<string>` elements, each formatted as
 * `"Code: Description"`. Strings that do not match this pattern are assigned
 * the fallback code `"DIAN_ERROR"`.
 *
 * @param doc - Parsed DOM Document containing the DIAN response
 * @returns Array of structured validation errors; empty if none found
 *
 * @see {@link DianValidationError}
 */
function extractErrors(doc: Document): DianValidationError[] {
  // DIAN retorna errores en strings con formato "Código: Descripción"
  const errorStrings = getTextAll(doc, "string");
  return errorStrings.map((s) => {
    const colonIdx = s.indexOf(":");
    if (colonIdx > 0 && colonIdx < 10) {
      return {
        code: s.slice(0, colonIdx).trim(),
        description: s.slice(colonIdx + 1).trim(),
      };
    }
    return { code: "DIAN_ERROR", description: s };
  });
}

/**
 * Parses the raw SOAP XML response from `SendBillSync`, `SendBillAsync`, or
 * `SendTestSetAsync` into a structured {@link DianSendResponse}.
 *
 * Extracts the validation result, status code, track ID (ZipKey or XmlFileName),
 * and any validation errors from the DIAN response.
 *
 * @param rawXml - Raw SOAP XML response string from the DIAN service
 * @returns Structured send response with validation status and errors
 * @throws {DianTransportError} If the XML is malformed or contains a SOAP Fault
 *
 * @example
 * ```typescript
 * const response = parseSendResponse(rawSoapXml);
 * if (response.isValid) {
 *   console.log('Document accepted, trackId:', response.trackId);
 * } else {
 *   console.error('Validation errors:', response.errors);
 * }
 * ```
 *
 * @see {@link DianSendResponse}
 * @see {@link sendBill}
 */
export function parseSendResponse(rawXml: string): DianSendResponse {
  const doc = parseXml(rawXml);
  checkForFault(doc, rawXml);

  const isValidText = getText(doc, "IsValid").toLowerCase();
  const isValid = isValidText === "true";
  const statusCode = getText(doc, "StatusCode");
  const statusDescription = getText(doc, "StatusDescription");
  const trackId = getText(doc, "ZipKey") || getText(doc, "XmlFileName") || undefined;
  const errors = isValid ? [] : extractErrors(doc);

  return {
    isValid,
    statusCode,
    statusDescription,
    trackId: trackId || undefined,
    errors,
    rawResponse: rawXml,
  };
}

/**
 * Parses the raw SOAP XML response from `GetStatus` or `GetStatusZip` into a
 * structured {@link DianStatusResponse}.
 *
 * Extracts the document validation status, status code, description, and any
 * validation errors from the DIAN response.
 *
 * @param rawXml - Raw SOAP XML response string from the DIAN service
 * @returns Structured status response with validation result and errors
 * @throws {DianTransportError} If the XML is malformed or contains a SOAP Fault
 *
 * @example
 * ```typescript
 * const status = parseStatusResponse(rawSoapXml);
 * console.log(status.isValid, status.statusCode, status.statusDescription);
 * ```
 *
 * @see {@link DianStatusResponse}
 * @see {@link getStatus}
 * @see {@link getStatusZip}
 */
export function parseStatusResponse(rawXml: string): DianStatusResponse {
  const doc = parseXml(rawXml);
  checkForFault(doc, rawXml);

  const isValidText = getText(doc, "IsValid").toLowerCase();
  const isValid = isValidText === "true";
  const statusCode = getText(doc, "StatusCode");
  const statusDescription = getText(doc, "StatusDescription");
  const errors = isValid ? [] : extractErrors(doc);

  return {
    isValid,
    statusCode,
    statusDescription,
    errors,
    rawResponse: rawXml,
  };
}

/**
 * Parses the raw SOAP XML response from `GetAcquirer` into a structured
 * {@link DianAcquirerResponse}.
 *
 * Extracts the acquirer's registered name, email, status code, and message
 * from the DIAN response.
 *
 * @param rawXml - Raw SOAP XML response string from the DIAN service
 * @returns Structured acquirer response with registered name and email
 * @throws {DianTransportError} If the XML is malformed or contains a SOAP Fault
 *
 * @example
 * ```typescript
 * const acquirer = parseAcquirerResponse(rawSoapXml);
 * console.log(acquirer.receiverName, acquirer.receiverEmail);
 * ```
 *
 * @see {@link DianAcquirerResponse}
 * @see {@link getAcquirer}
 */
export function parseAcquirerResponse(rawXml: string): DianAcquirerResponse {
  const doc = parseXml(rawXml);
  checkForFault(doc, rawXml);

  return {
    receiverName: getText(doc, "ReceiverName"),
    receiverEmail: getText(doc, "ReceiverEmail"),
    statusCode: getText(doc, "StatusCode"),
    message: getText(doc, "Message"),
    rawResponse: rawXml,
  };
}

/**
 * Parses the raw SOAP XML response from `GetNumberingRange` into a structured
 * {@link DianNumberingRangeResponse}.
 *
 * Iterates over all `<NumberRange>` elements in the response and extracts each
 * range's authorization number, prefix, number bounds, date range, and technical key.
 *
 * @param rawXml - Raw SOAP XML response string from the DIAN service
 * @returns Structured response with an array of authorized numbering ranges
 * @throws {DianTransportError} If the XML is malformed or contains a SOAP Fault
 *
 * @example
 * ```typescript
 * const result = parseNumberingRangeResponse(rawSoapXml);
 * for (const range of result.ranges) {
 *   console.log(`${range.prefix}: ${range.fromNumber}-${range.toNumber}`);
 * }
 * ```
 *
 * @see {@link DianNumberingRangeResponse}
 * @see {@link getNumberingRange}
 */
export function parseNumberingRangeResponse(rawXml: string): DianNumberingRangeResponse {
  const doc = parseXml(rawXml);
  checkForFault(doc, rawXml);

  const rangeNodes = doc.getElementsByTagNameNS("*", "NumberRange");
  const ranges: DianNumberingRange[] = [];

  for (let i = 0; i < rangeNodes.length; i++) {
    const node = rangeNodes[i];
    if (!node) continue;

    const getField = (name: string): string => {
      const el = node.getElementsByTagNameNS("*", name)[0];
      return el?.textContent?.trim() ?? "";
    };

    ranges.push({
      authorizationNumber: getField("AuthorizationNumber"),
      prefix: getField("Prefix"),
      fromNumber: parseInt(getField("FromNumber"), 10) || 0,
      toNumber: parseInt(getField("ToNumber"), 10) || 0,
      startDate: getField("StartDate"),
      endDate: getField("EndDate"),
      technicalKey: getField("TechnicalKey"),
    });
  }

  return { ranges, rawResponse: rawXml };
}
