import * as crypto from "node:crypto";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { setNodeDependencies } from "xml-core";
import * as xadesjs from "xadesjs";
import * as xmldsigjs from "xmldsigjs";
import xpath from "xpath";

import { DianSignaturePolicy } from "../constants/dian-endpoints.js";
import type { CertificateData } from "./certificate.js";

const DIAN_POLICY_URL = DianSignaturePolicy.URL;
const DIAN_POLICY_DESCRIPTION = DianSignaturePolicy.DESCRIPTION;

/**
 * Pre-computed SHA-256 hash of the DIAN signature policy PDF.
 * This avoids downloading the PDF on every signature operation.
 * If the DIAN updates the policy document, this hash must be updated.
 */
const DIAN_POLICY_HASH_BASE64 = "dMoMvtcG5aIzgYo0tIsSQeVJBDnUnfSOfBpC8YsCctM=";

export interface SignXmlOptions {
  /** The unsigned XML document string */
  xml: string;
  /** Certificate data from loadP12() */
  certificate: CertificateData;
  /** XPath to the element where the signature should be placed.
   *  Defaults to the second UBLExtension's ExtensionContent. */
  signatureLocation?: string;
  /** Override the policy hash (base64) if DIAN updates the policy PDF */
  policyHashBase64?: string;
}

export interface SignXmlResult {
  /** The signed XML document string */
  signedXml: string;
}

let engineInitialized = false;

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
 * Converts a PEM private key (PKCS#1 or PKCS#8) to a CryptoKey.
 * node-forge exports PKCS#1 (RSA PRIVATE KEY), but WebCrypto requires PKCS#8.
 * We use node-forge to convert between formats when needed.
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  let pkcs8Der: ArrayBuffer;

  if (pem.includes("BEGIN RSA PRIVATE KEY")) {
    // PKCS#1 → PKCS#8 conversion via node-forge
    const forge = await import("node-forge");
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
 * Signs an XML document with XAdES-BES/EPES using the DIAN signature policy.
 *
 * Signature structure follows the DIAN Anexo Técnico requirements:
 * - 3 References: document (enveloped), KeyInfo, SignedProperties
 * - Canonicalization: Inclusive C14N
 * - Algorithms: RSA-SHA256 for signature, SHA-256 for digests
 * - XAdES elements: SigningTime, SigningCertificate, SignaturePolicyIdentifier
 * - SignerRole: "supplier"
 * - Placement: ext:UBLExtensions/ext:UBLExtension[2]/ext:ExtensionContent
 *
 * SECURITY: The private key is used only for the signing operation and
 * is never logged, transmitted, or stored beyond the function scope.
 */
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

  const signature = await signedXml.Sign(
    algorithm,
    privateKey,
    xmlDoc,
    {
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
      signingTime: { value: new Date() },
      signerRole: { claimed: ["supplier"] },
      signingCertificate: certificate.certificateDerBase64,
      productionPlace: {
        country: "Colombia",
      },
    },
  );

  // Place signature in ext:UBLExtensions/ext:UBLExtension[2]/ext:ExtensionContent
  const signatureNode = signature.GetXml();
  if (!signatureNode) {
    throw new Error("[DIAN-KIT] Error generando la firma digital. El resultado está vacío.");
  }

  const extensionContent = findSignatureExtensionContent(xmlDoc);
  if (extensionContent) {
    // Remove the placeholder comment if present
    while (extensionContent.firstChild) {
      extensionContent.removeChild(extensionContent.firstChild);
    }
    extensionContent.appendChild(signatureNode);
  } else {
    // Fallback: append to document element
    xmlDoc.documentElement.appendChild(signatureNode);
  }

  const serializer = new XMLSerializer();
  const signedXmlString = serializer.serializeToString(xmlDoc);

  return { signedXml: signedXmlString };
}

/**
 * Finds the second UBLExtension's ExtensionContent where the signature goes.
 * Uses namespace-aware traversal. Types are kept generic since xmldom
 * provides its own DOM implementation.
 */
function findSignatureExtensionContent(doc: globalThis.Document): globalThis.Element | null {
  const nsExt = "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2";

  const extensions = doc.getElementsByTagNameNS(nsExt, "UBLExtension");
  if (extensions.length < 2) return null;

  const secondExtension = extensions[1];
  if (!secondExtension) return null;

  const contentNodes = secondExtension.getElementsByTagNameNS(nsExt, "ExtensionContent");
  return contentNodes[0] ?? null;
}
