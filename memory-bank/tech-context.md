# Tech Context

## Technology Stack

- **Language**: TypeScript 6.x (strict mode, verbatimModuleSyntax)
- **Runtime**: Node.js >= 20 (uses native `fetch`, `crypto.webcrypto`)
- **Build**: tsup (per-package), Turborepo (orchestration)
- **Package Manager**: pnpm 9.x (workspace protocol)
- **Testing**: Vitest 4.x (v8 coverage)
- **Linting/Formatting**: Biome 2.x (replaces ESLint + Prettier)
- **Validation**: Zod 4.x
- **Versioning**: Changesets
- **CI**: GitHub Actions (Node 20 + 22, Python 3.12)

## Project Structure

```
dian-kit/
├── packages/
│   ├── core/          # XML, signing, CUFE, transport - the engine
│   ├── sdk-node/      # High-level DianKit class wrapping core
│   ├── cli/           # CLI tool (stub)
│   ├── ai/            # AI layer (stub)
│   └── sdk-python/    # Python SDK (stub)
├── plugins/
│   └── whatsapp/      # WhatsApp agent (stub)
├── tests/             # Top-level test dirs (empty, tests live in packages)
├── docs/              # Technical reference
└── examples/          # Usage examples (empty gitkeep dirs)
```

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Quick Start

```bash
git clone https://github.com/sergioarojasm98/dian-kit.git
cd dian-kit
pnpm install
pnpm build
pnpm test
```

## Main Commands

```bash
pnpm build        # Build all packages (turbo)
pnpm test         # Run all tests (turbo)
pnpm lint         # Biome check
pnpm typecheck    # TypeScript noEmit check
pnpm changeset    # Create a changeset for versioning
pnpm release      # Build + changeset publish
```

## Key Dependencies (core)

| Package | Purpose |
|---------|---------|
| `xmlbuilder2` | UBL 2.1 XML generation |
| `xadesjs` / `xmldsigjs` | XAdES-EPES digital signatures |
| `node-forge` | PKCS#12 certificate parsing |
| `@xmldom/xmldom` | XML DOM for signing and response parsing |
| `fflate` | ZIP compression for DIAN SOAP transport |
| `zod` (v4) | Runtime validation of document schemas |
| `xpath` | XPath queries for signature placement |

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Monorepo tool | pnpm + Turborepo | Fast builds, workspace protocol, task caching |
| Linter/Formatter | Biome | Single tool, faster than ESLint+Prettier |
| XML builder | xmlbuilder2 | Fluent API, namespace support |
| Signing lib | xadesjs | Only JS lib supporting XAdES-EPES policy |
| ZIP lib | fflate | Tiny, sync API, no native deps |
| Validation | Zod v4 | Schema-first, good TS inference |
| Module format | ESM + CJS dual | `tsup` generates both via package exports |
| Target | ES2022 | Matches Node.js 20 baseline |
