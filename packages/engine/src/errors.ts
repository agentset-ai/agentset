/**
 * Thrown when a provider or model isn't available in this deployment, either
 * because the region doesn't allow it or because it isn't configured.
 */
export class ProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

// by name, so errors from another copy of this module match too
export const isProviderUnavailableError = (
  error: unknown,
): error is ProviderUnavailableError =>
  error instanceof Error && error.name === "ProviderUnavailableError";

// EU: thrown when a partition request is over the size limit. The jobs keep
// this message in failure reports (see JOB_ERROR_MESSAGES)
export const PARTITION_BODY_TOO_LARGE_MESSAGE =
  "Document metadata is too large";
