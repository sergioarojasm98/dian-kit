# Referencia de errores de validacion DIAN

Esta guia documenta los errores de validacion de la DIAN que encontramos durante
la integracion de dian-kit, junto con sus causas y soluciones. La DIAN devuelve
estos codigos cuando rechaza un documento electronico.

---

## FAD06 -- CUFE incorrectamente calculado

**Descripcion**: El CUFE informado no corresponde al esperado por la DIAN.

**Causa**: Los valores monetarios en la cadena de entrada del CUFE se
redondearon en lugar de truncarse. Por ejemplo, un valor de `285000.005` se
redondea a `285000.01` pero la DIAN espera `285000.00` (truncado).

**Solucion**: Truncar todos los valores monetarios a 2 decimales usando
`Math.trunc(value * 100) / 100` en lugar de `Math.round`. dian-kit maneja
esto automaticamente con la funcion `truncateDecimals()`.

---

## ZB01 -- TaxScheme donde se espera TaxCategory

**Descripcion**: Regla de validacion del esquema no satisfecha: se encontro
un nodo `TaxScheme` donde la DIAN espera un nodo `TaxCategory`.

**Causa**: En los totales de impuestos (tanto a nivel de linea como a nivel de
documento), el nodo `TaxScheme` debe estar envuelto dentro de un nodo
`TaxCategory`. Si se coloca `TaxScheme` directamente dentro de `TaxSubtotal`,
la validacion falla.

**Solucion**: Asegurarse de que la estructura XML siga esta jerarquia:

```xml
<cac:TaxSubtotal>
  <cbc:TaxableAmount>...</cbc:TaxableAmount>
  <cbc:TaxAmount>...</cbc:TaxAmount>
  <cac:TaxCategory>
    <cbc:Percent>19.00</cbc:Percent>
    <cac:TaxScheme>
      <cbc:ID>01</cbc:ID>
      <cbc:Name>IVA</cbc:Name>
    </cac:TaxScheme>
  </cac:TaxCategory>
</cac:TaxSubtotal>
```

dian-kit genera esta estructura correctamente de forma automatica.

---

## ZE02 -- Valor de firma invalido

**Descripcion**: El valor de la firma digital no corresponde al contenido del
documento.

**Causa**: Despues de firmar el XML con XAdES-EPES, se re-serializo el DOM
usando `XMLSerializer`. La re-serializacion altera declaraciones de namespaces
y espacios en blanco, lo que invalida el digest de la firma.

**Solucion**: Insertar el nodo de firma directamente en el XML original
mediante manipulacion de strings (buscar la posicion del tag de cierre y hacer
un splice), sin pasar por una re-serializacion del DOM completo. dian-kit
implementa esta estrategia internamente.

---

## FAD09e -- IssueDate distinta de SigningTime

**Descripcion**: La fecha de emision del documento (`IssueDate`) no coincide
con la fecha de firma (`SigningTime` en la firma XAdES).

**Causa**: Desfase de zona horaria. La libreria de firma (xadesjs) serializa
la fecha con `.toISOString()`, que siempre usa UTC. Si el servidor esta en
UTC y la factura se emite a las 20:00 del 5 de abril en Colombia (01:00 del
6 de abril UTC), la fecha de firma queda como 6 de abril mientras que
`IssueDate` dice 5 de abril.

**Solucion**: Ajustar la fecha de firma para compensar la diferencia horaria.
dian-kit aplica automaticamente un offset de UTC-5 (hora Colombia) al
`SigningTime` para que la fecha coincida con `IssueDate`.

---

## FAJ02a / FAJ02b -- Falta AdditionalAccountID

**Descripcion**: El campo `AdditionalAccountID` no esta presente en la
informacion del emisor o del receptor.

**Causa**: La DIAN requiere el campo `AdditionalAccountID` dentro del nodo
`AccountingSupplierParty` (y `AccountingCustomerParty`) para indicar el tipo
de persona: `"1"` para persona juridica, `"2"` para persona natural.

**Solucion**: Incluir el campo `personType` en la configuracion del supplier
y del customer:

```typescript
supplier: {
  personType: "1", // "1" = Persona Juridica, "2" = Persona Natural
  // ...
}
```

dian-kit genera el nodo XML `AdditionalAccountID` a partir de este campo.

---

## FAK61 -- Falta PartyIdentification para persona natural

