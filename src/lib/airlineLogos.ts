import garudaLogo from "@/assets/airlines/garuda-indonesia.svg";
import saudiaLogo from "@/assets/airlines/saudia.svg";
import qatarLogo from "@/assets/airlines/qatar-airways.svg";
import emiratesLogo from "@/assets/airlines/emirates.svg";
import omanAirLogo from "@/assets/airlines/oman-air.svg";
import lionAirLogo from "@/assets/airlines/lion-air.svg";
import scootLogo from "@/assets/airlines/scoot.svg";

const airlineLogosByFullName: Record<string, string> = {
  "Garuda Indonesia": garudaLogo,
  "Saudia": saudiaLogo,
  "Qatar Airways": qatarLogo,
  "Emirates": emiratesLogo,
  "Oman Air": omanAirLogo,
  "Lion Air": lionAirLogo,
  "Scoot": scootLogo,
};

// Short forms actually stored on packages (e.g. "Garuda" instead of "Garuda Indonesia")
// map to the same logo, so admin-entered data doesn't need to match exactly.
const airlineAliases: Record<string, string> = {
  "garuda": "Garuda Indonesia",
  "garuda indonesia": "Garuda Indonesia",
  "saudia": "Saudia",
  "saudi arabian airlines": "Saudia",
  "qatar": "Qatar Airways",
  "qatar airways": "Qatar Airways",
  "emirates": "Emirates",
  "oman": "Oman Air",
  "oman air": "Oman Air",
  "lion": "Lion Air",
  "lion air": "Lion Air",
  "scoot": "Scoot",
};

export const airlineLogos: Record<string, string> = new Proxy(airlineLogosByFullName, {
  get(target, prop: string) {
    if (prop in target) return target[prop as keyof typeof target];
    const alias = airlineAliases[prop.trim().toLowerCase()];
    return alias ? target[alias] : undefined;
  },
});
