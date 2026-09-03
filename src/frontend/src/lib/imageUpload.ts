import type { Result, Result_10 } from "@/backend";

/** Long-edge cap for browser-side resize before upload. */
export const MAX_IMAGE_EDGE = 1200;

/** WebP encode quality (0–1) used when the browser supports WebP. */
export const WEBP_QUALITY = 0.85;

/** Target compressed size in bytes; the driver warns when it is exceeded. */
export const TARGET_MAX_BYTES = 300 * 1024;

/** Chunk size for the chunked canister upload (~1 MB). */
export const UPLOAD_CHUNK_BYTES = 1024 * 1024;

/** Result of the browser-side resize/compress step. */
export interface CompressedImage {
  /** The re-encoded blob ready to upload (WebP, or JPEG fallback). */
  blob: Blob;
  /** Original file size in bytes (before compression). */
  originalBytes: number;
  /** Compressed blob size in bytes. */
  compressedBytes: number;
  /** MIME type of the compressed blob. */
  mimeType: string;
}

/** Live progress reported by the chunked upload driver. */
export interface UploadProgress {
  /** Bytes successfully uploaded so far. */
  bytesUploaded: number;
  /** Total bytes to upload. */
  totalBytes: number;
  /** 0–100 percentage. */
  percent: number;
}

/** The three backend actor methods the chunked driver needs. */
export interface UploadDriverMethods {
  startUpload: (contentType: string, totalSize: bigint) => Promise<Result_10>;
  uploadChunk: (
    uploadId: string,
    index: bigint,
    blob: Uint8Array,
  ) => Promise<Result>;
  finishUpload: (uploadId: string, productId: bigint) => Promise<Result_10>;
}

/**
 * Maps a backend `UploadError` variant to a readable, specific message. The
 * requirement is to surface the real error, never a generic "upload failed",
 * so every variant has its own copy.
 */
export function uploadErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const kind = record.__kind__;
    if (typeof kind === "string") {
      switch (kind) {
        case "unauthorized":
          return "Your session was not attached — sign in again and retry.";
        case "notFound":
          return "The upload session was not found. It may have expired — start a new upload.";
        case "invalidContentType":
          return "This file type is not supported. Upload a JPEG, PNG, or WebP image.";
        case "svgNotAllowed":
          return "SVG files are not allowed for security reasons. Upload a raster image.";
        case "tooLarge":
          return "The image is too large. Compress it further and try again.";
        case "sizeMismatch":
          return "The uploaded size did not match the declared size. Start the upload again.";
        case "magicByteMismatch":
          return "The file content does not match its declared type. Upload a valid image.";
        case "tooManyImages":
          return "This product already has the maximum number of images. Remove one first.";
        case "chunkOutOfOrder":
          return "Upload chunks arrived out of order. Start the upload again.";
        case "uploadExpired":
          return "The upload session expired before it finished. Start a new upload.";
        default:
          return `Upload failed: ${kind}.`;
      }
    }
  }
  if (error instanceof Error) {
    if (/anonymous|not attached|session/i.test(error.message)) {
      return "Your session was not attached — sign in again and retry.";
    }
    return error.message;
  }
  return "Upload failed. Please try again.";
}

/**
 * Browser-side resize + compression. Draws the image onto a canvas capped at
 * `MAX_IMAGE_EDGE` on the long edge, then encodes as WebP at `WEBP_QUALITY`
 * with a JPEG fallback when WebP is unsupported. Returns the compressed blob
 * plus the original and compressed byte sizes so the UI can show both.
 */
export async function resizeAndCompressImage(
  file: File,
): Promise<CompressedImage> {
  const originalBytes = file.size;

  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not create an image canvas in this browser.");
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const webpSupported =
      typeof HTMLCanvasElement.prototype.toBlob === "function" &&
      canvas.toDataURL("image/webp").startsWith("data:image/webp");

    let blob: Blob;
    let mimeType: string;
    if (webpSupported) {
      blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
      mimeType = "image/webp";
    } else {
      blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
      mimeType = "image/jpeg";
    }

    return {
      blob,
      originalBytes,
      compressedBytes: blob.size,
      mimeType,
    };
  } finally {
    bitmap.close();
  }
}

/** Promise wrapper around `canvas.toBlob`. */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Could not encode image as ${type}.`));
      },
      type,
      quality,
    );
  });
}

/**
 * Chunked upload driver. Calls `startUpload`, then streams the blob in
 * `UPLOAD_CHUNK_BYTES` chunks via `uploadChunk`, then `finishUpload`. Reports
 * real progress (bytes uploaded / total) through `onProgress`. On failure it
 * throws the mapped `UploadError` message so the caller surfaces the actual
 * error. Returns the new asset id on success.
 */
export async function uploadProductImage(args: {
  blob: Blob;
  contentType: string;
  productId: bigint;
  methods: UploadDriverMethods;
  onProgress?: (progress: UploadProgress) => void;
}): Promise<string> {
  const { blob, contentType, productId, methods, onProgress } = args;
  const totalBytes = blob.size;

  const started = await methods.startUpload(contentType, BigInt(totalBytes));
  if (started.__kind__ === "err") {
    throw uploadErrorMessage(started.err);
  }
  const uploadId = started.ok;

  const bytes = new Uint8Array(await blob.arrayBuffer());
  let offset = 0;
  let index = 0n;
  while (offset < bytes.length) {
    const end = Math.min(offset + UPLOAD_CHUNK_BYTES, bytes.length);
    const chunk = bytes.slice(offset, end);
    const result = await methods.uploadChunk(uploadId, index, chunk);
    if (result.__kind__ === "err") {
      throw uploadErrorMessage(result.err);
    }
    offset = end;
    index += 1n;
    onProgress?.({
      bytesUploaded: offset,
      totalBytes,
      percent: totalBytes === 0 ? 100 : (offset / totalBytes) * 100,
    });
  }

  const finished = await methods.finishUpload(uploadId, productId);
  if (finished.__kind__ === "err") {
    throw uploadErrorMessage(finished.err);
  }
  return finished.ok;
}

/**
 * Builds the public asset URL for a product image served from the canister:
 * `https://<canister-id>.icp0.io/assets/products/<assetId>`. The canister id is
 * resolved at runtime (it is not known at build time), so callers pass it in.
 */
export function buildAssetUrl(canisterId: string, assetId: string): string {
  return `https://${canisterId}.icp0.io/assets/products/${assetId}`;
}

/** Human-readable byte size, e.g. "284 KB" or "1.2 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
