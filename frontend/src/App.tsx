import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import {
  adminLogin,
  changePassword,
  createFarmer,
  createGoodsItem,
  createPlace,
  createStaff,
  getFarmers,
  getGoodsItems,
  getMe,
  getPlaces,
  getStaff,
  getStaffBootstrap,
  logout,
  resetStaffKey,
  staffLogin,
  updateFarmer,
  updateGoodsItem,
  updatePlace,
  updateStaff,
} from './api';
import type {
  AdminSession,
  Farmer,
  GoodsItem,
  Place,
  Session,
  StaffBootstrap,
  StaffMember,
  StaffSession,
} from './types';
import { formatDate } from './format';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <svg viewBox="0 0 48 48" role="img">
        <path
          d="M24 4C18 13 12 20 12 28a12 12 0 0 0 24 0c0-8-6-15-12-24Z"
          fill="currentColor"
        />
        <path d="M18 28a6 6 0 0 0 12 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Splash() {
  return (
    <div className="splash">
      <Logo />
      <p>Loading Milk Tracker…</p>
    </div>
  );
}

function LoginScreen({ onSession }: { onSession: (session: Session) => void }) {
  const [mode, setMode] = useState<'admin' | 'staff'>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [key, setKey] = useState('');
  const [deviceId] = useState(() => {
    const stored = localStorage.getItem('milk.deviceId');
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem('milk.deviceId', id);
    return id;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session =
        mode === 'admin'
          ? await adminLogin(username.trim(), password)
          : await staffLogin(key.trim(), deviceId);
      onSession(session);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand brand-large">
          <Logo />
          <div>
            <h1>Milk Tracker</h1>
            <p>Daily collection, made simple.</p>
          </div>
        </div>

        <div className="tabs tabs-auth" role="tablist" aria-label="Sign in as">
          <button
            type="button"
            className={mode === 'admin' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('admin');
              setError('');
            }}
          >
            Admin
          </button>
          <button
            type="button"
            className={mode === 'staff' ? 'tab active' : 'tab'}
            onClick={() => {
              setMode('staff');
              setError('');
            }}
          >
            Field staff
          </button>
        </div>

        <form onSubmit={submit} className="stack">
          {mode === 'admin' ? (
            <>
              <label className="field">
                <span>Username</span>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span>Numeric staff key</span>
                <input
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{6,8}"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <p className="hint">
                This device is remembered as <code>{deviceId.slice(0, 8)}…</code>
              </p>
            </>
          )}

          {error && <div className="alert" role="alert">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="hint auth-footnote">
          Admin accounts are managed by the protected seed admin. Staff keys are issued by an admin.
        </p>
      </div>
    </div>
  );
}

function ChangePasswordScreen({
  name,
  onChanged,
  onLogout,
}: {
  name: string;
  onChanged: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('The new password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await changePassword(currentPassword, newPassword);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand brand-large">
          <Logo />
          <div>
            <h1>Change password</h1>
            <p>{name}, choose a new password before continuing.</p>
          </div>
        </div>
        <form onSubmit={submit} className="stack">
          <label className="field">
            <span>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label className="field">
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          {error && <div className="alert" role="alert">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => void onLogout()}>
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminDashboard({
  session,
  onLogout,
}: {
  session: AdminSession;
  onLogout: () => Promise<void>;
}) {
  const [tab, setTab] = useState<'overview' | 'places' | 'farmers' | 'goods' | 'staff'>('overview');
  const [places, setPlaces] = useState<Place[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [goods, setGoods] = useState<GoodsItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [nextPlaces, nextFarmers, nextGoods, nextStaff] = await Promise.all([
        getPlaces(),
        getFarmers(),
        getGoodsItems(),
        getStaff(),
      ]);
      setPlaces(nextPlaces);
      setFarmers(nextFarmers);
      setGoods(nextGoods);
      setStaff(nextStaff);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const activeFarmers = farmers.filter((farmer) => farmer.isActive).length;
  const activePlaces = places.filter((place) => place.isActive).length;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>Milk Tracker</span>
        </div>
        <div className="topbar-actions">
          <span className="user-chip">{session.name}</span>
          <button type="button" className="btn btn-ghost" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Admin workspace</p>
            <h1>Master data</h1>
            <p className="muted">Places, farmers, goods and field staff in one place.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <div className="notice">
          This build covers authentication and master data. Milk, cash and goods entry, sync and
          reporting routes are documented in <code>docs/api.md</code> but are not implemented in this copy.
        </div>

        {error && <div className="alert" role="alert">{error}</div>}

        <nav className="tabs" aria-label="Admin sections">
          {(
            [
              ['overview', 'Overview'],
              ['places', `Places (${places.length})`],
              ['farmers', `Farmers (${farmers.length})`],
              ['goods', `Goods (${goods.length})`],
              ['staff', `Staff (${staff.length})`],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={tab === value ? 'tab active' : 'tab'}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <section className="stack-lg">
            <div className="grid grid-4">
              <StatCard label="Active places" value={activePlaces} hint={`${places.length} total`} />
              <StatCard label="Active farmers" value={activeFarmers} hint={`${farmers.length} total`} />
              <StatCard label="Goods items" value={goods.filter((item) => item.isActive).length} hint={`${goods.length} total`} />
              <StatCard label="Field staff" value={staff.filter((member) => member.isActive).length} hint={`${staff.length} total`} />
            </div>
            <div className="card">
              <h2>Getting started</h2>
              <ol className="steps">
                <li>Add at least one collection place.</li>
                <li>Add farmers and assign each one to a place.</li>
                <li>Add goods items such as feed or sacks.</li>
                <li>Create field staff accounts and share each numeric key once.</li>
              </ol>
            </div>
          </section>
        )}

        {tab === 'places' && <PlacesTab places={places} onChanged={load} />}
        {tab === 'farmers' && (
          <FarmersTab farmers={farmers} places={places} onChanged={load} />
        )}
        {tab === 'goods' && <GoodsTab goods={goods} onChanged={load} />}
        {tab === 'staff' && <StaffTab staff={staff} onChanged={load} />}
      </main>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="card stat-card">
      <p className="eyebrow">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="hint">{hint}</p>
    </div>
  );
}

function PlacesTab({ places, onChanged }: { places: Place[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createPlace(name.trim());
      setName('');
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(place: Place) {
    setError('');
    try {
      await updatePlace(place.id, { isActive: !place.isActive });
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <section className="stack-lg">
      <form className="card form-row" onSubmit={add}>
        <label className="field grow">
          <span>New place name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Adding…' : 'Add place'}
        </button>
      </form>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Place</th>
                <th>Active farmers</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id}>
                  <td>{place.name}</td>
                  <td>{place.activeFarmers}</td>
                  <td>
                    <span className={place.isActive ? 'badge badge-ok' : 'badge badge-muted'}>
                      {place.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => void toggle(place)}>
                      {place.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {places.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">No places yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FarmersTab({
  farmers,
  places,
  onChanged,
}: {
  farmers: Farmer[];
  places: Place[];
  onChanged: () => Promise<void>;
}) {
  const activePlaces = places.filter((place) => place.isActive);
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createFarmer({
        farmerNumber: Number(number),
        name: name.trim(),
        placeId: Number(placeId),
      });
      setNumber('');
      setName('');
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(farmer: Farmer) {
    setError('');
    try {
      await updateFarmer(farmer.id, { isActive: !farmer.isActive });
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <section className="stack-lg">
      <form className="card form-row form-wrap" onSubmit={add}>
        <label className="field">
          <span>Farmer number</span>
          <input
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            type="number"
            min={1}
            required
          />
        </label>
        <label className="field grow">
          <span>Name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} />
        </label>
        <label className="field">
          <span>Place</span>
          <select value={placeId} onChange={(event) => setPlaceId(event.target.value)} required>
            <option value="">Select a place</option>
            {activePlaces.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !number || !name.trim() || !placeId}>
          {busy ? 'Adding…' : 'Add farmer'}
        </button>
      </form>
      {activePlaces.length === 0 && (
        <div className="notice">Add an active place before creating farmers.</div>
      )}
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Farmer</th>
                <th>Place</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {farmers.map((farmer) => (
                <tr key={farmer.id}>
                  <td>{farmer.farmerNumber}</td>
                  <td>{farmer.name}</td>
                  <td>{farmer.placeName}</td>
                  <td>
                    <span className={farmer.isActive ? 'badge badge-ok' : 'badge badge-muted'}>
                      {farmer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => void toggle(farmer)}>
                      {farmer.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {farmers.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">No farmers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function GoodsTab({ goods, onChanged }: { goods: GoodsItem[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await createGoodsItem({ name: name.trim(), defaultUnit: unit.trim() || null });
      setName('');
      setUnit('');
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: GoodsItem) {
    setError('');
    try {
      await updateGoodsItem(item.id, { isActive: !item.isActive });
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <section className="stack-lg">
      <form className="card form-row" onSubmit={add}>
        <label className="field grow">
          <span>Item name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <label className="field">
          <span>Default unit</span>
          <input value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={20} placeholder="sack" />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Adding…' : 'Add item'}
        </button>
      </form>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Default unit</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {goods.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.defaultUnit ?? '—'}</td>
                  <td>
                    <span className={item.isActive ? 'badge badge-ok' : 'badge badge-muted'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => void toggle(item)}>
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
              {goods.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">No goods items yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StaffTab({ staff, onChanged }: { staff: StaffMember[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await createStaff(name.trim());
      setName('');
      setNewKey(result.key);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(member: StaffMember) {
    setError('');
    try {
      await updateStaff(member.id, { isActive: !member.isActive });
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  async function reset(member: StaffMember) {
    setError('');
    try {
      const result = await resetStaffKey(member.id);
      setNewKey(result.key);
      await onChanged();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  return (
    <section className="stack-lg">
      <form className="card form-row" onSubmit={add}>
        <label className="field grow">
          <span>Staff name</span>
          <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy || !name.trim()}>
          {busy ? 'Creating…' : 'Create staff'}
        </button>
      </form>

      {newKey && (
        <div className="key-card" role="status">
          <div>
            <p className="eyebrow">New staff key</p>
            <p className="key-value">{newKey}</p>
            <p className="hint">Share this key once. It cannot be shown again after you leave this page.</p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => void navigator.clipboard.writeText(newKey)}>
            Copy key
          </button>
        </div>
      )}

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="card table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Staff</th>
                <th>Last sync</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td>{member.name}</td>
                  <td>{formatDate(member.lastSyncAt)}</td>
                  <td>
                    <span className={member.isActive ? 'badge badge-ok' : 'badge badge-muted'}>
                      {member.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => void reset(member)}>
                      Reset key
                    </button>
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => void toggle(member)}>
                      {member.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">No staff accounts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StaffDashboard({
  session,
  onLogout,
}: {
  session: StaffSession;
  onLogout: () => Promise<void>;
}) {
  const [data, setData] = useState<StaffBootstrap | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getStaffBootstrap()
      .then((bootstrap) => {
        if (!cancelled) setData(bootstrap);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>Milk Tracker</span>
        </div>
        <div className="topbar-actions">
          <span className="user-chip">{session.name}</span>
          <button type="button" className="btn btn-ghost" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
      </header>
      <main className="container">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Field workspace</p>
            <h1>Today’s collection data</h1>
            <p className="muted">Offline bootstrap data for farmers and goods items.</p>
          </div>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        {!data && !error && <p className="muted">Loading bootstrap data…</p>}
        {data && (
          <section className="stack-lg">
            <div className="grid grid-3">
              <StatCard label="Farmers" value={data.farmers.length} hint="active" />
              <StatCard label="Goods items" value={data.goodsItems.length} hint="active" />
              <StatCard label="Shifts" value={data.shifts.length} hint={data.shifts.join(' / ')} />
            </div>
            <div className="card table-card">
              <h2>Farmers</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Name</th>
                      <th>Place</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.farmers.map((farmer) => (
                      <tr key={farmer.id}>
                        <td>{farmer.farmerNumber}</td>
                        <td>{farmer.name}</td>
                        <td>{farmer.placeName}</td>
                      </tr>
                    ))}
                    {data.farmers.length === 0 && (
                      <tr>
                        <td colSpan={3} className="empty">No active farmers.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card table-card">
              <h2>Goods items</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Default unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.goodsItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td>{item.defaultUnit ?? '—'}</td>
                      </tr>
                    ))}
                    {data.goodsItems.length === 0 && (
                      <tr>
                        <td colSpan={2} className="empty">No active goods items.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="hint">Server time: {formatDate(data.serverTime)}</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((nextSession) => {
        if (!cancelled) setSession(nextSession);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Clear the local session even if the server is unreachable.
    }
    setSession(null);
  }

  if (loading) return <Splash />;
  if (!session) return <LoginScreen onSession={setSession} />;

  if (session.role === 'admin') {
    if (session.mustChangePassword) {
      return (
        <ChangePasswordScreen
          name={session.name}
          onChanged={async () => {
            const nextSession = await getMe();
            setSession(nextSession);
          }}
          onLogout={handleLogout}
        />
      );
    }
    return <AdminDashboard session={session} onLogout={handleLogout} />;
  }

  return <StaffDashboard session={session} onLogout={handleLogout} />;
}
