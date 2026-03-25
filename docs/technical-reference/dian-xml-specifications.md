# Especificaciones Técnicas XML — Facturación Electrónica DIAN Colombia

> **Fuentes**: Anexo Técnico FE v1.9 (Resolución 000165/2023), Anexo Técnico DE v1.0/1.3,
> Resolución 000042/2020, Resolución 000012/2021, Resolución 000008/2024.
>
> **Estándar base**: UBL 2.1 (OASIS Universal Business Language)

---

## 1. Namespaces XML Requeridos (UBL 2.1 — Validación Previa)

Todos deben declararse en el **elemento raíz** (`<Invoice>`). La DIAN valida que `sts`
esté en la raíz y no en nodos hijos.

| Prefijo | URI | Uso |
|---------|-----|-----|
| *(default)* | `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2` | Elemento raíz Invoice |
| `cac` | `urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2` | Componentes agregados UBL |
| `cbc` | `urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2` | Componentes básicos UBL |
| `ext` | `urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2` | Extensiones UBL |
| `sts` | `dian:gov:co:facturaelectronica:Structures-2-1` | Extensiones DIAN (DianExtensions) |
| `ds` | `http://www.w3.org/2000/09/xmldsig#` | Firma digital XML |
| `xades` | `http://uri.etsi.org/01903/v1.3.2#` | XAdES firma cualificada |
| `xades141` | `http://uri.etsi.org/01903/v1.4.1#` | XAdES v1.4.1 |
| `xsi` | `http://www.w3.org/2001/XMLSchema-instance` | Instancia de schema XML |

### Nota sobre CreditNote / DebitNote

Para Notas Crédito y Débito, el namespace default cambia:

| Documento | Namespace default |
|-----------|-------------------|
| Factura / Doc. Equivalente POS | `urn:oasis:names:specification:ubl:schema:xsd:Invoice-2` |
| Nota Crédito | `urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2` |
| Nota Débito | `urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2` |

### XSD Schemas (OASIS UBL 2.1)

```
http://docs.oasis-open.org/ubl/os-UBL-2.1/xsdrt/maindoc/UBL-Invoice-2.1.xsd
http://docs.oasis-open.org/ubl/os-UBL-2.1/xsdrt/maindoc/UBL-CreditNote-2.1.xsd
http://docs.oasis-open.org/ubl/os-UBL-2.1/xsdrt/maindoc/UBL-DebitNote-2.1.xsd
```

---

