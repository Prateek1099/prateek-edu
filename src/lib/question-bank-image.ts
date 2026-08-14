import { isPrivateOrLocalHostname, isTrustedDocumentHost } from "./document-security";

export const MAX_BANK_QUESTION_IMAGE_BYTES = 5 * 1024 * 1024;

export type BankQuestionImageType = {
  extension: "png" | "jpg" | "webp";
  contentType: "image/png" | "image/jpeg" | "image/webp";
};

const ALLOWED_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp"]);
const ALLOWED_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function getBankQuestionImageExtension(filename: string): string | null {
  const extension = filename.trim().toLowerCase().split(".").pop() ?? "";
  return ALLOWED_EXTENSIONS.has(extension) ? extension : null;
}

export function detectBankQuestionImageType(bytes: Uint8Array): BankQuestionImageType | null {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length >= pngSignature.length &&
    pngSignature.every((byte, index) => bytes[index] === byte)
  ) {
    return { extension: "png", contentType: "image/png" };
  }

  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
    return { extension: "jpg", contentType: "image/jpeg" };
  }

  if (
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    return { extension: "webp", contentType: "image/webp" };
  }

  return null;
}

export function validateBankQuestionImageFile(input: {
  filename: string;
  contentType: string;
  size: number;
  bytes: Uint8Array;
}): { success: true; imageType: BankQuestionImageType } | { success: false; error: string } {
  if (input.size < 1 || input.size > MAX_BANK_QUESTION_IMAGE_BYTES) {
    return { success: false, error: "Choose a PNG, JPG, or WebP image up to 5 MB." };
  }

  const extension = getBankQuestionImageExtension(input.filename);
  if (!extension || !ALLOWED_CONTENT_TYPES.has(input.contentType.toLowerCase())) {
    return { success: false, error: "Only PNG, JPG/JPEG, and WebP images are supported." };
  }

  const imageType = detectBankQuestionImageType(input.bytes);
  if (!imageType) {
    return { success: false, error: "The uploaded file is not a valid PNG, JPG, or WebP image." };
  }

  const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
  if (
    normalizedExtension !== imageType.extension ||
    input.contentType.toLowerCase() !== imageType.contentType
  ) {
    return { success: false, error: "The image extension, content type, and file contents do not match." };
  }

  return { success: true, imageType };
}

export function normalizeTrustedQuestionImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const extension = url.pathname.toLowerCase().split(".").pop() ?? "";
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !ALLOWED_EXTENSIONS.has(extension) ||
      isPrivateOrLocalHostname(url.hostname) ||
      !isTrustedDocumentHost(url.hostname)
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
