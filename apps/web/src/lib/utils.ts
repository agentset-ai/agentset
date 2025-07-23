import { env } from "@/env";

import { APP_DOMAIN } from "./constants";

export function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;

  if (env.NODE_ENV === "production") return APP_DOMAIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

let formatter: Intl.NumberFormat | undefined;
let compactFormatter: Intl.NumberFormat | undefined;
let currencyFormatter: Intl.NumberFormat | undefined;
export function formatNumber(
  num: number,
  style: "decimal" | "compact" | "currency" = "decimal",
) {
  let formatterToUse;

  if (style === "decimal") {
    if (!formatter) {
      formatter = new Intl.NumberFormat("en-US", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    }
    formatterToUse = formatter;
  } else if (style === "currency") {
    if (!currencyFormatter) {
      currencyFormatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    formatterToUse = currencyFormatter;
  } else {
    if (!compactFormatter) {
      compactFormatter = new Intl.NumberFormat("en-US", {
        notation: "compact",
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    }
    formatterToUse = compactFormatter;
  }

  return formatterToUse.format(num);
}

export function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }
  return `${ms}ms`;
}

export function formatDuration(start: Date, end: Date) {
  const duration = end.getTime() - start.getTime();
  return formatMs(duration);
}
