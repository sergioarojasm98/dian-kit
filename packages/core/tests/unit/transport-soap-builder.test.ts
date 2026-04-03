import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

import { generateTestP12, loadP12, type CertificateData } from "../../src/security/certificate.js";
import type { SoapAuthConfig } from "../../src/transport/types.js";

import {
  DIAN_ACTION_BASE,
  buildGetAcquirerEnvelope,
  buildGetNumberingRangeEnvelope,
  buildGetStatusEnvelope,
  buildGetStatusZipEnvelope,
  buildSendBillAsyncEnvelope,
  buildSendBillSyncEnvelope,
  buildSendTestSetAsyncEnvelope,
  buildSignedSoapEnvelope,
  getSoapAction,
} from "../../src/transport/soap-builder.js";

const TEST_P12 = generateTestP12("test-password");
const TEST_CERT: CertificateData = loadP12(TEST_P12, "test-password");
const AUTH: SoapAuthConfig = { certificate: TEST_CERT };
const ENDPOINT_URL = "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc";

const FILE_NAME = "900123456SETP990000001.xml.zip";
const FILE_BASE64 = "SGVsbG8gV29ybGQ=";
const TRACK_ID = "abc123cufe";

const parser = new DOMParser();

function parseEnvelope(xml: string): Document {
  const doc = parser.parseFromString(xml, "text/xml");
  const error = doc.getElementsByTagName("parsererror")[0];
  if (error) throw new Error(`Invalid XML: ${error.textContent}`);
  return doc;
}

function getText(doc: Document, localName: string): string {
  return doc.getElementsByTagNameNS("*", localName)[0]?.textContent?.trim() ?? "";
}

function getElements(doc: Document, localName: string): Element[] {
  const nodeList = doc.getElementsByTagNameNS("*", localName);
  const result: Element[] = [];
  for (let i = 0; i < nodeList.length; i++) {
    result.push(nodeList[i] as Element);
  }
  return result;
}

describe("buildSignedSoapEnvelope", () => {
  it("produces a well-formed SOAP 1.2 envelope", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(() => parseEnvelope(xml)).not.toThrow();
  });

  it("uses the correct SOAP 1.2 namespace", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(xml).toContain("http://www.w3.org/2003/05/soap-envelope");
  });

  it("contains a wsu:Timestamp with Created and Expires", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    const created = getText(doc, "Created");
    const expires = getText(doc, "Expires");
    expect(created).toBeTruthy();
    expect(expires).toBeTruthy();
    // Expires should be after Created
    expect(new Date(expires).getTime()).toBeGreaterThan(new Date(created).getTime());
  });

  it("contains a BinarySecurityToken with the certificate", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    const bst = getText(doc, "BinarySecurityToken");
    expect(bst).toBe(TEST_CERT.certificateDerBase64);
  });

  it("contains a ds:Signature with SignedInfo, SignatureValue, and KeyInfo", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    expect(getElements(doc, "Signature")).toHaveLength(1);
    expect(getElements(doc, "SignedInfo")).toHaveLength(1);
    expect(getText(doc, "SignatureValue")).toBeTruthy();
    expect(getElements(doc, "KeyInfo")).toHaveLength(1);
  });

  it("signs only the wsa:To element (one Reference)", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    const references = getElements(doc, "Reference").filter(
      (el) => el.namespaceURI === "http://www.w3.org/2000/09/xmldsig#",
    );
    expect(references).toHaveLength(1);
  });

  it("uses RSA-SHA256 as the signature algorithm", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(xml).toContain("http://www.w3.org/2001/04/xmldsig-more#rsa-sha256");
  });

  it("uses SHA-256 as the digest algorithm", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(xml).toContain("http://www.w3.org/2001/04/xmlenc#sha256");
  });

  it("uses Exclusive C14N for canonicalization", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(xml).toContain("http://www.w3.org/2001/10/xml-exc-c14n#");
  });

  it("includes wsa:Action with the correct SOAPAction URI", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "TestMethod",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    expect(getText(doc, "Action")).toBe(
      "http://wcf.dian.colombia/IWcfDianCustomerServices/TestMethod",
    );
  });

  it("includes wsa:To with the endpoint URL", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);
    expect(getText(doc, "To")).toBe(ENDPOINT_URL);
  });

  it("does NOT contain any UsernameToken element", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    expect(xml).not.toContain("UsernameToken");
    expect(xml).not.toContain("Username");
    expect(xml).not.toContain("Password");
  });

  it("contains a SecurityTokenReference pointing to the BinarySecurityToken", () => {
    const xml = buildSignedSoapEnvelope(
      "<wcf:Test/>",
      "Test",
      ENDPOINT_URL,
      AUTH,
    );
    const doc = parseEnvelope(xml);

    // Get the wsu:Id of BinarySecurityToken
    const bstElements = getElements(doc, "BinarySecurityToken");
    expect(bstElements).toHaveLength(1);
    const bstId = bstElements[0]!.getAttributeNS(
      "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd",
      "Id",
    );
    expect(bstId).toBeTruthy();

    // The SecurityTokenReference should contain a Reference with URI pointing to BST
    const strRefs = getElements(doc, "SecurityTokenReference");
    expect(strRefs).toHaveLength(1);
    const wsseRef = strRefs[0]!.getElementsByTagNameNS(
      "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd",
      "Reference",
    )[0];
    expect(wsseRef).toBeDefined();
    expect(wsseRef!.getAttribute("URI")).toBe(`#${bstId}`);
  });
});

