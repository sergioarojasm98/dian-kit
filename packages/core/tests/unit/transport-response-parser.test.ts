import { describe, expect, it } from "vitest";

import {
  parseAcquirerResponse,
  parseNumberingRangeResponse,
  parseSendResponse,
  parseStatusResponse,
} from "../../src/transport/response-parser.js";
import { DianTransportError } from "../../src/transport/types.js";

// Respuestas SOAP mock basadas en la estructura real del WCF DIAN
const SEND_RESPONSE_VALID = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendBillSyncResponse xmlns="http://wcf.dian.colombia">
      <SendBillSyncResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:IsValid>true</b:IsValid>
        <b:StatusCode>00</b:StatusCode>
        <b:StatusDescription>Procesado Correctamente</b:StatusDescription>
        <b:XmlFileName>900123456SETP990000001.xml</b:XmlFileName>
        <b:ErrorMessage xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays"/>
      </SendBillSyncResult>
    </SendBillSyncResponse>
  </s:Body>
</s:Envelope>`;

const SEND_RESPONSE_INVALID = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendBillSyncResponse xmlns="http://wcf.dian.colombia">
      <SendBillSyncResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse">
        <b:IsValid>false</b:IsValid>
        <b:StatusCode>99</b:StatusCode>
        <b:StatusDescription>Documento con errores en campos obligatorios</b:StatusDescription>
        <b:ErrorMessage xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
          <c:string>CAD06: El valor del campo PayableAmount no coincide</c:string>
          <c:string>FAD06: Error en los totales de impuestos</c:string>
        </b:ErrorMessage>
      </SendBillSyncResult>
    </SendBillSyncResponse>
  </s:Body>
</s:Envelope>`;

const SOAP_FAULT = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <s:Fault>
      <s:Code><s:Value>s:Sender</s:Value></s:Code>
      <s:Reason><s:Text xml:lang="es">Credenciales inválidas</s:Text></s:Reason>
    </s:Fault>
  </s:Body>
</s:Envelope>`;

const STATUS_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
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

const NUMBERING_RANGE_RESPONSE = `<?xml version="1.0" encoding="utf-8"?>
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
            <b:TechnicalKey>fc8eac422eba16e22ffd8c6f94b3f40a6e38162c</b:TechnicalKey>
          </b:NumberRange>
        </b:ResponseList>
      </GetNumberingRangeResult>
    </GetNumberingRangeResponse>
  </s:Body>
</s:Envelope>`;

describe("parseSendResponse", () => {
  it("retorna isValid=true cuando DIAN acepta el documento", () => {
    const result = parseSendResponse(SEND_RESPONSE_VALID);
    expect(result.isValid).toBe(true);
  });

  it("extrae el statusCode correctamente", () => {
    const result = parseSendResponse(SEND_RESPONSE_VALID);
    expect(result.statusCode).toBe("00");
  });

  it("extrae la statusDescription", () => {
    const result = parseSendResponse(SEND_RESPONSE_VALID);
    expect(result.statusDescription).toBe("Procesado Correctamente");
  });

  it("retorna isValid=false con errores cuando DIAN rechaza el documento", () => {
    const result = parseSendResponse(SEND_RESPONSE_INVALID);
    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it("mapea los errores con código y descripción", () => {
    const result = parseSendResponse(SEND_RESPONSE_INVALID);
    expect(result.errors[0]).toMatchObject({ code: "CAD06", description: expect.stringContaining("PayableAmount") });
    expect(result.errors[1]).toMatchObject({ code: "FAD06", description: expect.stringContaining("impuestos") });
  });

  it("incluye el rawResponse original", () => {
    const result = parseSendResponse(SEND_RESPONSE_VALID);
    expect(result.rawResponse).toBe(SEND_RESPONSE_VALID);
  });

  it("lanza DianTransportError ante un SOAP Fault", () => {
    expect(() => parseSendResponse(SOAP_FAULT)).toThrow(DianTransportError);
    expect(() => parseSendResponse(SOAP_FAULT)).toThrow("[DIAN-KIT]");
  });

  it("lanza DianTransportError ante XML malformado", () => {
    expect(() => parseSendResponse("<not-valid-xml<<")).toThrow(DianTransportError);
  });

  it("retorna errors vacío cuando isValid=true", () => {
    const result = parseSendResponse(SEND_RESPONSE_VALID);
    expect(result.errors).toHaveLength(0);
  });
});

describe("parseStatusResponse", () => {
  it("extrae isValid, statusCode y statusDescription", () => {
    const result = parseStatusResponse(STATUS_RESPONSE);
    expect(result.isValid).toBe(true);
    expect(result.statusCode).toBe("00");
    expect(result.statusDescription).toBe("Procesado Correctamente");
  });

  it("incluye el rawResponse original", () => {
    const result = parseStatusResponse(STATUS_RESPONSE);
    expect(result.rawResponse).toBe(STATUS_RESPONSE);
  });
});

describe("parseAcquirerResponse", () => {
  const ACQUIRER_RESPONSE_FOUND = `<?xml version="1.0" encoding="utf-8"?>
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

  const ACQUIRER_RESPONSE_NOT_FOUND = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetAcquirerResponse xmlns="http://wcf.dian.colombia">
      <GetAcquirerResult xmlns:b="http://schemas.datacontract.org/2004/07/Gosocket.Dian.Services.Utils.Common">
        <b:Message>NIT no encontrado</b:Message>
        <b:ReceiverEmail/>
        <b:ReceiverName/>
        <b:StatusCode>99</b:StatusCode>
      </GetAcquirerResult>
    </GetAcquirerResponse>
  </s:Body>