## 2. Estructura XML Raíz — Factura Electrónica de Venta (tipo 01)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
         xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
         xmlns:xades141="http://uri.etsi.org/01903/v1.4.1#"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2
           http://docs.oasis-open.org/ubl/os-UBL-2.1/xsdrt/maindoc/UBL-Invoice-2.1.xsd">

  <!-- 1. Extensiones UBL (DianExtensions + Firma Digital) -->
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sts:DianExtensions>
          <sts:InvoiceControl>
            <sts:InvoiceAuthorization>NÚMERO_RESOLUCIÓN</sts:InvoiceAuthorization>
            <sts:AuthorizationPeriod>
              <cbc:StartDate>2024-01-01</cbc:StartDate>
              <cbc:EndDate>2025-12-31</cbc:EndDate>
            </sts:AuthorizationPeriod>
            <sts:AuthorizedInvoices>
              <sts:Prefix>SETT</sts:Prefix>
              <sts:From>1</sts:From>
              <sts:To>5000000</sts:To>
            </sts:AuthorizedInvoices>
          </sts:InvoiceControl>
          <sts:InvoiceSource>
            <cbc:IdentificationCode listAgencyID="6"
              listAgencyName="United Nations Economic Commission for Europe"
              listSchemeURI="urn:oasis:names:specification:ubl:codelist:gc:CountryIdentificationCode-2.0"
            >CO</cbc:IdentificationCode>
          </sts:InvoiceSource>
          <sts:SoftwareProvider>
            <sts:ProviderID schemeAgencyID="195"
              schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
            >NIT_PROVEEDOR</sts:ProviderID>
            <sts:SoftwareID schemeAgencyID="195"
              schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
            >UUID_SOFTWARE</sts:SoftwareID>
          </sts:SoftwareProvider>
          <sts:SoftwareSecurityCode schemeAgencyID="195"
            schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
          >HASH_SHA384</sts:SoftwareSecurityCode>
          <sts:AuthorizationProvider>
            <sts:AuthorizationProviderID schemeAgencyID="195"
              schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
            >800197268</sts:AuthorizationProviderID>
          </sts:AuthorizationProvider>
          <sts:QRCode>URL_QR</sts:QRCode>
        </sts:DianExtensions>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <!-- Firma digital XAdES-BES va aquí (ds:Signature) -->
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>

  <!-- 2. Metadatos del documento -->
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1: Factura Electrónica de Venta</cbc:ProfileID>
  <cbc:ProfileExecutionID>2</cbc:ProfileExecutionID> <!-- 1=Producción, 2=Habilitación -->
  <cbc:ID>SETT1</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384"
    schemeID="2">HASH_CUFE_96_CARACTERES</cbc:UUID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:IssueTime>10:30:00-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:Note>Texto libre de observaciones</cbc:Note>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>

  <!-- 3. Período de facturación (opcional) -->
  <cac:InvoicePeriod>
    <cbc:StartDate>2024-01-01</cbc:StartDate>
    <cbc:EndDate>2024-01-31</cbc:EndDate>
  </cac:InvoicePeriod>

  <!-- 4. Emisor (Obligatorio) -->
  <cac:AccountingSupplierParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID> <!-- 1=Persona Jurídica, 2=Persona Natural -->
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>EMPRESA EJEMPLO S.A.S.</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>11001</cbc:ID> <!-- Código DANE municipio -->
          <cbc:CityName>Bogotá</cbc:CityName>
          <cbc:PostalZone>110111</cbc:PostalZone>
          <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>Calle 100 # 10-20</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
            <cbc:Name languageID="es">Colombia</cbc:Name>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>EMPRESA EJEMPLO S.A.S.</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
          schemeID="3" <!-- DV (dígito verificación) -->
          schemeName="31" <!-- 31=NIT -->
        >900123456</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">O-99</cbc:TaxLevelCode> <!-- Responsabilidad fiscal -->
        <cac:RegistrationAddress>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>Bogotá</cbc:CityName>
          <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>Calle 100 # 10-20</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>EMPRESA EJEMPLO S.A.S.</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
          schemeID="3" schemeName="31"
        >900123456</cbc:CompanyID>
        <cac:CorporateRegistrationScheme>
          <cbc:ID>SETT</cbc:ID> <!-- Prefijo de numeración -->
        </cac:CorporateRegistrationScheme>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>facturacion@empresa.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- 5. Adquirente (Obligatorio en factura, opcional en POS) -->
  <cac:AccountingCustomerParty>
    <cbc:AdditionalAccountID>1</cbc:AdditionalAccountID>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>CLIENTE EJEMPLO</cbc:Name>
      </cac:PartyName>
      <cac:PhysicalLocation>
        <cac:Address>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>Bogotá</cbc:CityName>
          <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>Carrera 7 # 50-10</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:Address>
      </cac:PhysicalLocation>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>CLIENTE EJEMPLO</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
          schemeID="1" schemeName="13" <!-- 13=Cédula -->
        >1234567890</cbc:CompanyID>
        <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
        <cac:RegistrationAddress>
          <cbc:ID>11001</cbc:ID>
          <cbc:CityName>Bogotá</cbc:CityName>
          <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
          <cac:AddressLine>
            <cbc:Line>Carrera 7 # 50-10</cbc:Line>
          </cac:AddressLine>
          <cac:Country>
            <cbc:IdentificationCode>CO</cbc:IdentificationCode>
          </cac:Country>
        </cac:RegistrationAddress>
        <cac:TaxScheme>
          <cbc:ID>ZZ</cbc:ID>
          <cbc:Name>No aplica</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>CLIENTE EJEMPLO</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195"
          schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
          schemeID="1" schemeName="13"
        >1234567890</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>cliente@ejemplo.com</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- 6. Medio de pago -->
  <cac:PaymentMeans>
    <cbc:ID>1</cbc:ID>
    <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode> <!-- 10=Efectivo, 47=Transferencia, etc. -->
    <cbc:PaymentDueDate>2024-02-15</cbc:PaymentDueDate>
    <cbc:PaymentID>1</cbc:PaymentID>
  </cac:PaymentMeans>

  <!-- 7. Totales de impuestos -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
    <cbc:RoundingAmount currencyID="COP">0.00</cbc:RoundingAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:Percent>19.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>01</cbc:ID>
          <cbc:Name>IVA</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- 8. Totales monetarios -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">100000.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">119000.00</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="COP">0.00</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="COP">0.00</cbc:ChargeTotalAmount>
    <cbc:PayableAmount currencyID="COP">119000.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- 9. Líneas de factura -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1.000000</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">100000.00</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="COP">0.00</cbc:RoundingAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="COP">100000.00</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="COP">19000.00</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:Percent>19.00</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>01</cbc:ID>
            <cbc:Name>IVA</cbc:Name>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Description>Servicio de consultoría</cbc:Description>
      <cac:StandardItemIdentification>
        <cbc:ID schemeID="999"
          schemeName="Estándar de adopción del contribuyente"
        >SRV001</cbc:ID>
      </cac:StandardItemIdentification>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">100000.00</cbc:PriceAmount>
      <cbc:BaseQuantity unitCode="EA">1.000000</cbc:BaseQuantity>
    </cac:Price>
  </cac:InvoiceLine>

