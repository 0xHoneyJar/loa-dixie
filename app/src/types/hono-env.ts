/**
 * Hono ContextVariableMap type augmentation — compile-time safety for c.set()/c.get().
 *
 * Without this, all c.get() calls require `as never` casts or return `unknown`.
 * This module declares the full set of context variables used across middleware,
 * so TypeScript can verify correct usage at compile time.
 *
 * @since cycle-014 Sprint 106 — BF-001 (Bridgebuilder iteration 1)
 */
import type { ConvictionTier } from './conviction.js';

declare module 'hono' {
  interface ContextVariableMap {
    /** Authenticated wallet address (set by JWT middleware). */
    wallet: string;
    /** Unique request identifier (set by request-id middleware). */
    requestId: string;
    /** OTEL trace ID for log-trace correlation (set by tracing middleware). */
    traceId: string;
    /** Operator wallet address in fleet context (set by fleet-auth middleware). */
    operatorId: string;
    /** Whether the caller has fleet admin privileges (set by fleet-auth middleware). */
    isFleetAdmin: boolean;
    /** Fleet database context (set by fleet-auth middleware). */
    fleetDbContext: { operatorId: string; isAdmin: boolean };
    /** Service JWT issuer (set by service-jwt middleware). May be undefined per JWT spec. */
    serviceIssuer: string | undefined;
    /** Service JWT subject (set by service-jwt middleware). */
    serviceSubject: string | null;
    /** Client protocol version from X-Protocol-Version header (set by protocol-version middleware). */
    clientProtocolVersion: string;
    /** Whether the caller has admin privileges (set by admin-auth middleware). */
    isAdmin: boolean;
  }
}
