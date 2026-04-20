import type { DailyAnalysis, Meal, Profile } from "../types";
import type { HabitInsight, WeeklySummary } from "../utils/insights";
import { formatDate } from "../utils/dates";
import { safeNumber } from "../utils/misc";
import {
  alertPanel,
  caloriePanel,
  contentGrid,
  dashboardGrid,
  heroCopy,
  heroHeading,
  heroMetricPill,
  heroSubcopy,
  eyebrowText,
  mealListButton,
  panel,
  quickActionGrid,
  successPanel,
  summaryGrid,
  todayHero,
} from "../styles";
import {
  CalorieRing,
  EmptyBox,
  MacroBar,
  MiniInfo,
  QuickAction,
  ScorePill,
  SectionTitle,
  Spacer,
  SummaryCard,
} from "./ui";

type DairyWaitInfo = {
  status: "ready" | "waiting";
  title: string;
  description: string;
};

type DashboardViewProps = {
  selectedDate: string;
  profile: Profile;
  calorieProgress: number;
  todayTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  caloriesGoal: number;
  caloriesRemaining: number;
  dailyAnalysis: DailyAnalysis;
  carbsGoal: number;
  fatGoal: number;
  latestMeals: Meal[];
  dairyWaitInfo: DairyWaitInfo;
  dailyFeedback: string[];
  weeklySummary: WeeklySummary;
  habitInsights: HabitInsight[];
  latestWeight: { weight: string } | null;
  onOpenQuickPhoto: () => void;
  onStartMealEntry: () => void;
  onGoMenus: () => void;
  onGoAi: () => void;
  onGoProgress: () => void;
  onEditMeal: (meal: Meal) => void;
};

