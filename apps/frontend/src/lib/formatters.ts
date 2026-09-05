export function formatMbit(value: number): string {
  return `${value.toFixed(1)} Mbit/s`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)} %`;
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("de-DE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
