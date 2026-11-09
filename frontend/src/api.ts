import type {
  Farmer,
  GoodsItem,
  Place,
  Session,
  StaffBootstrap,
  StaffMember,
} from './types';

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const errorBody = (body ?? {}) as ApiErrorBody;
    throw new ApiError(
      errorBody.error?.message ?? `Request failed (HTTP ${response.status}).`,
      response.status,
      errorBody.error?.code,
    );
  }

  return body as T;
}

export function getMe(): Promise<Session> {
  return request<Session>('/api/me');
}

export function adminLogin(username: string, password: string): Promise<Session> {
  return request<Session>('/api/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function staffLogin(key: string, deviceId: string): Promise<Session> {
  return request<Session>('/api/auth/staff/login', {
    method: 'POST',
    body: JSON.stringify({ key, deviceId }),
  });
}

export function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>('/api/auth/admin/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getPlaces(): Promise<Place[]> {
  const data = await request<{ places: Place[] }>('/api/admin/places');
  return data.places;
}

export async function createPlace(name: string): Promise<Place> {
  const data = await request<{ place: Place }>('/api/admin/places', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  return data.place;
}

export async function updatePlace(
  id: number,
  patch: { name?: string; isActive?: boolean },
): Promise<Place> {
  const data = await request<{ place: Place }>(`/api/admin/places/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.place;
}

export async function getFarmers(): Promise<Farmer[]> {
  const data = await request<{ farmers: Farmer[] }>('/api/admin/farmers');
  return data.farmers;
}

export async function createFarmer(input: {
  farmerNumber: number;
  name: string;
  placeId: number;
}): Promise<Farmer> {
  const data = await request<{ farmer: Farmer }>('/api/admin/farmers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.farmer;
}

export async function updateFarmer(
  id: number,
  patch: { farmerNumber?: number; name?: string; placeId?: number; isActive?: boolean },
): Promise<Farmer> {
  const data = await request<{ farmer: Farmer }>(`/api/admin/farmers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.farmer;
}

export async function getGoodsItems(): Promise<GoodsItem[]> {
  const data = await request<{ goodsItems: GoodsItem[] }>('/api/admin/goods-items');
  return data.goodsItems;
}

export async function createGoodsItem(input: {
  name: string;
  defaultUnit: string | null;
}): Promise<GoodsItem> {
  const data = await request<{ goodsItem: GoodsItem }>('/api/admin/goods-items', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.goodsItem;
}

export async function updateGoodsItem(
  id: number,
  patch: { name?: string; defaultUnit?: string | null; isActive?: boolean },
): Promise<GoodsItem> {
  const data = await request<{ goodsItem: GoodsItem }>(`/api/admin/goods-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.goodsItem;
}

export async function getStaff(): Promise<StaffMember[]> {
  const data = await request<{ staff: StaffMember[] }>('/api/admin/staff');
  return data.staff;
}

export async function createStaff(name: string): Promise<{ staff: StaffMember; key: string }> {
  return request<{ staff: StaffMember; key: string }>('/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateStaff(
  id: number,
  patch: { name?: string; isActive?: boolean },
): Promise<StaffMember> {
  const data = await request<{ staff: StaffMember }>(`/api/admin/staff/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.staff;
}

export function resetStaffKey(id: number): Promise<{ staff: StaffMember; key: string }> {
  return request<{ staff: StaffMember; key: string }>(`/api/admin/staff/${id}/reset-key`, {
    method: 'POST',
  });
}

export function getStaffBootstrap(): Promise<StaffBootstrap> {
  return request<StaffBootstrap>('/api/staff/bootstrap');
}