</Invoice>
```

---

## 3. Códigos de Tipo de Documento (InvoiceTypeCode)

### Factura y Notas

| Código | Documento | Elemento raíz | UUID |
|--------|-----------|---------------|------|
| `01` | Factura Electrónica de Venta | `<Invoice>` | CUFE |
| `02` | Factura de exportación | `<Invoice>` | CUFE |
| `03` | Factura de contingencia | `<Invoice>` | CUFE |
| `91` | Nota Crédito | `<CreditNote>` | CUDE |
| `92` | Nota Débito | `<DebitNote>` | CUDE |

### Documentos Equivalentes Electrónicos

| Código | Documento | Elemento raíz | UUID |
|--------|-----------|---------------|------|
| `20` | Tiquete de máquina registradora con sistema P.O.S. | `<Invoice>` | CUDE |
| `25` | Boleta de ingreso a cine | `<Invoice>` | CUDE |
| `27` | Boleta de ingreso a espectáculos públicos | `<Invoice>` | CUDE |
| `30` | Documento en juegos localizados | `<Invoice>` | CUDE |
| `32` | Documento en juegos de suerte y azar | `<Invoice>` | CUDE |
| `35` | Tiquete de transporte de pasajeros terrestre | `<Invoice>` | CUDE |
| `40` | Documento expedido para cobro de peajes | `<Invoice>` | CUDE |
| `45` | Extracto expedido por sociedades financieras | `<Invoice>` | CUDE |
| `50` | Tiquete de billete de transporte aéreo | `<Invoice>` | CUDE |
| `55` | Documento de operación de bolsa de valores | `<Invoice>` | CUDE |
| `60` | Documento para servicios públicos y domiciliarios | `<Invoice>` | CUDE |

### Notas de Ajuste a Documentos Equivalentes

| Código | Documento | Elemento raíz | UUID |
|--------|-----------|---------------|------|
| `93` | Nota de ajuste débito al documento equivalente | `<DebitNote>` | CUDE |
| `94` | Nota de ajuste crédito al documento equivalente | `<CreditNote>` | CUDE |

### Contingencias de Documentos Equivalentes

| Código | Descripción |
|--------|-------------|
| `07` | Contingencia documentos equivalentes (modo facturador) |
| `08` | Contingencia documentos equivalentes (modo proveedor tecnológico) |

---

## 4. Diferencias: Factura (01) vs POS Electrónico (20)

| Aspecto | Factura (01) | POS Electrónico (20) |
|---------|-------------|---------------------|
| **Código de tipo** | `InvoiceTypeCode = 01` | `InvoiceTypeCode = 20` |
| **UUID** | CUFE (usa `ClTec`) | CUDE (usa `PIN`) |
| **schemeName del UUID** | `CUFE-SHA384` | `CUDE-SHA384` |
| **ProfileID** | `DIAN 2.1: Factura Electrónica de Venta` | `DIAN 2.1: documento equivalente electrónico del tiquete de máquina registradora con sistema P.O.S.` |
| **Dato adquirente** | **Obligatorio** | **Opcional** (puede ser consumidor final) |
| **Numeración** | Resolución de facturación | Resolución de documento equivalente |
| **CustomizationID** | `10` (estándar) | `10` (estándar) |
| **Derecho tributario** | Siempre aplica | Solo aplica si se identifica al comprador |
| **Elemento raíz** | `<Invoice>` | `<Invoice>` (misma estructura) |

### Campos opcionales en POS que son obligatorios en Factura

En el documento equivalente POS (tipo 20), los siguientes campos del `AccountingCustomerParty`
pueden usar los datos de **consumidor final**:

- `cbc:CompanyID` → Se puede usar `222222222222`
- `cbc:RegistrationName` → `"Consumidor Final"`
- Dirección → Se puede omitir o usar datos genéricos
- Contacto (email) → Se puede omitir

---

## 5. Consumidor Final — Representación XML

Cuando el comprador no suministra datos de identificación (ventas retail, puerta a puerta):

```xml
<cac:AccountingCustomerParty>
  <cbc:AdditionalAccountID>2</cbc:AdditionalAccountID> <!-- 2=Persona Natural -->
  <cac:Party>
    <cac:PartyName>
      <cbc:Name>Consumidor Final</cbc:Name>
    </cac:PartyName>
    <cac:PhysicalLocation>
      <cac:Address>
        <cbc:ID>11001</cbc:ID>
        <cbc:CityName>Bogotá</cbc:CityName>
        <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
        <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
        <cac:AddressLine>
          <cbc:Line>Consumidor Final</cbc:Line>
        </cac:AddressLine>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:Address>
    </cac:PhysicalLocation>
    <cac:PartyTaxScheme>
      <cbc:RegistrationName>Consumidor Final</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195"
        schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
        schemeID="1"
        schemeName="13">222222222222</cbc:CompanyID>
      <cbc:TaxLevelCode listName="48">R-99-PN</cbc:TaxLevelCode>
      <cac:RegistrationAddress>
        <cbc:ID>11001</cbc:ID>
        <cbc:CityName>Bogotá</cbc:CityName>
        <cbc:CountrySubentity>Bogotá</cbc:CountrySubentity>
        <cbc:CountrySubentityCode>11</cbc:CountrySubentityCode>
        <cac:AddressLine>
          <cbc:Line>Consumidor Final</cbc:Line>
        </cac:AddressLine>
        <cac:Country>
          <cbc:IdentificationCode>CO</cbc:IdentificationCode>
        </cac:Country>
      </cac:RegistrationAddress>
      <cac:TaxScheme>
        <cbc:ID>ZZ</cbc:ID>
        <cbc:Name>No aplica</cbc:Name>
      </cac:TaxScheme>
    </cac:PartyTaxScheme>
    <cac:PartyLegalEntity>
      <cbc:RegistrationName>Consumidor Final</cbc:RegistrationName>
      <cbc:CompanyID schemeAgencyID="195"
        schemeAgencyName="CO, DIAN (Direccion de Impuestos y Aduanas Nacionales)"
        schemeID="1"
        schemeName="13">222222222222</cbc:CompanyID>
    </cac:PartyLegalEntity>
  </cac:Party>
