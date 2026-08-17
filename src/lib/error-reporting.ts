// Generic client-side error reporter. Previously this forwarded errors to
// Lovable's editor telemetry (window.__lovableEvents / __lovableReportRuntimeError),
// which only existed inside the Lovable preview iframe. Now it just logs to the
// console; wire up Sentry/another provider here if you want remote error tracking.

export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  // Loaders and server fns commonly throw a raw Response; String(it) is the
  // opaque "[object Response]", so pull out the status and URL instead.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  console.error("[error-boundary]", message, {
    route: window.location.pathname,
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  });
}
