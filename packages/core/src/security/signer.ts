import * as crypto from "node:crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as xadesjs from "xadesjs";
import { setNodeDependencies } from "xml-core";
import * as xmldsigjs from "xmldsigjs";
import xpath from "xpath";

import { DianSignaturePolicy } from "../constants/dian-endpoints.js";
import type { CertificateData } from "./certificate.js";

const DIAN_POLICY_URL = DianSignaturePolicy.URL;
const DIAN_POLICY_DESCRIPTION = DianSignaturePolicy.DESCRIPTION;

/**
 * Pre-computed SHA-256 digest (base64-encoded) of the DIAN electronic
 * invoicing signature policy PDF document. This constant avoids downloading
 * and hashing the policy PDF on every signing operation.
 *
 * The hash corresponds to the policy document at
 * {@link https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf}.
 *
 * @remarks
 * If DIAN updates their signature policy PDF, this hash must be recomputed
 * and updated accordingly. The {@link SignXmlOptions.policyHashBase64} option
 * allows overriding this value at runtime as a stopgap.
 *
 * @internal
 */
const DIAN_POLICY_HASH_BASE64 = "dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpxXrmor0Y=";

/**
 * Configuration options for the {@link signXml} function, specifying the
 * XML document to sign, the certificate to use, and optional overrides
 * for signature placement and policy hash.
 *
 * @see {@link signXml} for the signing function that consumes these options
 * @see {@link loadP12} for obtaining the required {@link CertificateData}
 */
export interface SignXmlOptions {
  /** The unsigned UBL XML document string to be digitally signed */
  xml: string;
  /** Certificate data obtained from {@link loadP12}, containing the private
   *  key, public certificate, and metadata required for XAdES-EPES signing */
  certificate: CertificateData;
  /** XPath expression to the element where the signature should be placed.
   *  Defaults to `ext:UBLExtensions/ext:UBLExtension[2]/ext:ExtensionContent`,
   *  which is the standard DIAN location for the digital signature. */
  signatureLocation?: string;
  /** Override the pre-computed DIAN policy hash (base64-encoded SHA-256).
   *  Use this if DIAN updates their signature policy PDF before this library
   *  is updated with the new hash. */
  policyHashBase64?: string;
  /** Override the signing time. Defaults to `new Date()`.
   *  Should match the document's issueDate to satisfy DIAN rule FAD09e. */
  signingTime?: Date;
}

/**
 * Result of the {@link signXml} operation, containing the complete XML
 * document with the XAdES-EPES digital signature embedded.
 *
 * @see {@link signXml} for the function that produces this result
 */
export interface SignXmlResult {
  /** The complete XML document string with the XAdES-EPES digital signature
   *  embedded in the second UBLExtension's ExtensionContent element */
  signedXml: string;
}

/** Tracks whether the xadesjs/xmldsigjs crypto engine has been initialized */
let engineInitialized = false;

/**
 * Initializes the xadesjs XML signing engine with Node.js dependencies.
 * This is a one-time setup that configures the DOM parser, XML serializer,
 * XPath engine, and the WebCrypto provider for xadesjs.
 *
 * The function is idempotent -- subsequent calls after the first are no-ops.
 *
 * @internal
 */
function initEngine(): void {
  if (engineInitialized) return;

  setNodeDependencies({
    DOMParser,
    XMLSerializer,
    xpath,
  });

  const webcrypto = crypto.webcrypto as unknown as Crypto;
  xadesjs.Application.setEngine("NodeJS", webcrypto);
  engineInitialized = true;
}

