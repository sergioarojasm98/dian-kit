import { createHash } from "node:crypto";
import forge from "node-forge";

/**
 * Parsed certificate data extracted from a PKCS#12 container, containing all
 * the cryptographic material and metadata required for XAdES-EPES digital
 * signing of DIAN electronic invoicing documents.
 *
 * @remarks
 * The `privateKeyPem` field contains the RSA private key in PEM format.
 * It must be handled with care: never log, persist to disk, or transmit
 * this value outside the signing process. The `certDigestBase64` is a
 * SHA-256 fingerprint used in the `<DigestValue>` element of the
 * XAdES `SigningCertificate` reference.
 *
 * @see {@link loadP12} for how to obtain a `CertificateData` instance
 * @see {@link signXml} for consuming this data in the signing workflow
 */
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
 * Loads a PKCS#12 (.p12/.pfx) certificate file and extracts the private key,
 * X.509 certificate, and associated metadata needed for XAdES-EPES digital
 * signing of Colombian electronic invoicing documents.
 *
 * The function decodes the PKCS#12 binary container, locates the shrouded
 * key bag and certificate bag, and returns all fields required by the
 * {@link signXml} function: PEM keys, DER-encoded certificate, SHA-256
 * digest, issuer name, serial number, and validity dates.
 *
 * @param p12Buffer - Raw binary content of the .p12/.pfx file, typically read
 *   with `fs.readFileSync()`. Must be a valid PKCS#12 DER-encoded container.
 * @param password - Password to decrypt the PKCS#12 container. This is the
 *   password assigned when the certificate was exported or enrolled with the
 *   DIAN certification authority.
 * @returns Parsed {@link CertificateData} with private key, public cert, issuer,
 *   serial number, subject name, and validity period
 * @throws {Error} If no private key is found in the .p12 file (wrong password
 *   or corrupted file)
 * @throws {Error} If no X.509 certificate is found in the .p12 file
 *
 * @remarks
 * **Security:** The private key is held in memory only for the duration of
 * the signing operation. It is NEVER logged, serialized to disk, or
 * transmitted over the network. Callers should avoid storing the returned
 * `privateKeyPem` in any persistent storage.
 *
 * The certificate digest is computed using SHA-256 over the DER encoding,
 * matching the algorithm required by DIAN's XAdES-EPES signature profile.
 *
 * @example
 * ```typescript
 * import fs from 'node:fs';
 * import { loadP12 } from '@dian-kit/core';
 *
 * const p12Buffer = fs.readFileSync('./empresa.p12');
 * const cert = loadP12(p12Buffer, 'my-password');
 *
 * console.log(cert.subjectName);   // "MI EMPRESA S.A.S."
 * console.log(cert.issuerName);    // "CN=AC DIAN, O=DIAN, C=CO"
 * console.log(cert.serialNumber);  // "1234567890"
 * ```
 *
 * @see {@link CertificateData} for the shape of the returned object
 * @see {@link signXml} for using the certificate to sign XML documents
 * @see {@link https://www.dian.gov.co/ | DIAN} for certificate enrollment
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

  const certDigest = createHash("sha256")
    .update(Buffer.from(certDerBytes, "binary"))
    .digest("base64");

  const issuerName = cert.issuer.attributes
    .map((attr: forge.pki.CertificateField) => `${attr.shortName}=${attr.value}`)
    .reverse()
    .join(", ");

  const serialNumber = cert.serialNumber;
  const subjectName = (cert.subject.getField("CN")?.value as string) ?? "";

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
 * Generates a self-signed PKCS#12 (.p12) certificate for development and
 * testing purposes. The certificate uses a 2048-bit RSA key pair, is valid
 * for one year from the current date, and is signed with SHA-256.
 *
 * **This certificate is NOT valid for production use with DIAN.** Production
 * electronic invoicing requires a certificate issued by a DIAN-authorized
 * certification authority. This function is intended only for local
 * development, unit tests, and sandbox (habilitacion) testing.
 *
 * @param password - Password to protect the generated .p12 container. This
 *   same password must be passed to {@link loadP12} when loading the certificate.
 * @returns A `Buffer` containing the DER-encoded PKCS#12 file, ready to be
 *   written to disk or passed directly to {@link loadP12}
 *
 * @example
 * ```typescript
 * import fs from 'node:fs';
 * import { generateTestP12, loadP12 } from '@dian-kit/core';
 *
 * // Generate and save to disk
 * const p12Buffer = generateTestP12('test-password');
 * fs.writeFileSync('./test-cert.p12', p12Buffer);
 *
 * // Or use directly in memory
 * const cert = loadP12(p12Buffer, 'test-password');
 * ```
 *
 * @see {@link loadP12} for loading the generated certificate
 * @see {@link https://www.dian.gov.co/ | DIAN} for obtaining production certificates
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
