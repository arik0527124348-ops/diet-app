import { useMemo, useState } from "react";
import { menuTemplates, type MenuTemplate } from "../data/menu-templates";
import type { Meal, Profile } from "../types";
import { safeNumber } from "../utils/misc";
import {
  card,
  contentGrid,
  dashboardGrid,
  eyebrowText,
  heroCopy,
  heroHeading,
  heroSubcopy,
  inputStyle,
  mealBadge,
  mealCard,
  mealHeader,
  primaryBtn,
  secondaryBtnSmall,
  subMealCard,
  subtleText,
  summaryGrid,
  todayHero,
} from "../styles";
import { Field, MiniInfo, Spacer, SummaryCard } from "./ui";

type MenuFilter = "all" | "cut" | "mass" | "vegetarian" | "fast" | "shabbat";

const filters: Array<{ id: MenuFilter; label: string }> = [
  { id: "all", label: "הכל" },
  { id: "cut", label: "חיטוב" },
  { id: "mass", label: "מסה" },
  { id: "vegetarian", label: "צמחוני" },
  { id: "fast", label: "מהיר להכנה" },
  { id: "shabbat", label: "שבת" },
];

function getMenuPersonality(template: MenuTemplate) {
  const tagText = `${template.name} ${template.tags.join(" ")} ${template.subtitle}`.toLowerCase();

  if (tagText.includes("שבת")) {
    return {
      accent: "#ca8a04",
      label: "שבת",
      description: "משפחתי ומדוד",
    };
  }

  if (tagText.includes("צמחוני") || tagText.includes("חלבי")) {
    return {
      accent: "#0d9488",
      label: "צמחוני",
      description: "קליל בלי בשר",
    };
  }

  if (tagText.includes("מהיר") || tagText.includes("עבודה")) {
    return {
      accent: "#7c3aed",
      label: "מהיר",
      description: "מינימום הכנה",
    };
  }

  if (template.calories >= 2200 || tagText.includes("מסה")) {
    return {
      accent: "#2563eb",
      label: "מסה",
      description: "יותר אנרגיה",
    };
  }

  if (template.calories <= 1800 || tagText.includes("חיטוב") || tagText.includes("קליל")) {
    return {
      accent: "#16a34a",
      label: "חיטוב",
      description: "מדויק וקל לסריקה",
    };
  }

  return {
    accent: "#0f766e",
    label: "מאוזן",
    description: "יום יציב",
  };
}

function matchesFilter(template: MenuTemplate, filter: MenuFilter) {
  const text = `${template.name} ${template.tags.join(" ")} ${template.subtitle}`.toLowerCase();

  if (filter === "all") return true;
  if (filter === "cut") return template.calories <= 1800 || text.includes("חיטוב") || text.includes("קליל");
  if (filter === "mass") return template.calories >= 2200 || text.includes("מסה");
  if (filter === "vegetarian") return text.includes("צמחוני") || text.includes("חלבי");
  if (filter === "fast") return text.includes("מהיר") || text.includes("עבודה") || text.includes("בלי הרבה הכנה");
  if (filter === "shabbat") return text.includes("שבת");
  return true;
}

function getGapText(templateCalories: number, caloriesGoal: number) {
  if (!caloriesGoal) return "יעד לא מוגדר";

  const gap = templateCalories - caloriesGoal;
  if (gap === 0) return "בדיוק ביעד";
  if (gap > 0) return `${gap} קלוריות מעל היעד`;
  return `${Math.abs(gap)} קלוריות מתחת ליעד`;
}

function getMealMarker(type: Meal["type"]) {
  if (type === "ארוחת בוקר") return "ב";
  if (type === "ארוחת צהריים") return "צ";
  if (type === "ארוחת ערב") return "ע";
  return "נ";
}

function getMacroTotals(template: MenuTemplate) {
  return template.meals.reduce(
    (acc, meal) => {
      acc.protein += safeNumber(meal.protein);
      acc.carbs += safeNumber(meal.carbs);
      acc.fat += safeNumber(meal.fat);
      return acc;
    },
    { protein: 0, carbs: 0, fat: 0 },
  );
}

