"use client";

import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ViewType = "dashboard" | "daily" | "progress" | "profile" | "journals";

type MealType = "ארוחת בוקר" | "ארוחת ביניים" | "ארוחת צהריים" | "ארוחת ערב";
type KosherType = "בשרי" | "חלבי" | "פרווה";
type FitnessLevel = "נמוכה" | "בינונית" | "גבוהה";
type GoalPreset = "1200" | "1500" | "1800" | "custom";

type Meal = {
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

type Journal = {
  id: string;
  date: string;
  meals: Meal[];
};

type WeightEntry = {
  id: string;
  date: string;
  weight: string;
};

type Profile = {
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
};

type MealForm = {
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

type SyncPayload = {
  profile: Profile;
  journals: Journal[];
  weights: WeightEntry[];
};

const STORAGE_KEY = "diet_app_pro_v1";

const mealTypes: MealType[] = ["ארוחת בוקר", "ארוחת ביניים", "ארוחת צהריים", "ארוחת ערב"];
const kosherTypes: KosherType[] = ["בשרי", "חלבי", "פרווה"];
const fitnessLevels: FitnessLevel[] = ["נמוכה", "בינונית", "גבוהה"];

function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function currentTimeString() {
  const d = new Date();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  return `${hh}:${mm}`;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function safeNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function formatDate(date: string) {
  if (!date) return "-";
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

function formatDateTime(date: string, time: string) {
  return `${formatDate(date)} ${time || ""}`.trim();
}

function defaultProfile(): Profile {
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
  };
}

function defaultMealForm(): MealForm {
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

function getOrCreateJournal(journals: Journal[], date: string) {
  const found = journals.find((j) => j.date === date);
  if (found) return found;

  return {
    id: makeId(),
    date,
    meals: [],
  };
}

function getCaloriesGoal(profile: Profile) {
  if (profile.goalPreset === "custom") {
    return safeNumber(profile.customCaloriesGoal);
  }
  return safeNumber(profile.goalPreset);
}

function sortByDateAsc<T extends { date: string }>(items: T[]) {
  return [...items].sort((a, b) => a.date.localeCompare(b.date));
}

function parseDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const dt = new Date(`${date}T${time}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getWeightChartPoints(weights: WeightEntry[]) {
  if (weights.length === 0) return "";

  const values = weights.map((w) => safeNumber(w.weight));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 700;
  const height = 230;
  const padding = 30;

  return weights
    .map((w, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(weights.length - 1, 1);
      const y = height - padding - ((safeNumber(w.weight) - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<ViewType>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpStep, setOtpStep] = useState<"email" | "code">("email");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const [profile, setProfile] = useState<Profile>(defaultProfile());
  const [journals, setJournals] = useState<Journal[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState(todayString());
  const [search, setSearch] = useState("");

  const [mealForm, setMealForm] = useState<MealForm>(defaultMealForm());
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealDate, setEditingMealDate] = useState<string | null>(null);

  const [weightForm, setWeightForm] = useState({
    date: todayString(),
    weight: "",
  });

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("getSession error:", error);
        }

        if (!mounted) return;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("getSession crash:", error);
      } finally {
        if (mounted) setAuthReady(true);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadAll() {
      setLoaded(false);

      try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (raw) {
          const parsed = JSON.parse(raw);
          if (!cancelled) {
            setProfile(parsed.profile ?? defaultProfile());
            setJournals(Array.isArray(parsed.journals) ? parsed.journals : []);
            setWeights(Array.isArray(parsed.weights) ? parsed.weights : []);
          }
        }

        if (user?.id) {
          const remote = await loadFromSupabase(user.id);

          if (remote && !cancelled) {
            const nextPayload = {
              profile: remote.profile ?? defaultProfile(),
              journals: Array.isArray(remote.journals) ? remote.journals : [],
              weights: Array.isArray(remote.weights) ? remote.weights : [],
            };

            setProfile(nextPayload.profile);
            setJournals(nextPayload.journals);
            setWeights(nextPayload.weights);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPayload));
            setStatus("הנתונים נטענו מהחשבון שלך");
          } else if (!raw && !cancelled) {
            setStatus("החשבון מוכן לשימוש");
          }
        } else if (!raw && !cancelled) {
          setStatus("מוכן להתחברות");
        }
      } catch (error) {
        console.error("load error:", error);
        if (!cancelled) setStatus("שגיאה בטעינת הנתונים");
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    if (!loaded) return;

    const payload: SyncPayload = { profile, journals, weights };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.error("local save error:", error);
    }

    if (!user?.id) return;

    const timeout = setTimeout(async () => {
      await syncAllToSupabase(user.id, payload);
    }, 600);

    return () => clearTimeout(timeout);
  }, [profile, journals, weights, loaded, user?.id]);

  const currentJournal = useMemo(() => getOrCreateJournal(journals, selectedDate), [journals, selectedDate]);

  const todayTotals = useMemo(() => {
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
  }, [currentJournal]);

  const caloriesGoal = useMemo(() => getCaloriesGoal(profile), [profile]);
  const caloriesRemaining = Math.max(caloriesGoal - todayTotals.calories, 0);
  const proteinRemaining = Math.max(safeNumber(profile.proteinGoal) - todayTotals.protein, 0);

  const sortedWeights = useMemo(() => sortByDateAsc(weights), [weights]);
  const latestWeight = useMemo(() => (sortedWeights.length ? sortedWeights[sortedWeights.length - 1] : null), [sortedWeights]);

  const startWeight = safeNumber(profile.startWeight);
  const targetWeight = safeNumber(profile.targetWeight);
  const currentWeight = safeNumber(latestWeight?.weight);

  const weightDeltaFromStart = latestWeight && startWeight ? currentWeight - startWeight : 0;
  const remainingToTarget = latestWeight && targetWeight ? Math.abs(currentWeight - targetWeight) : 0;

  const filteredJournals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...journals].sort((a, b) => b.date.localeCompare(a.date));

    if (!q) return list;

    return list.filter((journal) => {
      const text = [
        journal.date,
        ...journal.meals.flatMap((meal) => [
          meal.type,
          meal.kosherType,
          meal.name,
          meal.quantity,
          meal.notes,
          meal.time,
          meal.calories,
          meal.protein,
          meal.carbs,
          meal.fat,
        ]),
      ]
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [journals, search]);

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
        description: `ההמתנה הסתיימה. הארוחה הבשרית האחרונה הייתה ב־${formatDateTime(
          lastMeatyMeal.date,
          lastMeatyMeal.time
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
      description: `נשארו ${hours}:${`${minutes}`.padStart(2, "0")} שעות. ארוחה בשרית אחרונה: ${lastMeatyMeal.meal.name} ב־${lastMeatyMeal.time}.`,
    };
  }, [lastMeatyMeal, profile.waitHoursAfterMeat]);

  const profileCompletion = useMemo(() => {
    const fields = [
      profile.fullName,
      profile.age,
      profile.height,
      profile.startWeight,
      profile.targetWeight,
      profile.fitnessLevel,
      profile.goalPreset,
      profile.proteinGoal,
      profile.waitHoursAfterMeat,
    ];

    const filled = fields.filter((x) => String(x).trim() !== "").length;
    return Math.round((filled / fields.length) * 100);
  }, [profile]);

  const dailyFeedback = useMemo(() => {
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

    if (dairyWaitInfo.status === "waiting") {
      notes.push("יש כרגע המתנה לחלבי אחרי ארוחה בשרית.");
    }

    if (currentJournal.meals.length >= 4) {
      notes.push("יפה, היום שלך מתועד בצורה מסודרת.");
    }

    return notes;
  }, [caloriesGoal, todayTotals, profile.proteinGoal, dairyWaitInfo.status, currentJournal.meals.length]);

  function updateMealForm(field: keyof MealForm, value: string) {
    setMealForm((prev) => ({ ...prev, [field]: value }));
  }

  function resetMealForm() {
    setMealForm(defaultMealForm());
    setEditingMealId(null);
    setEditingMealDate(null);
  }

  function updateProfileField(field: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function saveMeal() {
    if (!mealForm.name.trim()) {
      setStatus("צריך להזין שם ארוחה");
      return;
    }

    const targetDate = editingMealDate || selectedDate;

    setJournals((prev) => {
      const journal = getOrCreateJournal(prev, targetDate);
      let nextMeals = [...journal.meals];

      if (editingMealId) {
        nextMeals = nextMeals.map((meal) =>
          meal.id === editingMealId
            ? {
                ...meal,
                ...mealForm,
              }
            : meal
        );
      } else {
        nextMeals.unshift({
          id: makeId(),
          ...mealForm,
        });
      }

      const nextJournal: Journal = {
        ...journal,
        meals: nextMeals,
      };

      const without = prev.filter((j) => j.date !== targetDate);
      return [...without, nextJournal].sort((a, b) => a.date.localeCompare(b.date));
    });

    setStatus(editingMealId ? "הארוחה עודכנה" : "הארוחה נוספה");
    resetMealForm();
  }

  function editMeal(meal: Meal, journalDate: string) {
    setMealForm({
      type: meal.type,
      kosherType: meal.kosherType,
      name: meal.name,
      quantity: meal.quantity,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      notes: meal.notes,
      time: meal.time,
    });

    setEditingMealId(meal.id);
    setEditingMealDate(journalDate);
    setSelectedDate(journalDate);
    setView("daily");
    setMenuOpen(false);
    setStatus("מצב עריכה הופעל");
  }

  function deleteMeal(mealId: string, journalDate?: string) {
    setJournals((prev) =>
      prev
        .map((journal) => {
          const shouldFilter = journalDate ? journal.date === journalDate : true;
          if (!shouldFilter) return journal;

          return {
            ...journal,
            meals: journal.meals.filter((meal) => meal.id !== mealId),
          };
        })
        .filter((journal) => journal.meals.length > 0)
    );

    if (editingMealId === mealId) resetMealForm();
    setStatus("הארוחה נמחקה");
  }

  function addWeight() {
    if (!weightForm.date || !weightForm.weight.trim()) {
      setStatus("צריך להזין תאריך ומשקל");
      return;
    }

    const exists = weights.findIndex((item) => item.date === weightForm.date);

    if (exists >= 0) {
      setWeights((prev) =>
        prev.map((item, index) => (index === exists ? { ...item, weight: weightForm.weight } : item))
      );
      setStatus("המשקל לתאריך הזה עודכן");
    } else {
      setWeights((prev) => [
        ...prev,
        {
          id: makeId(),
          date: weightForm.date,
          weight: weightForm.weight,
        },
      ]);
      setStatus("המשקל נשמר");
    }

    setWeightForm({ date: todayString(), weight: "" });
  }

  function deleteWeight(id: string) {
    setWeights((prev) => prev.filter((item) => item.id !== id));
    setStatus("רשומת המשקל נמחקה");
  }

async function signIn() {
  if (!email.trim()) {
    setStatus("תכניס מייל");
    return;
  }

  try {
    setSendingCode(true);
    setStatus("שולח קוד...");

    console.log("BEFORE signInWithOtp");
    console.log("EMAIL:", email.trim());

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
      },
    });

    console.log("AFTER signInWithOtp", { error });

    if (error) {
      console.error("signIn error:", error);
      setStatus("שגיאה בשליחת הקוד: " + error.message);
      return;
    }

    console.log("MOVING TO CODE STEP");
    setOtpStep("code");
    setStatus("קוד אימות נשלח למייל - גרסה חדשה");
  } catch (error: any) {
    console.error("signIn crash:", error);
    setStatus("שגיאה בשליחת הקוד: " + (error?.message || "שגיאה לא ידועה"));
  } finally {
    setSendingCode(false);
  }
}

  async function verifyCode() {
    if (!email.trim()) {
      setStatus("חסר מייל");
      return;
    }

    if (!otpCode.trim()) {
      setStatus("תכניס קוד אימות");
      return;
    }

    try {
      setVerifyingCode(true);
      setStatus("");

      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: "email",
      });

      if (error) {
        console.error("verifyCode error:", error);
        setStatus(`קוד לא תקין: ${error.message}`);
        return;
      }

      setUser(data.user ?? null);
      setOtpCode("");
      setOtpStep("email");
      setStatus("התחברת בהצלחה 🎉");
    } catch (error: any) {
      console.error("verifyCode crash:", error);
      setStatus(`שגיאה באימות הקוד: ${error?.message ?? "שגיאה לא ידועה"}`);
    } finally {
      setVerifyingCode(false);
    }
  }

  function backToEmailStep() {
    setOtpStep("email");
    setOtpCode("");
    setStatus("");
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("signOut error:", error);
      setStatus("שגיאה בהתנתקות");
      return;
    }

    setStatus("התנתקת בהצלחה");
    setUser(null);
    setMenuOpen(false);
    setOtpStep("email");
    setOtpCode("");
    setEmail("");
  }

  function clearLocalAndState() {
    const ok = window.confirm("למחוק את כל הנתונים המקומיים?");
    if (!ok) return;

    localStorage.removeItem(STORAGE_KEY);
    setProfile(defaultProfile());
    setJournals([]);
    setWeights([]);
    setSelectedDate(todayString());
    resetMealForm();
    setStatus("הנתונים המקומיים נמחקו");
  }

  if (!authReady || !loaded) {
    return (
      <main dir="rtl" style={appBg}>
        <div style={centerBox}>
          <div style={card}>
            <div style={bigTitle}>טוען...</div>
            <div style={subtleText}>מכין את האפליקציה</div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main dir="rtl" style={appBg}>
        <div style={centerBox}>
          <div style={{ ...card, maxWidth: 460, width: "100%" }}>
            <div style={heroTitle}>Diet Pro NEW</div>
            <div style={{ ...subtleText, marginBottom: 18 }}>
              התחברות מהירה עם קוד למייל כדי לשמור את כל הנתונים שלך בין מכשירים.
            </div>

            {status && <StatusBox text={status} variant={status.includes("שגיאה") || status.includes("לא תקין") ? "error" : "success"} />}

            <label style={labelStyle}>מייל</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={otpStep === "code"}
            />

            <div style={{ height: 14 }} />

            {otpStep === "email" ? (
              <button style={primaryBtn} onClick={signIn} disabled={sendingCode}>
                {sendingCode ? "שולח קוד..." : "שלח קוד למייל"}
              </button>
            ) : (
              <>
                <label style={{ ...labelStyle, marginTop: 8 }}>קוד אימות</label>
                <input
                  style={inputStyle}
                  type="text"
                  inputMode="numeric"
                  placeholder="הכנס קוד שקיבלת במייל"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                />

                <div style={{ height: 14 }} />

                <div style={{ display: "grid", gap: 10 }}>
                  <button style={primaryBtn} onClick={verifyCode} disabled={verifyingCode}>
                    {verifyingCode ? "מאמת..." : "אמת קוד והתחבר"}
                  </button>

                  <button style={secondaryBtn} onClick={backToEmailStep}>
                    חזור להזנת מייל
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
          background: "rgba(15,23,42,0.35)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
          transition: "0.2s",
          zIndex: 40,
        }}
      />

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: menuOpen ? 0 : "-88vw",
          width: "84vw",
          maxWidth: 310,
          height: "100vh",
          background: "#ffffff",
          borderLeft: "1px solid #e2e8f0",
          boxShadow: "-10px 0 30px rgba(15,23,42,0.08)",
          transition: "0.25s ease",
          zIndex: 50,
          padding: 20,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>תפריט</div>
        <div style={{ display: "grid", gap: 10 }}>
          <MenuButton label="דשבורד" active={view === "dashboard"} onClick={() => goTo("dashboard", setView, setMenuOpen)} />
          <MenuButton label="יומן יומי" active={view === "daily"} onClick={() => goTo("daily", setView, setMenuOpen)} />
          <MenuButton label="התקדמות" active={view === "progress"} onClick={() => goTo("progress", setView, setMenuOpen)} />
          <MenuButton label="פרופיל" active={view === "profile"} onClick={() => goTo("profile", setView, setMenuOpen)} />
          <MenuButton label="כל היומנים" active={view === "journals"} onClick={() => goTo("journals", setView, setMenuOpen)} />
        </div>

        <div style={{ height: 18 }} />

        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>מחובר בתור</div>
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, wordBreak: "break-word" }}>
            {user.email}
          </div>
        </div>

        <div style={{ height: 12 }} />

        <button style={secondaryBtn} onClick={signOut}>
          התנתק
        </button>

        <div style={{ height: 10 }} />
        <button style={dangerBtn} onClick={clearLocalAndState}>
          מחק נתונים מקומיים
        </button>
      </aside>

      <header style={topBar}>
        <div style={pageShell}>
          <div style={headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <button style={menuToggle} onClick={() => setMenuOpen(true)}>
                ☰
              </button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 24, fontWeight: 900 }}>Diet Pro</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>יומן תזונה, משקל והתקדמות</div>
              </div>
            </div>

            <div style={welcomePill}>{profile.fullName ? `שלום ${profile.fullName}` : "ברוך הבא"}</div>
          </div>
        </div>
      </header>

      <div style={pageShell}>
        {status && <StatusBox text={status} variant={status.includes("שגיאה") || status.includes("לא תקין") ? "error" : "success"} />}

        {view === "dashboard" && (
          <div style={{ display: "grid", gap: 16 }}>
            <section
              style={{
                ...card,
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#fff",
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>
                {profile.fullName ? `שלום ${profile.fullName}` : "ברוך הבא לאפליקציה"}
              </div>
              <div style={{ lineHeight: 1.7, opacity: 0.96 }}>
                כאן תוכל לעקוב אחרי ארוחות, קלוריות, חלבון, הפרדה אחרי בשר והתקדמות משקל.
              </div>
            </section>

            <section style={summaryGrid}>
              <SummaryCard label="יעד קלוריות" value={caloriesGoal || "-"} />
              <SummaryCard label="קלוריות היום" value={todayTotals.calories} />
              <SummaryCard label="נשאר להיום" value={caloriesGoal ? caloriesRemaining : "-"} />
              <SummaryCard label="חלבון היום" value={todayTotals.protein} suffix=" ג׳" />
            </section>

            <section style={summaryGrid}>
              <SummaryCard label="יעד חלבון" value={safeNumber(profile.proteinGoal) || "-"} suffix=" ג׳" />
              <SummaryCard
                label="נשאר חלבון"
                value={safeNumber(profile.proteinGoal) ? proteinRemaining : "-"}
                suffix={safeNumber(profile.proteinGoal) ? " ג׳" : ""}
              />
              <SummaryCard label="השלמת פרופיל" value={profileCompletion} suffix="%" />
              <SummaryCard label="רמת כושר" value={profile.fitnessLevel} />
            </section>

            <section style={twoPanelGrid}>
              <div style={card}>
                <SectionTitle title="סטטוס חלבי / בשרי" />
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: dairyWaitInfo.status === "waiting" ? "#fff7ed" : "#ecfdf5",
                    border: dairyWaitInfo.status === "waiting" ? "1px solid #fdba74" : "1px solid #86efac",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>{dairyWaitInfo.title}</div>
                  <div style={{ color: "#475569", lineHeight: 1.7 }}>{dairyWaitInfo.description}</div>
                </div>
              </div>

              <div style={card}>
                <SectionTitle title="פידבק יומי" />
                <div style={{ display: "grid", gap: 10 }}>
                  {dailyFeedback.map((item, index) => (
                    <MiniInfo key={index} text={item} />
                  ))}
                  {dailyFeedback.length === 0 && <EmptyBox text="התחל לתעד כדי לקבל פידבק חכם." />}
                </div>
              </div>
            </section>

            <section style={twoPanelGrid}>
              <div style={card}>
                <SectionTitle title="התקדמות משקל" />
                {latestWeight ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <MiniInfo text={`משקל אחרון: ${latestWeight.weight} ק״ג`} />
                    <MiniInfo text={`תאריך: ${formatDate(latestWeight.date)}`} />
                    <MiniInfo
                      text={`שינוי מההתחלה: ${weightDeltaFromStart > 0 ? "+" : ""}${weightDeltaFromStart.toFixed(1)} ק״ג`}
                    />
                    <MiniInfo text={`מרחק מהיעד: ${remainingToTarget ? remainingToTarget.toFixed(1) : 0} ק״ג`} />
                  </div>
                ) : (
                  <EmptyBox text="עדיין אין שקילות" />
                )}
              </div>

              <div style={card}>
                <SectionTitle title="פעולות מהירות" />
                <div style={{ display: "grid", gap: 10 }}>
                  <button style={primaryBtn} onClick={() => setView("daily")}>
                    הוסף ארוחה
                  </button>
                  <button style={secondaryBtn} onClick={() => setView("progress")}>
                    הוסף משקל
                  </button>
                  <button style={secondaryBtn} onClick={() => setView("profile")}>
                    עדכן פרופיל
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {view === "daily" && (
          <div style={twoPanelGrid}>
            <section style={card}>
              <SectionTitle title="יומן יומי" />
              <label style={labelStyle}>תאריך</label>
              <input
                style={inputStyle}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              <Spacer />
              <label style={labelStyle}>סוג ארוחה</label>
              <select
                style={inputStyle}
                value={mealForm.type}
                onChange={(e) => updateMealForm("type", e.target.value as MealType)}
              >
                {mealTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <Spacer />
              <label style={labelStyle}>סוג כשרות</label>
              <select
                style={inputStyle}
                value={mealForm.kosherType}
                onChange={(e) => updateMealForm("kosherType", e.target.value as KosherType)}
              >
                {kosherTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <Spacer />
              <label style={labelStyle}>שם הארוחה</label>
              <input
                style={inputStyle}
                value={mealForm.name}
                onChange={(e) => updateMealForm("name", e.target.value)}
                placeholder="למשל: חביתה, אורז ועוף"
              />

              <Spacer />
              <div style={twoCols}>
                <Field label="כמות">
                  <input
                    style={inputStyle}
                    value={mealForm.quantity}
                    onChange={(e) => updateMealForm("quantity", e.target.value)}
                    placeholder="למשל: 2 פרוסות"
                  />
                </Field>
                <Field label="שעה">
                  <input
                    style={inputStyle}
                    type="time"
                    value={mealForm.time}
                    onChange={(e) => updateMealForm("time", e.target.value)}
                  />
                </Field>
              </div>

              <Spacer />
              <div style={macroGrid}>
                <Field label="קלוריות">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={mealForm.calories}
                    onChange={(e) => updateMealForm("calories", e.target.value)}
                  />
                </Field>
                <Field label="חלבון">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={mealForm.protein}
                    onChange={(e) => updateMealForm("protein", e.target.value)}
                  />
                </Field>
                <Field label="פחמימות">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={mealForm.carbs}
                    onChange={(e) => updateMealForm("carbs", e.target.value)}
                  />
                </Field>
                <Field label="שומן">
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    value={mealForm.fat}
                    onChange={(e) => updateMealForm("fat", e.target.value)}
                  />
                </Field>
              </div>

              <Spacer />
              <label style={labelStyle}>הערות</label>
              <textarea
                style={textareaStyle}
                value={mealForm.notes}
                onChange={(e) => updateMealForm("notes", e.target.value)}
                placeholder="איך הרגשת, מה היה חסר, הערות אישיות..."
              />

              <Spacer />
              <div style={buttonRow}>
                <button style={primaryBtn} onClick={saveMeal}>
                  {editingMealId ? "עדכן ארוחה" : "הוסף ארוחה"}
                </button>
                <button style={secondaryBtn} onClick={resetMealForm}>
                  נקה טופס
                </button>
              </div>
            </section>

            <section style={card}>
              <SectionTitle title={`סיכום ליום ${formatDate(selectedDate)}`} />
              <div style={summaryGrid}>
                <SummaryCard label="קלוריות" value={todayTotals.calories} />
                <SummaryCard label="חלבון" value={todayTotals.protein} suffix=" ג׳" />
                <SummaryCard label="פחמימות" value={todayTotals.carbs} suffix=" ג׳" />
                <SummaryCard label="שומן" value={todayTotals.fat} suffix=" ג׳" />
              </div>

              <Spacer />
              <div style={{ display: "grid", gap: 12 }}>
                {currentJournal.meals.length === 0 ? (
                  <EmptyBox text="עדיין אין ארוחות בתאריך הזה" />
                ) : (
                  currentJournal.meals.map((meal) => (
                    <div key={meal.id} style={mealCard}>
                      <div style={mealHeader}>
                        <div>
                          <div style={mealBadge}>
                            {meal.type} · {meal.kosherType}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{meal.name}</div>
                          <div style={{ color: "#64748b", marginTop: 6 }}>
                            כמות: {meal.quantity || "-"} · שעה: {meal.time || "-"}
                          </div>
                        </div>

                        <div style={buttonRow}>
                          <button style={secondaryBtnSmall} onClick={() => editMeal(meal, selectedDate)}>
                            ערוך
                          </button>
                          <button style={dangerBtnSmall} onClick={() => deleteMeal(meal.id, selectedDate)}>
                            מחק
                          </button>
                        </div>
                      </div>

                      <Spacer small />
                      <div style={macroGrid}>
                        <MiniInfo text={`קלוריות: ${meal.calories || 0}`} />
                        <MiniInfo text={`חלבון: ${meal.protein || 0}`} />
                        <MiniInfo text={`פחמימות: ${meal.carbs || 0}`} />
                        <MiniInfo text={`שומן: ${meal.fat || 0}`} />
                      </div>

                      {meal.notes && (
                        <>
                          <Spacer small />
                          <div style={noteBox}>{meal.notes}</div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === "progress" && (
          <div style={twoPanelGrid}>
            <section style={card}>
              <SectionTitle title="מעקב משקל" />
              <div style={twoCols}>
                <Field label="תאריך">
                  <input
                    style={inputStyle}
                    type="date"
                    value={weightForm.date}
                    onChange={(e) => setWeightForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </Field>
                <Field label="משקל">
                  <input
                    style={inputStyle}
                    type="number"
                    step="0.1"
                    min="0"
                    value={weightForm.weight}
                    onChange={(e) => setWeightForm((prev) => ({ ...prev, weight: e.target.value }))}
                    placeholder="למשל 82.5"
                  />
                </Field>
              </div>

              <Spacer />
              <button style={primaryBtn} onClick={addWeight}>
                שמור משקל
              </button>

              <Spacer />
              {sortedWeights.length === 0 ? (
                <EmptyBox text="אין עדיין נתוני משקל" />
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 18,
                    padding: 12,
                    background: "#fff",
                  }}
                >
                  <div style={{ minWidth: 320 }}>
                    <svg width="100%" height="230" viewBox="0 0 700 230" preserveAspectRatio="xMidYMid meet">
                      <rect x="0" y="0" width="700" height="230" fill="#fff" />
                      <line x1="30" y1="200" x2="670" y2="200" stroke="#cbd5e1" />
                      <polyline
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={getWeightChartPoints(sortedWeights)}
                      />
                      {sortedWeights.map((w, index) => {
                        const values = sortedWeights.map((x) => safeNumber(x.weight));
                        const min = Math.min(...values);
                        const max = Math.max(...values);
                        const range = max - min || 1;
                        const padding = 30;
                        const width = 700;
                        const height = 230;
                        const x = padding + (index * (width - padding * 2)) / Math.max(sortedWeights.length - 1, 1);
                        const y = height - padding - ((safeNumber(w.weight) - min) / range) * (height - padding * 2);

                        return (
                          <g key={w.id}>
                            <circle cx={x} cy={y} r="5" fill="#2563eb" />
                            <text x={x} y={y - 10} fontSize="12" textAnchor="middle" fill="#0f172a">
                              {w.weight}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </section>

            <section style={card}>
              <SectionTitle title="היסטוריית שקילות" />
              <div style={{ display: "grid", gap: 10 }}>
                {sortedWeights.length === 0 ? (
                  <EmptyBox text="אין עדיין רשומות" />
                ) : (
                  [...sortedWeights].reverse().map((item) => (
                    <div key={item.id} style={rowCard}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{item.weight} ק״ג</div>
                        <div style={{ color: "#64748b", marginTop: 4 }}>{formatDate(item.date)}</div>
                      </div>
                      <button style={dangerBtnSmall} onClick={() => deleteWeight(item.id)}>
                        מחק
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === "profile" && (
          <section style={{ ...card, maxWidth: 980, margin: "0 auto" }}>
            <SectionTitle title="פרופיל אישי" />
            <div style={profileGrid}>
              <Field label="שם מלא">
                <input style={inputStyle} value={profile.fullName} onChange={(e) => updateProfileField("fullName", e.target.value)} />
              </Field>

              <Field label="גיל">
                <input style={inputStyle} type="number" min="0" value={profile.age} onChange={(e) => updateProfileField("age", e.target.value)} />
              </Field>

              <Field label="גובה">
                <input style={inputStyle} type="number" min="0" value={profile.height} onChange={(e) => updateProfileField("height", e.target.value)} />
              </Field>

              <Field label="משקל התחלתי">
                <input
                  style={inputStyle}
                  type="number"
                  step="0.1"
                  min="0"
                  value={profile.startWeight}
                  onChange={(e) => updateProfileField("startWeight", e.target.value)}
                />
              </Field>

              <Field label="משקל יעד">
                <input
                  style={inputStyle}
                  type="number"
                  step="0.1"
                  min="0"
                  value={profile.targetWeight}
                  onChange={(e) => updateProfileField("targetWeight", e.target.value)}
                />
              </Field>

              <Field label="רמת כושר">
                <select style={inputStyle} value={profile.fitnessLevel} onChange={(e) => updateProfileField("fitnessLevel", e.target.value as FitnessLevel)}>
                  {fitnessLevels.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="יעד קלורי">
                <select style={inputStyle} value={profile.goalPreset} onChange={(e) => updateProfileField("goalPreset", e.target.value as GoalPreset)}>
                  <option value="1200">1200</option>
                  <option value="1500">1500</option>
                  <option value="1800">1800</option>
                  <option value="custom">אישי</option>
                </select>
              </Field>

              <Field label="יעד קלורי אישי">
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  value={profile.customCaloriesGoal}
                  onChange={(e) => updateProfileField("customCaloriesGoal", e.target.value)}
                  placeholder={profile.goalPreset === "custom" ? "הכנס יעד אישי" : "לא חובה"}
                />
              </Field>

              <Field label="יעד חלבון יומי">
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  value={profile.proteinGoal}
                  onChange={(e) => updateProfileField("proteinGoal", e.target.value)}
                />
              </Field>

              <Field label="שעות המתנה אחרי בשר">
                <input
                  style={inputStyle}
                  type="number"
                  min="1"
                  max="12"
                  value={profile.waitHoursAfterMeat}
                  onChange={(e) => updateProfileField("waitHoursAfterMeat", e.target.value)}
                />
              </Field>
            </div>

            <Spacer />
            <StatusBox
              text={`יעד הקלוריות הפעיל שלך הוא ${caloriesGoal || 0}, רמת הכושר: ${profile.fitnessLevel}, וההמתנה לחלבי מוגדרת ל־${profile.waitHoursAfterMeat || 6} שעות.`}
              variant="info"
            />
          </section>
        )}

        {view === "journals" && (
          <section style={card}>
            <SectionTitle title="כל היומנים" />
            <input
              style={{ ...inputStyle, maxWidth: 320 }}
              placeholder="חיפוש לפי שם ארוחה / תאריך / סוג..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Spacer />
            <div style={{ display: "grid", gap: 14 }}>
              {filteredJournals.length === 0 ? (
                <EmptyBox text="אין יומנים תואמים" />
              ) : (
                filteredJournals.map((journal) => {
                  const totalCalories = journal.meals.reduce((sum, meal) => sum + safeNumber(meal.calories), 0);

                  return (
                    <div key={journal.id} style={mealCard}>
                      <div style={mealHeader}>
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 800 }}>{formatDate(journal.date)}</div>
                          <div style={{ color: "#64748b", marginTop: 4 }}>
                            {journal.meals.length} ארוחות · {totalCalories} קלוריות
                          </div>
                        </div>

                        <button
                          style={secondaryBtnSmall}
                          onClick={() => {
                            setSelectedDate(journal.date);
                            setView("daily");
                          }}
                        >
                          פתח יומן
                        </button>
                      </div>

                      <Spacer small />
                      <div style={{ display: "grid", gap: 10 }}>
                        {journal.meals.map((meal) => (
                          <div key={meal.id} style={subMealCard}>
                            <div style={{ fontWeight: 800 }}>
                              {meal.type} · {meal.kosherType} · {meal.name}
                            </div>
                            <div style={{ color: "#64748b", marginTop: 4 }}>
                              שעה: {meal.time || "-"} | קלוריות: {meal.calories || 0} | כמות: {meal.quantity || "-"}
                            </div>

                            {(meal.notes || "").trim() && (
                              <div style={{ color: "#475569", marginTop: 6 }}>{meal.notes}</div>
                            )}

                            <div style={{ ...buttonRow, marginTop: 10 }}>
                              <button style={secondaryBtnSmall} onClick={() => editMeal(meal, journal.date)}>
                                ערוך
                              </button>
                              <button style={dangerBtnSmall} onClick={() => deleteMeal(meal.id, journal.date)}>
                                מחק
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

async function syncAllToSupabase(userId: string, payload: SyncPayload) {
  try {
    const row = {
      user_id: userId,
      profile: payload.profile ?? defaultProfile(),
      journals: Array.isArray(payload.journals) ? payload.journals : [],
      weights: Array.isArray(payload.weights) ? payload.weights : [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("diet_app_sync")
      .upsert(row, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    if (error) {
      console.error("sync error full:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return false;
    }

    console.log("sync success:", data);
    return true;
  } catch (error: any) {
    console.error("sync crash:", {
      message: error?.message ?? null,
      stack: error?.stack ?? null,
      raw: error,
    });
    return false;
  }
}

async function loadFromSupabase(userId: string) {
  try {
    const { data, error } = await supabase
      .from("diet_app_sync")
      .select("user_id, profile, journals, weights, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("loadFromSupabase error full:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return null;
    }

    if (!data) return null;

    return {
      profile: data.profile ?? defaultProfile(),
      journals: Array.isArray(data.journals) ? data.journals : [],
      weights: Array.isArray(data.weights) ? data.weights : [],
    };
  } catch (error: any) {
    console.error("loadFromSupabase crash:", {
      message: error?.message ?? null,
      stack: error?.stack ?? null,
      raw: error,
    });
    return null;
  }
}

function goTo(view: ViewType, setView: (view: ViewType) => void, setMenuOpen: (value: boolean) => void) {
  setView(view);
  setMenuOpen(false);
}

function MenuButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
        background: active ? "#eff6ff" : "#fff",
        color: active ? "#1d4ed8" : "#0f172a",
        borderRadius: 14,
        padding: "12px 14px",
        cursor: "pointer",
        textAlign: "right",
        fontWeight: 700,
        fontSize: 15,
        width: "100%",
      }}
    >
      {label}
    </button>
  );
}

function SummaryCard({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div style={summaryCard}>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900 }}>
        {value}
        {suffix}
      </div>
    </div>
  );
}

function MiniInfo({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        borderRadius: 14,
        padding: "12px 14px",
        color: "#334155",
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        borderRadius: 16,
        padding: 20,
        textAlign: "center",
        color: "#64748b",
      }}
    >
      {text}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 14 }}>{title}</div>;
}

function Spacer({ small = false }: { small?: boolean }) {
  return <div style={{ height: small ? 10 : 14 }} />;
}

function StatusBox({ text, variant }: { text: string; variant: "success" | "info" | "error" }) {
  const styles =
    variant === "success"
      ? {
          background: "#dcfce7",
          border: "1px solid #86efac",
          color: "#166534",
        }
      : variant === "error"
      ? {
          background: "#fef2f2",
          border: "1px solid #fecaca",
          color: "#b91c1c",
        }
      : {
          background: "#eff6ff",
          border: "1px solid #93c5fd",
          color: "#1d4ed8",
        };

  return (
    <div style={{ ...styles, padding: 14, borderRadius: 16, fontWeight: 700, lineHeight: 1.6, marginBottom: 16 }}>
      {text}
    </div>
  );
}

const appBg: CSSProperties = {
  minHeight: "100vh",
  background: "#f8fafc",
  color: "#0f172a",
};

const centerBox: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 16,
};

const pageShell: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: 16,
};

const topBar: CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  backdropFilter: "blur(10px)",
  background: "rgba(255,255,255,0.88)",
  borderBottom: "1px solid #e2e8f0",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: "4px 0",
};

const menuToggle: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#fff",
  cursor: "pointer",
  fontSize: 22,
};

const welcomePill: CSSProperties = {
  background: "#dbeafe",
  color: "#0f172a",
  padding: "8px 12px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 13,
};

const heroTitle: CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  marginBottom: 8,
};

const bigTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 900,
  marginBottom: 8,
};

const subtleText: CSSProperties = {
  color: "#64748b",
  lineHeight: 1.7,
};

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
};

const summaryCard: CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
};

const summaryGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const twoPanelGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const profileGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const twoCols: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
};

const macroGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontWeight: 700,
  color: "#334155",
};

const inputStyle: CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  background: "#fff",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
};

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 14,
  border: "1px solid #cbd5e1",
  padding: 14,
  background: "#fff",
  fontSize: 16,
  boxSizing: "border-box",
  outline: "none",
  resize: "vertical",
};

const primaryBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "none",
  borderRadius: 14,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
};

const secondaryBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #cbd5e1",
  borderRadius: 14,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
};

const dangerBtn: CSSProperties = {
  width: "100%",
  minHeight: 46,
  border: "1px solid #fecaca",
  borderRadius: 14,
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 800,
  cursor: "pointer",
  padding: "12px 18px",
};

const secondaryBtnSmall: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 14px",
};

const dangerBtnSmall: CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 12,
  background: "#fff1f2",
  color: "#b91c1c",
  fontWeight: 800,
  cursor: "pointer",
  padding: "10px 14px",
};

const buttonRow: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const mealCard: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
};

const subMealCard: CSSProperties = {
  border: "1px solid #eef2f7",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
};

const mealHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const mealBadge: CSSProperties = {
  color: "#2563eb",
  fontWeight: 800,
  marginBottom: 4,
};

const noteBox: CSSProperties = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  color: "#334155",
  lineHeight: 1.6,
};

const rowCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 14,
  flexWrap: "wrap",
};