</cac:AccountingCustomerParty>
```

**Base legal**: Oficio DIAN 43 de 2022 y Art. 11 Resolución 000042/2020.

---

## 6. Cálculo CUFE y CUDE (SHA-384)

### 6.1 Fórmula General

Ambos códigos usan SHA-384 sobre una cadena concatenada de campos. El resultado es un
hash hexadecimal de **96 caracteres** (384 bits / 4 = 96 hex chars), siempre en **minúsculas**.

```
HASH = SHA384(campo1 + campo2 + ... + campoN).toLowerCase()
```

### 6.2 Campos de la Cadena

| # | Variable | Descripción | Formato | Ejemplo |
|---|----------|-------------|---------|---------|
| 1 | `NumFac` | Número de factura (con prefijo) | String | `SETT1` |
| 2 | `FecFac` | Fecha de factura | `YYYY-MM-DD` | `2024-01-15` |
| 3 | `HorFac` | Hora de factura | `HH:MM:SS-05:00` | `10:30:00-05:00` |
| 4 | `ValFac` | Valor antes de impuestos | Decimal `.2f` | `100000.00` |
| 5 | `CodImp1` | Código impuesto 1 (IVA) | `01` | `01` |
| 6 | `ValImp1` | Valor IVA | Decimal `.2f` | `19000.00` |
| 7 | `CodImp2` | Código impuesto 2 (INC) | `04` | `04` |
| 8 | `ValImp2` | Valor INC | Decimal `.2f` | `0.00` |
| 9 | `CodImp3` | Código impuesto 3 (ICA) | `03` | `03` |
| 10 | `ValImp3` | Valor ICA | Decimal `.2f` | `0.00` |
| 11 | `ValTot` | Valor total (con impuestos) | Decimal `.2f` | `119000.00` |
| 12 | `NitOFE` | NIT del emisor (sin DV) | String | `900123456` |
| 13 | `NumAdq` | Número identificación comprador | String | `1234567890` |
| 14 | **ClTec/PIN** | **Ver diferencia abajo** | String | (ver tabla) |
| 15 | `TipoAmb` | Tipo de ambiente | `1` o `2` | `2` |

### 6.3 Diferencia Clave: CUFE vs CUDE

| | CUFE (Factura 01) | CUDE (POS 20, NC 91, ND 92, etc.) |
|---|---|---|
| **Campo 14** | `ClTec` = Clave Técnica | `PIN` = PIN del software |
| **Origen del valor** | Lo asigna la DIAN al autorizar el **rango de numeración** (resolución de facturación) | Lo asigna el usuario al registrar el **software** en la DIAN |
| **schemeName en UUID** | `CUFE-SHA384` | `CUDE-SHA384` |
| **schemeID en UUID** | `1` (ambiente producción) o `2` (habilitación) | `1` o `2` |

### 6.4 Ejemplo de Cálculo

```
Cadena para CUFE:
SETT12024-01-1510:30:00-05:00100000.000119000.00040.00030.00119000.009001234561234567890fc8eac422eba16e22ffd8c6f94b3f9c6e2021

