import type { ReactNode } from "react";
import type { ViewType } from "../types";
import type { SyncStatus } from "../hooks/useSync";
import {
  bottomNavButton,
  bottomNavButtonActive,
  labelStyle,
  macroBarHeader,
  macroFill,
  macroTrack,
  quickAction,
  ringCenter,
  ringWrap,
  scorePill,
  summaryCard,
} from "../styles";

export function goTo(view: ViewType, setView: (view: ViewType) => void, setMenuOpen: (value: boolean) => void) {
  setView(view);
  setMenuOpen(false);
}

export function MenuButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="interactive-button"
      onClick={onClick}
      style={{
        border: active ? "1px solid #16a34a" : "1px solid #e2e8f0",
        background: active ? "#16a34a" : "#fff",
        color: active ? "#fff" : "#0f172a",
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "right",
        fontWeight: 700,
        fontSize: 15,
        width: "100%",
      }}
    >
      {label}
    </button>
  );
}

export function SummaryCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="lift-card" style={summaryCard}>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900 }}>
        {value}
        {suffix}
      </div>
    </div>
  );
}

export function CalorieRing({
  progress,
  calories,
  goal,
  remaining,
}: {
  progress: number;
  calories: number;
  goal: number;
  remaining: number;
}) {
  const color = progress < 70 ? "#f59e0b" : progress < 100 ? "#16a34a" : "#dc2626";
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;

  return (
    <div style={{ ...ringWrap, boxShadow: `0 0 25px ${color}40` }}>
      <svg width="230" height="230" viewBox="0 0 230 230" aria-hidden="true">
        <circle cx="115" cy="115" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="18" />
        <circle
          cx="115"
          cy="115"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 115 115)"
        />
      </svg>
      <div style={ringCenter}>
        <div style={{ color: "#64748b", fontSize: 13 }}>נשארו</div>
        <div style={{ fontSize: 42, fontWeight: 950, color }}>{goal ? remaining : "-"}</div>
        <div style={{ color: "#64748b", fontSize: 13 }}>{calories} / {goal || "-"} קל׳</div>
      </div>
    </div>
  );
}

export function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const percent = goal ? Math.min((value / goal) * 100, 130) : 0;

  return (
    <div>
      <div style={macroBarHeader}>
        <span>{label}</span>
        <span>
          {value} / {goal || "-"} ג׳
        </span>
      </div>
      <div style={macroTrack}>
        <div style={{ ...macroFill, width: `${percent}%`, background: value > goal && goal ? "#dc2626" : color }} />
      </div>
    </div>
  );
}

export function QuickAction({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button className="interactive-button lift-card" style={quickAction} onClick={onClick}>
      <div style={{ fontWeight: 950 }}>{title}</div>
      <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{description}</div>
    </button>
  );
}

export function ScorePill({ score }: { score: number }) {
  const color = score >= 85 ? "#15803d" : score >= 65 ? "#b45309" : "#b91c1c";

  return (
    <div style={{ ...scorePill, color, borderColor: `${color}33`, background: `${color}12` }}>
      ציון יומי {score}/100
    </div>
  );
}

export function BottomNavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  function handleClick() {
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
    onClick();
  }

  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={`עבור אל ${label}`}
      className="interactive-button"
      style={active ? bottomNavButtonActive : bottomNavButton}
      onClick={handleClick}
    >
      <span>{label}</span>
    </button>
  );
}

export function MiniInfo({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        borderRadius: 14,
        padding: "12px 14px",
        color: "#334155",
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

export function InfoList({ title, items }: { title: string; items: string[] }) {
  const safeItems = items.filter((item) => item.trim() !== "");

  return (
    <div>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {safeItems.length ? safeItems.map((item, index) => <MiniInfo key={index} text={item} />) : <EmptyBox text="אין המלצות כרגע" />}
      </div>
    </div>
  );
}

export function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px dashed #93c5fd",
        background: "#eff6ff",
        borderRadius: 8,
        padding: 22,
        textAlign: "center",
        color: "#1e3a8a",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          background: "#6366f1",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 10px",
          fontWeight: 950,
        }}
      >
        +
      </div>
      <div style={{ fontWeight: 900 }}>{text}</div>
      <div style={{ color: "#475569", marginTop: 6 }}>לחץ על פעולה מהירה כדי להתחיל.</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>{title}</div>;
}

export function Spacer({ small = false }: { small?: boolean }) {
  return <div style={{ height: small ? 10 : 14 }} />;
}

export function StatusBox({ text, variant }: { text: string; variant: "success" | "info" | "error" }) {
  const styles =
    variant === "success"
      ? {
          background: "#dcfce7",
          border: "1px solid #86efac",
          color: "#166534",
        }
      : variant === "error"
      ? {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
        }
      : {
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          color: "#1d4ed8",
        };

  return (
    <div style={{ ...styles, padding: 14, borderRadius: 16, fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
      {text}
    </div>
  );
}

export function SyncStatusIndicator({ status }: { status: SyncStatus }) {
  const map = {
    synced: {
      label: "מסונכרן",
      color: "#166534",
      background: "#dcfce7",
      border: "#86efac",
    },
    syncing: {
      label: "מסנכרן",
      color: "#1d4ed8",
      background: "#dbeafe",
      border: "#93c5fd",
    },
    pending: {
      label: "ממתין לסנכרון",
      color: "#92400e",
      background: "#fef3c7",
      border: "#fcd34d",
    },
    offline: {
      label: "ממתין לחיבור",
      color: "#92400e",
      background: "#fff7ed",
      border: "#fdba74",
    },
    error: {
      label: "ינסה שוב",
      color: "#b91c1c",
      background: "#fef2f2",
      border: "#fecaca",
    },
    local: {
      label: "שמירה מקומית",
      color: "#475569",
      background: "#f8fafc",
      border: "#cbd5e1",
    },
  } satisfies Record<SyncStatus, { label: string; color: string; background: string; border: string }>;
  const item = map[status];

  return (
    <div
      aria-live="polite"
      title={item.label}
      style={{
        alignItems: "center",
        background: item.background,
        border: `1px solid ${item.border}`,
        borderRadius: 8,
        color: item.color,
        display: "inline-flex",
        fontSize: 13,
        fontWeight: 900,
        gap: 6,
        padding: "7px 10px",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true">☁</span>
      <span>{item.label}</span>
    </div>
  );
}