describe("buildSendBillSyncEnvelope", () => {
  it("produces a well-formed SOAP 1.2 envelope", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, ENDPOINT_URL, AUTH);
    expect(() => parseEnvelope(xml)).not.toThrow();
  });

  it("uses the correct SOAP 1.2 namespace", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, ENDPOINT_URL, AUTH);
    expect(xml).toContain("http://www.w3.org/2003/05/soap-envelope");
  });

  it("contains a WS-Security Signature (no UsernameToken)", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, ENDPOINT_URL, AUTH);
    expect(xml).toContain("BinarySecurityToken");
    expect(xml).toContain("Signature");
    expect(xml).not.toContain("UsernameToken");
  });

  it("the body contains wcf:SendBillSync with fileName and contentFile", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, ENDPOINT_URL, AUTH);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "fileName")).toBe(FILE_NAME);
    expect(getText(doc, "contentFile")).toBe(FILE_BASE64);
  });

  it("escapes XML special characters in fileName", () => {
    const xml = buildSendBillSyncEnvelope("file<name>", FILE_BASE64, ENDPOINT_URL, AUTH);
    expect(xml).not.toContain("<name>");
    expect(xml).toContain("&lt;name&gt;");
  });
});

describe("buildSendBillAsyncEnvelope", () => {
  it("uses wcf:SendBillAsync in the body", () => {
    const xml = buildSendBillAsyncEnvelope(FILE_NAME, FILE_BASE64, ENDPOINT_URL, AUTH);
    expect(xml).toContain("SendBillAsync");
    expect(xml).not.toContain("SendBillSync");
  });
});

describe("buildSendTestSetAsyncEnvelope", () => {
  it("includes the testSetId in the body", () => {
    const xml = buildSendTestSetAsyncEnvelope(FILE_NAME, FILE_BASE64, "testSet-001", ENDPOINT_URL, AUTH);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "testSetId")).toBe("testSet-001");
  });

  it("uses wcf:SendTestSetAsync as the operation", () => {
    const xml = buildSendTestSetAsyncEnvelope(FILE_NAME, FILE_BASE64, "id", ENDPOINT_URL, AUTH);
    expect(xml).toContain("SendTestSetAsync");
  });
});

describe("buildGetStatusEnvelope", () => {
  it("includes the trackId in the body", () => {
    const xml = buildGetStatusEnvelope(TRACK_ID, ENDPOINT_URL, AUTH);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "trackId")).toBe(TRACK_ID);
  });

  it("uses GetStatus as the operation", () => {
    const xml = buildGetStatusEnvelope(TRACK_ID, ENDPOINT_URL, AUTH);
    expect(xml).toContain("GetStatus");
    expect(xml).not.toContain("GetStatusZip");
  });
});

describe("buildGetStatusZipEnvelope", () => {
  it("uses GetStatusZip as the operation", () => {
    const xml = buildGetStatusZipEnvelope(TRACK_ID, ENDPOINT_URL, AUTH);
    expect(xml).toContain("GetStatusZip");
  });
});

describe("buildGetNumberingRangeEnvelope", () => {
  it("includes accountCode, accountCodeT, and softwareCode", () => {
    const xml = buildGetNumberingRangeEnvelope(
      {
        accountCode: "900123456",
        accountCodeT: "800000001",
        softwareCode: "SW-001",
        auth: AUTH,
      },
      ENDPOINT_URL,
    );
    const doc = parseEnvelope(xml);
    expect(getText(doc, "accountCode")).toBe("900123456");
    expect(getText(doc, "accountCodeT")).toBe("800000001");
    expect(getText(doc, "softwareCode")).toBe("SW-001");
  });
});

describe("buildGetAcquirerEnvelope", () => {
  it("includes identificationType and identificationNumber in the body", () => {
    const xml = buildGetAcquirerEnvelope(
      {
        identificationType: "31",
        identificationNumber: "900123456",
        auth: AUTH,
      },
      ENDPOINT_URL,
    );
    const doc = parseEnvelope(xml);
    expect(getText(doc, "identificationType")).toBe("31");
    expect(getText(doc, "identificationNumber")).toBe("900123456");
  });

  it("uses GetAcquirer as the operation", () => {
    const xml = buildGetAcquirerEnvelope(
      {
        identificationType: "31",
        identificationNumber: "900123456",
        auth: AUTH,
      },
      ENDPOINT_URL,
    );
    expect(xml).toContain("GetAcquirer");
  });

  it("escapes XML special characters in the identification number", () => {
    const xml = buildGetAcquirerEnvelope(
      {
        identificationType: "31",
        identificationNumber: "900<inject>",
        auth: AUTH,
      },
      ENDPOINT_URL,
    );
    expect(xml).not.toContain("<inject>");
    expect(xml).toContain("&lt;inject&gt;");
  });
});

describe("getSoapAction", () => {
  it("returns the full URL with the method name", () => {
    expect(getSoapAction("SendBillSync")).toBe(`${DIAN_ACTION_BASE}/SendBillSync`);
    expect(getSoapAction("GetStatus")).toBe(`${DIAN_ACTION_BASE}/GetStatus`);
  });
});
