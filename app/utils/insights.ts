import type { Journal, Meal, Profile } from "../types";
import { getMealsTotals } from "./nutrition";
import { safeNumber } from "./misc";

type DayInsight = {
  journal: Journal;
  totals: ReturnType<typeof getMealsTotals>;
};

export type WeeklySummary = {
  trackedDays: number;
  averageCalories: number;
  averageProtein: number;
  goalHitPercent: number;
  goodDays: number;
  roughDays: number;
};

export type HabitInsight = {
  title: string;
  detail: string;
  tone: "good" | "warning" | "info";
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekWindow(selectedDate: string) {
  const end = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();
  const start = addDays(end, -6);
  return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

function getWeekDays(journals: Journal[], selectedDate: string): DayInsight[] {
  const { startKey, endKey } = getWeekWindow(selectedDate);

  return journals
    .filter((journal) => journal.date >= startKey && journal.date <= endKey && journal.meals.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((journal) => ({
      journal,
      totals: getMealsTotals(journal.meals),
    }));
}

function getMealTypeTotals(meals: Meal[], type: Meal["type"]) {
  return getMealsTotals(meals.filter((meal) => meal.type === type));
}

export function getWeeklySummary(journals: Journal[], selectedDate: string, profile: Profile): WeeklySummary {
  const days = getWeekDays(journals, selectedDate);
  const calorieGoal = profile.goalPreset === "custom" ? safeNumber(profile.customCaloriesGoal) : safeNumber(profile.goalPreset);

  if (days.length === 0) {
    return {
      trackedDays: 0,
      averageCalories: 0,
      averageProtein: 0,
      goalHitPercent: 0,
      goodDays: 0,
      roughDays: 0,
    };
  }

  const calorieSum = days.reduce((sum, day) => sum + day.totals.calories, 0);
  const proteinSum = days.reduce((sum, day) => sum + day.totals.protein, 0);
  const goodDays = calorieGoal
    ? days.filter((day) => day.totals.calories >= calorieGoal * 0.9 && day.totals.calories <= calorieGoal * 1.1).length
    : 0;
  const roughDays = calorieGoal
    ? days.filter((day) => day.totals.calories < calorieGoal * 0.75 || day.totals.calories > calorieGoal * 1.2).length
    : 0;

  return {
    trackedDays: days.length,
    averageCalories: Math.round(calorieSum / days.length),
    averageProtein: Math.round(proteinSum / days.length),
    goalHitPercent: Math.round((goodDays / days.length) * 100),
    goodDays,
    roughDays,
  };
}

export function getHabitInsights(journals: Journal[], selectedDate: string, profile: Profile): HabitInsight[] {
  const days = getWeekDays(journals, selectedDate);
  const proteinGoal = safeNumber(profile.proteinGoal);
  const calorieGoal = profile.goalPreset === "custom" ? safeNumber(profile.customCaloriesGoal) : safeNumber(profile.goalPreset);

  if (days.length < 3) {
    return [
      {
        title: "צריך עוד כמה ימים",
        detail: "אחרי 3 ימים מתועדים לפחות, האפליקציה תזהה דפוסים שחוזרים על עצמם.",
        tone: "info",
      },
    ];
  }

  const insights: HabitInsight[] = [];
  const lowProteinDays = proteinGoal
    ? days.filter((day) => day.totals.protein < proteinGoal * 0.8).length
    : 0;
  const lowDinnerProteinDays = proteinGoal
    ? days.filter((day) => getMealTypeTotals(day.journal.meals, "ארוחת ערב").protein < proteinGoal * 0.22).length
    : 0;
  const heavyLunchDays = days.filter((day) => {
    const lunch = getMealTypeTotals(day.journal.meals, "ארוחת צהריים").calories;
    return day.totals.calories > 0 && lunch / day.totals.calories >= 0.45;
  }).length;
  const overGoalDays = calorieGoal ? days.filter((day) => day.totals.calories > calorieGoal * 1.1).length : 0;

  if (lowDinnerProteinDays >= Math.ceil(days.length / 2)) {
    insights.push({
      title: "חסר חלבון בערב",
      detail: "בערבים האחרונים ארוחת הערב לא סוחבת מספיק חלבון. שווה להוסיף טונה, ביצים, יוגורט או עדשים.",
      tone: "warning",
    });
  }

  if (heavyLunchDays >= Math.ceil(days.length / 2)) {
    insights.push({
      title: "צהריים כבדה יחסית",
      detail: "ברוב הימים ארוחת הצהריים לוקחת כמעט חצי מהקלוריות. חלוקה עדינה יותר יכולה להקל על הערב.",
      tone: "warning",
    });
  }

  if (lowProteinDays >= Math.ceil(days.length / 2)) {
    insights.push({
      title: "חלבון יומי נמוך",
      detail: "אתה מפספס את יעד החלבון ברוב הימים המתועדים. זה מקום טוב לשיפור מהיר.",
      tone: "warning",
    });
  }

  if (overGoalDays >= Math.ceil(days.length / 2)) {
    insights.push({
      title: "חריגה קלורית חוזרת",
      detail: "ברוב השבוע אתה מעל היעד. כדאי להתחיל מתפריט מוכן או להקטין תוספות בצהריים.",
      tone: "warning",
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: "הכיוון השבוע יציב",
      detail: "לא זוהה דפוס בעייתי חזק. המשך לתעד, ושמור על חלבון מסודר לאורך היום.",
      tone: "good",
    });
  }

  return insights.slice(0, 3);
}
