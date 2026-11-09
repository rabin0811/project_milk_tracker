import { listActiveFarmersForStaff } from '../data/farmers.js';
import { listActiveGoodsItemsForStaff } from '../data/goods.js';

export type StaffBootstrap = {
  farmers: Array<{ id: number; farmerNumber: number; name: string; placeName: string }>;
  goodsItems: Array<{ id: number; name: string; defaultUnit: string | null }>;
  shifts: readonly ['morning', 'evening'];
  serverTime: string;
};

/**
 * Explicit staff allow-list. Returns no rate, rate-derived amount, total,
 * goods value, or profit field. Extend only by naming fields explicitly.
 */
export async function getStaffBootstrap(): Promise<StaffBootstrap> {
  const [farmers, goodsItems] = await Promise.all([
    listActiveFarmersForStaff(),
    listActiveGoodsItemsForStaff(),
  ]);

  return {
    farmers: farmers.map((farmer) => ({
      id: farmer.id,
      farmerNumber: farmer.farmerNumber,
      name: farmer.name,
      placeName: farmer.placeName,
    })),
    goodsItems: goodsItems.map((item) => ({
      id: item.id,
      name: item.name,
      defaultUnit: item.defaultUnit,
    })),
    shifts: ['morning', 'evening'] as const,
    serverTime: new Date().toISOString(),
  };
}
