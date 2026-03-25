export const NS = {
  INVOICE: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  CREDIT_NOTE: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
  DEBIT_NOTE: "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
  CAC: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  CBC: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  EXT: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  STS: "dian:gov:co:facturaelectronica:Structures-2-1",
  DS: "http://www.w3.org/2000/09/xmldsig#",
  XADES: "http://uri.etsi.org/01903/v1.3.2#",
  XSI: "http://www.w3.org/2001/XMLSchema-instance",
} as const;

export const SCHEMA_LOCATION = [
  "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  "http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd",
].join(" ");

export const UBL_VERSION = "UBL 2.1";
export const DIAN_PROFILE_INVOICE = "DIAN 2.1: Factura Electrónica de Venta";
export const DIAN_PROFILE_POS = "DIAN 2.1: documento soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura o documento equivalente";

/**
 * Profile ID mapping per document type (CustomizationID / ProfileID).
 * ProfileID identifies the document family for the DIAN.
 */
export const PROFILE_EXECUTION_ID = {
  PRODUCCION: "1",
  HABILITACION: "2",
} as const;
