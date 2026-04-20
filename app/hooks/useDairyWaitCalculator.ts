import { useMemo } from "react";
import type { Journal, Meal, Profile } from "../types";
import { formatDateTime, parseDateTime } from "../utils/dates";
import { safeNumber } from "../utils/misc";

export function useDairyWaitCalculator(journals: Journal[], profile: Profile) {
  const lastMeatyMeal = useMemo(() => {
    const items: Array<{ date: string; time: string; meal: Meal }> = [];

    for (const journal of journals) {
      for (const meal of journal.meals) {
        if (meal.kosherType === "בשרי" && meal.time) {
          items.push({ date: journal.date, time: meal.time, meal });
        }
      }
    }

    items.sort((a, b) => {
      const aDate = parseDateTime(a.date, a.time)?.getTime() ?? 0;
      const bDate = parseDateTime(b.date, b.time)?.getTime() ?? 0;
      return bDate - aDate;
    });

    return items[0] ?? null;
  }, [journals]);

  const dairyWaitInfo = useMemo(() => {
    if (!lastMeatyMeal) {
      return {
        status: "ready" as const,
        title: "אפשר חלבי",
        description: "לא נמצאה ארוחה בשרית אחרונה עם שעה.",
      };
    }

    const waitHours = safeNumber(profile.waitHoursAfterMeat) || 6;
    const lastDate = parseDateTime(lastMeatyMeal.date, lastMeatyMeal.time);

    if (!lastDate) {
      return {
        status: "ready" as const,
        title: "אפשר חלבי",
        description: "חסרה שעה לארוחה הבשרית האחרונה.",
      };
    }

    const end = new Date(lastDate.getTime() + waitHours * 60 * 60 * 1000);
    const now = new Date();

    if (now >= end) {
      return {
        status: "ready" as const,
        title: "אפשר חלבי",
        description: `ההמתנה הסתיימה. הארוחה הבשרית האחרונה הייתה ב-${formatDateTime(
          lastMeatyMeal.date,
          lastMeatyMeal.time,
        )}.`,
      };
    }

    const diffMs = end.getTime() - now.getTime();
    const totalMinutes = Math.ceil(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return {
      status: "waiting" as const,
      title: "עדיין בהמתנה לחלבי",
      description: `נשארו ${hours}:${`${minutes}`.padStart(2, "0")} שעות. ארוחה בשרית אחרונה: ${lastMeatyMeal.meal.name} ב-${lastMeatyMeal.time}.`,
    };
  }, [lastMeatyMeal, profile.waitHoursAfterMeat]);

  return {
    lastMeatyMeal,
    dairyWaitInfo,
  };
}
