import { SECTOR_LABEL } from '@/services/api/providers/wits';

/** Plain-English name for a WITS sector id (falls back to the id). */
export const sectorLabel = (id: string): string => SECTOR_LABEL[id] ?? id;
