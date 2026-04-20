import type { MealForm, Profile } from "../types";
import { currentTimeString } from "./dates";

export function defaultProfile(): Profile {
  return {
    fullName: "",
    age: "",
    height: "",
    startWeight: "",
    targetWeight: "",
    fitnessLevel: "בינונית",
    goalPreset: "1500",
    customCaloriesGoal: "",
    proteinGoal: "110",
    waitHoursAfterMeat: "6",
    gender: "זכר",
    goalType: "חיטוב",
    mealsPerDay: "4",
    dietStyle: "כשר",
  };
}

export function defaultMealForm(): MealForm {
  return {
    type: "ארוחת בוקר",
    kosherType: "פרווה",
    name: "",
    quantity: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
    time: currentTimeString(),
  };
}
