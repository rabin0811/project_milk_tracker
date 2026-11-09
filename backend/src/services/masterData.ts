import { withTransaction } from '../db/pool.js';
import {
  findFarmerById,
  insertFarmer,
  listFarmers,
  updateFarmer,
  type FarmerRow,
} from '../data/farmers.js';
import {
  findGoodsItemById,
  insertGoodsItem,
  listGoodsItems,
  updateGoodsItem,
  type GoodsItemRow,
} from '../data/goods.js';
import {
  countActiveFarmers,
  findPlaceById,
  insertPlace,
  listPlaces,
  updatePlace,
  type PlaceRow,
  type PlaceWithUsage,
} from '../data/places.js';
import { writeAudit } from '../lib/audit.js';
import { conflict, notFound } from '../lib/errors.js';
import { isUniqueViolation } from '../lib/pgErrors.js';

function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
  keys: Array<keyof T>,
): { oldValue: Partial<T>; newValue: Partial<T> } | null {
  const oldValue: Partial<T> = {};
  const newValue: Partial<T> = {};
  let changed = false;
  for (const key of keys) {
    if (before[key] !== after[key]) {
      oldValue[key] = before[key];
      newValue[key] = after[key];
      changed = true;
    }
  }
  return changed ? { oldValue, newValue } : null;
}

// Places ---------------------------------------------------------------------

export function getPlaces(): Promise<PlaceWithUsage[]> {
  return listPlaces();
}

export async function createPlace(adminId: number, input: { name: string }): Promise<PlaceRow> {
  try {
    return await withTransaction(async (client) => {
      const place = await insertPlace(client, input.name);
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'place_created',
        entityType: 'place',
        entityId: place.id,
        newValue: { name: place.name },
      });
      return place;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`A place named "${input.name}" already exists.`, 'duplicate_place_name');
    }
    throw error;
  }
}

export async function editPlace(
  adminId: number,
  id: number,
  input: { name?: string | undefined; isActive?: boolean | undefined },
): Promise<PlaceRow> {
  const current = await findPlaceById(id);
  if (!current) throw notFound('Place not found.');

  if (input.isActive === false && current.isActive) {
    const activeFarmers = await countActiveFarmers(id);
    if (activeFarmers > 0) {
      throw conflict(
        'This place still has active farmers. Deactivate or move them first.',
        'place_has_active_farmers',
      );
    }
  }

  const next = {
    name: input.name ?? current.name,
    isActive: input.isActive ?? current.isActive,
  };
  const changes = changedFields(
    { name: current.name, isActive: current.isActive },
    next,
    ['name', 'isActive'],
  );
  if (!changes) return current;

  try {
    return await withTransaction(async (client) => {
      const updated = await updatePlace(client, id, {
        name: changes.newValue.name,
        isActive: changes.newValue.isActive,
      });
      if (!updated) throw notFound('Place not found.');
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'place_updated',
        entityType: 'place',
        entityId: id,
        oldValue: changes.oldValue,
        newValue: changes.newValue,
      });
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`A place named "${next.name}" already exists.`, 'duplicate_place_name');
    }
    throw error;
  }
}

// Farmers --------------------------------------------------------------------

export function getFarmers(): Promise<FarmerRow[]> {
  return listFarmers();
}

async function requireActivePlace(placeId: number): Promise<void> {
  const place = await findPlaceById(placeId);
  if (!place) throw notFound('Place not found.');
  if (!place.isActive) throw conflict('That place is inactive.', 'place_inactive');
}

export async function createFarmer(
  adminId: number,
  input: { farmerNumber: number; name: string; placeId: number },
): Promise<FarmerRow> {
  await requireActivePlace(input.placeId);
  try {
    return await withTransaction(async (client) => {
      const farmer = await insertFarmer(client, input);
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'farmer_created',
        entityType: 'farmer',
        entityId: farmer.id,
        newValue: {
          farmerNumber: farmer.farmerNumber,
          name: farmer.name,
          placeId: farmer.placeId,
        },
      });
      return farmer;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(
        `Farmer number ${input.farmerNumber} is already in use.`,
        'duplicate_farmer_number',
      );
    }
    throw error;
  }
}

