import { describe, expect, it } from "vitest";

import { generateTestP12, loadP12 } from "../../src/security/certificate.js";
import { signXml } from "../../src/security/signer.js";

/**
 * Minimal UBL 2.1 Invoice XML with the correct UBLExtensions structure.
 * The second UBLExtension has an empty ExtensionContent where the signature goes.
 */
const MINIMAL_UBL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>18760000001</sts:InvoiceAuthorization>
          </sts:InvoiceControl>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent/>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>20</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: documento equivalente electrónico</cbc:ProfileID>
  <cbc:ID>SETP990000001</cbc:ID>
  <cbc:IssueDate>2026-03-24</cbc:IssueDate>
  <cbc:IssueTime>10:30:00-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>20</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Test Supplier</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Test Customer</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="COP">100000.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>Test Item</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">100000.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>`;

describe("signXml", () => {
  const password = "test-signing-123";
  const p12Buffer = generateTestP12(password);
  const certificate = loadP12(p12Buffer, password);

  it("produces a signed XML string", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toBeTruthy();
    expect(typeof result.signedXml).toBe("string");
    expect(result.signedXml.length).toBeGreaterThan(MINIMAL_UBL_XML.length);
  });

  it("contains ds:Signature element", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("<ds:Signature");
    expect(result.signedXml).toContain("</ds:Signature>");
  });

  it("contains ds:SignatureValue", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("<ds:SignatureValue");
  });

  it("contains ds:SignedInfo with references", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("<ds:SignedInfo");
    expect(result.signedXml).toContain("<ds:Reference");
    expect(result.signedXml).toContain("<ds:DigestValue>");
  });

  it("contains X509Certificate in KeyInfo", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("<ds:X509Certificate>");
    expect(result.signedXml).toContain("<ds:KeyInfo");
  });

  it("contains XAdES QualifyingProperties", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("QualifyingProperties");
    expect(result.signedXml).toContain("SignedProperties");
    expect(result.signedXml).toContain("SignedSignatureProperties");
  });

  it("contains SigningTime", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("SigningTime");
  });

  it("contains SigningCertificate with digest", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("SigningCertificate");
    expect(result.signedXml).toContain("CertDigest");
  });

  it("contains DIAN SignaturePolicyIdentifier", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("SignaturePolicyIdentifier");
    expect(result.signedXml).toContain(
      "https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf",
    );
  });

  it("contains supplier SignerRole", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("supplier");
  });

  it("places signature inside second UBLExtension", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    // The signature should be inside ExtensionContent of the second UBLExtension
    const signatureIndex = result.signedXml.indexOf("<ds:Signature");
    const secondExtensionIndex = result.signedXml.indexOf(
      "<ext:UBLExtension>",
      result.signedXml.indexOf("<ext:UBLExtension>") + 1,
    );

    expect(signatureIndex).toBeGreaterThan(secondExtensionIndex);
  });

  it("uses RSA-SHA256 signature algorithm", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain(
      "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    );
  });

  it("uses SHA-256 digest algorithm", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain(
      "http://www.w3.org/2001/04/xmlenc#sha256",
    );
  });

  it("uses enveloped signature transform", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain(
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
    );
  });

  it("preserves original XML content", async () => {
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
    });

    expect(result.signedXml).toContain("SETP990000001");
    expect(result.signedXml).toContain("Test Supplier");
    expect(result.signedXml).toContain("100000.00");
  });

  it("allows custom policy hash override", async () => {
    const customHash = "Y3VzdG9tLWhhc2gtdGVzdA==";
    const result = await signXml({
      xml: MINIMAL_UBL_XML,
      certificate,
      policyHashBase64: customHash,
    });

    expect(result.signedXml).toContain("SignaturePolicyIdentifier");
  });
});