SHA384(cadena) → resultado en hexadecimal lowercase (96 chars)
```

### 6.5 Implementación TypeScript

```typescript
import { createHash } from "node:crypto";

interface CufeInput {
  numFac: string;      // "SETT1"
  fecFac: string;      // "2024-01-15"
  horFac: string;      // "10:30:00-05:00"
  valFac: string;      // "100000.00"
  codImp1: string;     // "01" (IVA)
  valImp1: string;     // "19000.00"
  codImp2: string;     // "04" (INC)
  valImp2: string;     // "0.00"
  codImp3: string;     // "03" (ICA)
  valImp3: string;     // "0.00"
  valTot: string;      // "119000.00"
  nitOFE: string;      // "900123456"
  numAdq: string;      // "1234567890"
  clTecOrPin: string;  // Clave Técnica (CUFE) o PIN (CUDE)
  tipoAmb: string;     // "1" o "2"
}

function computeCufe(input: CufeInput): string {
  const source = [
    input.numFac, input.fecFac, input.horFac, input.valFac,
    input.codImp1, input.valImp1, input.codImp2, input.valImp2,
    input.codImp3, input.valImp3, input.valTot, input.nitOFE,
    input.numAdq, input.clTecOrPin, input.tipoAmb,
  ].join("");

  return createHash("sha384").update(source, "utf8").digest("hex");
}
```

---

## 7. SoftwareSecurityCode

El código de seguridad del software se calcula así:

```
SoftwareSecurityCode = SHA384(SoftwareID + PIN + NumFac)
```

| Campo | Descripción |
|-------|-------------|
| `SoftwareID` | UUID del software registrado en DIAN (ej. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`) |
| `PIN` | PIN del software asignado por el usuario en la DIAN |
| `NumFac` | Número de la factura actual (con prefijo) |

