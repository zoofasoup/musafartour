import puppeteer from "@cloudflare/puppeteer";
import type { Env } from "./_lib/env";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const ids = url.searchParams.get("ids");
  const format = url.searchParams.get("format") === "jpeg" ? "jpeg" : "png";

  if (!ids) {
    return new Response("Missing ids query param", { status: 400 });
  }

  const browser = await puppeteer.launch(context.env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });

    const printUrl = `${url.origin}/flyer-print?ids=${encodeURIComponent(ids)}`;
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    await page.waitForSelector('body[data-flyer-ready="true"]', { timeout: 20000 });

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
  } finally {
    await browser.close();
  }
};
