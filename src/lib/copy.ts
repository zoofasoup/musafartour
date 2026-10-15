import { toast } from "sonner";

/**
 * Copy text and always tell the person: a toast on success and on failure. Falls back to a hidden textarea where
 * navigator.clipboard does not exist (plain http, such as the LAN dev link) or is refused. Returns whether it worked.
 */
export async function copyText(text: string, done = "Disalin."): Promise<boolean> {
  let ok = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch {
    ok = false;
  }
  if (!ok) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
      document.body.appendChild(area);
      area.select();
      ok = document.execCommand("copy");
      document.body.removeChild(area);
    } catch {
      ok = false;
    }
  }
  if (ok) toast.success(done);
  else toast.error("Belum bisa menyalin. Coba lagi.");
  return ok;
}
