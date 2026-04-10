/**
 * Resize an image in the browser before upload (WebP for smaller payloads).
 */
export async function resizeImageBeforeUpload(
  file: File,
  maxDimension: number,
  quality: number = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    let { width, height } = bitmap;
    const maxSide = Math.max(width, height);
    const scale = maxSide > maxDimension ? maxDimension / maxSide : 1;
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Could not encode image as WebP"));
        },
        "image/webp",
        quality,
      );
    });
    return blob;
  } finally {
    bitmap.close();
  }
}
