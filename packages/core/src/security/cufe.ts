import { createHash } from "node:crypto";

import { CUFE_DOCUMENTS } from "../constants/document-types.js";
import { CUFE_TAX_ORDER } from "../constants/tax-codes.js";
import type { DianDocument } from "../types/common.js";
import { formatDate, formatTime, truncateDecimals } from "../utils/amount.js";

/**
 * Computes the SHA-384 cryptographic hash of an input string and returns
 * it as a lowercase hexadecimal string (96 characters).
 *
 * This is the hashing algorithm mandated by DIAN's Anexo Tecnico for
 * computing the CUFE (Codigo Unico de Factura Electronica) and CUDE
 * (Codigo Unico de Documento Equivalente) identifiers.
 *
 * @param input - The UTF-8 string to hash. For CUFE/CUDE generation, this
 *   is the concatenation of invoice fields produced by {@link concatenateCufeFields}.
 * @returns A 96-character lowercase hexadecimal SHA-384 digest
 *
 * @example
 * ```typescript
 * import { sha384 } from '@dian-kit/core';
 *
 * const hash = sha384('SEFT01000000120190101120000');
 * console.log(hash.length); // 96
 * ```
 *
 * @see {@link generateCufe} for the complete CUFE/CUDE generation workflow
 * @see {@link https://www.dian.gov.co/ | DIAN Anexo Tecnico} for algorithm specification
 */
export function sha384(input: string): string {
  return createHash("sha384").update(input, "utf-8").digest("hex");
}

/**
 * Extracts the total tax amount for a specific tax code from the document's
 * tax totals. Iterates through all `TaxTotal` entries and their subtotals,
 * returning the amount for the first matching tax scheme code.
 *
 * Returns `0` if the tax code is not present in the document, which is the
 * correct behavior for the CUFE/CUDE formula (absent taxes contribute zero
 * to the hash input).
 *
 * @param doc - The DIAN document containing tax totals to search
 * @param taxCode - The tax scheme code to look for (e.g., "01" for IVA,
 *   "04" for INC, "03" for ICA)
 * @returns The tax amount for the matching code, or `0` if not found
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
 * Determines the secret key (field 14) for the CUFE/CUDE hash formula based
 * on the document type.
 *
 * - **CUFE documents** (facturas de venta, exportacion, tipo 04) use the
 *   `technicalKey` (clave tecnica) assigned by DIAN in the numbering
 *   resolution.
 * - **CUDE documents** (notas credito/debito, documento soporte, POS, etc.)
 *   use the software `PIN` registered with DIAN.
 *
 * @param doc - The DIAN document whose type determines which key to use
 * @returns The technical key or software PIN string
 * @throws {Error} If the document is a CUFE type but `technicalKey` is not set
 *   in the numbering authorization
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

/**
 * Structured representation of the 15 fields that compose the CUFE/CUDE
 * hash input string, as defined in DIAN's Anexo Tecnico.
 *
 * Each field maps to a specific position in the concatenation formula:
 * `NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 +
 *  ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec/PIN +
 *  TipoAmb`
 *
 * All monetary values are truncated (not rounded) to 2 decimal places.
 * Incorrect rounding is the most common cause of DIAN rejections
 * (error codes CAD06/FAD06).
 *
 * @see {@link buildCufeInput} for constructing this from a {@link DianDocument}
 * @see {@link concatenateCufeFields} for converting this to the raw hash string
 */
