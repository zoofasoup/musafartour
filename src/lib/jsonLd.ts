/**
 * JSON for a <script type="application/ld+json"> block. JSON.stringify alone leaves "<" as it is, so a value
 * containing "</script>" would close the tag and let the rest run as markup. Escaping < > & (and the two
 * line separators) keeps the JSON identical for crawlers while making that impossible.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(new RegExp("\u2028", "g"), "\\u2028")
    .replace(new RegExp("\u2029", "g"), "\\u2029");
}
