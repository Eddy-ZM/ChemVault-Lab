import type { SupportedFileExtension } from "./types";

export const supportedExtensions: SupportedFileExtension[] = [
  "pdf",
  "docx",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "txt",
  "asc",
  "jdx",
  "dx",
];

export const acceptedInputTypes = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".csv",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
  ".asc",
  ".jdx",
  ".dx",
].join(",");

export function getFileExtension(fileName: string): SupportedFileExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (extension && supportedExtensions.includes(extension as SupportedFileExtension)) {
    return extension as SupportedFileExtension;
  }
  return null;
}

export function describeFileType(fileName: string, mimeType: string): string {
  const extension = getFileExtension(fileName);
  if (extension) return extension.toUpperCase();
  return mimeType || "unknown";
}

export function assertSupportedFile(fileName: string): SupportedFileExtension {
  const extension = getFileExtension(fileName);
  if (!extension) {
    throw new Error(`Unsupported file type for ${fileName}. Supported files: ${supportedExtensions.join(", ")}`);
  }
  return extension;
}
