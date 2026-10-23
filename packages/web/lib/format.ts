import { formatSignedCurrency, formatSignedPoints } from "@e-patti/shared";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function signedPoints(value: number): string {
  return formatSignedPoints(value);
}

export function moneyOrPoints(value: number, unit: "currency" | "points"): string {
  return formatSignedCurrency(value, unit);
}

export { formatSignedCurrency, formatSignedPoints };
