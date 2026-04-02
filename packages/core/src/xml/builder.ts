import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces.js";

import { DocumentType, type EnvironmentValue } from "../constants/document-types.js";
import { TaxCode, TaxCodeName } from "../constants/tax-codes.js";
import type {
  AllowanceCharge,
  DianDocument,
  InvoiceLine,
  LegalMonetaryTotal,
  NumberingAuthorization,
  Party,
  PaymentMeans,
  SoftwareInfo,
  TaxTotal,
} from "../types/common.js";
import { formatAmount, formatDate, formatPercent, formatTime } from "../utils/amount.js";
import { NS, SCHEMA_LOCATION, SCHEMA_LOCATION_CREDIT_NOTE, SCHEMA_LOCATION_DEBIT_NOTE, UBL_VERSION } from "./namespaces.js";

/** Set of document type codes that produce a CreditNote XML root element */
const CREDIT_NOTE_DOCUMENTS: ReadonlySet<string> = new Set([DocumentType.NOTA_CREDITO, DocumentType.NOTA_AJUSTE_CREDITO_DOC_EQUIV]);

/** Set of document type codes that produce a DebitNote XML root element */
const DEBIT_NOTE_DOCUMENTS: ReadonlySet<string> = new Set([DocumentType.NOTA_DEBITO, DocumentType.NOTA_AJUSTE_DEBITO_DOC_EQUIV]);

/**
 * Internal configuration that varies by document type (Invoice, CreditNote, DebitNote).
 * Determines the XML root element name, namespace, schema location, and child element names.
 */
interface DocumentConfig {
  /** Root XML element name (e.g., "Invoice", "CreditNote", "DebitNote") */
  rootName: string;
  /** Primary namespace URI for the root element */
  ns: string;
  /** XSD schema location string for the xsi:schemaLocation attribute */
  schemaLocation: string;
  /** Line item element name (e.g., "InvoiceLine", "CreditNoteLine") */
  lineTag: string;
  /** Quantity element name (e.g., "InvoicedQuantity", "CreditedQuantity") */
  quantityTag: string;
  /** Document type code element name (e.g., "InvoiceTypeCode", "CreditNoteTypeCode") */
  typeCodeTag: string;
}

/**
 * Resolves the XML document configuration based on the DIAN document type code.
 * Returns the appropriate root element, namespace, schema, and tag names
 * for Invoice, CreditNote, or DebitNote documents.
 *
 * @param docType - DIAN document type code (e.g., "01", "91", "92")
 * @returns Configuration object with XML structure details for the document type
 */
function getDocumentConfig(docType: string): DocumentConfig {
  if (CREDIT_NOTE_DOCUMENTS.has(docType)) {
    return {
      rootName: "CreditNote",
      ns: NS.CREDIT_NOTE,
      schemaLocation: SCHEMA_LOCATION_CREDIT_NOTE,
      lineTag: "CreditNoteLine",
      quantityTag: "CreditedQuantity",
      typeCodeTag: "CreditNoteTypeCode",
    };
  }
  if (DEBIT_NOTE_DOCUMENTS.has(docType)) {
    return {
      rootName: "DebitNote",
      ns: NS.DEBIT_NOTE,
      schemaLocation: SCHEMA_LOCATION_DEBIT_NOTE,
      lineTag: "DebitNoteLine",
      quantityTag: "DebitedQuantity",
      typeCodeTag: "DebitNoteTypeCode",
    };
  }
  return {
    rootName: "Invoice",
    ns: NS.INVOICE,
    schemaLocation: SCHEMA_LOCATION,
    lineTag: "InvoiceLine",
    quantityTag: "InvoicedQuantity",
    typeCodeTag: "InvoiceTypeCode",
  };
}

/**
 * Returns the DIAN ProfileID string for a given document type.
 * The ProfileID identifies the document family (e.g., electronic invoice,
 * credit note, POS ticket) in the UBL ProfileID element.
 *
 * @param docType - DIAN document type code
 * @returns DIAN ProfileID string for the UBL document
 */