export async function editFarmer(
  adminId: number,
  id: number,
  input: {
    farmerNumber?: number | undefined;
    name?: string | undefined;
    placeId?: number | undefined;
    isActive?: boolean | undefined;
  },
): Promise<FarmerRow> {
  const current = await findFarmerById(id);
  if (!current) throw notFound('Farmer not found.');

  if (input.placeId !== undefined && input.placeId !== current.placeId) {
    await requireActivePlace(input.placeId);
  }

  const next = {
    farmerNumber: input.farmerNumber ?? current.farmerNumber,
    name: input.name ?? current.name,
    placeId: input.placeId ?? current.placeId,
    isActive: input.isActive ?? current.isActive,
  };
  const changes = changedFields(
    {
      farmerNumber: current.farmerNumber,
      name: current.name,
      placeId: current.placeId,
      isActive: current.isActive,
    },
    next,
    ['farmerNumber', 'name', 'placeId', 'isActive'],
  );
  if (!changes) return current;

  try {
    return await withTransaction(async (client) => {
      const updated = await updateFarmer(client, id, {
        farmerNumber: changes.newValue.farmerNumber,
        name: changes.newValue.name,
        placeId: changes.newValue.placeId,
        isActive: changes.newValue.isActive,
      });
      if (!updated) throw notFound('Farmer not found.');
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'farmer_updated',
        entityType: 'farmer',
        entityId: id,
        oldValue: changes.oldValue,
        newValue: changes.newValue,
      });
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(
        `Farmer number ${next.farmerNumber} is already in use.`,
        'duplicate_farmer_number',
      );
    }
    throw error;
  }
}

// Goods items ----------------------------------------------------------------

export function getGoodsItems(): Promise<GoodsItemRow[]> {
  return listGoodsItems();
}

export async function createGoodsItem(
  adminId: number,
  input: { name: string; defaultUnit: string | null },
): Promise<GoodsItemRow> {
  try {
    return await withTransaction(async (client) => {
      const item = await insertGoodsItem(client, input);
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'goods_item_created',
        entityType: 'goods_item',
        entityId: item.id,
        newValue: { name: item.name, defaultUnit: item.defaultUnit },
      });
      return item;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`A goods item named "${input.name}" already exists.`, 'duplicate_goods_name');
    }
    throw error;
  }
}

export async function editGoodsItem(
  adminId: number,
  id: number,
  input: {
    name?: string | undefined;
    defaultUnit?: string | null | undefined;
    isActive?: boolean | undefined;
  },
): Promise<GoodsItemRow> {
  const current = await findGoodsItemById(id);
  if (!current) throw notFound('Goods item not found.');

  const next = {
    name: input.name ?? current.name,
    defaultUnit: input.defaultUnit === undefined ? current.defaultUnit : input.defaultUnit,
    isActive: input.isActive ?? current.isActive,
  };
  const changes = changedFields(
    {
      name: current.name,
      defaultUnit: current.defaultUnit,
      isActive: current.isActive,
    },
    next,
    ['name', 'defaultUnit', 'isActive'],
  );
  if (!changes) return current;

  try {
    return await withTransaction(async (client) => {
      const updated = await updateGoodsItem(client, id, {
        name: changes.newValue.name,
        defaultUnit: changes.newValue.defaultUnit,
        isActive: changes.newValue.isActive,
      });
      if (!updated) throw notFound('Goods item not found.');
      await writeAudit(client, {
        actorType: 'admin',
        actorId: adminId,
        action: 'goods_item_updated',
        entityType: 'goods_item',
        entityId: id,
        oldValue: changes.oldValue,
        newValue: changes.newValue,
      });
      return updated;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw conflict(`A goods item named "${next.name}" already exists.`, 'duplicate_goods_name');
    }
    throw error;
  }
}
