/**
 * Transport module for communicating with the DIAN electronic invoicing
 * web service (WcfDianCustomerServices).
 *
 * Provides high-level functions for sending documents, querying status,
 * retrieving numbering ranges, and looking up acquirer information.
 * All communication uses SOAP 1.2 with WS-Security Signature authentication.
 *
 * @example
 * ```typescript
 * import {
 *   sendBill,
 *   getStatus,
 *   getNumberingRange,
 *   getAcquirer,
 *   DianTransportError,
 * } from '@dian-kit/core/transport';
 * ```
 *
 * @see {@link https://vpfe.dian.gov.co/WcfDianCustomerServices.svc | DIAN WCF Service}
 *
 * @module transport
 */

export {
  getAcquirer,
  getNumberingRange,
  getStatus,
  getStatusZip,
  sendBill,
} from "./dian-client.js";
export type {
  DianAcquirerResponse,
  DianNumberingRange,
  DianNumberingRangeResponse,
  DianSendResponse,
  DianSoapMethodValue,
  DianStatusResponse,
  DianValidationError,
  GetAcquirerOptions,
  GetNumberingRangeOptions,
  GetStatusOptions,
  SendBillOptions,
  SoapAuthConfig,
} from "./types.js";
export { DianTransportError } from "./types.js";
