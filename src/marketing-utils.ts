import type { AssetItem, ParsedItem } from './marketing-types';

export function parseFilename(item: AssetItem): ParsedItem {
  const ext = item.name.split('.').pop()?.toLowerCase();
  let type: ParsedItem['type'] = 'unknown';
  let campaignCode = '';

  // Check for explicit type override in folder field
  if (item.folder?.startsWith('type:')) {
    type = item.folder.replace('type:', '') as ParsedItem['type'];
  } else {
    // Legacy parsing
    if (item.name.startsWith('FLYER') && ext === 'png') {
      type = 'flyer';
      campaignCode = item.name.replace('FLYER ', '').replace(/\.png$/i, '').trim();
    } else if (item.name.startsWith('KAT') && ext === 'pdf') {
      type = 'katalog';
      campaignCode = item.name.replace('KAT ', '').replace(/\.pdf$/i, '').trim();
    } else if (item.name.startsWith('MSF_')) {
      const parts = item.name.split('_');
      if (parts.length >= 3) {
        campaignCode = parts[1];
        const typeStr = parts[2].toLowerCase();
        if (['flyer', 'copy', 'foto', 'pricelist'].includes(typeStr)) {
          type = typeStr as ParsedItem['type'];
        }
      }
    }

    if (type === 'unknown') {
      if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) type = 'foto';
      if (['txt', 'docx'].includes(ext || '')) type = 'copy';
      if (['xls', 'xlsx'].includes(ext || '')) type = 'pricelist';
      if (item.folder?.toLowerCase().includes('copy')) type = 'copy';
    }
  }

  // Set thumbnail based on type and url
  let thumbnail = undefined;
  if (type === 'flyer' || type === 'foto') {
    thumbnail = item.url; // Use original image as thumbnail
  }

  return {
    ...item,
    campaignCode,
    type,
    ext,
    thumbnail
  };
}
