export type AdminSession = {
  role: 'admin';
  name: string;
  mustChangePassword: boolean;
};

export type StaffSession = {
  role: 'staff';
  name: string;
};

export type Session = AdminSession | StaffSession;

export type Place = {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  activeFarmers: number;
};

export type Farmer = {
  id: number;
  farmerNumber: number;
  name: string;
  placeId: number;
  placeName: string;
  isActive: boolean;
  createdAt: string;
};

export type GoodsItem = {
  id: number;
  name: string;
  defaultUnit: string | null;
  isActive: boolean;
};

export type StaffMember = {
  id: number;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

export type StaffBootstrap = {
  farmers: Array<{
    id: number;
    farmerNumber: number;
    name: string;
    placeName: string;
  }>;
  goodsItems: Array<{
    id: number;
    name: string;
    defaultUnit: string | null;
  }>;
  shifts: string[];
  serverTime: string;
};
