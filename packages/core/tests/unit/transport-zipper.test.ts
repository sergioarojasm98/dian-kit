import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { DianTransportError } from "../../src/transport/types.js";
import { createXmlZip, getZipFileName } from "../../src/transport/zipper.js";

const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8"?><Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><cbc:ID>SETP990000001</cbc:ID></Invoice>`;
const NIT = "900123456";
const DOC_NUMBER = "SETP990000001";

describe("createXmlZip", () => {
  it("produce un Buffer no vacío", () => {
    const result = createXmlZip(SAMPLE_XML, NIT, DOC_NUMBER);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it("el ZIP contiene exactamente un archivo con el nombre correcto", () => {
    const zipBuffer = createXmlZip(SAMPLE_XML, NIT, DOC_NUMBER);
    const files = unzipSync(new Uint8Array(zipBuffer));
    const names = Object.keys(files);
    expect(names).toHaveLength(1);
    expect(names[0]).toBe(`${NIT}${DOC_NUMBER}.xml`);
  });

  it("el contenido del archivo dentro del ZIP es idéntico al XML original", () => {
    const zipBuffer = createXmlZip(SAMPLE_XML, NIT, DOC_NUMBER);
    const files = unzipSync(new Uint8Array(zipBuffer));
    const extracted = new TextDecoder().decode(files[`${NIT}${DOC_NUMBER}.xml`]);
    expect(extracted).toBe(SAMPLE_XML);
  });

  it("el resultado puede convertirse a Base64 válido", () => {
    const zipBuffer = createXmlZip(SAMPLE_XML, NIT, DOC_NUMBER);
    const base64 = zipBuffer.toString("base64");
    expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(Buffer.from(base64, "base64").length).toBe(zipBuffer.length);
  });

  it("funciona con XML que contiene caracteres no-ASCII (tildes)", () => {
    const xmlWithTildes = SAMPLE_XML.replace("<cbc:ID>", "<cbc:Nombre>Óscar Pérez ñoño</cbc:Nombre><cbc:ID>");
    const result = createXmlZip(xmlWithTildes, NIT, DOC_NUMBER);
    const files = unzipSync(new Uint8Array(result));
    const extracted = new TextDecoder().decode(files[`${NIT}${DOC_NUMBER}.xml`]);
    expect(extracted).toBe(xmlWithTildes);
  });

  it("rechaza XML vacío con DianTransportError", () => {
    expect(() => createXmlZip("", NIT, DOC_NUMBER)).toThrow(DianTransportError);
    expect(() => createXmlZip("", NIT, DOC_NUMBER)).toThrow("[DIAN-KIT]");
  });

  it("rechaza NIT vacío con DianTransportError", () => {
    expect(() => createXmlZip(SAMPLE_XML, "", DOC_NUMBER)).toThrow(DianTransportError);
  });

  it("rechaza número de documento vacío con DianTransportError", () => {
    expect(() => createXmlZip(SAMPLE_XML, NIT, "")).toThrow(DianTransportError);
  });
});

describe("getZipFileName", () => {
  it("retorna el nombre con extensión .xml.zip", () => {
    expect(getZipFileName(NIT, DOC_NUMBER)).toBe(`${NIT}${DOC_NUMBER}.xml.zip`);
  });

  it("no incluye espacios ni caracteres extra", () => {
    const name = getZipFileName("900123456", "SETP990000001");
    expect(name).not.toContain(" ");
    expect(name).toBe("900123456SETP990000001.xml.zip");
  });
});