</s:Envelope>`;

  it("extrae receiverName y receiverEmail cuando el adquiriente existe", () => {
    const result = parseAcquirerResponse(ACQUIRER_RESPONSE_FOUND);
    expect(result.receiverName).toBe("EMPRESA XYZ SAS");
    expect(result.receiverEmail).toBe("facturacion@empresa.com");
  });

  it("extrae statusCode y message", () => {
    const result = parseAcquirerResponse(ACQUIRER_RESPONSE_FOUND);
    expect(result.statusCode).toBe("00");
    expect(result.message).toBe("Operación exitosa");
  });

  it("retorna campos vacíos cuando el adquiriente no existe", () => {
    const result = parseAcquirerResponse(ACQUIRER_RESPONSE_NOT_FOUND);
    expect(result.receiverName).toBe("");
    expect(result.receiverEmail).toBe("");
    expect(result.statusCode).toBe("99");
  });

  it("incluye el rawResponse original", () => {
    const result = parseAcquirerResponse(ACQUIRER_RESPONSE_FOUND);
    expect(result.rawResponse).toBe(ACQUIRER_RESPONSE_FOUND);
  });

  it("lanza DianTransportError ante un SOAP Fault", () => {
    expect(() => parseAcquirerResponse(SOAP_FAULT)).toThrow(DianTransportError);
  });
});

describe("parseNumberingRangeResponse", () => {
  it("retorna al menos un rango de numeración", () => {
    const result = parseNumberingRangeResponse(NUMBERING_RANGE_RESPONSE);
    expect(result.ranges).toHaveLength(1);
  });

  it("el rango tiene todos los campos requeridos", () => {
    const result = parseNumberingRangeResponse(NUMBERING_RANGE_RESPONSE);
    const range = result.ranges[0]!;
    expect(range.authorizationNumber).toBe("18760000001");
    expect(range.prefix).toBe("SETP");
    expect(range.fromNumber).toBe(990000000);
    expect(range.toNumber).toBe(995000000);
    expect(range.technicalKey).toBe("fc8eac422eba16e22ffd8c6f94b3f40a6e38162c");
  });

  it("authorizationNumber se retorna como string (no number)", () => {
    const result = parseNumberingRangeResponse(NUMBERING_RANGE_RESPONSE);
    expect(typeof result.ranges[0]!.authorizationNumber).toBe("string");
  });

  it("incluye el rawResponse original", () => {
    const result = parseNumberingRangeResponse(NUMBERING_RANGE_RESPONSE);
    expect(result.rawResponse).toBe(NUMBERING_RANGE_RESPONSE);
  });
});
