/**
 * Narrow screens: the Nama column stays in view while the table scrolls sideways, so a row is never
 * "someone, 700px to the right". A sticky cell must be opaque, so the hover and family tints that the other
 * cells get from the row are layered here as gradients on top of white.
 * Wide screens (lg and up) do not scroll sideways: the cell stays transparent and takes the row's tint.
 */
export const STICKY_HEAD =
  "max-lg:sticky max-lg:left-0 max-lg:z-[2] max-lg:bg-white max-lg:bg-[linear-gradient(hsl(var(--muted)/0.5),hsl(var(--muted)/0.5))]";

const STICKY_CELL = "max-lg:sticky max-lg:left-0 max-lg:z-[1] max-lg:bg-white max-lg:shadow-[1px_0_0_hsl(var(--muted-foreground)/0.2)]";
const ROW_HOVER = "max-lg:group-hover/row:bg-[linear-gradient(hsl(var(--muted)/0.5),hsl(var(--muted)/0.5))]";
const FAMILY_TINT = "max-lg:bg-[linear-gradient(hsl(var(--muted)/0.6),hsl(var(--muted)/0.6))]";
const PERSON_HOVER =
  "max-lg:group-hover/row:bg-[linear-gradient(hsl(var(--muted-foreground)/0.15),hsl(var(--muted-foreground)/0.15))] lg:group-hover/row:bg-muted-foreground/15";

/** Classes for the Nama cell. `familyHot` = the pointer is on any member of this row's family. */
export function stickyNameCell(inFamily: boolean, familyHot: boolean) {
  if (!inFamily) return `${STICKY_CELL} ${ROW_HOVER}`;
  return `${STICKY_CELL} ${familyHot ? FAMILY_TINT : ""} ${PERSON_HOVER}`;
}
