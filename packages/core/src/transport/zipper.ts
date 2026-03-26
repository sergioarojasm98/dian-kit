import { strToU8, zipSync } from "fflate";

import { DianTransportError } from "./types.js";

/**
 * Empaqueta un XML firmado en un archivo ZIP siguiendo la convención DIAN.
 *
 * Convención de nombre DIAN:
 * - Archivo dentro del ZIP: `{NIT}{docNumber}.xml`
 * - ZIP en el SOAP body: `{NIT}{docNumber}.xml.zip`
 *
 * @param signedXml  XML firmado como string UTF-8
 * @param supplierNit  NIT del emisor sin DV ni guiones (ej: "900123456")
 * @param documentNumber  Número del documento (ej: "SETP990000001")
 * @returns Buffer con el contenido del archivo ZIP
 */
export function createXmlZip(
  signedXml: string,
  supplierNit: string,
  documentNumber: string,
): Buffer {
  if (!signedXml) {
    throw new DianTransportError(
      "El XML firmado no puede estar vacío.",
    );
  }
  if (!supplierNit) {
    throw new DianTransportError(
      "El NIT del emisor no puede estar vacío.",
    );
  }
  if (!documentNumber) {
    throw new DianTransportError(
      "El número del documento no puede estar vacío.",
    );
  }

  const filename = `${supplierNit}${documentNumber}.xml`;
  const xmlBytes = strToU8(signedXml);
  const zipped = zipSync({ [filename]: [xmlBytes, { level: 9 }] });

  return Buffer.from(zipped);
}

/**
 * Retorna el nombre del archivo ZIP para usar en el campo `fileName` del SOAP body.
 * Formato DIAN: `{NIT}{docNumber}.xml.zip`
 */
export function getZipFileName(supplierNit: string, documentNumber: string): string {
  return `${supplierNit}${documentNumber}.xml.zip`;
}
