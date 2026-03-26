import { DOMParser } from "@xmldom/xmldom";

import type {
  DianNumberingRange,
  DianNumberingRangeResponse,
  DianSendResponse,
  DianStatusResponse,
  DianValidationError,
} from "./types.js";
import { DianTransportError } from "./types.js";

/** Parsea un XML string y lanza error descriptivo si está malformado */
function parseXml(rawXml: string): Document {
  let parseErrorMessage: string | undefined;

  // @xmldom/xmldom requiere el errorHandler en el constructor del DOMParser,
  // NO como argumento de parseFromString. Creamos una instancia por llamada
  // para capturar errores de forma thread-safe.
  const parser = new DOMParser({
    errorHandler: {
      error: (msg: string) => { parseErrorMessage ??= msg; },
      fatalError: (msg: string) => { parseErrorMessage ??= msg; },
      warning: () => { /* ignorar warnings */ },
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

/** Extrae el texto de la primera etiqueta con `localName` dado, en cualquier namespace */
function getText(doc: Document, localName: string): string {
  const nodes = doc.getElementsByTagNameNS("*", localName);
  return nodes[0]?.textContent?.trim() ?? "";
}

/** Extrae todos los valores de texto de etiquetas con `localName` dado */
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
 * Verifica si el XML contiene un SOAP Fault y lanza un DianTransportError si es así.
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
 * Extrae los errores de validación DIAN del campo `ErrorMessage`.
 * DIAN retorna los errores como un array de strings dentro de `ErrorMessage`.
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
 * Parsea la respuesta de SendBillSync, SendBillAsync o SendTestSetAsync.
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
 * Parsea la respuesta de GetStatus o GetStatusZip.
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
 * Parsea la respuesta de GetNumberingRange.
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
