// OpenTelemetry tracing configuration
// Note: OpenTelemetry packages are installed but commented out due to version compatibility issues
// Uncomment and fix imports when ready to enable tracing

// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
// import { resource } from '@opentelemetry/resources';
// import {
//   SEMRESATTRS_SERVICE_NAME,
//   SEMRESATTRS_SERVICE_VERSION,
//   SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
// } from '@opentelemetry/semantic-conventions';
// import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

// const jaegerExporterInstance = new JaegerExporter({
//   endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
// });

// const sdk = new NodeSDK({
//   resource: resource({
//     [SEMRESATTRS_SERVICE_NAME]: 'quiz-app-backend',
//     [SEMRESATTRS_SERVICE_VERSION]: '1.0.0',
//     [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
//   }),
//   instrumentations: [getNodeAutoInstrumentations({
//     '@opentelemetry/instrumentation-fs': { enabled: false },
//   })],
//   traceExporter: jaegerExporterInstance,
// });

// sdk.start();

// console.log('OpenTelemetry tracing initialized successfully');

// export default sdk;

// Placeholder export for now
export default {};