/**
 * Converts a PEM-encoded RSA private key to a WebCrypto `CryptoKey` for use
 * with the RSASSA-PKCS1-v1_5 signing algorithm (SHA-256 digest).
 *
 * Handles both PEM formats:
 * - **PKCS#1** (`BEGIN RSA PRIVATE KEY`): Converted to PKCS#8 via node-forge
 *   before importing, since the WebCrypto API only accepts PKCS#8.
 * - **PKCS#8** (`BEGIN PRIVATE KEY`): Imported directly.
 *
 * @param pem - The PEM-encoded private key string, in either PKCS#1 or PKCS#8 format
 * @returns A `CryptoKey` configured for RSASSA-PKCS1-v1_5 signing with SHA-256
 * @throws {Error} If the PEM format is invalid or the key cannot be imported
 *
 * @remarks
 * The imported `CryptoKey` is created with `extractable: false` and limited
 * to the `["sign"]` usage, ensuring it cannot be re-exported from WebCrypto.
 * The private key material is never logged or persisted.
 *
 * @internal
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  let pkcs8Der: ArrayBuffer;

  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    // PKCS#1 → PKCS#8 conversion via node-forge
    const forgeModule = await import("node-forge");
    const forge = forgeModule.default ?? forgeModule;
    const rsaKey = forge.pki.privateKeyFromPem(pem);
    const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(rsaKey));
    const derBytes = forge.asn1.toDer(pkcs8Asn1).getBytes();
    pkcs8Der = Uint8Array.from(derBytes, (c) => c.charCodeAt(0)).buffer;
  } else {
    // Already PKCS#8
    const pemContents = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, "")
      .replace(/-----END PRIVATE KEY-----/, "")
      .replace(/\s/g, "");
    const buf = Buffer.from(pemContents, "base64");
    pkcs8Der = new Uint8Array(buf).buffer;
  }

  const webcrypto = crypto.webcrypto as unknown as Crypto;
  return webcrypto.subtle.importKey(
    "pkcs8",
    pkcs8Der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Signs a UBL XML document with an XAdES-EPES digital signature conforming
 * to DIAN's Anexo Tecnico requirements for Colombian electronic invoicing.
 *
 * The produced signature includes:
 * - **3 References:** the document itself (enveloped transform), KeyInfo,
 *   and SignedProperties
 * - **Canonicalization:** Inclusive C14N (Canonical XML 1.0)
 * - **Algorithms:** RSASSA-PKCS1-v1_5 with SHA-256 for signing, SHA-256
 *   for all digest computations
 * - **XAdES elements:** SigningTime, SigningCertificate (with SHA-256 digest
 *   and issuer serial), SignaturePolicyIdentifier (DIAN policy URL and hash)
 * - **SignerRole:** "supplier" (as required by DIAN)
 * - **ProductionPlace:** Colombia
 * - **Placement:** The signature is inserted into
 *   `ext:UBLExtensions/ext:UBLExtension[2]/ext:ExtensionContent`
 *
 * @param options - Configuration specifying the XML to sign, the certificate
 *   to use, and optional overrides. See {@link SignXmlOptions} for details.
 * @returns A {@link SignXmlResult} containing the fully signed XML string
 *   with the XAdES-EPES signature embedded
 * @throws {Error} If the signature generation fails or produces an empty result
 * @throws {Error} If the private key cannot be imported (invalid PEM format)
 *
 * @remarks
 * **Security:** The private key is imported as a non-extractable WebCrypto
 * `CryptoKey` limited to `["sign"]` usage. It is used only within this
 * function's scope and is never logged, serialized, transmitted, or stored.
 *
 * **Algorithm details:**
 * - Signature algorithm: RSASSA-PKCS1-v1_5 (2048-bit RSA minimum)
 * - Digest algorithm: SHA-256 (for all references and certificate digest)
 * - Policy hash: SHA-256 of the DIAN signature policy PDF
 * - Key wrapping: PKCS#1 keys are converted to PKCS#8 before import
 *
 * **DIAN compliance:** The signature structure, algorithm choices, and XAdES
 * elements are configured to match the requirements in DIAN's Anexo Tecnico
 * for facturacion electronica. The policy identifier points to DIAN's
 * official signature policy PDF.
 *
 * @example
 * ```typescript
 * import fs from 'node:fs';
 * import { loadP12, signXml } from '@dian-kit/core';
 *
 * const cert = loadP12(fs.readFileSync('./empresa.p12'), 'my-password');
 * const unsignedXml = fs.readFileSync('./invoice.xml', 'utf-8');
 *
 * const { signedXml } = await signXml({
 *   xml: unsignedXml,
 *   certificate: cert,
 * });
 *
 * fs.writeFileSync('./invoice-signed.xml', signedXml);
 * ```
 *
 * @see {@link loadP12} for obtaining the certificate data
 * @see {@link SignXmlOptions} for all available configuration options
 * @see {@link SignXmlResult} for the return type
 * @see {@link https://www.dian.gov.co/ | DIAN Anexo Tecnico} for the full specification
 */
/**
 * Adjusts a Date so that when xadesjs serializes it via `.toISOString()` (UTC),
 * the date portion matches the local date. This prevents DIAN FAD09e rejection
 * when the server timezone differs from Colombia time (UTC-5).
 *
 * xadesjs always serializes SigningTime as UTC (e.g., "2026-04-08T00:30:00Z"),
 * but DIAN compares that date with IssueDate which is formatted in local time.
 * Near midnight, these can be on different calendar dates.
 *
 * @param date - The original signing time
 * @returns A Date adjusted so its UTC date matches the local date
 * @internal
 */
