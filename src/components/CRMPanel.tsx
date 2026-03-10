import { useState, useEffect, useCallback, useRef } from 'react';
import type { CRMClient, CRMClientInput } from '../types/crm';
import { EMPTY_CLIENT_INPUT } from '../types/crm';
import {
  loadClients,
  saveClients,
  createClient,
  updateClient,
  deleteClient,
  searchClients,
  sortClients,
  formatBirthDate,
} from '../lib/crm';
import { calculateNatalChart } from '../lib/astro';
import { calculateBazi } from '../lib/bazi';
import { calcLifePath } from '../lib/numerology';
import { NatalChart } from './NatalChart';
import type { NatalChart as NatalChartData } from '../types/astro';
import { HouseSystem } from '../types/astro';
import { createDebouncedGeocode } from '../lib/geocode';
import type { GeocodingResult } from '../lib/geocode';

// ── helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function clientToBirthData(c: CRMClient) {
  return {
    year: c.birthYear,
    month: c.birthMonth,
    day: c.birthDay,
    hour: c.birthHour,
    minute: c.birthMinute,
    latitude: c.latitude,
    longitude: c.longitude,
    locationName: c.locationName,
  };
}

// ── ClientForm ────────────────────────────────────────────────────────────────

interface ClientFormProps {
  initial: CRMClientInput;
  onSave: (input: CRMClientInput) => void;
  onCancel: () => void;
}

