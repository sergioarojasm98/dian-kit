/**
 * DIAN SOAP/WCF web service endpoint URLs for electronic invoicing.
 * Contains both production (VPFE) and sandbox (habilitacion) environments.
 *
 * @example
 * ```typescript
 * const url = DianEndpoint.PRODUCTION.SERVICE;
 * ```
 */
export const DianEndpoint = {
  /** Production environment endpoints (live DIAN system) */
  PRODUCTION: {
    /** DIAN production SOAP service URL for sending electronic documents */
    SERVICE: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc",
    /** DIAN production WSDL descriptor for service discovery */
    WSDL: "https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
  },
  /** Sandbox (habilitacion) environment endpoints for testing and certification */
  SANDBOX: {
    /** DIAN sandbox SOAP service URL for testing electronic documents */
    SERVICE: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc",
    /** DIAN sandbox WSDL descriptor for service discovery */
    WSDL: "https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl",
    /** DIAN sandbox catalog URL for document verification */
    CATALOG: "https://catalogo-vpfe-hab.dian.gov.co/",
  },
} as const;

/**
 * DIAN XAdES signature policy configuration for electronic documents.
 * References the official DIAN signing policy PDF required for XAdES-EPES signatures.
 *
 * @example
 * ```typescript
 * const policyUrl = DianSignaturePolicy.URL;
 * ```
 */
export const DianSignaturePolicy = {
  /** URL to the official DIAN electronic invoicing signature policy PDF (v2) */
  URL: "https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf",
  /** Human-readable description of the Colombian electronic invoicing signature policy */
  DESCRIPTION: "Política de firma para facturas electrónicas de la República de Colombia.",
} as const;

/**
 * SOAP method names exposed by the DIAN WCF web service.
 * Used as the SOAP action when invoking DIAN electronic invoicing operations.
 *
 * @example
 * ```typescript
 * const method = DianSoapMethod.SEND_BILL_SYNC;
 * ```
 */
export const DianSoapMethod = {
  /** Send an electronic document synchronously and receive immediate validation */
  SEND_BILL_SYNC: "SendBillSync",
  /** Send an electronic document asynchronously for background processing */
  SEND_BILL_ASYNC: "SendBillAsync",
  /** Send a test set of documents for DIAN certification (habilitacion) */
  SEND_TEST_SET_ASYNC: "SendTestSetAsync",
  /** Query the processing status of a previously submitted document by CUFE/CUDE */
  GET_STATUS: "GetStatus",
  /** Query the processing status of a previously submitted ZIP file */
  GET_STATUS_ZIP: "GetStatusZip",
  /** Retrieve the authorized numbering ranges for the taxpayer */
  GET_NUMBERING_RANGE: "GetNumberingRange",
  /** Retrieve acquirer (customer) information from DIAN records */
  GET_ACQUIRER: "GetAcquirer",
} as const;
