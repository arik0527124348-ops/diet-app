import type { Journal, KosherType, Profile } from "../types";
import { useDailyFeedback } from "./useDailyFeedback";
import { useDairyWaitCalculator } from "./useDairyWaitCalculator";
import { useJournalFilters } from "./useJournalFilters";
import { useTodayNutrition } from "./useTodayNutrition";
import { useWeeklyNutrition } from "./useWeeklyNutrition";

type UseNutritionParams = {
  journals: Journal[];
  profile: Profile;
  selectedDate: string;
  search: string;
  kosherFilter: "all" | KosherType;
  journalDetailDate: string | null;
  menuDetailId: string | null;
};

export function useNutrition({
  journals,
  profile,
  selectedDate,
  search,
  kosherFilter,
  journalDetailDate,
  menuDetailId,
}: UseNutritionParams) {
  const todayNutrition = useTodayNutrition(journals, selectedDate, profile);
  const journalFilters = useJournalFilters({
    journals,
    search,
    kosherFilter,
    journalDetailDate,
    menuDetailId,
  });
  const dairyWait = useDairyWaitCalculator(journals, profile);
  const weeklyNutrition = useWeeklyNutrition(journals, selectedDate, profile);
  const dailyFeedback = useDailyFeedback({
    caloriesGoal: todayNutrition.caloriesGoal,
    currentJournal: todayNutrition.currentJournal,
    dairyWaitStatus: dairyWait.dairyWaitInfo.status,
    profile,
    todayTotals: todayNutrition.todayTotals,
  });

  return {
    ...todayNutrition,
    ...weeklyNutrition,
    ...journalFilters,
    ...dairyWait,
    dailyFeedback,
  };
}
