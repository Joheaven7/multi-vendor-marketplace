import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api-client";

/**
 * Maps backend validation errors onto form fields.
 * Returns a message to show above the form, or null if every error was attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!(error instanceof ApiError)) return "Something went wrong. Please try again.";

  if (error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
    let mapped = false;
    for (const detail of error.details as { path?: string; message: string }[]) {
      if (detail.path) {
        setError(detail.path as Path<T>, { type: "server", message: detail.message });
        mapped = true;
      }
    }
    if (mapped) return null;
  }

  return error.message;
}