```typescript
function computeSoftwareSecurityCode(
  softwareId: string,
  pin: string,
  numFac: string
): string {
  const source = softwareId + pin + numFac;
  return createHash("sha384").update(source, "utf8").digest("hex");
}
```

---

## 8. Códigos de Impuestos / Tributos

### Impuestos (Trasladados al comprador)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `01` | IVA | Impuesto al Valor Agregado (19%, 5%, 0%) |
| `02` | IC | Impuesto al Consumo (legacy/departamental) |
| `03` | ICA | Impuesto de Industria, Comercio y Avisos |
| `04` | INC | Impuesto Nacional al Consumo (8%) |
| `ZZ` | No aplica | Para adquirentes no responsables |

### Retenciones (Deducidas al proveedor)

| Código | Nombre | Descripción |
|--------|--------|-------------|
| `05` | ReteICA | Retención ICA |
| `06` | ReteIVA | Retención IVA |
| `07` | ReteFuente | Retención en la fuente |

### Tarifas IVA Vigentes

| Tarifa | Aplicación |
|--------|------------|
| 19% | Tarifa general |
| 5% | Tarifa reducida (canasta familiar, algunos servicios) |
| 0% | Exentos (exportaciones, ciertos bienes) |

---

## 9. Tipos de Identificación (schemeName en CompanyID)

| Código | Tipo |
|--------|------|
| `11` | Registro civil |
| `12` | Tarjeta de identidad |
| `13` | Cédula de ciudadanía |
| `21` | Tarjeta de extranjería |
| `22` | Cédula de extranjería |
| `31` | NIT |
| `41` | Pasaporte |
| `42` | Documento de identificación extranjero |
| `47` | PEP (Permiso Especial de Permanencia) |
| `50` | NIT de otro país |
| `91` | NUIP |

---

## 10. Valores Clave del XML

### ProfileID por Tipo de Documento

| Tipo | ProfileID |
|------|-----------|
| Factura (01) | `DIAN 2.1: Factura Electrónica de Venta` |
| Nota Crédito (91) | `DIAN 2.1: Nota Crédito de Factura Electrónica de Venta` |
| Nota Débito (92) | `DIAN 2.1: Nota Débito de Factura Electrónica de Venta` |
| POS (20) | `DIAN 2.1: documento equivalente electrónico del tiquete de máquina registradora con sistema P.O.S.` |
| NC Doc. Equiv. (94) | `DIAN 2.1: Nota de Ajuste al Documento Equivalente Electrónico Crédito` |
| ND Doc. Equiv. (93) | `DIAN 2.1: Nota de Ajuste al Documento Equivalente Electrónico Débito` |

### ProfileExecutionID (Ambiente)

| Valor | Ambiente |
|-------|----------|
| `1` | Producción |
| `2` | Habilitación (pruebas/sandbox) |

### CustomizationID (Tipo de Operación)

