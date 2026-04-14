"use client";

import { useEffect, useMemo, useState } from "react";

type MealType = "ארוחת בוקר" | "ארוחת ביניים" | "ארוחת צהריים" | "ארוחת ערב";
type ViewType = "dashboard" | "daily" | "journals" | "progress" | "profile" | "settings";

type Meal = {
  id: string;
  type: MealType;
  name: string;
  quantity: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  notes: string;
  time: string;
};

type WeightEntry = {
  id: string;
  date: string;
  weight: string;
};

type JournalDay = {
  date: string;
  meals: Meal[];
};

type Profile = {
  fullName: string;
  age: string;
  height: string;
  startWeight: string;
  targetWeight: string;
  activityLevel: string;
  dailyCaloriesGoal: string;
  dailyProteinGoal: string;
};

type AppData = {
  profile: Profile;
  journals: JournalDay[];
  weights: WeightEntry[];
};

const STORAGE_KEY = "diet_super_app_v2";

const mealTypes: MealType[] = [
  "ארוחת בוקר",
  "ארוחת ביניים",
  "ארוחת צהריים",
  "ארוחת ערב",
];

const activityOptions = ["נמוכה", "בינונית", "גבוהה"];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nowTimeString() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(date: string) {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function getOrCreateJournal(journals: JournalDay[], date: string): JournalDay {
  return journals.find((j) => j.date === date) ?? { date, meals: [] };
}

function defaultProfile(): Profile {
  return {
    fullName: "",
    age: "",
    height: "",
    startWeight: "",
    targetWeight: "",
    activityLevel: "בינונית",
    dailyCaloriesGoal: "",
    dailyProteinGoal: "",
  };
}

function safeNumber(value: string | number) {
  return Number(value) || 0;
}

export default function Page() {
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<ViewType>("dashboard");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  const [data, setData] = useState<AppData>({
    profile: defaultProfile(),
    journals: [],
    weights: [],
  });

  const [mealForm, setMealForm] = useState({
    type: "ארוחת בוקר" as MealType,
    name: "",
    quantity: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    notes: "",
    time: nowTimeString(),
  });

  const [weightForm, setWeightForm] = useState({
    date: todayString(),
    weight: "",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData({
          profile: parsed?.profile ? { ...defaultProfile(), ...parsed.profile } : defaultProfile(),
          journals: Array.isArray(parsed?.journals) ? parsed.journals : [],
          weights: Array.isArray(parsed?.weights) ? parsed.weights : [],
        });
      }
    } catch (error) {
      console.error("load error", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("save error", error);
    }
  }, [data, loaded]);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(""), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const currentJournal = useMemo(() => {
    return getOrCreateJournal(data.journals, selectedDate);
  }, [data.journals, selectedDate]);

  const sortedWeights = useMemo(() => {
    return [...data.weights]
      .filter((w) => w.date && safeNumber(w.weight) > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.weights]);

  const dailyTotals = useMemo(() => {
    return currentJournal.meals.reduce(
      (acc, meal) => {
        acc.calories += safeNumber(meal.calories);
        acc.protein += safeNumber(meal.protein);
        acc.carbs += safeNumber(meal.carbs);
        acc.fat += safeNumber(meal.fat);
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [currentJournal.meals]);

  const allMealsCount = useMemo(() => {
    return data.journals.reduce((sum, journal) => sum + journal.meals.length, 0);
  }, [data.journals]);

  const todayMealsCount = currentJournal.meals.length;

  const profileCompletion = useMemo(() => {
    const profileValues = Object.values(data.profile).filter((v) => String(v).trim() !== "");
    return Math.round((profileValues.length / Object.keys(data.profile).length) * 100);
  }, [data.profile]);

  const latestWeight = sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1] : null;

  const filteredJournals = useMemo(() => {
    const sorted = [...data.journals].sort((a, b) => b.date.localeCompare(a.date));
    if (!search.trim()) return sorted;

    const q = search.trim().toLowerCase();
    return sorted.filter((journal) => {
      if (journal.date.includes(q)) return true;
      return journal.meals.some((meal) => {
        return (
          meal.name.toLowerCase().includes(q) ||
          meal.type.toLowerCase().includes(q) ||
          meal.notes.toLowerCase().includes(q) ||
          meal.quantity.toLowerCase().includes(q) ||
          meal.time.toLowerCase().includes(q)
        );
      });
    });
  }, [data.journals, search]);

  const chartPoints = useMemo(() => {
    if (sortedWeights.length === 0) return "";

    const width = 700;
    const height = 230;
    const padding = 28;
    const values = sortedWeights.map((w) => safeNumber(w.weight));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return sortedWeights
      .map((w, index) => {
        const x =
          padding +
          (index * (width - padding * 2)) / Math.max(sortedWeights.length - 1, 1);

        const y =
          height -
          padding -
          ((safeNumber(w.weight) - min) / range) * (height - padding * 2);

        return `${x},${y}`;
      })
      .join(" ");
  }, [sortedWeights]);

  function showMessage(message: string) {
    setStatus(message);
  }

  function updateMealForm(key: keyof typeof mealForm, value: string) {
    setMealForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateProfile(key: keyof Profile, value: string) {
    setData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [key]: value,
      },
    }));
  }

  function resetMealForm() {
    setMealForm({
      type: "ארוחת בוקר",
      name: "",
      quantity: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
      notes: "",
      time: nowTimeString(),
    });
    setEditingMealId(null);
  }

  function saveMeal() {
    if (!mealForm.name.trim()) {
      showMessage("צריך להזין שם לארוחה");
      return;
    }

    setData((prev) => {
      const exists = prev.journals.some((j) => j.date === selectedDate);

      if (exists) {
        return {
          ...prev,
          journals: prev.journals.map((journal) => {
            if (journal.date !== selectedDate) return journal;

            if (editingMealId) {
              return {
                ...journal,
                meals: journal.meals.map((meal) =>
                  meal.id === editingMealId ? { ...meal, ...mealForm } : meal
                ),
              };
            }

            return {
              ...journal,
              meals: [...journal.meals, { id: makeId(), ...mealForm }],
            };
          }),
        };
      }

      return {
        ...prev,
        journals: [
          ...prev.journals,
          {
            date: selectedDate,
            meals: [{ id: makeId(), ...mealForm }],
          },
        ],
      };
    });

    showMessage(editingMealId ? "הארוחה עודכנה" : "הארוחה נוספה");
    resetMealForm();
  }

  function editMeal(meal: Meal, date: string) {
    setMealForm({
      type: meal.type,
      name: meal.name,
      quantity: meal.quantity,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes,
      time: meal.time,
    });
    setSelectedDate(date);
    setEditingMealId(meal.id);
    setView("daily");
    setMenuOpen(false);
    showMessage("מצב עריכה הופעל");
  }

  function deleteMeal(mealId: string, date: string) {
    setData((prev) => ({
      ...prev,
      journals: prev.journals
        .map((journal) =>
          journal.date === date
            ? {
                ...journal,
                meals: journal.meals.filter((meal) => meal.id !== mealId),
              }
            : journal
        )
        .filter((journal) => journal.meals.length > 0),
    }));

    if (editingMealId === mealId) {
      resetMealForm();
    }

    showMessage("הארוחה נמחקה");
  }

  function addWeight() {
    if (!weightForm.date || !weightForm.weight) {
      showMessage("צריך להזין תאריך ומשקל");
      return;
    }

    const existingEntry = data.weights.find((w) => w.date === weightForm.date);

    if (existingEntry) {
      setData((prev) => ({
        ...prev,
        weights: prev.weights.map((w) =>
          w.date === weightForm.date ? { ...w, weight: weightForm.weight } : w
        ),
      }));
      showMessage("המשקל עודכן");
    } else {
      setData((prev) => ({
        ...prev,
        weights: [
          ...prev.weights,
          {
            id: makeId(),
            date: weightForm.date,
            weight: weightForm.weight,
          },
        ],
      }));
      showMessage("המשקל נשמר");
    }

    setWeightForm({
      date: todayString(),
      weight: "",
    });
  }

  function deleteWeight(id: string) {
    setData((prev) => ({
      ...prev,
      weights: prev.weights.filter((w) => w.id !== id),
    }));
    showMessage("רשומת המשקל נמחקה");
  }

  function clearAllData() {
    const ok = window.confirm("למחוק את כל היומנים, המשקלים והפרופיל?");
    if (!ok) return;

    setData({
      profile: defaultProfile(),
      journals: [],
      weights: [],
    });
    resetMealForm();
    showMessage("כל הנתונים נמחקו");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diet-app-backup-${todayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showMessage("קובץ גיבוי ירד למחשב");
  }

  const card = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: 18,
    boxShadow: "0 12px 34px rgba(15,23,42,0.06)",
  } as const;

  const input = {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 16,
    border: "1px solid #d1d5db",
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#fff",
    fontSize: 15,
  };

  const primaryBtn = {
    border: "none",
    borderRadius: 16,
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  };

  const secondaryBtn = {
    border: "1px solid #d1d5db",
    borderRadius: 16,
    padding: "12px 16px",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  };

  const dangerBtn = {
    border: "none",
    borderRadius: 16,
    padding: "12px 16px",
    background: "#dc2626",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  };

  const appBg = {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)",
    color: "#0f172a",
    fontFamily: "Arial, sans-serif",
  } as const;

  if (!loaded) {
    return (
      <main dir="rtl" style={{ ...appBg, display: "grid", placeItems: "center" }}>
        טוען...
      </main>
    );
  }

  return (
    <main dir="rtl" style={appBg}>
      <div
        onClick={() => setMenuOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.22)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "0.2s",
          zIndex: 30,
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: menuOpen ? 0 : -310,
          width: 300,
          height: "100vh",
          background: "#ffffff",
          borderLeft: "1px solid #e5e7eb",
          boxShadow: "-10px 0 30px rgba(0,0,0,0.08)",
          transition: "0.25s",
          zIndex: 40,
          padding: 20,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>תפריט</div>

        <div style={{ display: "grid", gap: 10 }}>
          <MenuButton label="דשבורד" active={view === "dashboard"} onClick={() => { setView("dashboard"); setMenuOpen(false); }} />
          <MenuButton label="יומן יומי" active={view === "daily"} onClick={() => { setView("daily"); setMenuOpen(false); }} />
          <MenuButton label="כל היומנים" active={view === "journals"} onClick={() => { setView("journals"); setMenuOpen(false); }} />
          <MenuButton label="התקדמות" active={view === "progress"} onClick={() => { setView("progress"); setMenuOpen(false); }} />
          <MenuButton label="פרופיל" active={view === "profile"} onClick={() => { setView("profile"); setMenuOpen(false); }} />
          <MenuButton label="הגדרות" active={view === "settings"} onClick={() => { setView("settings"); setMenuOpen(false); }} />
        </div>

        <div style={{ height: 18 }} />

        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>סטטוס שמירה</div>
          <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            כרגע הנתונים נשמרים במכשיר המקומי. בשלב הבא אפשר לחבר מסד נתונים אמיתי.
          </div>
        </div>

        <div style={{ height: 12 }} />
        <button style={{ ...secondaryBtn, width: "100%", marginBottom: 10 }} onClick={exportData}>ייצוא גיבוי</button>
        <button style={{ ...dangerBtn, width: "100%" }} onClick={clearAllData}>מחק הכול</button>
      </aside>

      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          background: "rgba(255,255,255,0.88)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setMenuOpen(true)}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                borderRadius: 14,
                width: 44,
                height: 44,
                cursor: "pointer",
                fontSize: 22,
              }}
            >
              ☰
            </button>

            <div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Diet App</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                אפליקציית יומן תזונה והתקדמות
              </div>
            </div>
          </div>

          <div
            style={{
              background: "#dbeafe",
              color: "#0f172a",
              padding: "8px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {data.profile.fullName ? `שלום ${data.profile.fullName}` : "ברוך הבא"}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16 }}>
        {status && (
          <div
            style={{
              marginBottom: 16,
              background: "#dcfce7",
              border: "1px solid #86efac",
              color: "#166534",
              padding: 14,
              borderRadius: 16,
              fontWeight: 700,
            }}
          >
            {status}
          </div>
        )}

        {view === "dashboard" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={{ ...card, background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff" }}>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                {data.profile.fullName ? `שלום ${data.profile.fullName}` : "ברוך הבא לאפליקציה"}
              </div>
              <div style={{ opacity: 0.95, lineHeight: 1.7 }}>
                כאן תוכל לנהל ארוחות, מעקב משקל, פרופיל אישי ויומנים בצורה נוחה יותר.
              </div>
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <SummaryCard label="ארוחות היום" value={todayMealsCount} />
              <SummaryCard label="קלוריות היום" value={dailyTotals.calories} />
              <SummaryCard label="סה״כ ארוחות" value={allMealsCount} />
              <SummaryCard label="השלמת פרופיל" value={profileCompletion} suffix="%" />
            </section>

            <section style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
              <div style={card}>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>היום בקצרה</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <MiniInfo text={`תאריך נבחר: ${formatDate(selectedDate)}`} />
                  <MiniInfo text={`חלבון היום: ${dailyTotals.protein} גרם`} />
                  <MiniInfo text={`פחמימות היום: ${dailyTotals.carbs} גרם`} />
                  <MiniInfo text={`שומן היום: ${dailyTotals.fat} גרם`} />
                </div>
              </div>

              <div style={card}>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>משקל אחרון</div>
                {latestWeight ? (
                  <>
                    <div style={{ fontSize: 34, fontWeight: 800 }}>{latestWeight.weight} ק״ג</div>
                    <div style={{ color: "#64748b", marginTop: 8 }}>{formatDate(latestWeight.date)}</div>
                  </>
                ) : (
                  <EmptyBox text="עדיין אין שקילות" />
                )}
              </div>
            </section>
          </div>
        )}

        {view === "daily" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
            <section style={card}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>יומן יומי</div>

              <label style={labelStyle}>תאריך</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={input} />

              <div style={{ height: 12 }} />
              <label style={labelStyle}>סוג ארוחה</label>
              <select value={mealForm.type} onChange={(e) => updateMealForm("type", e.target.value)} style={input}>
                {mealTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <div style={{ height: 12 }} />
              <label style={labelStyle}>שם הארוחה</label>
              <input value={mealForm.name} onChange={(e) => updateMealForm("name", e.target.value)} placeholder="למשל: חביתה עם לחם" style={input} />

              <div style={{ height: 12 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>כמות</label>
                  <input value={mealForm.quantity} onChange={(e) => updateMealForm("quantity", e.target.value)} placeholder="למשל 2 פרוסות" style={input} />
                </div>
                <div>
                  <label style={labelStyle}>שעה</label>
                  <input type="time" value={mealForm.time} onChange={(e) => updateMealForm("time", e.target.value)} style={input} />
                </div>
              </div>

              <div style={{ height: 12 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>קלוריות</label>
                  <input type="number" min="0" value={mealForm.calories} onChange={(e) => updateMealForm("calories", e.target.value)} placeholder="0" style={input} inputMode="numeric" />
                </div>
                <div>
                  <label style={labelStyle}>חלבון</label>
                  <input type="number" min="0" value={mealForm.protein} onChange={(e) => updateMealForm("protein", e.target.value)} placeholder="0" style={input} inputMode="numeric" />
                </div>
                <div>
                  <label style={labelStyle}>פחמימות</label>
                  <input type="number" min="0" value={mealForm.carbs} onChange={(e) => updateMealForm("carbs", e.target.value)} placeholder="0" style={input} inputMode="numeric" />
                </div>
                <div>
                  <label style={labelStyle}>שומן</label>
                  <input type="number" min="0" value={mealForm.fat} onChange={(e) => updateMealForm("fat", e.target.value)} placeholder="0" style={input} inputMode="numeric" />
                </div>
              </div>

              <div style={{ height: 12 }} />
              <label style={labelStyle}>הערות</label>
              <textarea value={mealForm.notes} onChange={(e) => updateMealForm("notes", e.target.value)} placeholder="הערות חופשיות" style={{ ...input, minHeight: 90, resize: "vertical" }} />

              <div style={{ height: 16 }} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={primaryBtn} onClick={saveMeal}>{editingMealId ? "עדכן ארוחה" : "הוסף ארוחה"}</button>
                <button style={secondaryBtn} onClick={resetMealForm}>נקה טופס</button>
              </div>

              <div style={{ height: 24 }} />
              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>הוספת משקל</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10 }}>
                <input type="date" value={weightForm.date} onChange={(e) => setWeightForm((prev) => ({ ...prev, date: e.target.value }))} style={input} />
                <input type="number" step="0.1" min="0" value={weightForm.weight} onChange={(e) => setWeightForm((prev) => ({ ...prev, weight: e.target.value }))} placeholder="למשל 82.4" style={input} inputMode="decimal" />
                <button style={primaryBtn} onClick={addWeight}>שמור</button>
              </div>
            </section>

            <section style={card}>
              <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>התאריך הנבחר: {formatDate(selectedDate)}</div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>הארוחות של היום, עם סיכום תזונתי מהיר</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
                <SummaryCard label="קלוריות" value={dailyTotals.calories} />
                <SummaryCard label="חלבון" value={dailyTotals.protein} suffix="ג׳" />
                <SummaryCard label="פחמימות" value={dailyTotals.carbs} suffix="ג׳" />
                <SummaryCard label="שומן" value={dailyTotals.fat} suffix="ג׳" />
              </div>

              <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>ארוחות</div>

              {currentJournal.meals.length === 0 ? (
                <EmptyBox text="עדיין אין ארוחות בתאריך הזה" />
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {currentJournal.meals.map((meal) => (
                    <div key={meal.id} style={{ border: "1px solid #e5e7eb", borderRadius: 18, padding: 16, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ color: "#2563eb", fontWeight: 700, marginBottom: 4 }}>{meal.type}</div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{meal.name}</div>
                          <div style={{ color: "#64748b", marginTop: 6 }}>כמות: {meal.quantity || "-"} · שעה: {meal.time || "-"}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={secondaryBtn} onClick={() => editMeal(meal, selectedDate)}>ערוך</button>
                          <button style={dangerBtn} onClick={() => deleteMeal(meal.id, selectedDate)}>מחק</button>
                        </div>
                      </div>

                      <div style={{ height: 12 }} />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                        <MiniInfo text={`קלוריות: ${meal.calories || 0}`} />
                        <MiniInfo text={`חלבון: ${meal.protein || 0}`} />
                        <MiniInfo text={`פחמימות: ${meal.carbs || 0}`} />
                        <MiniInfo text={`שומן: ${meal.fat || 0}`} />
                      </div>

                      {meal.notes && (
                        <>
                          <div style={{ height: 12 }} />
                          <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, color: "#334155", lineHeight: 1.6 }}>
                            {meal.notes}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === "journals" && (
          <section style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>כל היומנים</div>
                <div style={{ color: "#64748b", marginTop: 4 }}>חיפוש לפי תאריך, שעה, סוג ארוחה, שם או הערות</div>
              </div>

              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש..." style={{ ...input, maxWidth: 280 }} />
            </div>

            {filteredJournals.length === 0 ? (
              <EmptyBox text="אין עדיין יומנים שמורים" />
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {filteredJournals.map((journal) => {
                  const total = journal.meals.reduce((acc, meal) => acc + safeNumber(meal.calories), 0);

                  return (
                    <div key={journal.date} style={{ border: "1px solid #e5e7eb", borderRadius: 18, padding: 16, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatDate(journal.date)}</div>
                          <div style={{ color: "#64748b", marginTop: 4 }}>{journal.meals.length} ארוחות · {total} קלוריות</div>
                        </div>

                        <button style={secondaryBtn} onClick={() => { setSelectedDate(journal.date); setView("daily"); }}>פתח יומן</button>
                      </div>

                      <div style={{ display: "grid", gap: 10 }}>
                        {journal.meals.map((meal) => (
                          <div key={meal.id} style={{ border: "1px solid #eef2f7", background: "#f8fafc", borderRadius: 14, padding: 12 }}>
                            <div style={{ fontWeight: 800 }}>{meal.type} · {meal.name}</div>
                            <div style={{ color: "#64748b", marginTop: 4 }}>שעה: {meal.time || "-"} | כמות: {meal.quantity || "-"} | קלוריות: {meal.calories || 0}</div>
                            {(meal.notes || "").trim() && <div style={{ color: "#475569", marginTop: 6 }}>{meal.notes}</div>}
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                              <button style={secondaryBtn} onClick={() => editMeal(meal, journal.date)}>ערוך</button>
                              <button style={dangerBtn} onClick={() => deleteMeal(meal.id, journal.date)}>מחק</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {view === "progress" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section style={card}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>גרף התקדמות משקל</div>
              {sortedWeights.length === 0 ? (
                <EmptyBox text="אין עדיין נתוני משקל" />
              ) : (
                <>
                  <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 18, background: "#fff", padding: 12 }}>
                    <svg width="700" height="230" viewBox="0 0 700 230">
                      <rect x="0" y="0" width="700" height="230" fill="#ffffff" />
                      <line x1="28" y1="202" x2="672" y2="202" stroke="#cbd5e1" />
                      <polyline fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={chartPoints} />
                      {sortedWeights.map((w, index) => {
                        const values = sortedWeights.map((x) => safeNumber(x.weight));
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const padding = 28;
                        const width = 700;
                        const height = 230;
                        const x = padding + (index * (width - padding * 2)) / Math.max(sortedWeights.length - 1, 1);
                        const y = height - padding - ((safeNumber(w.weight) - min) / range) * (height - padding * 2);
                        return (
                          <g key={w.id}>
                            <circle cx={x} cy={y} r="5" fill="#2563eb" />
                            <text x={x} y={y - 10} textAnchor="middle" fontSize="12" fill="#0f172a">{w.weight}</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </>
              )}
            </section>

            <section style={card}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14 }}>היסטוריית שקילות</div>
              {sortedWeights.length === 0 ? (
                <EmptyBox text="אין עדיין רשומות" />
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {sortedWeights.slice().reverse().map((w) => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff" }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{w.weight} ק״ג</div>
                        <div style={{ color: "#64748b", marginTop: 4 }}>{formatDate(w.date)}</div>
                      </div>
                      <button style={dangerBtn} onClick={() => deleteWeight(w.id)}>מחק</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === "profile" && (
          <section style={{ ...card, maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>פרופיל אישי</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="שם מלא"><input value={data.profile.fullName} onChange={(e) => updateProfile("fullName", e.target.value)} style={input} placeholder="למשל אריאל" /></Field>
              <Field label="גיל"><input type="number" min="0" value={data.profile.age} onChange={(e) => updateProfile("age", e.target.value)} style={input} placeholder="למשל 32" /></Field>
              <Field label="גובה"><input type="number" min="0" value={data.profile.height} onChange={(e) => updateProfile("height", e.target.value)} style={input} placeholder="בס״מ" /></Field>
              <Field label="משקל התחלתי"><input type="number" step="0.1" min="0" value={data.profile.startWeight} onChange={(e) => updateProfile("startWeight", e.target.value)} style={input} placeholder="למשל 88.5" /></Field>
              <Field label="משקל יעד"><input type="number" step="0.1" min="0" value={data.profile.targetWeight} onChange={(e) => updateProfile("targetWeight", e.target.value)} style={input} placeholder="למשל 78" /></Field>
              <Field label="רמת פעילות">
                <select value={data.profile.activityLevel} onChange={(e) => updateProfile("activityLevel", e.target.value)} style={input}>
                  {activityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="יעד קלוריות יומי"><input type="number" min="0" value={data.profile.dailyCaloriesGoal} onChange={(e) => updateProfile("dailyCaloriesGoal", e.target.value)} style={input} placeholder="למשל 2100" /></Field>
              <Field label="יעד חלבון יומי"><input type="number" min="0" value={data.profile.dailyProteinGoal} onChange={(e) => updateProfile("dailyProteinGoal", e.target.value)} style={input} placeholder="למשל 160" /></Field>
            </div>

            <div style={{ marginTop: 18, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16, padding: 14 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>הפרופיל נשמר אוטומטית</div>
              <div style={{ color: "#475569", lineHeight: 1.6 }}>בהמשך נחבר את זה למסד נתונים אמיתי כדי שתוכל לפתוח את הפרופיל מכל מכשיר.</div>
            </div>
          </section>
        )}

        {view === "settings" && (
          <section style={{ ...card, maxWidth: 800, margin: "0 auto" }}>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 18 }}>הגדרות</div>
            <div style={{ display: "grid", gap: 12 }}>
              <MiniInfo text="שמירה: אוטומטית במכשיר" />
              <MiniInfo text="גיבוי: אפשר לייצא קובץ JSON" />
              <MiniInfo text="מצב אייפון: מומלץ להעלות ל-Vercel ואז להוסיף למסך הבית" />
            </div>
            <div style={{ height: 14 }} />
            <button style={secondaryBtn} onClick={exportData}>ייצא גיבוי עכשיו</button>
          </section>
        )}
      </div>
    </main>
  );
}

function MenuButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void; }) {
  return (
    <button
      style={{
        border: "1px solid #d1d5db",
        borderRadius: 16,
        padding: "12px 16px",
        background: active ? "#eff6ff" : "#fff",
        borderColor: active ? "#93c5fd" : "#d1d5db",
        color: "#111827",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 14,
        textAlign: "right",
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, suffix = "" }: { label: string; value: number; suffix?: string; }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 14 }}>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800 }}>{value} {suffix}</div>
    </div>
  );
}

function MiniInfo({ text }: { text: string }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 14, padding: 10, fontWeight: 700, color: "#0f172a" }}>
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div style={{ border: "1px dashed #cbd5e1", borderRadius: 18, padding: 28, textAlign: "center", color: "#64748b", background: "#fff" }}>
      {text}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#334155",
};