function ClientForm({ initial, onSave, onCancel }: ClientFormProps) {
  const [form, setForm] = useState<CRMClientInput>(initial);
  const [geoQuery, setGeoQuery] = useState(initial.locationName);
  const [geoResults, setGeoResults] = useState<GeocodingResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const debouncedGeocode = useRef(createDebouncedGeocode(600)).current;

  function set<K extends keyof CRMClientInput>(key: K, value: CRMClientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const handleGeoSearch = useCallback(async () => {
    if (!geoQuery.trim()) return;
    setGeoLoading(true);
    setGeoResults([]);
    try {
      const results = await debouncedGeocode(geoQuery);
      setGeoResults(results ?? []);
    } finally {
      setGeoLoading(false);
    }
  }, [geoQuery, debouncedGeocode]);

  function pickGeo(r: GeocodingResult) {
    setForm((f) => ({
      ...f,
      locationName: r.displayName,
      latitude: r.lat,
      longitude: r.lon,
    }));
    setGeoQuery(r.displayName);
    setGeoResults([]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <form className="crm-form" onSubmit={handleSubmit}>
      {/* Name */}
      <div className="crm-form-row">
        <label className="crm-label" htmlFor="crm-name">
          姓名 *
        </label>
        <input
          id="crm-name"
          className="crm-input crm-input--wide"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="客戶姓名"
          required
        />
      </div>

      {/* Birth date */}
      <div className="crm-form-group">
        <div className="crm-form-group-label">出生日期時間</div>
        <div className="crm-form-row crm-form-row--inline">
          <label className="crm-label">年</label>
          <input
            type="number" className="crm-input crm-input--year"
            value={form.birthYear} min={1900} max={2100}
            onChange={(e) => set('birthYear', parseInt(e.target.value))}
          />
          <label className="crm-label">月</label>
          <input
            type="number" className="crm-input crm-input--sm"
            value={form.birthMonth} min={1} max={12}
            onChange={(e) => set('birthMonth', parseInt(e.target.value))}
          />
          <label className="crm-label">日</label>
          <input
            type="number" className="crm-input crm-input--sm"
            value={form.birthDay} min={1} max={31}
            onChange={(e) => set('birthDay', parseInt(e.target.value))}
          />
          <label className="crm-label">時</label>
          <input
            type="number" className="crm-input crm-input--sm"
            value={form.birthHour} min={0} max={23}
            onChange={(e) => set('birthHour', parseInt(e.target.value))}
          />
          <label className="crm-label">分</label>
          <input
            type="number" className="crm-input crm-input--sm"
            value={form.birthMinute} min={0} max={59}
            onChange={(e) => set('birthMinute', parseInt(e.target.value))}
          />
        </div>
      </div>

      {/* Location */}
      <div className="crm-form-group">
        <div className="crm-form-group-label">出生地點</div>
        <div className="crm-form-row crm-form-row--inline">
          <input
            className="crm-input crm-input--wide"
            value={geoQuery}
            onChange={(e) => setGeoQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeoSearch())}
            placeholder="城市名稱搜尋"
          />
          <button
            type="button" className="crm-btn crm-btn--secondary"
            onClick={handleGeoSearch} disabled={geoLoading}
          >
            {geoLoading ? '…' : '搜尋'}
          </button>
        </div>
        {geoResults.length > 0 && (
          <ul className="crm-geo-list">
            {geoResults.slice(0, 5).map((r, i) => (
              <li key={i} className="crm-geo-item" onClick={() => pickGeo(r)}>
                {r.displayName}
              </li>
            ))}
          </ul>
        )}
        <div className="crm-form-row crm-form-row--inline crm-form-row--mt">
          <label className="crm-label">緯度</label>
          <input
            type="number" className="crm-input crm-input--coord" step="0.0001"
            value={form.latitude}
            onChange={(e) => set('latitude', parseFloat(e.target.value))}
          />
          <label className="crm-label">經度</label>
          <input
            type="number" className="crm-input crm-input--coord" step="0.0001"
            value={form.longitude}
            onChange={(e) => set('longitude', parseFloat(e.target.value))}
          />
        </div>
        <div className="crm-form-row crm-form-row--mt">
          <label className="crm-label">地點名稱</label>
          <input
            className="crm-input crm-input--wide"
            value={form.locationName}
            onChange={(e) => set('locationName', e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="crm-form-row crm-form-row--col">
        <label className="crm-label">備註</label>
        <textarea
          className="crm-textarea"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={3}
          placeholder="占卜記錄、客戶備註…"
        />
      </div>

      {/* Buttons */}
      <div className="crm-form-actions">
        <button type="submit" className="crm-btn crm-btn--primary">儲存</button>
        <button type="button" className="crm-btn crm-btn--ghost" onClick={onCancel}>取消</button>
      </div>
    </form>
  );
}

// ── ClientChart (inline chart view) ──────────────────────────────────────────

interface ClientChartProps {
  client: CRMClient;
}

function ClientChart({ client }: ClientChartProps) {
  const [chart, setChart] = useState<NatalChartData | null>(null);
  const [error, setError] = useState('');
  const [bazi, setBazi] = useState<{ year: string; month: string; day: string; hour: string } | null>(null);

  useEffect(() => {
    try {
      const bd = clientToBirthData(client);
      const c = calculateNatalChart(bd, HouseSystem.Placidus);
      setChart(c);

      const bz = calculateBazi({
        year: client.birthYear, month: client.birthMonth, day: client.birthDay,
        hour: client.birthHour, minute: client.birthMinute,
        latitude: client.latitude, longitude: client.longitude,
      });
      setBazi({
        year: bz.year.stem + bz.year.branch,
        month: bz.month.stem + bz.month.branch,
        day: bz.day.stem + bz.day.branch,
        hour: bz.hour.stem + bz.hour.branch,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '排盤失敗');
    }
  }, [client]);

  if (error) return <div className="crm-chart-error">{error}</div>;
  if (!chart) return <div className="crm-chart-loading">排盤中…</div>;

  const sun = chart.planets.find((p) => p.name === '太陽');
  const asc = chart.houseCusps[0];
  const lp = calcLifePath(client.birthYear, client.birthMonth, client.birthDay);

  return (
    <div className="crm-chart-wrapper">
      {/* Quick stats */}
      <div className="crm-quick-stats">
        {sun && (
          <div className="crm-stat">
            <span className="crm-stat-label">太陽星座</span>
            <span className="crm-stat-value">{sun.zodiacSign}</span>
          </div>
        )}
        {asc && (
          <div className="crm-stat">
            <span className="crm-stat-label">上升星座</span>
            <span className="crm-stat-value">{asc.zodiacSign}</span>
          </div>
        )}
        <div className="crm-stat">
          <span className="crm-stat-label">生命靈數</span>
          <span className="crm-stat-value">{lp}</span>
        </div>
        {bazi && (
          <div className="crm-stat crm-stat--bazi">
            <span className="crm-stat-label">八字</span>
            <span className="crm-stat-value crm-bazi-pillars">
              {bazi.year}・{bazi.month}・{bazi.day}・{bazi.hour}
            </span>
          </div>
        )}
      </div>
      {/* SVG Chart */}
      <div className="crm-chart-svg">
        <NatalChart chart={chart} size={380} />
      </div>
    </div>
  );
}

// ── ClientCard ────────────────────────────────────────────────────────────────

interface ClientCardProps {
  client: CRMClient;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientCard({ client, expanded, onToggle, onEdit, onDelete }: ClientCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDelete() {
    if (confirmDelete) {
      onDelete();
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <div className={`crm-card ${expanded ? 'crm-card--expanded' : ''}`}>
      <div className="crm-card-header" onClick={onToggle}>
        <div className="crm-card-info">
          <span className="crm-card-name">{client.name}</span>
          <span className="crm-card-date">{formatBirthDate(client)}</span>
          <span className="crm-card-location">{client.locationName}</span>
        </div>
        <div className="crm-card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="crm-btn crm-btn--icon"
            title="排盤"
            onClick={onToggle}
          >
            {expanded ? '收合 ▲' : '排盤 ▼'}
          </button>
          <button className="crm-btn crm-btn--icon" title="編輯" onClick={onEdit}>
            編輯
          </button>
          {confirmDelete ? (
            <>
              <button className="crm-btn crm-btn--danger" onClick={handleDelete}>確認刪除</button>
              <button className="crm-btn crm-btn--ghost" onClick={() => setConfirmDelete(false)}>取消</button>
            </>
          ) : (
            <button className="crm-btn crm-btn--icon crm-btn--del" onClick={handleDelete}>
              刪除
            </button>
          )}
        </div>
      </div>

      {client.notes && !expanded && (
        <div className="crm-card-notes-preview">{client.notes}</div>
      )}

      {expanded && (
        <div className="crm-card-body">
          {client.notes && <div className="crm-notes-full">{client.notes}</div>}
          <ClientChart client={client} />
        </div>
      )}
    </div>
  );
}

// ── CRMPanel ──────────────────────────────────────────────────────────────────

export function CRMPanel() {
  const [clients, setClients] = useState<CRMClient[]>(() => loadClients());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'createdAt'>('createdAt');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Persist to localStorage whenever clients change
  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  const displayed = sortClients(searchClients(clients, search), sortBy, sortBy === 'name' ? 'asc' : 'desc');

  function handleSave(input: CRMClientInput) {
    if (editingId) {
      setClients((cs) => updateClient(cs, editingId, input));
    } else {
      setClients((cs) => [...cs, createClient(input)]);
    }
    setShowForm(false);
    setEditingId(null);
  }

  function handleEdit(client: CRMClient) {
    setEditingId(client.id);
    setShowForm(true);
    setExpandedId(null);
  }

  function handleDelete(id: string) {
    setClients((cs) => deleteClient(cs, id));
    if (expandedId === id) setExpandedId(null);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
  }

  const editingClient = editingId ? clients.find((c) => c.id === editingId) : null;
  const formInitial: CRMClientInput = editingClient
    ? {
        name: editingClient.name,
        birthYear: editingClient.birthYear,
        birthMonth: editingClient.birthMonth,
        birthDay: editingClient.birthDay,
        birthHour: editingClient.birthHour,
        birthMinute: editingClient.birthMinute,
        latitude: editingClient.latitude,
        longitude: editingClient.longitude,
        locationName: editingClient.locationName,
        notes: editingClient.notes,
      }
    : { ...EMPTY_CLIENT_INPUT };

  return (
    <div className="crm-panel">
      {/* ── Header ── */}
      <div className="crm-header">
        <div className="crm-header-left">
          <h2 className="crm-title">客戶管理</h2>
          <span className="crm-count">{clients.length} 位客戶</span>
        </div>
        {!showForm && (
          <button
            className="crm-btn crm-btn--primary"
            onClick={() => { setEditingId(null); setShowForm(true); }}
          >
            ＋ 新增客戶
          </button>
        )}
      </div>

      {/* ── Add/Edit form ── */}
      {showForm && (
        <div className="crm-form-section">
          <h3 className="crm-form-title">{editingId ? '編輯客戶' : '新增客戶'}</h3>
          <ClientForm
            initial={formInitial}
            onSave={handleSave}
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* ── Search & sort ── */}
      {!showForm && (
        <div className="crm-toolbar">
          <input
            className="crm-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋姓名、地點、備註…"
          />
          <select
            className="crm-sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="createdAt">最新建立</option>
            <option value="name">姓名排序</option>
          </select>
        </div>
      )}

      {/* ── Client list ── */}
      {!showForm && (
        <div className="crm-list">
          {displayed.length === 0 && (
            <div className="crm-empty">
              {search ? '找不到符合的客戶' : '尚無客戶資料，點擊「新增客戶」開始建檔'}
            </div>
          )}
          {displayed.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              expanded={expandedId === client.id}
              onToggle={() => setExpandedId((id) => (id === client.id ? null : client.id))}
              onEdit={() => handleEdit(client)}
              onDelete={() => handleDelete(client.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
