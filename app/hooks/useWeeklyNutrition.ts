import { useMemo } from "react";
import type { Journal, Profile } from "../types";
import { getHabitInsights, getWeeklySummary } from "../utils/insights";

export function useWeeklyNutrition(journals: Journal[], selectedDate: string, profile: Profile) {
  const weeklySummary = useMemo(() => getWeeklySummary(journals, selectedDate, profile), [journals, selectedDate, profile]);
  const habitInsights = useMemo(() => getHabitInsights(journals, selectedDate, profile), [journals, selectedDate, profile]);

  return {
    weeklySummary,
    habitInsights,
  };
}
