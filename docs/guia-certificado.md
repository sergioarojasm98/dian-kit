# Guia de certificado digital (.p12)

Esta guia explica que es un certificado .p12, por que se necesita para
facturacion electronica en Colombia y como obtener uno.

---

## Que es un certificado .p12

Un archivo `.p12` (tambien llamado PKCS#12 o `.pfx`) es un contenedor
criptografico que almacena:

- **Llave privada**: se usa para firmar digitalmente los documentos XML.
- **Certificado publico**: contiene la identidad del emisor y permite a la DIAN
  verificar la firma.
- **Cadena de confianza**: certificados intermedios de la autoridad certificadora (CA).

La DIAN exige que toda factura electronica este firmada con un certificado
emitido por una CA acreditada ante la ONAC (Organismo Nacional de Acreditacion
de Colombia).

---

## El certificado gratuito de la DIAN

La DIAN ofrece un certificado gratuito dentro de su plataforma de facturacion.
Sin embargo, este certificado **no sirve** para integraciones externas como
dian-kit por las siguientes razones:

- La llave privada esta bloqueada dentro de la plataforma de la DIAN.
- No es posible exportar el archivo .p12.
- Solo funciona para firmar documentos desde la interfaz web de la DIAN.

**Para usar dian-kit, usted necesita un certificado .p12 propio** emitido por
una CA acreditada.

---

## Opciones de compra

| Proveedor | Precio aprox. (COP/anio) | Tiempo de entrega | Sitio web |
|-----------|--------------------------|--------------------|----|
| **GarKeM** | ~$190,000 | 4-8 horas | [garkem.co](https://garkem.co) |
| **Andes SCD** | ~$389,000 | 4-5 dias habiles | [andesscd.com.co](https://andesscd.com.co) |
| **Certicamara** | Variable | Variable | [certicamara.com](https://certicamara.com) |

Los precios y tiempos son aproximados y pueden cambiar. Verifique directamente
con cada proveedor.

---

## Paso a paso: obtener certificado con GarKeM

GarKeM es la opcion mas economica y rapida al momento de escribir esta guia.

### 1. Ingresar al sitio

Visite [garkem.co](https://garkem.co) y seleccione el producto de certificado
de firma digital para facturacion electronica.

### 2. Completar el formulario CSR

Llene el formulario con los datos de su empresa o persona natural:

- Nombre o razon social
- NIT o numero de cedula
- Correo electronico (ahi le enviaran el certificado)
- Datos de contacto

### 3. Realizar el pago

Pague por PSE, tarjeta de credito o transferencia bancaria segun las opciones
disponibles.

### 4. Recibir el certificado

Recibira el archivo `.p12` y la contrasena por correo electronico. El tiempo
tipico es de 4 a 8 horas habiles.

### 5. Verificar el certificado

Puede verificar que el certificado es valido con OpenSSL:

```bash
openssl pkcs12 -in certificate.p12 -info -noout
```

Le pedira la contrasena. Si muestra informacion del certificado sin errores,
esta listo para usarlo.

---

## Usar el certificado con dian-kit

```typescript
import { readFileSync } from "node:fs";
import { DianKit } from "@dian-kit/sdk-node";

const kit = new DianKit({
  certificate: readFileSync("./certificate.p12"),
  certificatePassword: "the-certificate-password",
  // ... resto de la configuracion
});
```

La propiedad `certificate` acepta un `Buffer` con el contenido binario del
archivo `.p12`. La propiedad `certificatePassword` es la contrasena que recibio
junto con el certificado.

---

## Seguridad: nunca incluya el certificado en el repositorio

El archivo `.p12` contiene su llave privada. Si alguien obtiene acceso a este
archivo y a la contrasena, puede firmar documentos en su nombre.

### Agregar al .gitignore

```gitignore
# Digital certificates
*.p12
*.pfx
```

### Practicas recomendadas

- Almacene el certificado fuera del repositorio de codigo.
- Use variables de entorno para la contrasena:
  ```typescript
  certificatePassword: process.env.CERT_PASSWORD!,
  ```
- En produccion, considere un gestor de secretos (AWS Secrets Manager,
  Azure Key Vault, HashiCorp Vault).
- Renueve el certificado antes de que expire (tipicamente cada 1-2 anios).

---

## Recursos

- [Documentacion tecnica de la DIAN](https://micrositios.dian.gov.co/sistema-de-facturacion-electronica/documentacion-tecnica/)
- [Lista de CA acreditadas por la ONAC](https://onac.org.co)
- [Guia de inicio rapido](guia-inicio-rapido.md)
