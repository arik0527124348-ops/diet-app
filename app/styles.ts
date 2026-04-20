import type { CSSProperties } from "react";

export const appBg: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top right, rgba(22,163,74,0.12), transparent 30%), radial-gradient(circle at 15% 20%, rgba(99,102,241,0.10), transparent 28%), linear-gradient(180deg, #f8fafc 0%, #eef7f1 100%)",
  color: "#0f172a",
};

export const centerBox: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

export const pageShell: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "16px 16px 92px",
};

export const dashboardGrid: CSSProperties = {
  display: "grid",
  gap: 16,
};

export const todayHero: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
  gap: 24,
  alignItems: "center",
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(226, 232, 240, 0.78)",
  borderRadius: 8,
  padding: 24,
  boxShadow: "0 24px 54px rgba(15,23,42,0.10)",
  backdropFilter: "blur(18px)",
};

export const heroCopy: CSSProperties = {
  minWidth: 0,
};

export const eyebrowText: CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  marginBottom: 8,
};

export const heroHeading: CSSProperties = {
  fontSize: 32,
  fontWeight: 950,
  marginBottom: 8,
};

export const heroSubcopy: CSSProperties = {
  color: "#475569",
  lineHeight: 1.7,
  maxWidth: 540,
};

export const heroMetricPill: CSSProperties = {
  borderRadius: 8,
  padding: "9px 12px",
  fontWeight: 900,
  fontSize: 13,
};

export const caloriePanel: CSSProperties = {
  display: "grid",
  placeItems: "center",
  minHeight: 260,
};

export const cameraHeroButton: CSSProperties = {
  width: "min(100%, 260px)",
  minHeight: 52,
  border: "1px solid #15803d",
  borderRadius: 8,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 950,
  cursor: "pointer",
  padding: "14px 18px",
  fontSize: 16,
};

export const ringWrap: CSSProperties = {
  position: "relative",
  width: 230,
  height: 230,
  borderRadius: 8,
  background: "rgba(255,255,255,0.88)",
  display: "grid",
  placeItems: "center",
  transition: "0.2s ease",
};

export const ringCenter: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  alignContent: "center",
};

export const quickActionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};

export const quickAction: CSSProperties = {
  textAlign: "right",
  border: "1px solid rgba(226, 232, 240, 0.82)",
  background: "rgba(255, 255, 255, 0.82)",
  borderRadius: 8,
  padding: 16,
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  backdropFilter: "blur(14px)",
};

export const contentGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 16,
};

export const panel: CSSProperties = {
  background: "rgba(255, 255, 255, 0.82)",
  border: "1px solid rgba(226, 232, 240, 0.80)",
  borderRadius: 8,
  padding: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  backdropFilter: "blur(16px)",
};

export const macroBarHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontWeight: 800,
  marginBottom: 8,
};

export const macroTrack: CSSProperties = {
  height: 10,
  borderRadius: 999,
  background: "#e2e8f0",
  overflow: "hidden",
};

export const macroFill: CSSProperties = {
  height: "100%",
  borderRadius: 999,
};

export const mealListButton: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  borderRadius: 8,
  padding: 12,
  cursor: "pointer",
  textAlign: "right",
};

export const alertPanel: CSSProperties = {
  border: "1px solid #fdba74",
  background: "#fff7ed",
  borderRadius: 8,
  padding: 16,
};

export const successPanel: CSSProperties = {
  border: "1px solid #86efac",
  background: "#ecfdf5",
  borderRadius: 8,
  padding: 16,
};

export const scorePill: CSSProperties = {
  border: "1px solid",
  borderRadius: 8,
  padding: "12px 14px",
  fontWeight: 900,
};

export const bottomNav: CSSProperties = {
  position: "fixed",
  right: 18,
  left: 18,
  bottom: 18,
  zIndex: 35,
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  background: "rgba(255,255,255,0.86)",
  border: "1px solid rgba(226,232,240,0.82)",
  borderRadius: 999,
  padding: 7,
  boxShadow: "0 18px 44px rgba(15,23,42,0.18)",
  backdropFilter: "blur(18px)",
};