function profileIdForDocumentType(docType: string): string {
  switch (docType) {
    case DocumentType.POS:
      return "DIAN 2.1: documento equivalente electrónico - Tiquete de máquina registradora con sistema P.O.S.";
    case DocumentType.NOTA_CREDITO:
      return "DIAN 2.1: Nota Crédito de Factura Electrónica de Venta";
    case DocumentType.NOTA_DEBITO:
      return "DIAN 2.1: Nota Débito de Factura Electrónica de Venta";
    case DocumentType.NOTA_AJUSTE_CREDITO_DOC_EQUIV:
      return "DIAN 2.1: Nota de Ajuste tipo crédito al documento equivalente electrónico";
    case DocumentType.NOTA_AJUSTE_DEBITO_DOC_EQUIV:
      return "DIAN 2.1: Nota de Ajuste tipo débito al documento equivalente electrónico";
    default:
      return "DIAN 2.1: Factura Electrónica de Venta";
  }
}

/**
 * Adds a complete party node (AccountingSupplierParty or AccountingCustomerParty)
 * to the XML document, including PartyName, PhysicalLocation, PartyTaxScheme,
 * PartyLegalEntity, and Contact sub-elements.
 *
 * @param parent - Parent XML builder node to append the party element to
 * @param tagName - UBL element name ("AccountingSupplierParty" or "AccountingCustomerParty")
 * @param party - Party data containing identification, tax info, address, and contact
 */
function addPartyNode(
  parent: XMLBuilder,
  tagName: string,
  party: Party,
): void {
  const partyNode = parent.ele(NS.CAC, tagName);
  const innerParty = partyNode.ele(NS.CAC, "Party");

  // PartyName
  const partyName = innerParty.ele(NS.CAC, "PartyName");
  partyName.ele(NS.CBC, "Name").txt(party.name);

  // PhysicalLocation
  if (party.address) {
    const location = innerParty.ele(NS.CAC, "PhysicalLocation");
    addAddressNode(location, party.address);
  }

  // PartyTaxScheme
  const taxScheme = innerParty.ele(NS.CAC, "PartyTaxScheme");
  taxScheme.ele(NS.CBC, "RegistrationName").txt(party.taxInfo.registrationName);

  const companyId = taxScheme.ele(NS.CBC, "CompanyID");
  companyId.att("schemeAgencyID", "195");
  companyId.att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)");
  companyId.att("schemeID", party.identification.dv ?? "");
  companyId.att("schemeName", party.identification.type);
  companyId.txt(party.identification.number);

  taxScheme.ele(NS.CBC, "TaxLevelCode")
    .att("listName", "49")
    .txt(party.taxInfo.taxLevelCode);

  if (party.taxInfo.address) {
    const regAddress = taxScheme.ele(NS.CAC, "RegistrationAddress");
    addAddressFields(regAddress, party.taxInfo.address);
  }

  const taxSchemeInner = taxScheme.ele(NS.CAC, "TaxScheme");
  taxSchemeInner.ele(NS.CBC, "ID").txt(party.taxInfo.taxScheme.code);
  taxSchemeInner.ele(NS.CBC, "Name").txt(
    party.taxInfo.taxScheme.name ?? TaxCodeName[party.taxInfo.taxScheme.code] ?? "",
  );

  // PartyLegalEntity
  const legalEntity = innerParty.ele(NS.CAC, "PartyLegalEntity");
  legalEntity.ele(NS.CBC, "RegistrationName").txt(party.taxInfo.registrationName);

  const legalCompanyId = legalEntity.ele(NS.CBC, "CompanyID");
  legalCompanyId.att("schemeAgencyID", "195");
  legalCompanyId.att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)");
  legalCompanyId.att("schemeID", party.identification.dv ?? "");
  legalCompanyId.att("schemeName", party.identification.type);
  legalCompanyId.txt(party.identification.number);

  // Contact (email)
  if (party.email) {
    const contact = innerParty.ele(NS.CAC, "Contact");
    contact.ele(NS.CBC, "ElectronicMail").txt(party.email);
    if (party.phone) {
      contact.ele(NS.CBC, "Telephone").txt(party.phone);
    }
  }
}

