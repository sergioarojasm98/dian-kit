import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DianEndpoint, DianSoapMethod } from "../../src/constants/dian-endpoints.js";
import { Environment } from "../../src/constants/document-types.js";
import { generateTestP12, loadP12 } from "../../src/security/certificate.js";
import { getAcquirer, getNumberingRange, getStatus, getStatusZip, sendBill } from "../../src/transport/dian-client.js";
import * as httpClient from "../../src/transport/http-client.js";
import type { SoapAuthConfig } from "../../src/transport/types.js";
import { DianTransportError } from "../../src/transport/types.js";

const SIGNED_XML = `<?xml version="1.0" encoding="utf-8"?><Invoice><cbc:ID>SETP990000001</cbc:ID></Invoice>`;
const SUPPLIER_NIT = "900123456";
const DOC_NUMBER = "SETP990000001";

const TEST_P12 = generateTestP12("test-password");
const TEST_CERT = loadP12(TEST_P12, "test-password");
const AUTH: SoapAuthConfig = { certificate: TEST_CERT };

const MOCK_SEND_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendBillSyncResponse xmlns="http://wcf.dian.colombia">
      <SendBillSyncResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:IsValid>true</b:IsValid>
        <b:StatusCode>00</b:StatusCode>
        <b:StatusDescription>Procesado Correctamente</b:StatusDescription>
        <b:ErrorMessage xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/>
      </SendBillSyncResult>
    </SendBillSyncResponse>
  </s:Body>
</s:Envelope>`;

const MOCK_STATUS_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetStatusResponse xmlns="http://wcf.dian.colombia">
      <GetStatusResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:IsValid>true</b:IsValid>
        <b:StatusCode>00</b:StatusCode>
        <b:StatusDescription>Procesado Correctamente</b:StatusDescription>
      </GetStatusResult>
    </GetStatusResponse>
  </s:Body>
</s:Envelope>`;

const MOCK_NUMBERING_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetNumberingRangeResponse xmlns="http://wcf.dian.colombia">
      <GetNumberingRangeResult>
        <b:ResponseList xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
          <b:NumberRange>
            <b:AuthorizationNumber>18760000001</b:AuthorizationNumber>
            <b:Prefix>SETP</b:Prefix>
            <b:FromNumber>990000000</b:FromNumber>
            <b:ToNumber>995000000</b:ToNumber>
            <b:StartDate>2022-01-01T00:00:00</b:StartDate>
            <b:EndDate>2023-12-31T00:00:00</b:EndDate>
            <b:TechnicalKey>abc123</b:TechnicalKey>
          </b:NumberRange>
        </b:ResponseList>
      </GetNumberingRangeResult>
    </GetNumberingRangeResponse>
  </s:Body>
</s:Envelope>`;

const MOCK_ACQUIRER_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetAcquirerResponse xmlns="http://wcf.dian.colombia">
      <GetAcquirerResult xmlns:b="http://schemas.datacontract.org/2004/07/Gosocket.Dian.Services.Utils.Common">
        <b:Message>Operación exitosa</b:Message>
        <b:ReceiverEmail>facturacion@empresa.com</b:ReceiverEmail>
        <b:ReceiverName>EMPRESA XYZ SAS</b:ReceiverName>
        <b:StatusCode>00</b:StatusCode>
      </GetAcquirerResult>
    </GetAcquirerResponse>
  </s:Body>
</s:Envelope>`;

