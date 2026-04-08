/**
 * @module xml
 *
 * UBL 2.1 XML generation for DIAN electronic documents.
 * Provides builders for Invoice, CreditNote, and DebitNote XML,
 * along with namespace constants and schema locations.
 */
export {
  type BuildXmlResult,
  buildCreditNoteXml,
  buildDebitNoteXml,
  buildInvoiceXml,
} from "./builder.js";
export {
  NS,
  PROFILE_EXECUTION_ID,
  SCHEMA_LOCATION,
  SCHEMA_LOCATION_CREDIT_NOTE,
  SCHEMA_LOCATION_DEBIT_NOTE,
  UBL_VERSION,
} from "./namespaces.js";