/**
 * Adds a CAC:Address element wrapped in a parent container node.
 * Used for PhysicalLocation addresses.
 *
 * @param parent - Parent XML builder node (e.g., PhysicalLocation)
 * @param address - Address data with street, city, department, and country info
 */
function addAddressNode(parent: XMLBuilder, address: {
  street: string;
  cityCode: string;
  cityName: string;
  departmentCode: string;
  departmentName: string;
  countryCode?: string;
  countryName?: string;
  postalZone?: string;
}): void {
  const addrNode = parent.ele(NS.CAC, "Address");
  addAddressFields(addrNode, address);
}

/**
 * Populates address fields (ID, CityName, PostalZone, CountrySubentity, AddressLine, Country)
 * into an existing Address XML node. Defaults country to "CO" / "Colombia".
 *
 * @param addrNode - Address XML builder node to populate with fields
 * @param address - Address data with street, city, department, and country info
 */
function addAddressFields(addrNode: XMLBuilder, address: {
  street: string;
  cityCode: string;
  cityName: string;
  departmentCode: string;
  departmentName: string;
  countryCode?: string;
  countryName?: string;
  postalZone?: string;
}): void {
  addrNode.ele(NS.CBC, "ID").txt(address.cityCode);
  addrNode.ele(NS.CBC, "CityName").txt(address.cityName);
  if (address.postalZone) {
    addrNode.ele(NS.CBC, "PostalZone").txt(address.postalZone);
  }
  addrNode.ele(NS.CBC, "CountrySubentity").txt(address.departmentName);
  addrNode.ele(NS.CBC, "CountrySubentityCode").txt(address.departmentCode);

  const line = addrNode.ele(NS.CAC, "AddressLine");
  line.ele(NS.CBC, "Line").txt(address.street);

  const country = addrNode.ele(NS.CAC, "Country");
  country.ele(NS.CBC, "IdentificationCode").txt(address.countryCode ?? "CO");
  country.ele(NS.CBC, "Name")
    .att("languageID", "es")
    .txt(address.countryName ?? "Colombia");
}

/**
 * Adds a CAC:TaxTotal element with its TaxSubtotal children to the XML document.
 * Each subtotal includes taxable amount, tax amount, percent, and tax scheme.
 *
 * @param parent - Parent XML builder node to append the TaxTotal element to
 * @param taxTotal - Tax total data with aggregated amount and subtotals
 * @param currency - ISO 4217 currency code for amount attributes (e.g., "COP")
 */
function addTaxTotalNode(parent: XMLBuilder, taxTotal: TaxTotal, currency: string): void {
  const node = parent.ele(NS.CAC, "TaxTotal");
  node.ele(NS.CBC, "TaxAmount")
    .att("currencyID", currency)
    .txt(formatAmount(taxTotal.taxAmount));

  for (const subtotal of taxTotal.subtotals) {
    const sub = node.ele(NS.CAC, "TaxSubtotal");
    sub.ele(NS.CBC, "TaxableAmount")
      .att("currencyID", currency)
      .txt(formatAmount(subtotal.taxableAmount));
    sub.ele(NS.CBC, "TaxAmount")
      .att("currencyID", currency)
      .txt(formatAmount(subtotal.taxAmount));
    sub.ele(NS.CBC, "Percent").txt(formatPercent(subtotal.percent));

    const scheme = sub.ele(NS.CAC, "TaxScheme");
    scheme.ele(NS.CBC, "ID").txt(subtotal.taxScheme.code);
    scheme.ele(NS.CBC, "Name").txt(
      subtotal.taxScheme.name ?? TaxCodeName[subtotal.taxScheme.code] ?? "",
    );
  }
}

