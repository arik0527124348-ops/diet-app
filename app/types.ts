export type ViewType = "dashboard" | "daily" | "menus" | "ai" | "progress" | "profile" | "journals";

export type MealType = "ארוחת בוקר" | "ארוחת ביניים" | "ארוחת צהריים" | "ארוחת ערב";
export type KosherType = "בשרי" | "חלבי" | "פרווה";
export type FitnessLevel = "נמוכה" | "בינונית" | "גבוהה";
export type GoalPreset = "1200" | "1500" | "1800" | "custom";
export type CoachMode = "quick" | "fullDay" | "nextMeal";

export type Meal = {
  id: string;
  type: MealType;
  kosherType: KosherType;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  time: string;
};

export type FoodTag = "regular" | "vegetarian" | "dairy" | "kosher" | "highProtein" | "light";

export type FoodItem = {
  id: string;
  barcodes?: string[];
  name: string;
  quantity: string;
  kosherType: KosherType;
  mealTypes: MealType[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tags: FoodTag[];
};

export type Journal = {
  id: string;
  date: string;
  meals: Meal[];
};

export type WeightEntry = {
  id: string;
  date: string;
  weight: string;
};

export type GenderType = "זכר" | "נקבה";
export type GoalType = "חיטוב" | "שמירה" | "מסה";
export type DietStyleType = "רגיל" | "צמחוני" | "חלבי" | "כשר";

export type Profile = {
  fullName: string;
  age: string;
  height: string;
  startWeight: string;
  targetWeight: string;
  fitnessLevel: FitnessLevel;
  goalPreset: GoalPreset;
  customCaloriesGoal: string;
  proteinGoal: string;
  waitHoursAfterMeat: string;
  gender: GenderType;
  goalType: GoalType;
  mealsPerDay: string;
  dietStyle: DietStyleType;
};

export type MealForm = {
  type: MealType;
  kosherType: KosherType;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  time: string;
};

export type SyncPayload = {
  profile: Profile;
  journals: Journal[];
  weights: WeightEntry[];
  updatedAt?: string;
};

export type AiCoachResult = {
  title: string;
  summary: string;
  actionItems: string[];
  mealIdeas: string[];
  warnings: string[];
};

export type ParsedMealResult = {
  name: string;
  quantity: string;
  kosherType?: KosherType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "low" | "medium" | "high";
  notes: string;
};

export type DailyAnalysis = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  feedback: string[];
  score: number;
};