describe("sendBill", () => {
  let postSoapSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postSoapSpy = vi.spyOn(httpClient, "postSoap").mockResolvedValue(MOCK_SEND_RESPONSE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the sandbox endpoint when environment = HABILITACION", async () => {
    await sendBill({
      signedXml: SIGNED_XML,
      supplierNit: SUPPLIER_NIT,
      documentNumber: DOC_NUMBER,
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    const call = postSoapSpy.mock.calls[0]![0];
    expect(call.url).toBe(DianEndpoint.SANDBOX.SERVICE);
  });

  it("uses the production endpoint when environment = PRODUCCION", async () => {
    await sendBill({
      signedXml: SIGNED_XML,
      supplierNit: SUPPLIER_NIT,
      documentNumber: DOC_NUMBER,
      auth: AUTH,
      environment: Environment.PRODUCCION,
    });

    const call = postSoapSpy.mock.calls[0]![0];
    expect(call.url).toBe(DianEndpoint.PRODUCTION.SERVICE);
  });

  it("uses SendBillSync as the default method", async () => {
    await sendBill({
      signedXml: SIGNED_XML,
      supplierNit: SUPPLIER_NIT,
      documentNumber: DOC_NUMBER,
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    const call = postSoapSpy.mock.calls[0]![0];
    expect(call.soapAction).toContain("SendBillSync");
  });

  it("returns a well-typed DianSendResponse with isValid=true", async () => {
    const result = await sendBill({
      signedXml: SIGNED_XML,
      supplierNit: SUPPLIER_NIT,
      documentNumber: DOC_NUMBER,
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(result.isValid).toBe(true);
    expect(result.statusCode).toBe("00");
    expect(result.errors).toHaveLength(0);
    expect(result.rawResponse).toBeDefined();
  });

  it("throws DianTransportError if method=SendTestSetAsync and testSetId is missing", async () => {
    await expect(
      sendBill({
        signedXml: SIGNED_XML,
        supplierNit: SUPPLIER_NIT,
        documentNumber: DOC_NUMBER,
        auth: AUTH,
        environment: Environment.HABILITACION,
        method: DianSoapMethod.SEND_TEST_SET_ASYNC,
      }),
    ).rejects.toThrow(DianTransportError);
  });

  it("uses SendTestSetAsync with testSetId when specified", async () => {
    await sendBill({
      signedXml: SIGNED_XML,
      supplierNit: SUPPLIER_NIT,
      documentNumber: DOC_NUMBER,
      auth: AUTH,
      environment: Environment.HABILITACION,
      method: DianSoapMethod.SEND_TEST_SET_ASYNC,
      testSetId: "testSet-001",
    });

    const call = postSoapSpy.mock.calls[0]![0];
    expect(call.soapAction).toContain("SendTestSetAsync");
    expect(call.body).toContain("testSet-001");
  });

  it("propagates DianTransportError when postSoap fails", async () => {
    postSoapSpy.mockRejectedValue(
      new DianTransportError("El servidor DIAN retornó HTTP 500.", 500),
    );

    await expect(
      sendBill({
        signedXml: SIGNED_XML,
        supplierNit: SUPPLIER_NIT,
        documentNumber: DOC_NUMBER,
        auth: AUTH,
        environment: Environment.HABILITACION,
      }),
    ).rejects.toThrow(DianTransportError);
  });
});

describe("getStatus", () => {
  beforeEach(() => {
    vi.spyOn(httpClient, "postSoap").mockResolvedValue(MOCK_STATUS_RESPONSE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the trackId to the SOAP body", async () => {
    const postSoapSpy = vi.spyOn(httpClient, "postSoap").mockResolvedValue(MOCK_STATUS_RESPONSE);

    await getStatus({
      trackId: "abc123cufe",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(postSoapSpy.mock.calls[0]![0].body).toContain("abc123cufe");
    expect(postSoapSpy.mock.calls[0]![0].soapAction).toContain("GetStatus");
  });

  it("returns a well-typed DianStatusResponse", async () => {
    const result = await getStatus({
      trackId: "abc123cufe",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(result.isValid).toBe(true);
    expect(result.statusCode).toBe("00");
  });
});

describe("getStatusZip", () => {
  it("uses GetStatusZip as the SOAP method", async () => {
    const postSoapSpy = vi
      .spyOn(httpClient, "postSoap")
      .mockResolvedValue(MOCK_STATUS_RESPONSE);

    await getStatusZip({
      trackId: "zip-track-id",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(postSoapSpy.mock.calls[0]![0].soapAction).toContain("GetStatusZip");
  });
});

describe("getNumberingRange", () => {
  it("returns typed numbering ranges", async () => {
    vi.spyOn(httpClient, "postSoap").mockResolvedValue(MOCK_NUMBERING_RESPONSE);

    const result = await getNumberingRange({
      accountCode: "900123456",
      accountCodeT: "800000001",
      softwareCode: "SW-001",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(result.ranges).toHaveLength(1);
    expect(result.ranges[0]!.prefix).toBe("SETP");
    expect(result.ranges[0]!.authorizationNumber).toBe("18760000001");
  });
});

describe("getAcquirer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes identificationType and identificationNumber to the SOAP body", async () => {
    const postSoapSpy = vi
      .spyOn(httpClient, "postSoap")
      .mockResolvedValue(MOCK_ACQUIRER_RESPONSE);

    await getAcquirer({
      identificationType: "31",
      identificationNumber: "900123456",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    const call = postSoapSpy.mock.calls[0]![0];
    expect(call.body).toContain("<wcf:identificationNumber>900123456</wcf:identificationNumber>");
    expect(call.body).toContain("<wcf:identificationType>31</wcf:identificationType>");
    expect(call.soapAction).toContain("GetAcquirer");
  });

  it("uses the sandbox endpoint for HABILITACION", async () => {
    const postSoapSpy = vi
      .spyOn(httpClient, "postSoap")
      .mockResolvedValue(MOCK_ACQUIRER_RESPONSE);

    await getAcquirer({
      identificationType: "31",
      identificationNumber: "900123456",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(postSoapSpy.mock.calls[0]![0].url).toBe(DianEndpoint.SANDBOX.SERVICE);
  });

  it("returns DianAcquirerResponse with acquirer data", async () => {
    vi.spyOn(httpClient, "postSoap").mockResolvedValue(MOCK_ACQUIRER_RESPONSE);

    const result = await getAcquirer({
      identificationType: "31",
      identificationNumber: "900123456",
      auth: AUTH,
      environment: Environment.HABILITACION,
    });

    expect(result.receiverName).toBe("EMPRESA XYZ SAS");
    expect(result.receiverEmail).toBe("facturacion@empresa.com");
    expect(result.statusCode).toBe("00");
    expect(result.message).toBe("Operación exitosa");
  });

  it("propagates DianTransportError when postSoap fails", async () => {
    vi.spyOn(httpClient, "postSoap").mockRejectedValue(
      new DianTransportError("El servidor DIAN retornó HTTP 500.", 500),
    );

    await expect(
      getAcquirer({
        identificationType: "31",
        identificationNumber: "900123456",
        auth: AUTH,
        environment: Environment.HABILITACION,
      }),
    ).rejects.toThrow(DianTransportError);
  });
});
