import { beforeEach, describe, expect, it, vi } from "vitest";
import { resizeImageBeforeUpload } from "./imageUtils";

describe("resizeImageBeforeUpload", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 2400,
        height: 1200,
        close: vi.fn(),
      })),
    );

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as never;

    HTMLCanvasElement.prototype.toBlob = vi.fn(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(new Blob(["webp"], { type: "image/webp" }));
    }) as never;
  });

  it("returns a WebP blob and scales down large images", async () => {
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const blob = await resizeImageBeforeUpload(file, 1200, 0.85);

    expect(blob.type).toBe("image/webp");
    expect(createImageBitmap).toHaveBeenCalledWith(file);
  });
});
