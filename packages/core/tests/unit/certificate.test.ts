import { describe, expect, it } from "vitest";

import { generateTestP12, loadP12 } from "../../src/security/certificate.js";

describe("loadP12", () => {
  const password = "diankit-test-123";
  const p12Buffer = generateTestP12(password);

  it("extracts private key in PEM format", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.privateKeyPem).toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(cert.privateKeyPem).toContain("-----END RSA PRIVATE KEY-----");
  });

  it("extracts certificate in PEM format", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.certificatePem).toContain("-----BEGIN CERTIFICATE-----");
    expect(cert.certificatePem).toContain("-----END CERTIFICATE-----");
  });

  it("extracts certificate DER as base64", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.certificateDerBase64).toBeTruthy();
    expect(() => Buffer.from(cert.certificateDerBase64, "base64")).not.toThrow();
  });

  it("computes SHA-256 digest of certificate", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.certDigestBase64).toBeTruthy();
    const digestBytes = Buffer.from(cert.certDigestBase64, "base64");
    expect(digestBytes.length).toBe(32);
  });

  it("extracts issuer name", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.issuerName).toContain("CN=DIAN-KIT Test Certificate");
    expect(cert.issuerName).toContain("C=CO");
  });

  it("extracts serial number", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.serialNumber).toBeTruthy();
  });

  it("extracts subject name", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.subjectName).toBe("DIAN-KIT Test Certificate");
  });

  it("extracts validity dates", () => {
    const cert = loadP12(p12Buffer, password);
    expect(cert.notBefore).toBeInstanceOf(Date);
    expect(cert.notAfter).toBeInstanceOf(Date);
    expect(cert.notAfter.getTime()).toBeGreaterThan(cert.notBefore.getTime());
  });

  it("throws with wrong password", () => {
    expect(() => loadP12(p12Buffer, "wrong-password")).toThrow();
  });
});

describe("generateTestP12", () => {
  it("generates a valid .p12 buffer", () => {
    const p12 = generateTestP12("test");
    expect(p12).toBeInstanceOf(Buffer);
    expect(p12.length).toBeGreaterThan(0);
  });

  it("can be loaded back with loadP12", () => {
    const password = "roundtrip-test";
    const p12 = generateTestP12(password);
    const cert = loadP12(p12, password);
    expect(cert.privateKeyPem).toBeTruthy();
    expect(cert.certificatePem).toBeTruthy();
  });
});
