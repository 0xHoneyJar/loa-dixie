import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

/**
 * Initialize OpenTelemetry SDK for distributed tracing.
 * Returns null (no-op) when endpoint is not configured — zero overhead when disabled.
 */
export function initTelemetry(endpoint: string | null): NodeSDK | null {
  if (!endpoint) return null;

  const sdk = new NodeSDK({
    resource: new Resource({ [ATTR_SERVICE_NAME]: 'dixie-bff' }),
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({ url: endpoint }),
    ),
  });
  sdk.start();
  return sdk;
}

/**
 * Graceful shutdown — call on SIGTERM/SIGINT to flush pending spans.
 * Safe to call with null (no-op).
 */
export async function shutdownTelemetry(sdk: NodeSDK | null): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
}