export interface CufeInput {
  /** Document number (NumFac) - e.g., "SEFT01000000001" */
  numFac: string;
  /** Issue date formatted as YYYY-MM-DD (FecFac) */
  fecFac: string;
  /** Issue time formatted as HH:MM:SS-05:00 (HorFac) */
  horFac: string;
  /** Line extension amount truncated to 2 decimals (ValFac) */
  valFac: string;
  /** First tax code - IVA "01" (CodImp1) */
  codImp1: string;
  /** First tax amount - IVA total truncated to 2 decimals (ValImp1) */
  valImp1: string;
  /** Second tax code - INC "04" (CodImp2) */
  codImp2: string;
  /** Second tax amount - INC total truncated to 2 decimals (ValImp2) */
  valImp2: string;
  /** Third tax code - ICA "03" (CodImp3) */
  codImp3: string;
  /** Third tax amount - ICA total truncated to 2 decimals (ValImp3) */
  valImp3: string;
  /** Total payable amount truncated to 2 decimals (ValTot) */
  valTot: string;
  /** Supplier NIT number (NitOFE) */
  nitOFE: string;
  /** Customer identification number (NumAdq) */
  numAdq: string;
  /** Technical key (CUFE) or software PIN (CUDE) (ClTec/PIN) */
  clTecOrPin: string;
  /** Environment code: "1" for production, "2" for sandbox (TipoAmb) */
  tipoAmb: string;
}

/**
 * Builds the structured {@link CufeInput} from a {@link DianDocument} by
 * extracting and formatting all 15 fields required for the CUFE/CUDE hash.
 *
 * This function handles:
 * - Date and time formatting to DIAN-required formats
 * - Monetary amount truncation to 2 decimal places (not rounding)
 * - Tax extraction for the three mandatory tax codes (IVA, INC, ICA)
 * - Secret key selection (technical key for CUFE, PIN for CUDE)
 *
 * This function is exported primarily for testing and debugging purposes,
 * allowing inspection of the intermediate values before hashing.
 *
 * @param doc - A complete DIAN document with all required fields populated
 * @returns A {@link CufeInput} object with all 15 formatted fields ready
 *   for concatenation
 * @throws {Error} If the document is a CUFE type and `technicalKey` is missing
 *   from the numbering authorization
 *
 * @example
 * ```typescript
 * import { buildCufeInput, concatenateCufeFields, sha384 } from '@dian-kit/core';
 *
 * const input = buildCufeInput(myDocument);
 * console.log(input.numFac);       // "SEFT01000000001"
 * console.log(input.valFac);       // "1000.00"
 * console.log(input.clTecOrPin);   // technical key or PIN
 *
 * // Equivalent to generateCufe(myDocument):
 * const cufe = sha384(concatenateCufeFields(input));
 * ```
 *
 * @see {@link generateCufe} for the one-step convenience function
 * @see {@link CufeInput} for the structure of the returned object
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
 * Concatenates the 15 CUFE/CUDE input fields into a single raw string
 * suitable for SHA-384 hashing. The fields are joined without any separator,
 * in the exact order specified by DIAN's Anexo Tecnico:
 *
 * `NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 + CodImp2 +
 *  ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE + NumAdq + ClTec/PIN +
 *  TipoAmb`
 *
 * @param input - A {@link CufeInput} object, typically produced by
 *   {@link buildCufeInput}
 * @returns The concatenated string ready to be passed to {@link sha384}
 *
 * @example
 * ```typescript
 * import { buildCufeInput, concatenateCufeFields } from '@dian-kit/core';
 *
 * const input = buildCufeInput(myDocument);
 * const raw = concatenateCufeFields(input);
 * // raw = "SEFT010000000012025-04-0112:00:00-05:001000.00010.00040.00030.001100.009001234568901234567key2"
 * ```
 *
 * @see {@link buildCufeInput} for producing the input fields
 * @see {@link sha384} for hashing the concatenated result
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
 * Generates the CUFE (Codigo Unico de Factura Electronica) or CUDE
 * (Codigo Unico de Documento Equivalente) for a DIAN electronic document.
 *
 * This is the primary entry point for CUFE/CUDE generation. It orchestrates
 * the full pipeline: field extraction, formatting, concatenation, and SHA-384
 * hashing, following the formula defined in DIAN's Anexo Tecnico:
 *
 * `SHA384(NumFac + FecFac + HorFac + ValFac + CodImp1 + ValImp1 +
 *         CodImp2 + ValImp2 + CodImp3 + ValImp3 + ValTot + NitOFE +
 *         NumAdq + [ClTec|PIN] + TipoAmb)`
 *
 * - **CUFE:** Used for facturas de venta (01), exportacion (02), and tipo 04.
 *   Field 14 is the `technicalKey` (clave tecnica) from the DIAN resolution.
 * - **CUDE:** Used for notas credito/debito, documento soporte, POS, etc.
 *   Field 14 is the software `PIN` registered with DIAN.
 *
 * @param doc - A fully populated {@link DianDocument} with all required fields
 *   including tax totals, monetary totals, supplier/customer identification,
 *   and either a technical key or software PIN
 * @returns A 96-character lowercase hexadecimal SHA-384 hash representing
 *   the CUFE or CUDE
 * @throws {Error} If the document is a CUFE type and `technicalKey` is missing
 *
 * @remarks
 * **Critical:** All monetary values are TRUNCATED to 2 decimal places, not
 * rounded. Incorrect rounding is the most common cause of DIAN rejections
 * (error codes CAD06/FAD06). The {@link buildCufeInput} function handles
 * truncation automatically using `truncateDecimals()`.
 *
 * @example
 * ```typescript
 * import { generateCufe } from '@dian-kit/core';
 *
 * const cufe = generateCufe(myInvoice);
 * // cufe = "a3f5b8c1d2e4f6..."  (96 hex characters)
 *
 * // Use the CUFE in the XML document's UUID element
 * ```
 *
 * @see {@link buildCufeInput} for inspecting intermediate field values
 * @see {@link concatenateCufeFields} for the raw concatenation string
 * @see {@link sha384} for the underlying hash function
 * @see {@link https://www.dian.gov.co/ | DIAN Anexo Tecnico} for the full specification
 */