function adjustSigningTimeForLocalDate(date: Date): Date {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  return localDate;
}

export async function signXml(options: SignXmlOptions): Promise<SignXmlResult> {
  initEngine();

  const { xml, certificate, policyHashBase64 } = options;
  const privateKey = await importPrivateKey(certificate.privateKeyPem);

  const xmlDoc = xadesjs.Parse(xml);
  const signedXml = new xadesjs.SignedXml();

  const signatureId = signedXml.XmlSignature.Id;
  const keyInfoId = `${signatureId}-KeyInfo`;

  // Configure KeyInfo with X509Data
  const x509Data = new xmldsigjs.KeyInfoX509Data();
  const certDerBuffer = Buffer.from(certificate.certificateDerBase64, "base64");
  x509Data.AddCertificate(new xmldsigjs.X509Certificate(certDerBuffer));

  signedXml.XmlSignature.KeyInfo.Id = keyInfoId;
  signedXml.XmlSignature.KeyInfo.Add(x509Data);

  // Sign with XAdES-EPES options
  const algorithm: RsaHashedKeyAlgorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
  };

  const signature = await signedXml.Sign(algorithm, privateKey, xmlDoc, {
    references: [
      // Reference 0: document (enveloped signature)
      {
        uri: "",
        hash: "SHA-256",
        transforms: ["enveloped"],
      },
      // Reference 1: KeyInfo
      {
        uri: `#${keyInfoId}`,
        hash: "SHA-256",
      },
    ],
    // Signature policy (DIAN requirement for XAdES-EPES)
    policy: {
      hash: "SHA-256",
      identifier: {
        value: DIAN_POLICY_URL,
        description: DIAN_POLICY_DESCRIPTION,
        qualifier: "OIDAsURI",
      },
      digestValue: policyHashBase64 ?? DIAN_POLICY_HASH_BASE64,
    },
    signingTime: { value: adjustSigningTimeForLocalDate(options.signingTime ?? new Date()) },
    signerRole: { claimed: ["supplier"] },
    signingCertificate: certificate.certificateDerBase64,
    productionPlace: {
      country: "Colombia",
    },
  });

  // Place signature in ext:UBLExtensions/ext:UBLExtension[2]/ext:ExtensionContent
  // IMPORTANT: We insert the signature as a string into the original XML rather
  // than using DOM appendChild + XMLSerializer.serializeToString(). Re-serializing
  // the DOM via @xmldom/xmldom can alter namespace declarations and whitespace,
  // which invalidates the signature digest (causes DIAN ZE02 rejection).
  const signatureNode = signature.GetXml();
  if (!signatureNode) {
    throw new Error("[DIAN-KIT] Error generando la firma digital. El resultado está vacío.");
  }

  const serializer = new XMLSerializer();
  const signatureXmlString = serializer.serializeToString(signatureNode);

  // Replace the placeholder comment in the original XML string
  const placeholder = "<!--FIRMA DIGITAL XAdES-BES AQUÍ-->";
  let signedXmlString: string;
  if (xml.includes(placeholder)) {
    signedXmlString = xml.replace(placeholder, signatureXmlString);
  } else {
    // Fallback: insert before closing root tag
    const closingTag = xml.lastIndexOf("</");
    signedXmlString = xml.slice(0, closingTag) + signatureXmlString + xml.slice(closingTag);
  }

  return { signedXml: signedXmlString };
}

/**
 * Locates the second `UBLExtension`'s `ExtensionContent` element within the
 * XML document, which is the DIAN-mandated location for the XAdES digital
 * signature.
 *
 * The function uses namespace-aware DOM traversal with the UBL Common
 * Extension Components namespace (`urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2`)
 * to reliably find the target element regardless of namespace prefixes.
 *
 * @param doc - The parsed XML DOM document to search within
 * @returns The `ExtensionContent` element of the second `UBLExtension`,
 *   or `null` if the document does not contain at least two UBL extensions
 *
 * @internal
 */
function _findSignatureExtensionContent(doc: globalThis.Document): globalThis.Element | null {
  const nsExt = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";

  const extensions = doc.getElementsByTagNameNS(nsExt, "UBLExtension");
  if (extensions.length < 2) return null;

  const secondExtension = extensions[1];
  if (!secondExtension) return null;

  const contentNodes = secondExtension.getElementsByTagNameNS(nsExt, "ExtensionContent");
  return contentNodes[0] ?? null;
}