/**
 * Adds a CAC:AllowanceCharge element for a discount or surcharge.
 * Includes charge indicator, reason, multiplier factor, amount, and base amount.
 *
 * @param parent - Parent XML builder node to append the AllowanceCharge element to
 * @param ac - Allowance/charge data with amounts and reason
 * @param currency - ISO 4217 currency code for amount attributes
 */
function addAllowanceChargeNode(
  parent: XMLBuilder,
  ac: AllowanceCharge,
  currency: string,
): void {
  const node = parent.ele(NS.CAC, "AllowanceCharge");
  node.ele(NS.CBC, "ChargeIndicator").txt(ac.chargeIndicator ? "true" : "false");
  node.ele(NS.CBC, "AllowanceChargeReason").txt(ac.reason);
  if (ac.multiplierFactor !== undefined) {
    node.ele(NS.CBC, "MultiplierFactorNumeric").txt(formatPercent(ac.multiplierFactor));
  }
  node.ele(NS.CBC, "Amount")
    .att("currencyID", currency)
    .txt(formatAmount(ac.amount));
  node.ele(NS.CBC, "BaseAmount")
    .att("currencyID", currency)
    .txt(formatAmount(ac.baseAmount));
}

/**
 * Adds a CAC:LegalMonetaryTotal element with all required DIAN monetary amounts:
 * line extension, tax exclusive/inclusive, allowances, charges, prepaid, and payable.
 *
 * @param parent - Parent XML builder node to append the LegalMonetaryTotal element to
 * @param total - Legal monetary total data with all summary amounts
 * @param currency - ISO 4217 currency code for amount attributes
 */
