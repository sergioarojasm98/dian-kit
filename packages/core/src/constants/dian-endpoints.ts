export const DianEndpoint = {
  PRODUCTION: {
    SERVICE: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc",
    WSDL: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
  },
  SANDBOX: {
    SERVICE: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc",
    WSDL: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
    CATALOG: "https://catalogo-vpfe-hab.dian.gov.co/",
  },
} as const;

export const DianSignaturePolicy = {
  URL: "https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf",
  DESCRIPTION:
    "Política de firma para facturas electrónicas de la República de Colombia.",
} as const;

export const DianSoapMethod = {
  SEND_BILL_SYNC: "SendBillSync",
  SEND_BILL_ASYNC: "SendBillAsync",
  SEND_TEST_SET_ASYNC: "SendTestSetAsync",
  GET_STATUS: "GetStatus",
  GET_STATUS_ZIP: "GetStatusZip",
  GET_NUMBERING_RANGE: "GetNumberingRange",
  GET_ACQUIRER: "GetAcquirer",
} as const;
