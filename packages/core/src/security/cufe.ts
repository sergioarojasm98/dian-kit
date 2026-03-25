import { createHash } from "node:crypto";

import { CUFE_DOCUMENTS } from "../constants/document-types.js";
import { CUFE_TAX_ORDER } from "../constants/tax-codes.js";
import type { DianDocument } from "../types/common.js";
import { formatAmount, formatDate, formatTime, truncateDecimals } from "../utils/amount.js";

/**
 * Computes SHA-384 hash of input string.
 * Returns lowercase hexadecimal (96 characters).
 */
export function sha384(input: string): string {
  return createHash("sha384").update(input, "utf-8").digest("hex");
}

/**
 * Extracts the total tax amount for a specific tax code from the document.
 * Returns 0 if the tax is not present.
 */
function extractTaxAmount(doc: DianDocument, taxCode: string): number {
  for (const tt of doc.taxTotals) {
    for (const sub of tt.subtotals) {
      if (sub.taxScheme.code === taxCode) {
        return sub.taxAmount;
      }
    }
  }
  return 0;
}

/**
 * Determines the secret key for the hash:
 * - CUFE documents use `technicalKey` (clave técnica from DIAN resolution)
 * - CUDE documents use `PIN` (software PIN)
 */
function getSecretKey(doc: DianDocument): string {
  if (CUFE_DOCUMENTS.has(doc.documentType)) {
    if (!doc.numbering.technicalKey) {
      throw new Error(
        `[DIAN-KIT] La clave técnica (technicalKey) es obligatoria para documentos tipo ${doc.documentType}. ` +
        "Se obtiene de la resolución de numeración asignada por la DIAN al habilitarse.",
      );
    }
    return doc.numbering.technicalKey;
  }
  return doc.software.pin;
}

export interface CufeInput {
  numFac: string;
  fecFac: string;
  horFac: string;
  valFac: string;
  codImp1: string;
  valImp1: string;
  codImp2: string;
  valImp2: string;
  codImp3: string;
  valImp3: string;
  valTot: string;
  nitOFE: string;
  numAdq: string;
  clTecOrPin: string;
  tipoAmb: string;
}

/**
 * Builds the raw concatenation string for CUFE/CUDE from a DianDocument.
 * Exposed for testing and debugging.
 */
export function buildCufeInput(doc: DianDocument): CufeInput {
  const [taxCode1, taxCode2, taxCode3] = CUFE_TAX_ORDER;

  return {
    numFac: doc.id,
    fecFac: formatDate(doc.issueDate),
    horFac: formatTime(doc.issueTime),
    valFac: truncateDecimals(doc.legalMonetaryTotal.lineExtensionAmount, 2),
    codImp1: taxCode1!,
    valImp1: truncateDecimals(extractTaxAmount(doc, taxCode1!), 2),
    codImp2: taxCode2!,
    valImp2: truncateDecimals(extractTaxAmount(doc, taxCode2!), 2),
    codImp3: taxCode3!,
    valImp3: truncateDecimals(extractTaxAmount(doc, taxCode3!), 2),
    valTot: truncateDecimals(doc.legalMonetaryTotal.payableAmount, 2),
    nitOFE: doc.supplier.identification.number,
    numAdq: doc.customer.identification.number,
    clTecOrPin: getSecretKey(doc),
    tipoAmb: doc.environment,
  };
}

/**
 * Concatenates CUFE/CUDE input fields into the raw string for hashing.
 */
export function concatenateCufeFields(input: CufeInput): string {
  return [
    input.numFac,
    input.fecFac,
    input.horFac,
    input.valFac,
    input.codImp1,
    input.valImp1,
    input.codImp2,
    input.valImp2,
    input.codImp3,
    input.valImp3,
    input.valTot,
    input.nitOFE,
    input.numAdq,
    input.clTecOrPin,
    input.tipoAmb,
  ].join("");
}

/**
 * Generates the CUFE (Código Único de Factura Electrónica)
 * or CUDE (Código Único de Documento Equivalente).
 *
 * Formula: SHA384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
 *          CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE +
 *          NumAdq + [ClTec|PIN] + TipoAmb)
 *
 * - CUFE: uses `ClTec` (clave técnica) for field 14
 * - CUDE: uses `PIN` (software PIN) for field 14
 *
 * Values are TRUNCATED to 2 decimals (not rounded). This is the #1 cause
 * of DIAN rejections (error CAD06/FAD06).
 */
export function generateCufe(doc: DianDocument): string {
  const input = buildCufeInput(doc);
  const raw = concatenateCufeFields(input);
  return sha384(raw);
}

/**
 * Generates the SoftwareSecurityCode.
 * Formula: SHA384(SoftwareID + PIN + NumFac)
 */
export function generateSoftwareSecurityCode(
  softwareId: string,
  pin: string,
  documentNumber: string,
): string {
  const raw = softwareId + pin + documentNumber;
  return sha384(raw);
}
