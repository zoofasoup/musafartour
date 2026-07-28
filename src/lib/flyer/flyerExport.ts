import html2canvas from "html2canvas";

/**
 * Captures the given DOM node (expected to be exactly 1080x1920px - see
 * FlyerPreview) and triggers a browser download of the resulting image.
 */
export async function exportFlyerAsImage(node: HTMLElement, format: "png" | "jpeg"): Promise<void> {
  // html2canvas rasterizes text itself rather than using the browser's own
  // painted layout, so if the Onest webfont hasn't finished loading yet it
  // silently substitutes a fallback font with different line-height/ascent
  // metrics - shifting and clipping text that looks fine in the live DOM.
  // Waiting for all in-flight font loads to settle keeps the two in sync.
  await document.fonts.ready;

  const canvas = await html2canvas(node, {
    width: 1080,
    height: 1920,
    scale: 1,
    useCORS: true,
    backgroundColor: null,
    // The on-screen preview wraps this node in a `transform: scale(...)` div
    // for display sizing (see FlyerGenerator.tsx). html2canvas derives
    // element bounds from getBoundingClientRect() in the cloned document,
    // and it only neutralizes an element's OWN transform, never an
    // ancestor's - so without this, every child's bounding rect comes back
    // scaled down too, producing a shrunken capture in the corner of the
    // canvas. Clearing the ancestor's transform here only affects the
    // cloned document html2canvas renders from, not the live on-screen DOM,
    // so there's no visual flash for the user.
    onclone: (_doc: Document, el: HTMLElement) => {
      if (el.parentElement) el.parentElement.style.transform = "none";
    },
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
