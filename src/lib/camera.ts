import { isNativePlatform } from "@/src/lib/platform";

/**
 * Native photo capture for the log-creation flow.
 *
 * Presents the standard iOS source picker (Take Photo vs. Photo Library) via
 * `@capacitor/camera`, then returns a `File` so it drops straight into the
 * existing upload path (the flow stores `state.step3.photoFile` as a `File`).
 *
 * Uses `DataUrl` rather than `Uri`: in the remote-URL wrapper the web origin is
 * the live https site, so a `capacitor://localhost` `webPath` can't be fetched
 * cross-origin and the tap would silently fail. A `data:` URL is fetchable from
 * any origin.
 *
 * Returns `null` if the user cancels. Callers should only invoke this when
 * `isNativePlatform()` is true; on web, keep the existing `<input type="file">`.
 */
export async function pickPhoto(): Promise<File | null> {
  if (!isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );

  try {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      // Prompt → iOS action sheet letting the user choose camera or library.
      source: CameraSource.Prompt,
      promptLabelHeader: "Add a photo",
      promptLabelPhoto: "Choose from library",
      promptLabelPicture: "Take a photo",
    });

    if (!photo.dataUrl) return null;

    const res = await fetch(photo.dataUrl);
    const blob = await res.blob();
    const ext = photo.format || "jpeg";
    const type = blob.type || `image/${ext}`;
    return new File([blob], `gellog-${Date.now()}.${ext}`, { type });
  } catch (e) {
    // The plugin throws on user cancel — treat that as "no photo chosen".
    if (e instanceof Error && /cancel/i.test(e.message)) return null;
    throw e;
  }
}
