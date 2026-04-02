/**
 * @module xml
 *
 * UBL 2.1 XML generation for DIAN electronic documents.
 * Provides builders for Invoice, CreditNote, and DebitNote XML,
 * along with namespace constants and schema locations.
 */
export { buildInvoiceXml, buildCreditNoteXml, buildDebitNoteXml, type BuildXmlResult } from "./builder.js";
export { NS, UBL_VERSION, SCHEMA_LOCATION, SCHEMA_LOCATION_CREDIT_NOTE, SCHEMA_LOCATION_DEBIT_NOTE, PROFILE_EXECUTION_ID } from "./namespaces.js";
