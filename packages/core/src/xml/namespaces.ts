/**
 * XML namespace URIs used in DIAN UBL 2.1 electronic documents.
 * Each key maps to a standard UBL, W3C, or DIAN-specific namespace
 * required for Invoice, CreditNote, and DebitNote XML generation.
 *
 * @example
 * ```typescript
 * import { NS } from './namespaces';
 * root.att("xmlns:cac", NS.CAC);
 * ```
 */
export const NS = {
  /** UBL 2.1 Invoice root namespace */
  INVOICE: "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  /** UBL 2.1 CreditNote root namespace */
  CREDIT_NOTE: "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
  /** UBL 2.1 DebitNote root namespace */
  DEBIT_NOTE: "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
  /** UBL 2.1 Common Aggregate Components (cac) namespace */
  CAC: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  /** UBL 2.1 Common Basic Components (cbc) namespace */
  CBC: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
  /** UBL 2.1 Common Extension Components (ext) namespace */
  EXT: "urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2",
  /** DIAN-specific structures namespace for Colombian electronic invoicing extensions */
  STS: "dian:gov:co:facturaelectronica:Structures-2-1",
  /** W3C XML Digital Signature namespace */
  DS: "http://www.w3.org/2000/09/xmldsig#",
  /** ETSI XAdES XML Advanced Electronic Signatures namespace */
  XADES: "http://uri.etsi.org/01903/v1.3.2#",
  /** W3C XML Schema Instance namespace */
  XSI: "http://www.w3.org/2001/XMLSchema-instance",
} as const;

/**
 * XSD schema location for UBL 2.1 Invoice documents.
 * Combines the namespace URI with the official OASIS XSD URL,
 * used in the `xsi:schemaLocation` attribute of the root element.
 */
export const SCHEMA_LOCATION = [
  "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  "http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-Invoice-2.1.xsd",
].join(" ");

/**
 * XSD schema location for UBL 2.1 CreditNote documents.
 * Used in the `xsi:schemaLocation` attribute for credit note XML generation.
 */
export const SCHEMA_LOCATION_CREDIT_NOTE = [
  "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2",
  "http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-CreditNote-2.1.xsd",
].join(" ");

/**
 * XSD schema location for UBL 2.1 DebitNote documents.
 * Used in the `xsi:schemaLocation` attribute for debit note XML generation.
 */
export const SCHEMA_LOCATION_DEBIT_NOTE = [
  "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2",
  "http://docs.oasis-open.org/ubl/os-UBL-2.1/xsd/maindoc/UBL-DebitNote-2.1.xsd",
].join(" ");

/** UBL version identifier included in every DIAN electronic document as UBLVersionID */
export const UBL_VERSION = "UBL 2.1";

/** DIAN profile identifier for standard electronic sales invoices (Factura Electronica de Venta) */
export const DIAN_PROFILE_INVOICE = "DIAN 2.1: Factura Electrónica de Venta";

/** DIAN profile identifier for support documents in acquisitions from non-invoicing parties */
export const DIAN_PROFILE_POS = "DIAN 2.1: documento soporte en adquisiciones efectuadas a sujetos no obligados a expedir factura o documento equivalente";

/**
 * Profile ID mapping per document type (CustomizationID / ProfileID).
 * ProfileID identifies the document family for the DIAN.
 */
export const PROFILE_EXECUTION_ID = {
  PRODUCCION: "1",
  HABILITACION: "2",
} as const;
