import { strToU8, zipSync } from "fflate";

import { DianTransportError } from "./types.js";

/**
 * Packages a signed XML document into a ZIP archive following DIAN's naming conventions.
 * Uses `fflate` for fast, pure-JavaScript ZIP compression at maximum level (9).
 *
 * **DIAN naming convention:**
 * - File inside the ZIP: `{NIT}{docNumber}.xml`
 * - ZIP filename in SOAP body: `{NIT}{docNumber}.xml.zip`
 *
 * @param signedXml - XAdES-EPES signed XML document as a UTF-8 string
 * @param supplierNit - Supplier NIT without verification digit or dashes (e.g., `"900123456"`)
 * @param documentNumber - Document number (e.g., `"SETP990000001"`)
 * @returns Buffer containing the ZIP archive bytes
 * @throws {DianTransportError} If `signedXml` is empty
 * @throws {DianTransportError} If `supplierNit` is empty
 * @throws {DianTransportError} If `documentNumber` is empty
 *
 * @example
 * ```typescript
 * const zipBuffer = createXmlZip(
 *   signedXml,
 *   '900123456',
 *   'SETP990000001',
 * );
 * const base64 = zipBuffer.toString('base64');
 * ```
 *
 * @see {@link getZipFileName}
 * @see {@link sendBill}
 */
export function createXmlZip(
  signedXml: string,
  supplierNit: string,
  documentNumber: string,
): Buffer {
  if (!signedXml) {
    throw new DianTransportError("El XML firmado no puede estar vacío.");
  }
  if (!supplierNit) {
    throw new DianTransportError("El NIT del emisor no puede estar vacío.");
  }
  if (!documentNumber) {
    throw new DianTransportError("El número del documento no puede estar vacío.");
  }

  const filename = `${supplierNit}${documentNumber}.xml`;
  const xmlBytes = strToU8(signedXml);
  const zipped = zipSync({ [filename]: [xmlBytes, { level: 9 }] });

  return Buffer.from(zipped);
}

/**
 * Generates the ZIP filename for the `fileName` field in the SOAP body,
 * following DIAN's naming convention: `{NIT}{docNumber}.xml.zip`.
 *
 * @param supplierNit - Supplier NIT without verification digit (e.g., `"900123456"`)
 * @param documentNumber - Document number (e.g., `"SETP990000001"`)
 * @returns ZIP filename string (e.g., `"900123456SETP990000001.xml.zip"`)
 *
 * @example
 * ```typescript
 * const fileName = getZipFileName('900123456', 'SETP990000001');
 * // "900123456SETP990000001.xml.zip"
 * ```
 *
 * @see {@link createXmlZip}
 */
export function getZipFileName(supplierNit: string, documentNumber: string): string {
  return `${supplierNit}${documentNumber}.xml.zip`;
}