export function DashboardView({
  selectedDate,
  profile,
  calorieProgress,
  todayTotals,
  caloriesGoal,
  caloriesRemaining,
  dailyAnalysis,
  carbsGoal,
  fatGoal,
  latestMeals,
  dairyWaitInfo,
  dailyFeedback,
  weeklySummary,
  habitInsights,
  latestWeight,
  onOpenQuickPhoto,
  onStartMealEntry,
  onGoMenus,
  onGoAi,
  onGoProgress,
  onEditMeal,
}: DashboardViewProps) {
  return (
    <div style={dashboardGrid}>
      <section style={todayHero}>
        <div style={heroCopy}>
          <div style={eyebrowText}>{formatDate(selectedDate)}</div>
          <div style={heroHeading}>{profile.fullName ? `שלום ${profile.fullName}` : "היום שלך"}</div>
          <div style={heroSubcopy}>תעד ארוחות, צלם מנה, וקבל תמונת מצב ברורה לפני הארוחה הבאה.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            <div style={{ ...heroMetricPill, background: "#ecfdf5", color: "#166534" }}>{calorieProgress}% מהיעד</div>
            <div style={{ ...heroMetricPill, background: "#eef2ff", color: "#3730a3" }}>
              {todayTotals.protein}/{safeNumber(profile.proteinGoal) || "-"} ג׳ חלבון
            </div>
            <div style={{ ...heroMetricPill, background: "#fff7ed", color: "#9a3412" }}>ציון {dailyAnalysis.score}</div>
          </div>
        </div>

        <div style={caloriePanel}>
          <CalorieRing progress={calorieProgress} calories={todayTotals.calories} goal={caloriesGoal} remaining={caloriesRemaining} />
        </div>
      </section>

      <section style={quickActionGrid}>
        <QuickAction title="צלם ארוחה" description="ישר ליומן" onClick={onOpenQuickPhoto} />
        <QuickAction title="הוסף ארוחה" description="צילום / מאגר / ידני" onClick={onStartMealEntry} />
        <QuickAction title="תפריטים" description="יום מוכן בלי AI" onClick={onGoMenus} />
        <QuickAction title="מאמן AI" description="מה כדאי עכשיו" onClick={onGoAi} />
        <QuickAction title="שקילה" description={latestWeight ? `${latestWeight.weight} ק״ג` : "עדכן משקל"} onClick={onGoProgress} />
      </section>

      <section style={contentGrid}>
        <div style={panel}>
          <SectionTitle title="מאקרו היום" />
          <div style={{ display: "grid", gap: 14 }}>
            <MacroBar label="חלבון" value={todayTotals.protein} goal={safeNumber(profile.proteinGoal)} color="#16a34a" />
            <MacroBar label="פחמימות" value={todayTotals.carbs} goal={carbsGoal} color="#2563eb" />
            <MacroBar label="שומן" value={todayTotals.fat} goal={fatGoal} color="#db2777" />
          </div>
        </div>

        <div style={panel}>
          <SectionTitle title="יומן היום" />
          <div style={{ display: "grid", gap: 10 }}>
            {latestMeals.length ? (
              latestMeals.map((meal) => (
                <button key={meal.id} style={mealListButton} onClick={() => onEditMeal(meal)}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{meal.name}</div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {meal.type} · {meal.time || "-"}
                    </div>
                  </div>
                  <div style={{ fontWeight: 900 }}>{safeNumber(meal.calories)}</div>
                </button>
              ))
            ) : (
              <EmptyBox text="צלם או כתוב את הארוחה הראשונה שלך." />
            )}
          </div>
        </div>
      </section>

      <section style={contentGrid}>
        <div style={panel}>
          <SectionTitle title="סטטוס כשרות" />
          <div style={dairyWaitInfo.status === "waiting" ? alertPanel : successPanel}>
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>{dairyWaitInfo.title}</div>
            <div style={{ color: "#475569", lineHeight: 1.7 }}>{dairyWaitInfo.description}</div>
          </div>
        </div>

        <div style={panel}>
          <SectionTitle title="פידבק חכם" />
          <div style={{ display: "grid", gap: 10 }}>
            <ScorePill score={dailyAnalysis.score} />
            {dailyFeedback.slice(0, 3).map((item, index) => (
              <MiniInfo key={index} text={item} />
            ))}
            {dailyFeedback.length === 0 && <EmptyBox text="תיעוד קצר יספיק כדי להתחיל לקבל פידבק." />}
          </div>
        </div>
      </section>

      <section style={contentGrid}>
        <div style={panel}>
          <SectionTitle title="סיכום שבוע" />
          <div style={summaryGrid}>
            <SummaryCard label="ממוצע קלוריות" value={weeklySummary.averageCalories || "-"} />
            <SummaryCard label="עמידה ביעד" value={`${weeklySummary.goalHitPercent}%`} />
            <SummaryCard label="ימים טובים" value={`${weeklySummary.goodDays}/${weeklySummary.trackedDays || 7}`} />
            <SummaryCard label="ימים קשים" value={weeklySummary.roughDays} />
          </div>
          <Spacer />
          <MiniInfo
            text={
              weeklySummary.trackedDays
                ? `תועדו ${weeklySummary.trackedDays} ימים השבוע. ממוצע חלבון: ${weeklySummary.averageProtein} ג׳.`
                : "עדיין אין מספיק ימים מתועדים לסיכום שבוע."
            }
          />
        </div>

        <div style={panel}>
          <SectionTitle title="זיהוי הרגלים" />
          <div style={{ display: "grid", gap: 10 }}>
            {habitInsights.map((insight, index) => (
              <div
                className="lift-card"
                key={`${insight.title}-${index}`}
                style={{
                  border: "1px solid",
                  borderColor: insight.tone === "good" ? "#86efac" : insight.tone === "warning" ? "#fdba74" : "#bfdbfe",
                  background: insight.tone === "good" ? "#ecfdf5" : insight.tone === "warning" ? "#fff7ed" : "#eff6ff",
                  borderRadius: 8,
                  padding: 14,
                  boxShadow: "0 8px 20px rgba(15, 23, 42, 0.045)",
                }}
              >
                <div style={{ fontWeight: 950, marginBottom: 6 }}>{insight.title}</div>
                <div style={{ color: "#475569", lineHeight: 1.6 }}>{insight.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
