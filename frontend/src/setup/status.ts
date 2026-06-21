import { api } from '../api';
import type { Area, Category } from '../types';

export interface SetupStatus {
  hasAreas: boolean;
  hasTables: boolean;
  hasMenu: boolean;
  tableCount: number;
  itemCount: number;
  complete: boolean;
}

export async function getSetupStatus(outletId: string): Promise<SetupStatus> {
  const [floor, menu] = await Promise.all([
    api.getFloor(outletId),
    api.getMenu(outletId),
  ]);

  const tableCount = floor.reduce((sum, area) => sum + area.tables.length, 0);
  const itemCount = menu.categories.reduce((sum, cat) => sum + cat.items.length, 0);

  return {
    hasAreas: floor.length > 0,
    hasTables: tableCount > 0,
    hasMenu: menu.categories.length > 0 && itemCount > 0,
    tableCount,
    itemCount,
    complete: floor.length > 0 && tableCount > 0 && menu.categories.length > 0 && itemCount > 0,
  };
}

export type { Area, Category };
