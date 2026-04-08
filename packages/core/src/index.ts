/**
 * @dian-kit/core
 *
 * Core logic for DIAN electronic invoicing in Colombia.
 * XML/UBL 2.1 generation, CUFE/CUDE calculation, digital signature support.
 */

/** Current version of the @dian-kit/core package */
export const VERSION = "0.0.1";

// Constants
export * from "./constants/index.js";
// Schemas (Zod validation)
export * from "./schemas/index.js";
// Security (CUFE/CUDE, SoftwareSecurityCode)
export * from "./security/index.js";
// Transport (cliente SOAP/WCF para API DIAN)
export * from "./transport/index.js";
// Types
export type * from "./types/index.js";
export { CONSUMIDOR_FINAL } from "./types/index.js";

// Utilities
export * from "./utils/index.js";
// XML generation
export * from "./xml/index.js";