**Descripcion**: Falta el nodo `PartyIdentification` cuando el tipo de
persona es natural.

**Causa**: Para personas naturales (`personType: "2"`), la DIAN exige que el
XML incluya un nodo `PartyIdentification` con el numero de documento, ademas
del nodo `Person` con nombre y apellido.

**Solucion**: Cuando el tipo de persona sea `"2"`, asegurarse de incluir los
datos de persona natural:

```typescript
supplier: {
  personType: "2",
  person: {
    firstName: "JUAN",
    familyName: "PEREZ",
  },
  // ...
}
```

dian-kit genera automaticamente `PartyIdentification` y `Person` a partir de
estos campos.

---

## FAB10a -- Prefijo no coincide con CorporateRegistrationScheme

**Descripcion**: El prefijo de la factura no coincide con el codigo de sucursal
registrado en `CorporateRegistrationScheme`.

**Causa**: El nodo `CorporateRegistrationScheme/ID` del emisor debe contener
el mismo prefijo que se usa en el numero de factura (por ejemplo, `SETP`). Si
este nodo falta o tiene un valor distinto, la DIAN rechaza el documento.

**Solucion**: dian-kit asigna automaticamente el prefijo de la resolucion de
numeracion al nodo `CorporateRegistrationScheme`. No requiere configuracion
adicional si los datos de numeracion son correctos.

---

## FAB07b / FAB08b -- Rango de fechas no coincide

**Descripcion**: La fecha de inicio o fin de la resolucion de numeracion no
coincide con los registros de la DIAN.

**Causa**: Se construyeron las fechas de la resolucion con
`new Date("YYYY-MM-DD")`, que crea la fecha en UTC. Al convertirla a la zona
horaria de Colombia (UTC-5), la fecha puede retroceder un dia. Por ejemplo,
`new Date("2019-01-19")` es `2019-01-19T00:00:00Z`, que en Colombia son las
18:00 del 18 de enero.

**Solucion**: Usar siempre el constructor con argumentos numericos:

```typescript
// Correcto
startDate: new Date(2019, 0, 19),  // 19 de enero de 2019

// Incorrecto
startDate: new Date("2019-01-19"), // Puede resultar en 18 de enero
```

---

## FAB22b -- DV vacio en ProviderID

**Descripcion**: El digito de verificacion (DV) esta vacio en el nodo
`ProviderID` de la informacion del software.

**Causa**: El nodo `SoftwareProvider/ProviderID` requiere los atributos
`schemeID` (tipo de documento) y un DV calculado. Si el campo DV se omite o se
envia como string vacio, la DIAN rechaza el documento.

**Solucion**: Asegurarse de que el NIT del proveedor de software incluya el
digito de verificacion. dian-kit calcula el DV automaticamente a partir del
NIT del supplier si no se proporciona explicitamente.

---

## FAS01 -- Totales de impuestos no coinciden

**Descripcion**: Los totales de impuestos del documento no coinciden con la
suma de los impuestos de las lineas.

**Causa**: Similar al error ZB01, este error puede ocurrir cuando la
estructura de impuestos no incluye el nodo `TaxCategory` como envoltorio.
Tambien puede ocurrir si hay errores de redondeo en los montos.

**Solucion**: Verificar que:

1. La estructura XML de impuestos use `TaxCategory` como envoltorio de
   `TaxScheme` (ver solucion de ZB01).
2. Los montos de impuestos a nivel de documento coincidan exactamente con la
   suma de los montos a nivel de linea.
3. Los valores se truncen a 2 decimales (no se redondeen).

---

## Como interpretar los errores de la DIAN

Cuando la DIAN rechaza un documento, la respuesta incluye una lista de errores
con codigo y descripcion. En dian-kit, estos errores estan disponibles en la
respuesta del envio:

```typescript
const response = await kit.send(invoice);

if (!response.isValid && response.errors?.length) {
  for (const error of response.errors) {
    console.log(`${error.code}: ${error.description}`);
  }
}
```

La estructura de los codigos sigue un patron:

- **FA**: errores de validacion de factura
- **CA**: errores de validacion de CUFE/CUDE
- **ZB/ZE**: errores de esquema y firma digital
- El numero y letra final indican la regla especifica

---

## Recursos

- [Documentacion tecnica de la DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/)
- [Guia de inicio rapido](guia-inicio-rapido.md)
- [Guia de certificado](guia-certificado.md)
