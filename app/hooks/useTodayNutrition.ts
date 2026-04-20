import { useMemo } from "react";
import type { Journal, Profile } from "../types";
import { analyzeMeals, getCaloriesGoal, getMealsTotals, getOrCreateJournal } from "../utils/nutrition";

export function useTodayNutrition(journals: Journal[], selectedDate: string, profile: Profile) {
  const currentJournal = useMemo(() => getOrCreateJournal(journals, selectedDate), [journals, selectedDate]);
  const todayTotals = useMemo(() => getMealsTotals(currentJournal.meals), [currentJournal.meals]);
  const caloriesGoal = useMemo(() => getCaloriesGoal(profile), [profile]);
  const dailyAnalysis = useMemo(
    () => analyzeMeals(currentJournal.meals, caloriesGoal),
    [currentJournal.meals, caloriesGoal],
  );

  const calorieProgress = caloriesGoal ? Math.min(Math.round((todayTotals.calories / caloriesGoal) * 100), 140) : 0;
  const caloriesRemaining = Math.max(caloriesGoal - todayTotals.calories, 0);
  const carbsGoal = caloriesGoal ? Math.round((caloriesGoal * 0.4) / 4) : 0;
  const fatGoal = caloriesGoal ? Math.round((caloriesGoal * 0.3) / 9) : 0;
  const latestMeals = currentJournal.meals.slice(0, 4);

  return {
    currentJournal,
    todayTotals,
    caloriesGoal,
    dailyAnalysis,
    calorieProgress,
    caloriesRemaining,
    carbsGoal,
    fatGoal,
    latestMeals,
  };
}