function addMonetaryTotalNode(
  parent: XMLBuilder,
  total: LegalMonetaryTotal,
  currency: string,
): void {
  const node = parent.ele(NS.CAC, "LegalMonetaryTotal");
  node.ele(NS.CBC, "LineExtensionAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.lineExtensionAmount));
  node.ele(NS.CBC, "TaxExclusiveAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.taxExclusiveAmount));
  node.ele(NS.CBC, "TaxInclusiveAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.taxInclusiveAmount));
  node.ele(NS.CBC, "AllowanceTotalAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.allowanceTotalAmount));
  node.ele(NS.CBC, "ChargeTotalAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.chargeTotalAmount));
  node.ele(NS.CBC, "PrepaidAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.prepaidAmount));
  node.ele(NS.CBC, "PayableAmount")
    .att("currencyID", currency)
    .txt(formatAmount(total.payableAmount));
}

/**
 * Adds a line item element (InvoiceLine, CreditNoteLine, or DebitNoteLine) to the XML.
 * Includes ID, quantity, line extension amount, allowance/charges, tax totals,
 * item description, and price information.
 *
 * @param parent - Parent XML builder node to append the line element to
 * @param line - Invoice line data with quantity, price, taxes, and description
 * @param currency - ISO 4217 currency code for amount attributes
 * @param lineTag - Element name ("InvoiceLine", "CreditNoteLine", or "DebitNoteLine")
 * @param quantityTag - Quantity element name ("InvoicedQuantity", "CreditedQuantity", etc.)
 */
function addLineNode(
  parent: XMLBuilder,
  line: InvoiceLine,
  currency: string,
  lineTag: string,
  quantityTag: string,
): void {
  const node = parent.ele(NS.CAC, lineTag);
  node.ele(NS.CBC, "ID").txt(line.id);
  node.ele(NS.CBC, quantityTag)
    .att("unitCode", line.unitCode ?? "EA")
    .txt(String(line.quantity));
  node.ele(NS.CBC, "LineExtensionAmount")
    .att("currencyID", currency)
    .txt(formatAmount(line.lineExtensionAmount));

  if (line.allowanceCharges) {
    for (const ac of line.allowanceCharges) {
      addAllowanceChargeNode(node, ac, currency);
    }
  }

  for (const tax of line.taxTotals) {
    addTaxTotalNode(node, tax, currency);
  }

  // Item
  const item = node.ele(NS.CAC, "Item");
  item.ele(NS.CBC, "Description").txt(line.description);

  // Price
  const price = node.ele(NS.CAC, "Price");
  price.ele(NS.CBC, "PriceAmount")
    .att("currencyID", currency)
    .txt(formatAmount(line.price));
  price.ele(NS.CBC, "BaseQuantity")
    .att("unitCode", line.unitCode ?? "EA")
    .txt("1.00");
}

/**
 * Adds a CAC:PaymentMeans element with payment form, method, due date, and payment ID.
 *
 * @param parent - Parent XML builder node to append the PaymentMeans element to
 * @param pm - Payment means data with form, method, and optional due date
 */
function addPaymentMeansNode(parent: XMLBuilder, pm: PaymentMeans): void {
  const node = parent.ele(NS.CAC, "PaymentMeans");
  node.ele(NS.CBC, "ID").txt(pm.paymentForm);
  node.ele(NS.CBC, "PaymentMeansCode").txt(pm.paymentMethod);
  if (pm.dueDate) {
    node.ele(NS.CBC, "PaymentDueDate").txt(formatDate(pm.dueDate));
  }
  if (pm.paymentId) {
    node.ele(NS.CBC, "PaymentID").txt(pm.paymentId);
  }
}

/**
 * Adds the DIAN-specific UBLExtension content including InvoiceControl,
 * InvoiceSource, SoftwareProvider, SoftwareSecurityCode,
 * AuthorizationProvider, and QRCode elements.
 *
 * @param extensionContent - ExtensionContent XML builder node for the first UBLExtension
 * @param doc - Complete DIAN document data
 * @param softwareSecurityCode - Pre-computed SHA-384 software security code
 * @param uuid - Pre-computed CUFE or CUDE hash for the document
 */
function addDianExtensions(
  extensionContent: XMLBuilder,
  doc: DianDocument,
  softwareSecurityCode: string,
  uuid: string,
): void {
  const dianExt = extensionContent.ele(NS.STS, "DianExtensions");

  // InvoiceControl
  const control = dianExt.ele(NS.STS, "InvoiceControl");
  control.ele(NS.STS, "InvoiceAuthorization").txt(doc.numbering.authorizationNumber);

  const period = control.ele(NS.STS, "AuthorizationPeriod");
  period.ele(NS.CBC, "StartDate").txt(formatDate(doc.numbering.startDate));
  period.ele(NS.CBC, "EndDate").txt(formatDate(doc.numbering.endDate));

  const authRange = control.ele(NS.STS, "AuthorizedInvoices");
  authRange.ele(NS.STS, "Prefix").txt(doc.numbering.prefix);
  authRange.ele(NS.STS, "From").txt(String(doc.numbering.startNumber));
  authRange.ele(NS.STS, "To").txt(String(doc.numbering.endNumber));

  // InvoiceSource
  const source = dianExt.ele(NS.STS, "InvoiceSource");
  source.ele(NS.CBC, "IdentificationCode")
    .att("listAgencyID", "6")
    .att("listAgencyName", "United Nations Economic Commission for Europe")
    .att("listSchemeURI", "urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.1")
    .txt("CO");

  // SoftwareProvider
  const provider = dianExt.ele(NS.STS, "SoftwareProvider");
  provider.ele(NS.STS, "ProviderID")
    .att("schemeAgencyID", "195")
    .att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)")
    .att("schemeID", "")
    .att("schemeName", "31")
    .txt(doc.software.providerNit);
  provider.ele(NS.STS, "SoftwareID")
    .att("schemeAgencyID", "195")
    .att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)")
    .txt(doc.software.id);

  // SoftwareSecurityCode
  dianExt.ele(NS.STS, "SoftwareSecurityCode")
    .att("schemeAgencyID", "195")
    .att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)")
    .txt(softwareSecurityCode);

  // AuthorizationProvider
  const authProvider = dianExt.ele(NS.STS, "AuthorizationProvider");
  authProvider.ele(NS.STS, "AuthorizationProviderID")
    .att("schemeAgencyID", "195")
    .att("schemeAgencyName", "CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)")
    .att("schemeID", "4")
    .att("schemeName", "31")
    .txt("800197268");

  // QRCode
  dianExt.ele(NS.STS, "QRCode").txt(buildQRCode(doc, uuid));
}

/**
 * Builds the QR code content string for the DIAN electronic document.
 * Includes document number, dates, party NITs, tax amounts, total, and CUFE/CUDE,
 * followed by the DIAN catalog verification URL.
 *
 * @param doc - Complete DIAN document data
 * @param uuid - Pre-computed CUFE or CUDE hash
 * @returns Multi-line string formatted for QR code generation
 */
function buildQRCode(doc: DianDocument, uuid: string): string {
  const lines = [
    `NumFac: ${doc.id}`,
    `FecFac: ${formatDate(doc.issueDate)}`,
    `HorFac: ${formatTime(doc.issueTime)}`,
    `NitFac: ${doc.supplier.identification.number}`,
    `DocAdq: ${doc.customer.identification.number}`,
    `ValFac: ${formatAmount(doc.legalMonetaryTotal.lineExtensionAmount)}`,
    `ValIva: ${formatAmount(getTaxAmount(doc, TaxCode.IVA))}`,
    `ValOtroIm: ${formatAmount(getTaxAmount(doc, TaxCode.INC) + getTaxAmount(doc, TaxCode.ICA))}`,
    `ValTotFac: ${formatAmount(doc.legalMonetaryTotal.payableAmount)}`,
    `CUFE: ${uuid}`,
    `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${uuid}`,
  ];
  return lines.join("\n");
}

/**
 * Extracts the tax amount for a specific tax code from the document's tax totals.
 * Searches through all tax total subtotals and returns the first matching amount.
 *
 * @param doc - Complete DIAN document data
 * @param taxCode - DIAN tax code to search for (e.g., "01" for IVA)
 * @returns Tax amount for the specified code, or 0 if not found
 */
function getTaxAmount(doc: DianDocument, taxCode: string): number {
  for (const tt of doc.taxTotals) {
    for (const sub of tt.subtotals) {
      if (sub.taxScheme.code === taxCode) {
        return sub.taxAmount;
      }
    }
  }
  return 0;
}

/**
 * Result of building a DIAN UBL 2.1 XML document.
 * Contains the generated XML string and the associated CUFE/CUDE identifier.
 */
export interface BuildXmlResult {
  /** Complete UBL 2.1 XML string ready for XAdES signing */
  xml: string;
  /** CUFE or CUDE hash identifier embedded in the document */
  uuid: string;
}

/**
 * Builds the core UBL 2.1 XML structure shared by all DIAN document types
 * (Invoice, CreditNote, DebitNote). This is the internal implementation
 * used by the public buildInvoiceXml, buildCreditNoteXml, and buildDebitNoteXml functions.
 *
 * Generates the complete XML tree including: UBLExtensions (DianExtensions + signature placeholder),
 * document metadata, parties, payment means, tax totals, monetary totals, and line items.
 *
 * @param doc - Validated DianDocument with all document data
 * @param uuid - Pre-computed CUFE or CUDE hash identifier
 * @param softwareSecurityCode - Pre-computed SHA-384 software security code
 * @returns Pretty-printed UBL 2.1 XML string
 */
function buildDocumentXml(
  doc: DianDocument,
  uuid: string,
  softwareSecurityCode: string,
): string {
  const config = getDocumentConfig(doc.documentType);

  const root = create({ version: "1.0", encoding: "UTF-8", standalone: false })
    .ele(config.ns, config.rootName);

  // Namespace declarations
  root.att("xmlns:cac", NS.CAC);
  root.att("xmlns:cbc", NS.CBC);
  root.att("xmlns:ext", NS.EXT);
  root.att("xmlns:sts", NS.STS);
  root.att("xmlns:ds", NS.DS);
  root.att("xmlns:xades", NS.XADES);
  root.att("xmlns:xsi", NS.XSI);
  root.att("xsi:schemaLocation", config.schemaLocation);

  // 1. UBLExtensions
  const extensions = root.ele(NS.EXT, "UBLExtensions");

  // Extension 1: DianExtensions
  const ext1 = extensions.ele(NS.EXT, "UBLExtension");
  const extContent1 = ext1.ele(NS.EXT, "ExtensionContent");
  addDianExtensions(extContent1, doc, softwareSecurityCode, uuid);

  // Extension 2: placeholder for digital signature (XAdES-BES)
  const ext2 = extensions.ele(NS.EXT, "UBLExtension");
  const extContent2 = ext2.ele(NS.EXT, "ExtensionContent");
  extContent2.com("FIRMA DIGITAL XAdES-BES AQUÍ");

  // 2. UBLVersionID
  root.ele(NS.CBC, "UBLVersionID").txt(UBL_VERSION);

  // 3. CustomizationID — operation type
  root.ele(NS.CBC, "CustomizationID").txt(doc.operationType);

  // 4. ProfileID
  root.ele(NS.CBC, "ProfileID").txt(profileIdForDocumentType(doc.documentType));

  // 5. ProfileExecutionID — environment
  root.ele(NS.CBC, "ProfileExecutionID").txt(doc.environment);

  // 6. ID — document number
  root.ele(NS.CBC, "ID").txt(doc.id);

  // 7. UUID — CUFE or CUDE
  const uuidSchemeName = doc.documentType === DocumentType.FACTURA_VENTA
    ? "CUFE-SHA384"
    : "CUDE-SHA384";
  root.ele(NS.CBC, "UUID")
    .att("schemeID", doc.environment)
    .att("schemeName", uuidSchemeName)
    .txt(uuid);

  // 8. IssueDate
  root.ele(NS.CBC, "IssueDate").txt(formatDate(doc.issueDate));

  // 9. IssueTime
  root.ele(NS.CBC, "IssueTime").txt(formatTime(doc.issueTime));

  // 10. Document type code (InvoiceTypeCode / CreditNoteTypeCode / DebitNoteTypeCode)
  root.ele(NS.CBC, config.typeCodeTag).txt(doc.documentType);

  // 11. Notes
  if (doc.notes) {
    for (const note of doc.notes) {
      root.ele(NS.CBC, "Note").txt(note);
    }
  }

  // 12. DocumentCurrencyCode
  root.ele(NS.CBC, "DocumentCurrencyCode").txt(doc.currency);

  // 13. LineCountNumeric
  root.ele(NS.CBC, "LineCountNumeric").txt(String(doc.lines.length));

  // 14. InvoicePeriod
  if (doc.period) {
    const periodNode = root.ele(NS.CAC, "InvoicePeriod");
    periodNode.ele(NS.CBC, "StartDate").txt(formatDate(doc.period.startDate));
    periodNode.ele(NS.CBC, "EndDate").txt(formatDate(doc.period.endDate));
  }

  // 15. DiscrepancyResponse (for credit/debit notes)
  if (doc.discrepancyResponse) {
    const discrepancy = root.ele(NS.CAC, "DiscrepancyResponse");
    discrepancy.ele(NS.CBC, "ReferenceID").txt(doc.discrepancyResponse.referenceId);
    discrepancy.ele(NS.CBC, "ResponseCode").txt(doc.discrepancyResponse.responseCode);
    discrepancy.ele(NS.CBC, "Description").txt(doc.discrepancyResponse.description);
  }

  // 16. BillingReference (for credit/debit notes)
  if (doc.billingReference) {
    const billingRef = root.ele(NS.CAC, "BillingReference");
    const invoiceRef = billingRef.ele(NS.CAC, "InvoiceDocumentReference");
    invoiceRef.ele(NS.CBC, "ID").txt(doc.billingReference.id);
    invoiceRef.ele(NS.CBC, "UUID")
      .att("schemeName", "CUFE-SHA384")
      .txt(doc.billingReference.uuid);
    invoiceRef.ele(NS.CBC, "IssueDate").txt(formatDate(doc.billingReference.issueDate));
  }

  // 17. AccountingSupplierParty
  addPartyNode(root, "AccountingSupplierParty", doc.supplier);

  // 18. AccountingCustomerParty
  addPartyNode(root, "AccountingCustomerParty", doc.customer);

  // 19. PaymentMeans
  addPaymentMeansNode(root, doc.paymentMeans);

  // 20. AllowanceCharge (document level)
  // (handled in lines for now)

  // 21. TaxTotal
  for (const taxTotal of doc.taxTotals) {
    addTaxTotalNode(root, taxTotal, doc.currency);
  }

  // 22. LegalMonetaryTotal
  addMonetaryTotalNode(root, doc.legalMonetaryTotal, doc.currency);

  // 23. Lines (InvoiceLine / CreditNoteLine / DebitNoteLine)
  for (const line of doc.lines) {
    addLineNode(root, line, doc.currency, config.lineTag, config.quantityTag);
  }

  return root.end({ prettyPrint: true, indent: "  " });
}

/**
 * Builds a complete UBL 2.1 Invoice XML for DIAN electronic invoicing.
 * Supports Invoice (type "01") and POS (type "20") documents.
 *
 * The UUID (CUFE/CUDE) and SoftwareSecurityCode must be pre-computed
 * and passed in -- this builder only handles XML structure generation.
 *
 * @param doc - Validated DianDocument with all invoice data
 * @param uuid - Pre-computed CUFE or CUDE hash identifier
 * @param softwareSecurityCode - Pre-computed SHA-384 software security code
 * @returns Complete UBL 2.1 XML string ready for XAdES-EPES signing
 *
 * @example
 * ```typescript
 * const xml = buildInvoiceXml(document, cufe, securityCode);
 * ```
 */
export function buildInvoiceXml(
  doc: DianDocument,
  uuid: string,
  softwareSecurityCode: string,
): string {
  return buildDocumentXml(doc, uuid, softwareSecurityCode);
}

/**
 * Builds a complete UBL 2.1 CreditNote XML for DIAN (type "91" or "94").
 *
 * Generates a `<CreditNote>` root with correct namespace, `CreditNoteLine`,
 * `CreditedQuantity`, and `CreditNoteTypeCode` elements.
 *
 * The UUID (CUDE) and SoftwareSecurityCode must be pre-computed
 * and passed in -- this builder only handles XML structure generation.
 *
 * @param doc - Validated DianDocument with credit note data
 * @param uuid - Pre-computed CUDE hash identifier
 * @param softwareSecurityCode - Pre-computed SHA-384 software security code
 * @returns Complete UBL 2.1 CreditNote XML string ready for XAdES-EPES signing
 *
 * @example
 * ```typescript
 * const xml = buildCreditNoteXml(creditNoteDoc, cude, securityCode);
 * ```
 */
export function buildCreditNoteXml(
  doc: DianDocument,
  uuid: string,
  softwareSecurityCode: string,
): string {
  return buildDocumentXml(doc, uuid, softwareSecurityCode);
}

/**
 * Builds a complete UBL 2.1 DebitNote XML for DIAN (type "92" or "93").
 *
 * Generates a `<DebitNote>` root with correct namespace, `DebitNoteLine`,
 * `DebitedQuantity`, and `DebitNoteTypeCode` elements.
 *
 * The UUID (CUDE) and SoftwareSecurityCode must be pre-computed
 * and passed in -- this builder only handles XML structure generation.
 *
 * @param doc - Validated DianDocument with debit note data
 * @param uuid - Pre-computed CUDE hash identifier
 * @param softwareSecurityCode - Pre-computed SHA-384 software security code
 * @returns Complete UBL 2.1 DebitNote XML string ready for XAdES-EPES signing
 *
 * @example
 * ```typescript
 * const xml = buildDebitNoteXml(debitNoteDoc, cude, securityCode);
 * ```
 */
export function buildDebitNoteXml(
  doc: DianDocument,
  uuid: string,
  softwareSecurityCode: string,
): string {
  return buildDocumentXml(doc, uuid, softwareSecurityCode);
}
