import { createHash } from "node:crypto";
import forge from "node-forge";

export interface CertificateData {
  /** PEM-encoded private key */
  privateKeyPem: string;
  /** PEM-encoded X.509 certificate */
  certificatePem: string;
  /** DER-encoded certificate as base64 (for X509Certificate element) */
  certificateDerBase64: string;
  /** SHA-256 fingerprint of the certificate DER, base64-encoded */
  certDigestBase64: string;
  /** X.509 issuer distinguished name string */
  issuerName: string;
  /** Certificate serial number (decimal string) */
  serialNumber: string;
  /** Subject common name */
  subjectName: string;
  /** Certificate validity start */
  notBefore: Date;
  /** Certificate validity end */
  notAfter: Date;
}

/**
 * Loads a PKCS#12 (.p12 / .pfx) file and extracts the private key,
 * certificate, and metadata needed for XAdES-BES signing.
 *
 * SECURITY: The private key is held in memory only during the signing
 * operation. It is NEVER logged, serialized, or transmitted.
 */
export function loadP12(p12Buffer: Buffer, password: string): CertificateData {
  const p12Der = forge.util.decode64(p12Buffer.toString("base64"));
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const keyBagType = forge.pki.oids.pkcs8ShroudedKeyBag as string;
  const certBagType = forge.pki.oids.certBag as string;

  const keyBags = p12.getBags({ bagType: keyBagType });
  const keyBag = keyBags[keyBagType]?.[0];
  if (!keyBag?.key) {
    throw new Error(
      "[DIAN-KIT] No se encontró la clave privada en el archivo .p12. " +
      "Verifica que el archivo no esté dañado y que la contraseña sea correcta.",
    );
  }

  const certBags = p12.getBags({ bagType: certBagType });
  const certBag = certBags[certBagType]?.[0];
  if (!certBag?.cert) {
    throw new Error(
      "[DIAN-KIT] No se encontró el certificado en el archivo .p12. " +
      "El archivo debe contener un certificado X.509 válido.",
    );
  }

  const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
  const cert = certBag.cert;
  const certificatePem = forge.pki.certificateToPem(cert);

  const certDerBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes();
  const certificateDerBase64 = forge.util.encode64(certDerBytes);

  const certDigest = createHash("sha256").update(Buffer.from(certDerBytes, "binary")).digest("base64");

  const issuerName = cert.issuer.attributes
    .map((attr: forge.pki.CertificateField) => `${attr.shortName}=${attr.value}`)
    .reverse()
    .join(", ");

  const serialNumber = cert.serialNumber;
  const subjectName = cert.subject.getField("CN")?.value as string ?? "";

  return {
    privateKeyPem,
    certificatePem,
    certificateDerBase64,
    certDigestBase64: certDigest,
    issuerName,
    serialNumber,
    subjectName,
    notBefore: cert.validity.notBefore,
    notAfter: cert.validity.notAfter,
  };
}

/**
 * Generates a self-signed test certificate and .p12 for development/testing.
 * NOT for production use.
 */
export function generateTestP12(password: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: "DIAN-KIT Test Certificate" },
    { name: "countryName", value: "CO" },
    { name: "organizationName", value: "dian-kit (Test)" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, password, {
    algorithm: "3des",
  });
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

  return Buffer.from(p12Der, "binary");
}