| Valor | Operación | Aplica a |
|-------|-----------|----------|
| `10` | Estándar | Factura, POS, otros doc. equivalentes |
| `20` | Contingencia facturador | Factura contingencia |
| `30` | Contingencia DIAN | Factura contingencia |

Para documentos equivalentes, `CustomizationID` también puede tener valores específicos
por tipo (ver Tabla 2 del Anexo Técnico DE v1.3).

---

## 11. Orden de Elementos XML Requeridos

### Factura (`<Invoice>`) — Orden Obligatorio

1. `ext:UBLExtensions` — DianExtensions + Firma
2. `cbc:UBLVersionID` — `"UBL 2.1"`
3. `cbc:CustomizationID` — Tipo de operación
4. `cbc:ProfileID` — Literal del perfil DIAN
5. `cbc:ProfileExecutionID` — Ambiente
6. `cbc:ID` — Número factura (prefijo + consecutivo)
7. `cbc:UUID` — CUFE o CUDE
8. `cbc:IssueDate` — Fecha emisión
9. `cbc:IssueTime` — Hora emisión (con zona horaria)
10. `cbc:InvoiceTypeCode` — Código tipo documento
11. `cbc:Note` — Notas/observaciones (repetible, opcional)
12. `cbc:DocumentCurrencyCode` — Moneda (`COP`)
13. `cbc:LineCountNumeric` — Cantidad de líneas
14. `cac:InvoicePeriod` — Período (opcional)
15. `cac:OrderReference` — Orden de compra (opcional)
16. `cac:BillingReference` — Referencia a doc. previo (requerido en NC/ND)
17. `cac:DespatchDocumentReference` — Ref. despacho (opcional)
18. `cac:ReceiptDocumentReference` — Ref. recibo (opcional)
19. `cac:AdditionalDocumentReference` — Docs adicionales (opcional)
20. `cac:AccountingSupplierParty` — **Emisor** (obligatorio)
21. `cac:AccountingCustomerParty` — **Adquirente** (obligatorio, simplificado en POS)
22. `cac:PaymentMeans` — Medio de pago (obligatorio, repetible)
23. `cac:PaymentExchangeRate` — Tasa de cambio (si moneda ≠ COP)
24. `cac:AllowanceCharge` — Cargos/descuentos globales (opcional)
25. `cac:TaxTotal` — **Totales de impuestos** (obligatorio, repetible por tipo impuesto)
26. `cac:WithholdingTaxTotal` — Retenciones (opcional)
27. `cac:LegalMonetaryTotal` — **Totales monetarios** (obligatorio)
28. `cac:InvoiceLine` — **Líneas de detalle** (obligatorio, repetible)

---

## 12. Firma Digital XAdES-BES

### Algoritmos Requeridos

| Componente | Algoritmo |
|------------|-----------|
| Canonización | `http://www.w3.org/TR/2001/REC-xml-c14n-20010315` |
| Firma | `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` |
| Digest | `http://www.w3.org/2001/04/xmlenc#sha256` |

### Política de Firma DIAN

```
URL: https://facturaelectronica.dian.gov.co/politicadefirma/v2/politicadefirmav2.pdf
DigestMethod: SHA-256
```

### Ubicación en el XML

La firma va en la segunda `ext:UBLExtension`:

```xml
<ext:UBLExtensions>
  <ext:UBLExtension>
    <ext:ExtensionContent>
      <sts:DianExtensions>...</sts:DianExtensions>
    </ext:ExtensionContent>
  </ext:UBLExtension>
  <ext:UBLExtension>
    <ext:ExtensionContent>
      <ds:Signature Id="xmldsig-...">
        <ds:SignedInfo>...</ds:SignedInfo>
        <ds:SignatureValue>...</ds:SignatureValue>
        <ds:KeyInfo>...</ds:KeyInfo>
        <ds:Object>
          <xades:QualifyingProperties>
            <xades:SignedProperties>
              <xades:SignedSignatureProperties>
                <xades:SigningTime>...</xades:SigningTime>
                <xades:SigningCertificate>...</xades:SigningCertificate>
                <xades:SignaturePolicyIdentifier>...</xades:SignaturePolicyIdentifier>
                <xades:SignerRole>
                  <xades:ClaimedRoles>
                    <xades:ClaimedRole>supplier</xades:ClaimedRole>
                  </xades:ClaimedRoles>
                </xades:SignerRole>
              </xades:SignedSignatureProperties>
            </xades:SignedProperties>
          </xades:QualifyingProperties>
        </ds:Object>
      </ds:Signature>
    </ext:ExtensionContent>
  </ext:UBLExtension>
</ext:UBLExtensions>
```

