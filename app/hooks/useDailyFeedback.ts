import { useMemo } from "react";
import type { Journal, Profile } from "../types";
import { safeNumber } from "../utils/misc";

export function useDailyFeedback({
  caloriesGoal,
  currentJournal,
  dairyWaitStatus,
  profile,
  todayTotals,
}: {
  caloriesGoal: number;
  currentJournal: Journal;
  dairyWaitStatus: "ready" | "waiting";
  profile: Profile;
  todayTotals: {
    calories: number;
    protein: number;
  };
}) {
  return useMemo(() => {
    const notes: string[] = [];

    if (caloriesGoal > 0) {
      if (todayTotals.calories === 0) {
        notes.push("עדיין לא הוזנה ארוחה להיום.");
      } else if (todayTotals.calories < caloriesGoal * 0.75) {
        notes.push("אתה עדיין מתחת ליעד הקלוריות של היום.");
      } else if (todayTotals.calories <= caloriesGoal) {
        notes.push("אתה באזור טוב מבחינת קלוריות.");
      } else {
        notes.push("עברת את יעד הקלוריות היומי.");
      }
    }

    const proteinGoal = safeNumber(profile.proteinGoal);
    if (proteinGoal > 0) {
      if (todayTotals.protein >= proteinGoal) {
        notes.push("עמדת ביעד החלבון של היום.");
      } else if (todayTotals.protein >= proteinGoal * 0.75) {
        notes.push("אתה קרוב מאוד ליעד החלבון.");
      } else {
        notes.push("כדאי לחזק יותר חלבון בהמשך היום.");
      }
    }

    if (dairyWaitStatus === "waiting") {
      notes.push("יש כרגע המתנה לחלבי אחרי ארוחה בשרית.");
    }

    if (currentJournal.meals.length >= 4) {
      notes.push("יפה, היום שלך מתועד בצורה מסודרת.");
    }

    return notes;
  }, [caloriesGoal, todayTotals, profile.proteinGoal, dairyWaitStatus, currentJournal.meals.length]);
}
