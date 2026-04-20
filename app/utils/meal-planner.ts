import { foodDatabase } from "../data/food-database";
import type { DietStyleType, FoodItem, Meal, MealType, Profile } from "../types";
import { makeId, safeNumber } from "./misc";

const defaultMealOrder: MealType[] = ["ארוחת בוקר", "ארוחת ביניים", "ארוחת צהריים", "ארוחת ערב"];
const defaultTimes: Record<MealType, string> = {
  "ארוחת בוקר": "08:00",
  "ארוחת ביניים": "11:00",
  "ארוחת צהריים": "14:00",
  "ארוחת ערב": "19:00",
};

export type MealPlan = {
  meals: Meal[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  notes: string[];
};

function matchesDiet(item: FoodItem, dietStyle: DietStyleType) {
  if (dietStyle === "צמחוני") return item.tags.includes("vegetarian");
  if (dietStyle === "חלבי") return item.kosherType !== "בשרי";
  return item.tags.includes("kosher");
}

function getMealSlots(profile: Profile) {
  const count = Math.min(Math.max(Math.round(safeNumber(profile.mealsPerDay) || 4), 1), 4);
  return defaultMealOrder.slice(0, count);
}

function getTargetForSlot(totalCalories: number, slot: MealType, slots: MealType[]) {
  const ratios: Record<MealType, number> = {
    "ארוחת בוקר": 0.25,
    "ארוחת ביניים": 0.14,
    "ארוחת צהריים": 0.36,
    "ארוחת ערב": 0.25,
  };

  const selectedRatioTotal = slots.reduce((sum, item) => sum + ratios[item], 0);
  return Math.round(totalCalories * (ratios[slot] / selectedRatioTotal));
}

function pickClosest(items: FoodItem[], targetCalories: number, usedIds: Set<string>) {
  return [...items].sort((a, b) => {
    const aPenalty = usedIds.has(a.id) ? 120 : 0;
    const bPenalty = usedIds.has(b.id) ? 120 : 0;
    return Math.abs(a.calories - targetCalories) + aPenalty - (Math.abs(b.calories - targetCalories) + bPenalty);
  })[0];
}

export function buildLocalMealPlan(profile: Profile, calorieGoal: number): MealPlan {
  const targetCalories = calorieGoal || 1500;
  const slots = getMealSlots(profile);
  const notes: string[] = [];
  const usedIds = new Set<string>();

  const meals = slots
    .map((slot) => {
      const slotTarget = getTargetForSlot(targetCalories, slot, slots);
      const candidates = foodDatabase.filter((item) => item.mealTypes.includes(slot) && matchesDiet(item, profile.dietStyle));
      const fallbackCandidates = foodDatabase.filter((item) => item.mealTypes.includes(slot));
      const selected = pickClosest(candidates.length ? candidates : fallbackCandidates, slotTarget, usedIds);

      if (!selected) return null;
      usedIds.add(selected.id);

      return {
        id: makeId(),
        type: slot,
        kosherType: selected.kosherType,
        name: selected.name,
        quantity: selected.quantity,
        calories: String(selected.calories),
        protein: String(selected.protein),
        carbs: String(selected.carbs),
        fat: String(selected.fat),
        notes: `נבנה אוטומטית לפי יעד של ${targetCalories} קלוריות.`,
        time: defaultTimes[slot],
      };
    })
    .filter((meal): meal is Meal => Boolean(meal));

  const totals = meals.reduce(
    (acc, meal) => {
      acc.calories += safeNumber(meal.calories);
      acc.protein += safeNumber(meal.protein);
      acc.carbs += safeNumber(meal.carbs);
      acc.fat += safeNumber(meal.fat);
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const gap = targetCalories - totals.calories;
  if (Math.abs(gap) > targetCalories * 0.12) {
    notes.push(`היום שנבנה קרוב ליעד, אבל יש פער של ${Math.abs(gap)} קלוריות. אפשר לכוון ידנית כמות בארוחה אחת.`);
  }

  if (profile.dietStyle === "כשר") {
    notes.push("התפריט משתמש בפריטי מזון עם סיווג כשרות, ועדיין כדאי לוודא התאמה לכשרות האישית שלך.");
  }

  return { meals, totals, notes };
}