export const bottomNavButton: CSSProperties = {
  minHeight: 48,
  border: "1px solid transparent",
  borderRadius: 999,
  background: "transparent",
  color: "#475569",
  fontWeight: 900,
  cursor: "pointer",
  padding: "6px 4px",
  fontSize: 13,
};

export const bottomNavButtonActive: CSSProperties = {
  ...bottomNavButton,
  background: "#16a34a",
  border: "1px solid #16a34a",
  color: "#fff",
  boxShadow: "0 10px 22px rgba(22, 163, 74, 0.28)",
};

export const topBar: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  backdropFilter: "blur(10px)",
  background: "rgba(255,255,255,0.76)",
  borderBottom: "1px solid rgba(226,232,240,0.72)",
};

export const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: "4px 0",
};

export const menuToggle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  fontSize: 22,
};

export const welcomePill: CSSProperties = {
  background: "#dbeafe",
  color: "#0f172a",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
};

export const heroTitle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginBottom: 8,
};

export const bigTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 8,
};

export const subtleText: CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};

export const card: CSSProperties = {
  background: "rgba(255, 255, 255, 0.84)",
  border: "1px solid rgba(226, 232, 240, 0.82)",
  borderRadius: 8,
  padding: 20,
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  backdropFilter: "blur(16px)",
};

export const summaryCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.76)",
  border: "1px solid rgba(226, 232, 240, 0.78)",
  borderRadius: 8,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
};

export const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

export const twoPanelGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

export const profileGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

export const twoCols: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

export const macroGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};

export const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#334155",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 8,
  border: "1px solid rgba(203,213,225,0.92)",
  padding: "0 14px",
  background: "rgba(255,255,255,0.86)",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
};

export const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 8,
  border: "1px solid rgba(203,213,225,0.92)",
  padding: 14,
  background: "rgba(255,255,255,0.86)",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
};

export const fileInputStyle: CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px dashed #94a3b8",
  padding: 14,
  background: "rgba(248,250,252,0.84)",
  cursor: "pointer",
};

export const primaryBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "none",
  borderRadius: 8,
  background: "#16a34a",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
  boxShadow: "0 10px 22px rgba(22, 163, 74, 0.22)",
};

export const secondaryBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "rgba(255,255,255,0.86)",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
};

export const dangerBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #fecaca",
  borderRadius: 8,
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
};

export const secondaryBtnSmall: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "rgba(255,255,255,0.88)",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 14px",
};

export const dangerBtnSmall: CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 8,
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 14px",
};

export const buttonRow: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

export const mealCard: CSSProperties = {
  border: "1px solid rgba(226,232,240,0.82)",
  borderRadius: 8,
  padding: 16,
  background: "rgba(255,255,255,0.82)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
  backdropFilter: "blur(14px)",
};

export const subMealCard: CSSProperties = {
  border: "1px solid rgba(226,232,240,0.74)",
  borderRadius: 8,
  background: "rgba(248,250,252,0.76)",
  padding: 12,
};

export const mealHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

export const mealBadge: CSSProperties = {
  color: "#6366f1",
  fontWeight: 800,
  marginBottom: 4,
};

export const noteBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  color: "#334155",
  lineHeight: 1.6,
};

export const mealPhotoBox: CSSProperties = {
  display: "grid",
  gap: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 16,
  padding: 10,
  background: "#f8fafc",
};

export const mealPhotoPreview: CSSProperties = {
  width: "100%",
  height: 260,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "cover",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
};

export const aiResultHeader: CSSProperties = {
  border: "1px solid #bae6fd",
  borderRadius: 16,
  padding: 16,
  background: "#f0f9ff",
};

export const rowCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  flexWrap: "wrap",
};