---

## 13. URLs de Servicios Web DIAN

| Ambiente | URL WSDL |
|----------|----------|
| Habilitación | `https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc?wsdl` |
| Producción | `https://vpfe.dian.gov.co/WcfDianCustomerServices.svc?wsdl` |

### Operaciones SOAP Disponibles

| Operación | Descripción |
|-----------|-------------|
| `SendBillSync` | Envío sincrónico de documento individual |
| `SendBillAsync` | Envío asincrónico de documento |
| `SendTestSetAsync` | Envío de set de pruebas (habilitación) |
| `GetStatus` | Consulta estado por CUFE/CUDE |
| `GetStatusZip` | Consulta estado por TrackId (ZipKey) |
| `GetNumberingRange` | Consulta rangos de numeración autorizados |

### SOAP Action Base

```
http://wcf.dian.colombia/IWcfDianCustomerServices/{OPERACIÓN}
```

---

## 14. Resumen Rápido para Implementación

```
┌──────────────────────────────────────────────────────────┐
│               FACTURA ELECTRÓNICA (01)                    │
├──────────────────────────────────────────────────────────┤
│ Elemento raíz:    <Invoice>                               │
│ InvoiceTypeCode:  01                                      │
│ ProfileID:        DIAN 2.1: Factura Electrónica de Venta │
│ UUID:             CUFE = SHA384(...ClTec...)               │
│ Adquirente:       OBLIGATORIO                             │
│ Numeración:       Resolución de facturación               │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│           DOCUMENTO EQUIVALENTE POS (20)                  │
├──────────────────────────────────────────────────────────┤
│ Elemento raíz:    <Invoice>                               │
│ InvoiceTypeCode:  20                                      │
│ ProfileID:        DIAN 2.1: documento equivalente...POS  │
│ UUID:             CUDE = SHA384(...PIN...)                 │
│ Adquirente:       OPCIONAL (222222222222 = cons. final)   │
│ Numeración:       Resolución de doc. equivalente          │
└──────────────────────────────────────────────────────────┘
```

---

## 15. Referencias

| Recurso | URL |
|---------|-----|
| Documentación técnica DIAN | https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/ |
| Anexo Técnico FE v1.9 (PDF) | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Factura-Electronica-de-Venta-vr-1-9.pdf |
| Anexo Técnico FE v1.8 (PDF) | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Anexo-Tecnico-Resolucion-000012-09022021.pdf |
| Caja de herramientas FE v1.9 | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Caja-de-herramientas-FE-V19-V2026.zip |
| Caja de herramientas FE v1.8 | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Caja_de_herramientas_factura_electronica_validacion_previa.zip |
| XSD UBL 2.1 (OASIS) | http://docs.oasis-open.org/ubl/os-UBL-2.1/xsdrt/maindoc/ |
| ABC POS Electrónico | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Abece-POS-Electronico-documento-equivalente.pdf |
| Guía Web Services DIAN | https://www.dian.gov.co/impuestos/factura-electronica/Documents/Guia-Herramienta-para-el-Consumo-de-Web-Services.pdf |
| Ref. PHP: Stenfrank/ubl21dian | https://github.com/Stenfrank/ubl21dian (archivado) |
| Ref. PHP: lopezsoft/ubl21dian | https://github.com/lopezsoft/ubl21dian |
| Ref. Python: facho | https://github.com/bit4bit/facho |
