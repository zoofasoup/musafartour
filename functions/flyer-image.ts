import puppeteer from "@cloudflare/puppeteer";
import type { Env } from "./_lib/env";

// 16 matches SAFE_ZONE_MAX_ROWS in src/lib/flyer/flyerData.ts - kept as a
// local literal rather than importing across the functions/src boundary.
const MAX_IDS = 16;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ids = url.searchParams.get("ids");
  const format = url.searchParams.get("format") === "jpeg" ? "jpeg" : "png";

  if (!ids) {
    return new Response("Missing ids query param", { status: 400 });
  }

  const idList = ids.split(",").filter(Boolean);
  if (idList.length === 0 || idList.length > MAX_IDS || !idList.every((id) => UUID_RE.test(id))) {
    return new Response("Invalid ids: must be 1-16 comma-separated UUIDs", { status: 400 });
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  try {
    browser = await puppeteer.launch(context.env.BROWSER);
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.emulateTimezone("Asia/Jakarta");

    const printUrl = `${url.origin}/flyer-print?ids=${encodeURIComponent(ids)}`;
    await page.goto(printUrl, { waitUntil: "domcontentloaded" });

    const outcome = await Promise.race([
      page.waitForSelector('body[data-flyer-ready="true"]', { timeout: 20000 }).then(() => "ready" as const),
      page.waitForSelector('body[data-flyer-error]', { timeout: 20000 }).then(() => "error" as const),
    ]);

    if (outcome === "error") {
      const reason = await page.$eval("body", (el) => el.getAttribute("data-flyer-error"));
      return new Response(`Flyer render failed: ${reason ?? "unknown data error"}`, { status: 502 });
    }

    const image = await page.screenshot({
      type: format,
      ...(format === "jpeg" ? { quality: 92 } : {}),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const ext = format === "jpeg" ? "jpg" : "png";
    return new Response(image, {
      headers: {
        "content-type": format === "jpeg" ? "image/jpeg" : "image/png",
        "content-disposition": `attachment; filename="flyer-umroh-${dateStamp}.${ext}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response(`Flyer render failed: ${e instanceof Error ? e.message : String(e)}`, {
      status: 502,
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // best-effort cleanup; don't let a close() failure clobber the response already returned
      }
    }
  }
};
