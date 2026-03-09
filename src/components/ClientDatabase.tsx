import { useState } from 'react';

import type { ClientRecord } from '../types/client';
import { HouseSystem, HOUSE_SYSTEM_INFO } from '../types/astro';
import { getAllClients, saveClient, deleteClient, generateId } from '../lib/clientDb';

interface ClientDatabaseProps {
  onLoadClient?: (client: ClientRecord) => void;
}

const HOUSE_SYSTEMS = Object.values(HouseSystem);

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

interface ClientFormData {
  name: string;
  tags: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  locationName: string;
  latitude: string;
  longitude: string;
  houseSystem: string;
  analysisNotes: string;
}

function emptyForm(): ClientFormData {
  return {
    name: '',
    tags: '',
    year: '',
    month: '',
    day: '',
    hour: '0',
    minute: '0',
    locationName: '',
    latitude: '',
    longitude: '',
    houseSystem: HouseSystem.Alcabitius,
    analysisNotes: '',
  };
}

function clientToForm(c: ClientRecord): ClientFormData {
  return {
    name: c.name,
    tags: c.tags.join(', '),
    year: String(c.birthData.year),
    month: String(c.birthData.month),
    day: String(c.birthData.day),
    hour: String(c.birthData.hour),
    minute: String(c.birthData.minute),
    locationName: c.birthData.locationName,
    latitude: String(c.birthData.latitude),
    longitude: String(c.birthData.longitude),
    houseSystem: c.houseSystem,
    analysisNotes: c.analysisNotes,
  };
}

export function ClientDatabase({ onLoadClient }: ClientDatabaseProps) {
  const [clients, setClients] = useState<ClientRecord[]>(() => getAllClients());
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ClientFormData>(emptyForm());

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  function handleNewClient() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  }

  function handleEditClient(c: ClientRecord) {
    setForm(clientToForm(c));
    setEditingId(c.id);
    setShowForm(true);
  }

  function handleDeleteClient(id: string) {
    if (!confirm('確定要刪除此客戶嗎？')) return;
    deleteClient(id);
    setClients(getAllClients());
    if (expandedId === id) setExpandedId(null);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) return alert('請輸入姓名');
    const now = Date.now();
    const client: ClientRecord = {
      id: editingId ?? generateId(),
      name,
      notes: '',
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: editingId ? (clients.find((c) => c.id === editingId)?.createdAt ?? now) : now,
      updatedAt: now,
      birthData: {
        year: parseInt(form.year) || 2000,
        month: parseInt(form.month) || 1,
        day: parseInt(form.day) || 1,
        hour: parseInt(form.hour) || 0,
        minute: parseInt(form.minute) || 0,
        latitude: parseFloat(form.latitude) || 0,
        longitude: parseFloat(form.longitude) || 0,
        locationName: form.locationName,
      },
      houseSystem: form.houseSystem,
      analysisNotes: form.analysisNotes,
    };
    saveClient(client);
    setClients(getAllClients());
    setShowForm(false);
  }

  function handleCancel() {
    setShowForm(false);
  }

  function handleLoadClient(c: ClientRecord) {
    onLoadClient?.(c);
  }

  function setField(field: keyof ClientFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="client-db">
      {/* Top bar */}
      <div className="client-db-topbar">
        <input
          type="text"
          className="client-search-input"
          placeholder="搜尋客戶姓名或標籤"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="submit-btn" onClick={handleNewClient}>
          + 新增客戶
        </button>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="client-form-overlay">
          <div className="client-form-modal">
            <h3 className="section-title">{editingId ? '編輯客戶' : '新增客戶'}</h3>
            <div className="client-form-grid">
              <label>
                姓名 *
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </label>
              <label>
                標籤（逗號分隔）
                <input
                  type="text"
                  className="form-input"
                  value={form.tags}
                  onChange={(e) => setField('tags', e.target.value)}
                  placeholder="例：VIP, 回訪"
                />
              </label>
              <label>
                出生年
                <input
                  type="number"
                  className="form-input"
                  value={form.year}
                  onChange={(e) => setField('year', e.target.value)}
                />
              </label>
              <label>
                出生月
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={12}
                  value={form.month}
                  onChange={(e) => setField('month', e.target.value)}
                />
              </label>
              <label>
                出生日
                <input
                  type="number"
                  className="form-input"
                  min={1}
                  max={31}
                  value={form.day}
                  onChange={(e) => setField('day', e.target.value)}
                />
              </label>
              <label>
                出生時（UTC）
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={23}
                  value={form.hour}
                  onChange={(e) => setField('hour', e.target.value)}
                />
              </label>
              <label>
                出生分
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={59}
                  value={form.minute}
                  onChange={(e) => setField('minute', e.target.value)}
                />
              </label>
              <label>
                出生地點
                <input
                  type="text"
                  className="form-input"
                  value={form.locationName}
                  onChange={(e) => setField('locationName', e.target.value)}
                />
              </label>
              <label>
                緯度
                <input
                  type="number"
                  className="form-input"
                  step="0.0001"
                  value={form.latitude}
                  onChange={(e) => setField('latitude', e.target.value)}
                />
              </label>
              <label>
                經度
                <input
                  type="number"
                  className="form-input"
                  step="0.0001"
                  value={form.longitude}
                  onChange={(e) => setField('longitude', e.target.value)}
                />
              </label>
              <label>
                宮位系統
                <select
                  className="form-input"
                  value={form.houseSystem}
                  onChange={(e) => setField('houseSystem', e.target.value)}
                >
                  {HOUSE_SYSTEMS.map((hs) => (
                    <option key={hs} value={hs}>
                      {HOUSE_SYSTEM_INFO[hs].name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="client-form-fullwidth">
                分析筆記
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.analysisNotes}
                  onChange={(e) => setField('analysisNotes', e.target.value)}
                />
              </label>
            </div>
            <div className="client-form-actions">
              <button className="submit-btn" onClick={handleSave}>
                儲存
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client list */}
      {filtered.length === 0 ? (
        <p className="no-data">
          {clients.length === 0
            ? '尚無客戶資料，點擊「新增客戶」開始建檔。'
            : '沒有符合搜尋條件的客戶。'}
        </p>
      ) : (
        <div className="client-list">
          {filtered.map((c) => (
            <div key={c.id} className="client-card">
              <div
                className="client-card-header"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <span className="client-name">{c.name}</span>
                <span className="client-meta">
                  {c.birthData.year}/{String(c.birthData.month).padStart(2, '0')}/
                  {String(c.birthData.day).padStart(2, '0')} · {c.birthData.locationName}
                </span>
                <div className="client-tags">
                  {c.tags.map((t) => (
                    <span key={t} className="client-tag">
                      {t}
                    </span>
                  ))}
                </div>
                <span className="client-updated">更新：{formatDate(c.updatedAt)}</span>
              </div>
              {expandedId === c.id && (
                <div className="client-card-details">
                  {c.analysisNotes && <p className="client-analysis-notes">{c.analysisNotes}</p>}
                  <div className="client-card-actions">
                    <button
                      className="submit-btn client-load-btn"
                      onClick={() => handleLoadClient(c)}
                    >
                      帶入計算
                    </button>
                    <button className="edit-btn" onClick={() => handleEditClient(c)}>
                      編輯
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteClient(c.id)}>
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
