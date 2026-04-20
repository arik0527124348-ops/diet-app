type ParseMealRequest = {
  description?: string;
  imageDataUrl?: string;
  profile?: {
    dietStyle?: string;
  };
};

type ParsedMeal = {
  name: string;
  quantity: string;
  kosherType: "בשרי" | "חלבי" | "פרווה";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "low" | "medium" | "high";
  notes: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ParseMealRequest;
    const description = payload.description?.trim() ?? "";
    const imageDataUrl = payload.imageDataUrl?.trim() ?? "";

    if (!description && !imageDataUrl) {
      return Response.json({ error: "חסר תיאור או תמונת ארוחה" }, { status: 400 });
    }

    const localResult = estimateMealLocally(description || "ארוחה מצולמת");

    if (!process.env.OPENAI_API_KEY) {
      return Response.json({ source: "local", result: localResult });
    }

    try {
      const aiResult = await parseMealWithOpenAi({
        description,
        imageDataUrl,
        dietStyle: payload.profile?.dietStyle,
        localResult,
      });
      return Response.json({ source: "openai", result: aiResult });
    } catch (error: unknown) {
      console.error("OpenAI meal parse fallback:", error);
      return Response.json({
        source: "local",
        result: {
          ...localResult,
          notes: `${localResult.notes} החיבור ל-AI לא זמין כרגע, אז זו הערכה מקומית.`,
        },
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

function estimateMealLocally(description: string): ParsedMeal {
  const text = description.toLowerCase();
  const items = [
    { keys: ["ביצה", "ביצים"], calories: 75, protein: 6, carbs: 0.5, fat: 5, quantity: "ביצה" },
    { keys: ["פרוסת לחם", "לחם"], calories: 80, protein: 3, carbs: 15, fat: 1, quantity: "פרוסה" },
    { keys: ["אורז"], calories: 180, protein: 4, carbs: 39, fat: 1, quantity: "כוס מבושלת" },
    { keys: ["חזה עוף", "עוף"], calories: 165, protein: 31, carbs: 0, fat: 4, quantity: "100 גרם" },
    { keys: ["טונה"], calories: 120, protein: 26, carbs: 0, fat: 1, quantity: "קופסה מסוננת" },
    { keys: ["קוטג"], calories: 140, protein: 18, carbs: 5, fat: 5, quantity: "גביע קטן" },
    { keys: ["יוגורט"], calories: 130, protein: 12, carbs: 10, fat: 4, quantity: "גביע" },
    { keys: ["סלט", "ירקות"], calories: 60, protein: 2, carbs: 10, fat: 1, quantity: "קערה" },
    { keys: ["אבוקדו"], calories: 160, protein: 2, carbs: 8, fat: 15, quantity: "חצי אבוקדו" },
    { keys: ["בננה"], calories: 105, protein: 1, carbs: 27, fat: 0, quantity: "בננה" },
  ];

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const matched: string[] = [];

  for (const item of items) {
    if (!item.keys.some((key) => text.includes(key))) continue;

    const multiplier = findMultiplier(text, item.keys);
    totals.calories += item.calories * multiplier;
    totals.protein += item.protein * multiplier;
    totals.carbs += item.carbs * multiplier;
    totals.fat += item.fat * multiplier;
    matched.push(multiplier > 1 ? `${multiplier} ${item.quantity}` : item.quantity);
  }

  if (matched.length === 0) {
    return {
      name: description,
      quantity: "מנה אחת",
      kosherType: inferKosherType(text),
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      confidence: "low",
      notes: "לא הצלחתי לזהות מספיק רכיבים בלי AI. כדאי למלא ידנית או לסדר Billing ב-OpenAI.",
    };
  }

  return {
    name: description,
    quantity: matched.join(", "),
    kosherType: inferKosherType(text),
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    confidence: matched.length >= 2 ? "medium" : "low",
    notes: "הערכה מקומית לפי רכיבים נפוצים. הערכים הם בקירוב.",
  };
}

function inferKosherType(text: string): "בשרי" | "חלבי" | "פרווה" {
  const normalized = text.toLowerCase();
  const meatWords = [
    "עוף",
    "חזה עוף",
    "בשר",
    "סטייק",
    "המבורגר",
    "קציצה",
    "קציצות",
    "הודו",
    "שווארמה",
    "נקניק",
    "שניצל",
    "פרגית",
  ];
  const dairyWords = [
    "גבינה",
    "קוטג",
    "קוטג׳",
    "יוגורט",
    "חלב",
    "חלבי",
    "שמנת",
    "צהובה",
    "מוצרלה",
    "בולגרית",
    "פטה",
  ];

  const hasMeat = meatWords.some((word) => normalized.includes(word));
  const hasDairy = dairyWords.some((word) => normalized.includes(word));

  if (hasMeat) return "בשרי";
  if (hasDairy) return "חלבי";
  return "פרווה";
}

function findMultiplier(text: string, keys: string[]) {
  for (const key of keys) {
    const index = text.indexOf(key);
    if (index < 0) continue;
    const before = text.slice(Math.max(0, index - 8), index);
    const match = before.match(/(\d+(?:\.\d+)?)\s*$/);
    if (match) return Number(match[1]) || 1;
  }

  return 1;
}

async function parseMealWithOpenAi({
  description,
  imageDataUrl,
  dietStyle,
  localResult,
}: {
  description: string;
  imageDataUrl: string;
  dietStyle: string | undefined;
  localResult: ParsedMeal;
}): Promise<ParsedMeal> {
  const content: Array<
    | {
        type: "input_text";
        text: string;
      }
    | {
        type: "input_image";
        image_url: string;
        detail: "low" | "high" | "auto";
      }
  > = [
    {
      type: "input_text",
      text: JSON.stringify({
        mealDescription: description || "Analyze the attached meal image.",
        dietStyle: dietStyle || "לא צוין",
        localBaseline: localResult,
        instructions:
          "Estimate the visible food items, portion size, calories and macros. If the image is unclear, keep confidence low and explain what is uncertain.",
        outputShape: {
          name: "short meal name in Hebrew",
          quantity: "estimated quantity in Hebrew",
          kosherType: "בשרי | חלבי | פרווה. If chicken/meat/turkey is visible choose בשרי. If cheese/milk/yogurt is visible choose חלבי. Otherwise choose פרווה.",
          calories: "number",
          protein: "number grams",
          carbs: "number grams",
          fat: "number grams",
          confidence: "low | medium | high",
          notes: "short Hebrew explanation",
        },
      }),
    },
  ];

  if (imageDataUrl) {
    content.push({
      type: "input_image",
      image_url: imageDataUrl,
      detail: "low",
    });
  }

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
            "You estimate nutrition macros for meals written in Hebrew or shown in meal photos. Return only valid JSON. Values must be realistic estimates, not medical advice.",
        },
        {
          role: "user",
          content,
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
  const parsed = JSON.parse(extractOutputText(data)) as Partial<ParsedMeal>;

  return normalizeParsedMeal(parsed, localResult);
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

function normalizeParsedMeal(parsed: Partial<ParsedMeal>, fallback: ParsedMeal): ParsedMeal {
  const confidence = parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low" ? parsed.confidence : fallback.confidence;
  const kosherType =
    parsed.kosherType === "בשרי" || parsed.kosherType === "חלבי" || parsed.kosherType === "פרווה"
      ? parsed.kosherType
      : inferKosherType(`${parsed.name ?? ""} ${parsed.quantity ?? ""} ${parsed.notes ?? ""}`) || fallback.kosherType;

  return {
    name: typeof parsed.name === "string" && parsed.name.trim() ? parsed.name : fallback.name,
    quantity: typeof parsed.quantity === "string" && parsed.quantity.trim() ? parsed.quantity : fallback.quantity,
    kosherType,
    calories: normalizeNumber(parsed.calories, fallback.calories),
    protein: normalizeNumber(parsed.protein, fallback.protein),
    carbs: normalizeNumber(parsed.carbs, fallback.carbs),
    fat: normalizeNumber(parsed.fat, fallback.fat),
    confidence,
    notes: typeof parsed.notes === "string" && parsed.notes.trim() ? parsed.notes : fallback.notes,
  };
}

function normalizeNumber(value: unknown, fallback: number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue) : fallback;
}
