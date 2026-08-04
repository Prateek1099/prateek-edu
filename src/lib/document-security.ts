const PDF_EXTENSION_PATTERN = /\.pdf(?:$|[?#])/i;

export function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("fc") ||
    host.startsWith("fd") ||
    /^fe[89ab]/.test(host)
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return host.startsWith("::ffff:");

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;
  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function isTrustedDocumentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  const configuredHosts = (process.env.PDF_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return (
    host === "blob.vercel-storage.com" ||
    host.endsWith(".blob.vercel-storage.com") ||
    configuredHosts.includes(host)
  );
}

export function normalizeTrustedPdfUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("..") || !PDF_EXTENSION_PATTERN.test(trimmed)) return null;
    return trimmed;
  }

  try {
    const url = new URL(trimmed.replace(/ /g, "%20"));
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.pathname.toLowerCase().endsWith(".pdf") ||
      isPrivateOrLocalHostname(url.hostname) ||
      !isTrustedDocumentHost(url.hostname)
    ) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}
