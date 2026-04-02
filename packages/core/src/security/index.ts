/**
 * Security module for DIAN electronic invoicing.
 *
 * Provides cryptographic operations required by Colombia's DIAN for electronic
 * document processing:
 *
 * - **Certificate management** -- Loading PKCS#12 (.p12/.pfx) certificates and
 *   extracting keys for digital signing ({@link loadP12}, {@link generateTestP12})
 * - **CUFE/CUDE generation** -- Computing the unique document identifiers using
 *   SHA-384 as mandated by DIAN's Anexo Tecnico ({@link generateCufe},
 *   {@link generateSoftwareSecurityCode})
 * - **XML digital signing** -- XAdES-EPES signing of UBL XML documents with
 *   DIAN's signature policy ({@link signXml})
 *
 * @see {@link https://www.dian.gov.co/ | DIAN} for the official specification
 *
 * @module
 */

export {
  sha384,
  generateCufe,
  generateSoftwareSecurityCode,
  buildCufeInput,
  concatenateCufeFields,
  type CufeInput,
} from "./cufe.js";

export {
  loadP12,
  generateTestP12,
  type CertificateData,
} from "./certificate.js";

export {
  signXml,
  type SignXmlOptions,
  type SignXmlResult,
} from "./signer.js";
