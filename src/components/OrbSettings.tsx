/**
 * OrbSettings — compact inline editor for planet orb (moiety) values.
 * Classical system: max allowed orb between two planets = (moiety_A + moiety_B) / 2.
 */

import { useState } from 'react';
import { Planet, PLANET_INFO, DEFAULT_ORB_CONFIG } from '../types/astro';
import type { OrbConfig } from '../types/astro';

interface OrbSettingsProps {
  orbConfig: OrbConfig;
  onChange: (config: OrbConfig) => void;
}

const PLANET_ROWS: Array<{ planet: Planet }> = [
  { planet: Planet.Sun },
  { planet: Planet.Moon },
  { planet: Planet.Mercury },
  { planet: Planet.Venus },
  { planet: Planet.Mars },
  { planet: Planet.Jupiter },
  { planet: Planet.Saturn },
  { planet: Planet.Uranus },
  { planet: Planet.Neptune },
  { planet: Planet.Pluto },
];

export function OrbSettings({ orbConfig, onChange }: OrbSettingsProps) {
  const [open, setOpen] = useState(false);

  const set = (planet: Planet, val: number) =>
    onChange({ ...orbConfig, [planet]: Math.max(0, Math.min(20, val)) });

  const reset = () => onChange({ ...DEFAULT_ORB_CONFIG });

  return (
    <div className="orb-settings">
      <button
        type="button"
        className="orb-settings-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? '▲' : '▼'} 容許度設定（古典星體制）
      </button>
      {open && (
        <div className="orb-settings-panel">
          <p className="orb-hint">
            兩星之間的容許度 = (星體A + 星體B) / 2
          </p>
          <table className="orb-table" cellPadding={2} cellSpacing={0}>
            <thead>
              <tr>
                <th>星體</th>
                <th>符號</th>
                <th>Moiety（°）</th>
              </tr>
            </thead>
            <tbody>
              {PLANET_ROWS.map(({ planet }) => {
                const info = PLANET_INFO[planet];
                return (
                  <tr key={planet}>
                    <td className="orb-name-cell">{info.name}</td>
                    <td className="orb-glyph-cell">{info.glyph}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        step={0.5}
                        value={orbConfig[planet]}
                        onChange={(e) => set(planet, parseFloat(e.target.value) || 0)}
                        className="orb-input"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="orb-reset-btn" onClick={reset}>
            恢復預設值
          </button>
        </div>
      )}
    </div>
  );
}
