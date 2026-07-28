import html2canvas from "html2canvas";

/**
 * Captures the given DOM node (expected to be exactly 1080x1920px - see
 * FlyerPreview) and triggers a browser download of the resulting image.
 */
export async function exportFlyerAsImage(node: HTMLElement, format: "png" | "jpeg"): Promise<void> {
  const canvas = await html2canvas(node, {
    width: 1080,
    height: 1920,
    scale: 1,
    useCORS: true,
    backgroundColor: null,
  });

  const mime = format === "png" ? "image/png" : "image/jpeg";
  const dataUrl = format === "jpeg" ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime);

  const dateStamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement("a");
  link.download = `flyer-umroh-${dateStamp}.${format === "png" ? "png" : "jpg"}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
