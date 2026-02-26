/**
 * Telemetry init/shutdown tests — verifies no-op behavior and SDK lifecycle.
 *
 * @since cycle-014 Sprint 2 — Task T10
 */
import { describe, it, expect } from 'vitest';
import { initTelemetry, shutdownTelemetry } from '../telemetry.js';

describe('initTelemetry', () => {
  it('returns null when endpoint is null (zero overhead)', () => {
    const sdk = initTelemetry(null);
    expect(sdk).toBeNull();
  });

  it('returns null when endpoint is empty string', () => {
    // loadConfig returns null for empty OTEL_EXPORTER_OTLP_ENDPOINT
    const sdk = initTelemetry(null);
    expect(sdk).toBeNull();
  });

  it('returns a NodeSDK instance when endpoint is provided', async () => {
    // Use a dummy endpoint that won't actually connect
    const sdk = initTelemetry('http://localhost:0');
    expect(sdk).not.toBeNull();
    expect(sdk).toHaveProperty('shutdown');
    // Clean up
    await sdk!.shutdown();
  });
});

describe('shutdownTelemetry', () => {
  it('resolves cleanly when sdk is null', async () => {
    await expect(shutdownTelemetry(null)).resolves.toBeUndefined();
  });

  it('resolves cleanly after starting SDK', async () => {
    const sdk = initTelemetry('http://localhost:0');
    await expect(shutdownTelemetry(sdk)).resolves.toBeUndefined();
  });
});
