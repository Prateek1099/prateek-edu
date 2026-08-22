import crypto from "node:crypto";

import { del, put } from "@vercel/blob";

import { resolveBlobReadWriteToken } from "@/lib/blob-token";
import {
  MAX_BANK_QUESTION_IMAGE_BYTES,
  normalizeTrustedQuestionImageUrl,
  validateBankQuestionImageFile,
} from "@/lib/question-bank-image";

import type { ValidatedPaper } from "./types";

export type ArchivedImageCopies = {
  bySourceUrl: Map<string, string>;
  uploadedUrls: string[];
};

export function isArchiveOwnedQuestionImageUrl(value: string) {
  const normalized = normalizeTrustedQuestionImageUrl(value);
  if (!normalized) return false;
  try {
    return new URL(normalized).pathname.includes("/paper-archive/");
  } catch {
    return false;
  }
}

export async function copyPaperQuestionImages(
  paper: ValidatedPaper,
  savedPaperId: string,
): Promise<ArchivedImageCopies> {
  const sourceUrls = [...new Set(
    paper.sections.flatMap((section) => section.questions)
      .map((question) => question.imageUrl)
      .filter((value): value is string => Boolean(value)),
  )];
  if (sourceUrls.length === 0) return { bySourceUrl: new Map(), uploadedUrls: [] };

  const token = resolveBlobReadWriteToken();
  if (!token) throw new Error("Paper Archive image storage is not configured.");

  const bySourceUrl = new Map<string, string>();
  const uploadedUrls: string[] = [];
  try {
    for (const sourceUrl of sourceUrls) {
      const normalized = normalizeTrustedQuestionImageUrl(sourceUrl);
      if (!normalized) throw new Error("A question contains an untrusted image URL.");
      const response = await fetch(normalized, { redirect: "error" });
      if (!response.ok) throw new Error("A question image could not be copied into Paper Archive.");
      const declaredSize = Number(response.headers.get("content-length"));
      if (Number.isFinite(declaredSize) && declaredSize > MAX_BANK_QUESTION_IMAGE_BYTES) {
        throw new Error("A question image is too large to archive safely.");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const pathname = new URL(normalized).pathname;
      const filename = pathname.split("/").pop() || "question.png";
      const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() || "";
      const validation = validateBankQuestionImageFile({
        filename,
        contentType,
        size: bytes.byteLength,
        bytes,
      });
      if (!validation.success) throw new Error(`A question image could not be archived: ${validation.error}`);
      const blob = await put(
        `paper-archive/${savedPaperId}/${crypto.randomUUID()}.${validation.imageType.extension}`,
        new Blob([bytes], { type: validation.imageType.contentType }),
        {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType: validation.imageType.contentType,
          token,
        },
      );
      bySourceUrl.set(sourceUrl, blob.url);
      uploadedUrls.push(blob.url);
    }
    return { bySourceUrl, uploadedUrls };
  } catch (error) {
    await deleteArchivedQuestionImages(uploadedUrls);
    throw error;
  }
}

export async function deleteArchivedQuestionImages(urls: string[]) {
  const safeUrls = [...new Set(urls)].filter(isArchiveOwnedQuestionImageUrl);
  if (safeUrls.length === 0) return;
  const token = resolveBlobReadWriteToken();
  if (!token) {
    console.error("Paper Archive Blob cleanup skipped because storage is not configured.");
    return;
  }
  try {
    await del(safeUrls, { token });
  } catch (error) {
    console.error("Unable to clean up Paper Archive images:", error);
  }
}
