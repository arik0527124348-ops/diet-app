import type { WeightEntry } from "../types";
import { formatDate } from "../utils/dates";
import { safeNumber } from "../utils/misc";
import { getWeightChartPoints } from "../utils/nutrition";
import { card, dangerBtnSmall, inputStyle, primaryBtn, rowCard, twoCols, twoPanelGrid } from "../styles";
import { EmptyBox, Field, SectionTitle, Spacer } from "./ui";

type WeightTrackerViewProps = {
  weightForm: {
    date: string;
    weight: string;
  };
  sortedWeights: WeightEntry[];
  onWeightFormChange: (patch: Partial<{ date: string; weight: string }>) => void;
  onAddWeight: () => void;
  onDeleteWeight: (id: string) => void;
};

export function WeightTrackerView({
  weightForm,
  sortedWeights,
  onWeightFormChange,
  onAddWeight,
  onDeleteWeight,
}: WeightTrackerViewProps) {
  return (
    <div style={twoPanelGrid}>
      <section style={card}>
        <SectionTitle title="מעקב משקל" />
        <div style={twoCols}>
          <Field label="תאריך">
            <input
              style={inputStyle}
              type="date"
              value={weightForm.date}
              onChange={(e) => onWeightFormChange({ date: e.target.value })}
            />
          </Field>
          <Field label="משקל">
            <input
              style={inputStyle}
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              value={weightForm.weight}
              onChange={(e) => onWeightFormChange({ weight: e.target.value })}
              placeholder="למשל 82.5"
            />
          </Field>
        </div>

        <Spacer />
        <button style={primaryBtn} onClick={onAddWeight}>
          שמור משקל
        </button>

        <Spacer />
        {sortedWeights.length === 0 ? (
          <EmptyBox text="אין עדיין נתוני משקל" />
        ) : (
          <div
            style={{
              overflowX: "auto",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: 12,
              background: "#fff",
            }}
          >
            <div style={{ minWidth: 320 }}>
              <svg width="100%" height="230" viewBox="0 0 700 230" preserveAspectRatio="xMidYMid meet">
                <rect x="0" y="0" width="700" height="230" fill="#fff" />
                <line x1="30" y1="200" x2="670" y2="200" stroke="#cbd5e1" />
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={getWeightChartPoints(sortedWeights)}
                />
                {sortedWeights.map((w, index) => {
                  const values = sortedWeights.map((x) => safeNumber(x.weight));
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const padding = 30;
                  const width = 700;
                  const height = 230;
                  const x = padding + (index * (width - padding * 2)) / Math.max(sortedWeights.length - 1, 1);
                  const y = height - padding - ((safeNumber(w.weight) - min) / range) * (height - padding * 2);

                  return (
                    <g key={w.id}>
                      <circle cx={x} cy={y} r="5" fill="#2563eb" />
                      <text x={x} y={y - 10} fontSize="12" textAnchor="middle" fill="#0f172a">
                        {w.weight}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </section>

      <section style={card}>
        <SectionTitle title="היסטוריית שקילות" />
        <div style={{ display: "grid", gap: 10 }}>
          {sortedWeights.length === 0 ? (
            <EmptyBox text="אין עדיין רשומות" />
          ) : (
            [...sortedWeights].reverse().map((item) => (
              <div key={item.id} style={rowCard}>
                <div>
                  <div style={{ fontWeight: 800 }}>{item.weight} ק״ג</div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>{formatDate(item.date)}</div>
                </div>
                <button style={dangerBtnSmall} onClick={() => onDeleteWeight(item.id)}>
                  מחק
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
