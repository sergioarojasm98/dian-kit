import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";

import {
  DIAN_ACTION_BASE,
  buildGetAcquirerEnvelope,
  buildGetNumberingRangeEnvelope,
  buildGetStatusEnvelope,
  buildGetStatusZipEnvelope,
  buildSendBillAsyncEnvelope,
  buildSendBillSyncEnvelope,
  buildSendTestSetAsyncEnvelope,
  getSoapAction,
} from "../../src/transport/soap-builder.js";

const CREDS = { nit: "900123456", password: "testPassword123" };
const FILE_NAME = "900123456SETP990000001.xml.zip";
const FILE_BASE64 = "SGVsbG8gV29ybGQ=";
const TRACK_ID = "abc123cufe";

const parser = new DOMParser();

function parseEnvelope(xml: string): Document {
  const doc = parser.parseFromString(xml, "text/xml");
  const error = doc.getElementsByTagName("parsererror")[0];
  if (error) throw new Error(`XML inválido: ${error.textContent}`);
  return doc;
}

function getText(doc: Document, localName: string): string {
  return doc.getElementsByTagNameNS("*", localName)[0]?.textContent?.trim() ?? "";
}

describe("buildSendBillSyncEnvelope", () => {
  it("produce un envelope SOAP 1.2 bien formado", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    expect(() => parseEnvelope(xml)).not.toThrow();
  });

  it("usa el namespace SOAP 1.2 correcto", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    expect(xml).toContain("http://www.w3.org/2003/05/soap-envelope");
  });

  it("contiene el UsernameToken con el NIT", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "Username")).toBe(CREDS.nit);
  });

  it("la contraseña solo aparece en wsse:Password", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "Password")).toBe(CREDS.password);
    // No debe aparecer dos veces en el XML (evitar leaks)
    const count = (xml.match(new RegExp(CREDS.password, "g")) ?? []).length;
    expect(count).toBe(1);
  });

  it("el body contiene wcf:SendBillSync con fileName y contentFile", () => {
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "fileName")).toBe(FILE_NAME);
    expect(getText(doc, "contentFile")).toBe(FILE_BASE64);
  });

  it("escapa caracteres especiales XML en el NIT", () => {
    const maliciousCreds = { nit: "900<script>", password: "pass&word" };
    const xml = buildSendBillSyncEnvelope(FILE_NAME, FILE_BASE64, maliciousCreds);
    expect(xml).not.toContain("<script>");
    expect(xml).toContain("&lt;script&gt;");
  });
});

describe("buildSendBillAsyncEnvelope", () => {
  it("usa wcf:SendBillAsync en el body", () => {
    const xml = buildSendBillAsyncEnvelope(FILE_NAME, FILE_BASE64, CREDS);
    expect(xml).toContain("SendBillAsync");
    expect(xml).not.toContain("SendBillSync");
  });
});

describe("buildSendTestSetAsyncEnvelope", () => {
  it("incluye el testSetId en el body", () => {
    const xml = buildSendTestSetAsyncEnvelope(FILE_NAME, FILE_BASE64, "testSet-001", CREDS);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "testSetId")).toBe("testSet-001");
  });

  it("usa wcf:SendTestSetAsync como operación", () => {
    const xml = buildSendTestSetAsyncEnvelope(FILE_NAME, FILE_BASE64, "id", CREDS);
    expect(xml).toContain("SendTestSetAsync");
  });
});

describe("buildGetStatusEnvelope", () => {
  it("incluye el trackId en el body", () => {
    const xml = buildGetStatusEnvelope(TRACK_ID, CREDS);
    const doc = parseEnvelope(xml);
    expect(getText(doc, "trackId")).toBe(TRACK_ID);
  });

  it("usa GetStatus como operación", () => {
    const xml = buildGetStatusEnvelope(TRACK_ID, CREDS);
    expect(xml).toContain("GetStatus");
    expect(xml).not.toContain("GetStatusZip");
  });
});

describe("buildGetStatusZipEnvelope", () => {
  it("usa GetStatusZip como operación", () => {
    const xml = buildGetStatusZipEnvelope(TRACK_ID, CREDS);
    expect(xml).toContain("GetStatusZip");
  });
});

describe("buildGetNumberingRangeEnvelope", () => {
  it("incluye accountCode, accountCodeT y softwareCode", () => {
    const xml = buildGetNumberingRangeEnvelope({
      accountCode: "900123456",
      accountCodeT: "800000001",
      softwareCode: "SW-001",
      credentials: CREDS,
    });
    const doc = parseEnvelope(xml);
    expect(getText(doc, "accountCode")).toBe("900123456");
    expect(getText(doc, "accountCodeT")).toBe("800000001");
    expect(getText(doc, "softwareCode")).toBe("SW-001");
  });
});

describe("buildGetAcquirerEnvelope", () => {
  it("incluye identificationType e identificationNumber en el body", () => {
    const xml = buildGetAcquirerEnvelope({
      identificationType: "31",
      identificationNumber: "900123456",
      credentials: CREDS,
    });
    const doc = parseEnvelope(xml);
    expect(getText(doc, "identificationType")).toBe("31");
    expect(getText(doc, "identificationNumber")).toBe("900123456");
  });

  it("usa GetAcquirer como operación", () => {
    const xml = buildGetAcquirerEnvelope({
      identificationType: "31",
      identificationNumber: "900123456",
      credentials: CREDS,
    });
    expect(xml).toContain("GetAcquirer");
  });

  it("escapa caracteres especiales XML en el número de identificación", () => {
    const xml = buildGetAcquirerEnvelope({
      identificationType: "31",
      identificationNumber: "900<inject>",
      credentials: CREDS,
    });
    expect(xml).not.toContain("<inject>");
    expect(xml).toContain("&lt;inject&gt;");
  });
});

describe("getSoapAction", () => {
  it("retorna la URL completa con el método", () => {
    expect(getSoapAction("SendBillSync")).toBe(`${DIAN_ACTION_BASE}/SendBillSync`);
    expect(getSoapAction("GetStatus")).toBe(`${DIAN_ACTION_BASE}/GetStatus`);
  });
});
