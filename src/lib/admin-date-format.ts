const INDIA_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function indiaTimeParts(value: Date | string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;

  const shifted = new Date(instant.getTime() + INDIA_OFFSET_MS);
  return {
    day: String(shifted.getUTCDate()).padStart(2, "0"),
    month: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    year: String(shifted.getUTCFullYear()),
    hour: String(shifted.getUTCHours()).padStart(2, "0"),
    minute: String(shifted.getUTCMinutes()).padStart(2, "0"),
    second: String(shifted.getUTCSeconds()).padStart(2, "0"),
  };
}

export function formatAdminDate(value: Date | string) {
  const parts = indiaTimeParts(value);
  if (!parts) return "—";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatAdminDateTime(value: Date | string) {
  const parts = indiaTimeParts(value);
  if (!parts) return "—";
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}:${parts.second}`;
}
