import type { BaziChart } from '../types/bazi';
import { calculateKua } from '../lib/bazi';

interface KuaPanelProps {
  chart: BaziChart;
}

const AUSPICIOUS_ICON = '✦';
const INAUSPICIOUS_ICON = '✕';

export function KuaPanel({ chart }: KuaPanelProps) {
  const { input } = chart;
  const kua = calculateKua(input.year, input.gender);

  return (
    <div className="kua-panel">
      <div className="kua-header">
        <div className="kua-number">
          <span className="kua-num-label">命卦</span>
          <span className="kua-num-value">{kua.kua}</span>
          <span className="kua-trigram">{kua.name}卦</span>
        </div>
        <div className="kua-group-badge" data-group={kua.group}>
          {kua.group}
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table kua-table">
          <thead>
            <tr className="table-header">
              <th>類型</th>
              <th>方位</th>
              <th>吉凶</th>
              <th>說明</th>
            </tr>
          </thead>
          <tbody>
            {kua.directions.map((dir, idx) => (
              <tr key={dir.type} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td className="center-cell">
                  <span
                    className={`kua-dir-type ${dir.auspicious ? 'kua-auspicious' : 'kua-inauspicious'}`}
                  >
                    {dir.type}
                  </span>
                </td>
                <td className="center-cell kua-direction">{dir.direction}</td>
                <td className="center-cell">
                  <span className={dir.auspicious ? 'kua-icon-good' : 'kua-icon-bad'}>
                    {dir.auspicious ? AUSPICIOUS_ICON : INAUSPICIOUS_ICON}
                  </span>
                </td>
                <td className="kua-dir-desc">{KUA_DIR_DESC[dir.type]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="kua-note">
        ※ 以出生年計算（{input.year} 年），命卦適用於八宅派風水之臥室、大門、爐灶等方位選擇。
      </p>
    </div>
  );
}

const KUA_DIR_DESC: Record<string, string> = {
  生氣: '最佳方位，主旺財旺運，宜將床頭、座椅朝向此方。',
  天醫: '健康方位，有益身體，宜廚房、爐灶朝向此方。',
  延年: '感情婚姻方位，主和諧長壽，宜臥室大門。',
  伏位: '安穩方位，主平穩守成，書房、工作桌朝向此方。',
  禍害: '輕凶，主是非口舌，宜作廁所、雜物間。',
  六煞: '中凶，主破財桃花，避免臥室、大門朝向。',
  五鬼: '重凶，主火災、盜竊，避免廚房、財位。',
  絕命: '最凶，主重大損失，應完全避免此方位作重要用途。',
};
