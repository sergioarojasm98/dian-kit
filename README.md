# dian-kit

> El SDK open-source más completo para facturación electrónica DIAN en Colombia.
> TypeScript · Python · CLI · AI-ready

[![npm version](https://img.shields.io/npm/v/@dian-kit/core?label=npm&color=cb3837)](https://www.npmjs.com/package/@dian-kit/core)
[![PyPI version](https://img.shields.io/pypi/v/dian-kit?color=3775a9)](https://pypi.org/project/dian-kit/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![CI](https://github.com/sergioarojasm98/dian-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/sergioarojasm98/dian-kit/actions)

---

## Instalación en 30 segundos

```bash
npm install -g dian-kit
dian-kit init
```

O como dependencia en tu proyecto:

```bash
npm install @dian-kit/core @dian-kit/sdk-node
```

Python:

```bash
pip install dian-kit
```

## Ejemplo — Factura en 5 líneas

```typescript
import { DianKit } from "@dian-kit/sdk-node";

const dian = new DianKit({ sandbox: true });

const invoice = await dian.invoice.create({
  buyer: { documentNumber: "52123456", documentType: "CC" },
  items: [{ description: "Consultoría de infraestructura", price: 500_000, tax: "IVA" }],
});

const result = await dian.invoice.send(invoice);
console.log(`✓ Factura ${result.cufe} aceptada por la DIAN`);
```

## Ejemplo — Documento POS sin datos del comprador

```typescript
const pos = await dian.pos.create({
  items: [
    { description: "Corte de cabello", price: 25_000 },
    { description: "Tinte completo", price: 80_000, tax: "IVA" },
  ],
});

const result = await dian.pos.send(pos);
console.log(`✓ POS ${result.cude} validado por la DIAN`);
```

## Por qué dian-kit

| Característica | dian-kit | Factus API | MATIAS API | Implementación manual |
|---|---|---|---|---|
| Open source | ✅ MIT | ❌ SaaS | ❌ SaaS | N/A |
| Sin infraestructura | ✅ | ❌ Depende de ellos | ❌ Depende de ellos | ✅ |
| Tus propias credenciales DIAN | ✅ | ❌ | ❌ | ✅ |
| TypeScript + Python | ✅ | ❌ REST only | ❌ REST only | Depende |
| CLI interactivo | ✅ | ❌ | ❌ | ❌ |
| Capa de IA (BYOK) | ✅ | ❌ | ❌ | ❌ |
| Documento POS electrónico | ✅ | Parcial | Parcial | Manual |
| Plugin WhatsApp | ✅ | ❌ | ❌ | ❌ |
| Costo mensual | **$0** | Desde $99k COP | Desde $150k COP | Solo tu tiempo |

## Documentos soportados

- ✅ **Documento Equivalente POS Electrónico** (CUDE) — venta rápida sin datos del comprador
- ✅ **Factura Electrónica de Venta** (CUFE) — con datos del comprador
- ✅ **Nota Crédito** — anulaciones y correcciones
- ✅ **Nota Débito** — ajustes de valor
- 🔜 **Nómina Electrónica** — próximamente

## Capa de IA (opcional, BYOK)

Trae tu propia API key. Toda la IA corre en tu máquina — dian-kit nunca toca tus credenciales.

```typescript
import { DianKitAI } from "@dian-kit/ai";

// Lenguaje natural → factura
const invoice = await DianKitAI.parseInvoice(
  "Factura a cédula 52123456 por consultoría $500.000 más IVA",
  { provider: "openai", apiKey: process.env.OPENAI_API_KEY }
);

// Explicar errores DIAN en español humano
const explanation = await DianKitAI.explainError("FAD90", errorXml);
```

```bash
# CLI con lenguaje natural
dian-kit "factura a Juan Pérez cédula 12345678 por $200.000 de servicios"
dian-kit "venta rápida de $35.000"
dian-kit "explica por qué me rechazaron la factura FE-1042"
```

## Plugin WhatsApp para pymes

Facturación electrónica por WhatsApp en 15 minutos. Multi-tenant: cada empresa con sus propias credenciales DIAN.

```bash
dian-kit whatsapp init
```

## Plugins y adapters disponibles

| Plugin | Paquete | Estado |
|---|---|---|
| Express.js | `@dian-kit/plugin-express` | 🔜 |
| FastAPI (Python) | `dian-kit-fastapi` | 🔜 |
| WooCommerce | `@dian-kit/plugin-woocommerce` | 🔜 |
| Shopify | `@dian-kit/plugin-shopify` | 🔜 |
| WhatsApp | `@dian-kit/plugin-whatsapp` | 🔜 |

## CLI — Comandos principales

```bash
dian-kit init                          # Wizard interactivo
dian-kit invoice create                # Crear factura (interactivo o --ai)
dian-kit invoice send <id>             # Enviar a la DIAN
dian-kit pos create                    # Venta rápida (documento POS)
dian-kit validate <file.xml>           # Validar XML contra esquema DIAN
dian-kit buyer lookup <cedula-o-nit>   # Autocompletar datos del comprador
dian-kit explain <error-code>          # Explicar error DIAN en español
```

## Seguridad

- Tu certificado digital (.p12) **nunca** sale de tu máquina
- Las claves privadas **nunca** aparecen en logs ni mensajes de error
- `dian-kit init` agrega `.diankit/` a `.gitignore` automáticamente
- **dian-kit no envía ningún dato a servidores propios** — toda comunicación es directamente con la DIAN

## Contribuir

¡Las contribuciones son bienvenidas! Lee nuestra [guía de contribución](./CONTRIBUTING.md) para comenzar.

```bash
git clone https://github.com/sergioarojasm98/dian-kit.git
cd dian-kit
pnpm install
pnpm build
pnpm test
```

## Roadmap público

- [x] Setup monorepo (pnpm + Turborepo)
- [ ] Core: generación XML UBL 2.1 (POS + Factura)
- [ ] Core: firma digital XAdES-BES
- [ ] Core: cálculo CUFE/CUDE
- [ ] Core: cliente API DIAN (sandbox + producción)
- [ ] SDK Node.js con tipos completos
- [ ] CLI interactivo
- [ ] Capa de IA (BYOK)
- [ ] Plugin WhatsApp multi-tenant
- [ ] SDK Python (PyPI)
- [ ] Plugins: Express, FastAPI, WooCommerce, Shopify
- [ ] Expansión LATAM: México (CFDI), Chile (SII), Perú (SUNAT)

## Sponsors

¿Tu empresa usa facturación electrónica en Colombia? [Conviértete en sponsor](https://github.com/sponsors/sergioarojasm98) y ayuda a mantener dian-kit como el estándar open-source.

## Licencia

[MIT](./LICENSE) — usa dian-kit libremente en proyectos personales y comerciales.

---

<p align="center">
  Hecho con ❤️ para los developers colombianos 🇨🇴
</p>