export function generateCufe(doc: DianDocument): string {
  const input = buildCufeInput(doc);
  const raw = concatenateCufeFields(input);
  return sha384(raw);
}

/**
 * Generates the SoftwareSecurityCode required in every DIAN electronic
 * document. This code proves that the document was generated by authorized
 * software registered with DIAN.
 *
 * The formula is: `SHA384(SoftwareID + PIN + NumFac)`, where:
 * - `SoftwareID` is the UUID assigned by DIAN when the software is registered
 * - `PIN` is the secret PIN set during software registration
 * - `NumFac` is the full document number including prefix
 *
 * @param softwareId - The software identifier UUID assigned by DIAN during
 *   the software registration process (e.g., "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")
 * @param pin - The secret software PIN configured in DIAN's portal. This value
 *   should be stored securely and never logged or exposed in error messages.
 * @param documentNumber - The full document number including prefix
 *   (e.g., "SEFT01000000001")
 * @returns A 96-character lowercase hexadecimal SHA-384 hash representing
 *   the software security code
 *
 * @remarks
 * The `pin` parameter is a security-sensitive value. It should be loaded
 * from environment variables or a secrets manager and never hardcoded in
 * source code or logged.
 *
 * @example
 * ```typescript
 * import { generateSoftwareSecurityCode } from '@dian-kit/core';
 *
 * const securityCode = generateSoftwareSecurityCode(
 *   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  // softwareId from DIAN
 *   '12345',                                   // software PIN
 *   'SEFT01000000001',                          // document number
 * );
 * // securityCode = "b7e4c3..."  (96 hex characters)
 * ```
 *
 * @see {@link sha384} for the underlying hash function
 * @see {@link https://www.dian.gov.co/ | DIAN} for software registration
 */
export function generateSoftwareSecurityCode(
  softwareId: string,
  pin: string,
  documentNumber: string,
): string {
  const raw = softwareId + pin + documentNumber;
  return sha384(raw);
}
