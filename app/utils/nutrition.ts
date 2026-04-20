import type { DailyAnalysis, Journal, Meal, Profile, WeightEntry } from "../types";
import { makeId, safeNumber } from "./misc";

export function getOrCreateJournal(journals: Journal[], date: string) {
  const found = journals.find((j) => j.date === date);
  if (found) return found;

  return {
    id: makeId(),
    date,
    meals: [],
  };
}

export function getCaloriesGoal(profile: Profile) {
  if (profile.goalPreset === "custom") {
    return safeNumber(profile.customCaloriesGoal);
  }
  return safeNumber(profile.goalPreset);
}

export function sortByDateAsc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

export function getWeightChartPoints(weights: WeightEntry[]) {
  if (weights.length === 0) return "";

  const values = weights.map((w) => safeNumber(w.weight));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 700;
  const height = 230;
  const padding = 30;

  return weights
    .map((w, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(weights.length - 1, 1);
      const y = height - padding - ((safeNumber(w.weight) - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export function getMealsTotals(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => {
      acc.calories += safeNumber(meal.calories);
      acc.protein += safeNumber(meal.protein);
      acc.carbs += safeNumber(meal.carbs);
      acc.fat += safeNumber(meal.fat);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function analyzeMeals(meals: Meal[], calorieGoal: number): DailyAnalysis {
  const totals = getMealsTotals(meals);

  const feedback: string[] = [];
  let score = 100;

  if (totals.calories < calorieGoal * 0.8) {
    feedback.push("אכלת פחות מדי ביחס ליעד היומי.");
    score -= 10;
  } else if (totals.calories > calorieGoal * 1.1) {
    feedback.push("עברת את יעד הקלוריות היומי.");
    score -= 10;
  } else {
    feedback.push("עמדת יפה ביעד הקלוריות.");
  }

  if (totals.protein < 80) {
    feedback.push("כדאי להוסיף יותר חלבון במהלך היום.");
    score -= 10;
  } else {
    feedback.push("צריכת החלבון שלך טובה.");
  }

  if (totals.carbs > 220) {
    feedback.push("צריכת הפחמימות גבוהה יחסית היום.");
    score -= 8;
  }

  if (totals.fat > 80) {
    feedback.push("צריכת השומן גבוהה יחסית היום.");
    score -= 8;
  }

  if (meals.length < 3) {
    feedback.push("נראה שהיום לא תועדו מספיק ארוחות.");
    score -= 5;
  }

  if (score < 0) score = 0;

  return {
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
    feedback,
    score,
  };
}