function MacroStrip({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = total ? Math.round((value / total) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "#475569" }}>
        <span>{label}</span>
        <span>{value} ג׳</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "#e2e8f0", overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color }} />
      </div>
    </div>
  );
}

function buildShoppingList(template: MenuTemplate) {
  return template.meals.map((meal) => `${meal.name} - ${meal.quantity}`).slice(0, 8);
}

type MenuTemplatesViewProps = {
  caloriesGoal: number;
  menuDetail: MenuTemplate | null;
  profile: Profile;
  selectedDate: string;
  onApplyMenuTemplate: (template: MenuTemplate) => void;
  onBackToTemplates: () => void;
  onOpenTemplate: (id: string) => void;
  onSelectedDateChange: (value: string) => void;
};

export function MenuTemplatesView({
  caloriesGoal,
  menuDetail,
  profile,
  selectedDate,
  onApplyMenuTemplate,
  onBackToTemplates,
  onOpenTemplate,
  onSelectedDateChange,
}: MenuTemplatesViewProps) {
  const [activeFilter, setActiveFilter] = useState<MenuFilter>("all");
  const [shoppingListOpen, setShoppingListOpen] = useState(false);
  const filteredTemplates = useMemo(
    () => menuTemplates.filter((template) => matchesFilter(template, activeFilter)),
    [activeFilter],
  );

  return (
    <div style={dashboardGrid}>
      <section style={todayHero}>
        <div style={heroCopy}>
          <div style={eyebrowText}>תפריטים מוכנים</div>
          <div style={heroHeading}>בחר יום שמתאים לך</div>
          <div style={heroSubcopy}>תפריטים מחושבים ממאגר מזונות, עם קלוריות, חלבון וכשרות. בלי AI ובלי ניחושים.</div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <Field label="לאיזה תאריך לשמור">
            <input style={inputStyle} type="date" value={selectedDate} onChange={(e) => onSelectedDateChange(e.target.value)} />
          </Field>
          <MiniInfo text={`היעד הנוכחי שלך: ${caloriesGoal || 0} קלוריות ו-${profile.proteinGoal || 0} ג׳ חלבון.`} />
        </div>
      </section>

      {menuDetail ? (
        <section style={{ ...card, borderTop: `5px solid ${getMenuPersonality(menuDetail).accent}`, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}>
          {(() => {
            const personality = getMenuPersonality(menuDetail);
            const macroTotals = getMacroTotals(menuDetail);
            const macroTotal = macroTotals.protein + macroTotals.carbs + macroTotals.fat;
            const shoppingList = buildShoppingList(menuDetail);

            return (
              <>
                <div style={mealHeader}>
                  <div>
                    <div style={{ ...mealBadge, color: personality.accent }}>{personality.label} · {menuDetail.tags.join(" · ")}</div>
                    <div style={{ fontSize: 30, fontWeight: 950 }}>{menuDetail.name}</div>
                    <div style={{ ...subtleText, marginTop: 6 }}>{menuDetail.subtitle}</div>
                  </div>
                  <button style={secondaryBtnSmall} onClick={onBackToTemplates}>
                    חזרה לכל התפריטים
                  </button>
                </div>

                <Spacer />
                <div style={summaryGrid}>
                  <SummaryCard label="קלוריות" value={menuDetail.calories} />
                  <SummaryCard label="חלבון" value={menuDetail.protein} suffix=" ג׳" />
                  <SummaryCard label="ארוחות" value={menuDetail.meals.length} />
                </div>

                <Spacer />
                <MiniInfo text={getGapText(menuDetail.calories, caloriesGoal)} />

                <Spacer />
                <div style={{ ...subMealCard, display: "grid", gap: 12 }}>
                  <div style={{ fontWeight: 950 }}>מאקרו בתפריט</div>
                  <MacroStrip label="חלבון" value={macroTotals.protein} total={macroTotal} color="#16a34a" />
                  <MacroStrip label="פחמימות" value={macroTotals.carbs} total={macroTotal} color="#2563eb" />
                  <MacroStrip label="שומן" value={macroTotals.fat} total={macroTotal} color="#db2777" />
                </div>

                <Spacer />
                <div style={{ display: "grid", gap: 10 }}>
                  {menuDetail.meals.map((meal, index) => (
                    <div
                      key={`${menuDetail.id}-${index}`}
                      style={{
                        ...subMealCard,
                        borderRight: `4px solid ${personality.accent}`,
                        display: "grid",
                        gridTemplateColumns: "42px 1fr",
                        gap: 12,
                        alignItems: "start",
                      }}
                    >
                      <div
                        aria-hidden="true"
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: `${personality.accent}18`,
                          color: personality.accent,
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 950,
                        }}
                      >
                        {getMealMarker(meal.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 900 }}>
                          {meal.time} · {meal.type} · <span className={meal.kosherType === "בשרי" ? "kosher-pill kosher-meat" : meal.kosherType === "חלבי" ? "kosher-pill kosher-dairy" : "kosher-pill kosher-pareve"}>{meal.kosherType}</span>
                        </div>
                        <div style={{ color: "#0f172a", fontWeight: 850, marginTop: 5 }}>{meal.name}</div>
                        <div style={{ color: "#64748b", marginTop: 4 }}>
                          {meal.quantity} · {meal.calories} קל׳ · {meal.protein} ג׳ חלבון
                        </div>
                        {(meal.notes || "").trim() && <div style={{ color: "#475569", marginTop: 6 }}>{meal.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                <Spacer />
                <button style={secondaryBtnSmall} onClick={() => setShoppingListOpen((value) => !value)}>
                  {shoppingListOpen ? "הסתר רשימת קניות" : "צור רשימת קניות"}
                </button>

                {shoppingListOpen && (
                  <>
                    <Spacer small />
                    <div style={{ ...subMealCard, display: "grid", gap: 8 }}>
                      <div style={{ fontWeight: 950 }}>רשימת קניות</div>
                      {shoppingList.map((item) => (
                        <div key={item} style={{ color: "#475569" }}>
                          {item}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Spacer />
                <button className="interactive-button" style={primaryBtn} onClick={() => onApplyMenuTemplate(menuDetail)}>
                  השתמש בתפריט היום
                </button>
              </>
            );
          })()}
        </section>
      ) : (
        <>
          <section
            style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              padding: "2px 2px 8px",
            }}
            aria-label="סינון תפריטים"
          >
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  className="interactive-button"
                  style={{
                    border: active ? "1px solid #16a34a" : "1px solid #cbd5e1",
                    background: active ? "#dcfce7" : "#fff",
                    color: active ? "#166534" : "#0f172a",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 900,
                    padding: "10px 14px",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              );
            })}
          </section>

          <section style={contentGrid}>
            {filteredTemplates.map((template) => {
              const personality = getMenuPersonality(template);
              return (
                <button
                  key={template.id}
                  className="interactive-button lift-card"
                  style={{
                    ...mealCard,
                    cursor: "pointer",
                    textAlign: "right",
                    borderTop: `5px solid ${personality.accent}`,
                  }}
                  onClick={() => onOpenTemplate(template.id)}
                >
                  <div style={mealHeader}>
                    <div>
                      <div style={{ ...mealBadge, color: personality.accent }}>{personality.label} · {personality.description}</div>
                      <div style={{ fontSize: 22, fontWeight: 950 }}>{template.name}</div>
                      <div style={{ ...subtleText, marginTop: 6 }}>{template.subtitle}</div>
                    </div>
                    <div style={{ ...secondaryBtnSmall, width: "auto" }}>פתח</div>
                  </div>

                  <Spacer />
                  <div style={{ fontSize: 34, fontWeight: 950, color: "#0f172a", lineHeight: 1 }}>
                    {template.calories}
                    <span style={{ fontSize: 15, color: "#64748b", marginRight: 5 }}>קל׳</span>
                  </div>
                  <div style={{ color: "#475569", fontWeight: 800, marginTop: 10 }}>
                    {template.protein} ג׳ חלבון · {template.meals.length} ארוחות
                  </div>
                  <div style={{ color: "#64748b", marginTop: 6 }}>{getGapText(template.calories, caloriesGoal)}</div>
                </button>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
