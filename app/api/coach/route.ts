type CoachMode = "quick" | "fullDay" | "nextMeal";

type CoachRequest = {
  mode?: CoachMode;
  question?: string;
  selectedDate?: string;
  profile?: {
    fullName?: string;
    age?: string;
    height?: string;
    startWeight?: string;
    targetWeight?: string;
    fitnessLevel?: string;
    goalType?: string;
    mealsPerDay?: string;
    dietStyle?: string;
    proteinGoal?: string;
    waitHoursAfterMeat?: string;
  };
  journal?: {
    date?: string;
    meals?: Array<{
      type?: string;
      kosherType?: string;
      name?: string;
      quantity?: string;
      calories?: string;
      protein?: string;
      carbs?: string;
      fat?: string;
      notes?: string;
      time?: string;
    }>;
  };
  totals?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  calorieGoal?: number;
  proteinGoal?: number;
  dairyWaitInfo?: {
    status?: string;
    title?: string;
    description?: string;
  };
  latestWeight?: {
    date?: string;
    weight?: string;
  } | null;
};

type CoachResult = {
  title: string;
  summary: string;
  actionItems: string[];
  mealIdeas: string[];
  warnings: string[];
};

const fallbackResult: CoachResult = {
  title: "המלצה חכמה להיום",
  summary: "אפשר לקבל כיוון טוב גם בלי חיבור AI: נבדוק את הפער מול יעד הקלוריות, החלבון וכללי הכשרות.",
  actionItems: [],
  mealIdeas: [],
  warnings: [],
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CoachRequest;
    const localResult = buildLocalCoachResult(payload);

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ source: "local", result: localResult });
    }

    try {
      const aiResult = await askOpenAi(payload, localResult);
      return Response.json({ source: "openai", result: aiResult });
    } catch (error: unknown) {
      console.error("OpenAI coach fallback:", error);
      return Response.json({
        source: "local",
        result: addFallbackWarning(localResult, error),
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function buildLocalCoachResult(payload: CoachRequest): CoachResult {
  const totals = payload.totals ?? {};
  const calorieGoal = Number(payload.calorieGoal ?? 0);
  const proteinGoal = Number(payload.proteinGoal ?? payload.profile?.proteinGoal ?? 0);
  const remainingCalories = calorieGoal ? Math.max(calorieGoal - Number(totals.calories ?? 0), 0) : 0;
  const remainingProtein = proteinGoal ? Math.max(proteinGoal - Number(totals.protein ?? 0), 0) : 0;
  const meals = payload.journal?.meals ?? [];
  const actionItems: string[] = [];
  const mealIdeas: string[] = [];
  const warnings: string[] = [];

  if (meals.length === 0) {
    actionItems.push("תעד את הארוחה הראשונה כדי שההמלצות יהיו מדויקות יותר.");
  }

  if (calorieGoal > 0) {
    if (remainingCalories === 0) {
      actionItems.push("בחר ארוחה קלה מאוד להמשך היום: ירקות, שתייה ללא קלוריות או חלבון רזה לפי רעב.");
      warnings.push("כבר הגעת או עברת את יעד הקלוריות של היום.");
    } else if (remainingCalories < 350) {
      actionItems.push(`נשארו בערך ${remainingCalories} קלוריות, אז כדאי לשמור את הארוחה הבאה קטנה וממוקדת חלבון.`);
    } else {
      actionItems.push(`נשארו בערך ${remainingCalories} קלוריות. אפשר לבנות ארוחה מסודרת ולא רק נשנוש.`);
    }
  } else {
    actionItems.push("עדכן יעד קלורי בפרופיל כדי לקבל המלצות מדויקות יותר.");
  }

  if (proteinGoal > 0) {
    if (remainingProtein > 30) {
      actionItems.push(`חסר עוד בערך ${remainingProtein} גרם חלבון. תן עדיפות למקור חלבון בארוחה הקרובה.`);
    } else if (remainingProtein > 0) {
      actionItems.push(`אתה קרוב ליעד החלבון. עוד ${remainingProtein} גרם יסגרו את הפינה יפה.`);
    } else {
      actionItems.push("יעד החלבון היומי כבר נראה טוב.");
    }
  }

  if (payload.dairyWaitInfo?.status === "waiting") {
    warnings.push(payload.dairyWaitInfo.description || "יש כרגע המתנה לחלבי אחרי ארוחה בשרית.");
    mealIdeas.push("ארוחה פרווה: טונה/ביצים, ירקות, אורז או תפוח אדמה לפי הקלוריות שנשארו.");
  } else if (payload.profile?.dietStyle === "חלבי") {
    mealIdeas.push("יוגורט יווני עם פרי קטן, או קוטג׳ עם ירקות ולחם קל.");
  }

  if (payload.mode === "nextMeal") {
    mealIdeas.push("חזה עוף/טופו עם סלט גדול ופחמימה מדודה.");
    mealIdeas.push("חביתה משתי ביצים עם ירקות וגבינה רזה אם מותר חלבי.");
  } else if (payload.mode === "fullDay") {
    mealIdeas.push("חלק את מה שנשאר ל־2 ארוחות: אחת עשירה בחלבון ואחת קלה יותר.");
    mealIdeas.push("השאר 150-250 קלוריות גמישות לערב כדי לא לסיים את היום רעב.");
  } else {
    mealIdeas.push("מנה חלבונית, ירקות, ופחמימה אחת מדודה יתנו יום יציב יותר.");
  }

  if (Number(totals.carbs ?? 0) > 220) {
    warnings.push("הפחמימות היום גבוהות יחסית, אז בארוחה הבאה כדאי להפחית לחם, אורז, פסטה ומתוקים.");
  }

  if (Number(totals.fat ?? 0) > 80) {
    warnings.push("השומן היום גבוה יחסית, אז עדיף לבחור בישול ללא הרבה שמן ורוטב.");
  }

  return {
    ...fallbackResult,
    title: payload.mode === "nextMeal" ? "הארוחה הבאה שלך" : payload.mode === "fullDay" ? "תוכנית להמשך היום" : "בדיקה מהירה של היום",
    summary: `עד עכשיו תועדו ${meals.length} ארוחות: ${Number(totals.calories ?? 0)} קלוריות, ${Number(totals.protein ?? 0)} גרם חלבון.`,
    actionItems: actionItems.slice(0, 5),
    mealIdeas: mealIdeas.slice(0, 5),
    warnings: warnings.length ? warnings.slice(0, 4) : ["זו אינה המלצה רפואית. לשינוי תזונתי משמעותי כדאי להתייעץ עם איש מקצוע."],
  };
}

function addFallbackWarning(result: CoachResult, error: unknown): CoachResult {
  const message = error instanceof Error ? error.message : "";
  const reason = message.includes("insufficient_quota")
    ? "מכסת OpenAI נגמרה או שאין Billing פעיל, אז מוצגת המלצה מקומית."
    : "החיבור ל־AI לא זמין כרגע, אז מוצגת המלצה מקומית.";

  return {
    ...result,
    warnings: [reason, ...result.warnings].slice(0, 5),
  };
}

async function askOpenAi(payload: CoachRequest, localResult: CoachResult): Promise<CoachResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are a careful Hebrew nutrition coach inside a diet tracking app. Give practical, non-medical guidance. Respect kosher dairy/meat waiting constraints. Return only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Analyze this diet day and answer in Hebrew.",
            payload,
            localBaseline: localResult,
            outputShape: {
              title: "string",
              summary: "string",
              actionItems: ["string"],
              mealIdeas: ["string"],
              warnings: ["string"],
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed: ${details}`);
  }

  const data = await response.json();
  const text = extractOutputText(data);
  const parsed = JSON.parse(text) as Partial<CoachResult>;

  return normalizeCoachResult(parsed, localResult);
}

function extractOutputText(data: unknown): string {
  if (!data || typeof data !== "object") return "{}";
  const maybeText = (data as { output_text?: unknown }).output_text;
  if (typeof maybeText === "string") return maybeText;

  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return "{}";

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
    }
  }

  return "{}";
}

function normalizeCoachResult(parsed: Partial<CoachResult>, fallback: CoachResult): CoachResult {
  return {
    title: typeof parsed.title === "string" ? parsed.title : fallback.title,
    summary: typeof parsed.summary === "string" ? parsed.summary : fallback.summary,
    actionItems: normalizeList(parsed.actionItems, fallback.actionItems),
    mealIdeas: normalizeList(parsed.mealIdeas, fallback.mealIdeas),
    warnings: normalizeList(parsed.warnings, fallback.warnings),
  };
}

function normalizeList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
  return items.length ? items.slice(0, 6) : fallback;
}
