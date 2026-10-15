/**
 * One look for every phone field: 0812 3456 7890. Whatever is typed or pasted (+62 812-3456-7890, 62812..., 812...,
 * (0812) 3456 7890) comes out as a local number with spaces every four digits. Only the digits matter to the server,
 * which strips everything else, so this is purely for reading and checking.
 */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0062")) d = d.slice(4);
  if (d.startsWith("62") && d.length > 2) d = "0" + d.slice(2);
  else if (d.startsWith("8")) d = "0" + d;
  d = d.slice(0, 15);
  const parts = [d.slice(0, 4), d.slice(4, 8), d.slice(8)].filter(Boolean);
  return parts.join(" ");
}
