export interface AssetItem {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  content?: string;
  folder?: string;
}

export interface ItineraryDay {
  dayNumber: string;
  city: string;
  date: string;
  time: string;
  activity: string;
  pic: string;
}

export interface Campaign {
  id: string;
  name: string;
  date?: string;
  items: AssetItem[];
  itineraryDays?: ItineraryDay[];
}

export interface ParsedItem extends AssetItem {
  campaignCode?: string;
  type?: 'flyer' | 'katalog' | 'copy' | 'foto' | 'pricelist' | 'unknown';
  ext?: string;
}
