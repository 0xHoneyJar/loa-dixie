import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import type { Resource } from '@opentelemetry/resources';
import * as resources from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';

function createServiceResource(): Resource {
  const attributes: Record<string, string> = {
    [ATTR_SERVICE_NAME]: 'dixie-bff',
  };
  const resourceFactory = (
    resources as unknown as {
      resourceFromAttributes?: (attrs: Record<string, string>) => Resource;
    }
  ).resourceFromAttributes;

  if (resourceFactory) return resourceFactory(attributes);

  const LegacyResource = (
    resources as unknown as {
      Resource: new (attrs: Record<string, string>) => Resource;
    }
  ).Resource;
  return new LegacyResource(attributes);
}

/**
 * Initialize OpenTelemetry SDK for distributed tracing.
 * Returns null (no-op) when endpoint is not configured — zero overhead when disabled.
 */
export function initTelemetry(endpoint: string | null): NodeSDK | null {
  if (!endpoint) return null;

  const sdk = new NodeSDK({
    resource: createServiceResource(),
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: endpoint }))],
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
  // 5s deadline prevents hanging if OTEL collector is unreachable
  await Promise.race([
    sdk.shutdown(),
    new Promise<void>((r) => setTimeout(r, 5_000)),
  ]);
}
