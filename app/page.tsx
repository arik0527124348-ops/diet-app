"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { IScannerControls } from "@zxing/browser";
import { supabase } from "@/lib/supabase";
import { dietStyleTypes, fitnessLevels, genderTypes, goalTypes } from "./constants";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DashboardView } from "./components/DashboardView";
import { JournalView } from "./components/JournalView";
import { MealEntryFlow } from "./components/MealEntryFlow";
import { MenuTemplatesView } from "./components/MenuTemplatesView";
import { WeightTrackerView } from "./components/WeightTrackerView";
import { foodDatabase } from "./data/food-database";
import type { MenuTemplate } from "./data/menu-templates";
import {
  BottomNavButton,
  EmptyBox,
  Field,
  InfoList,
  MenuButton,
  MiniInfo,
  SectionTitle,
  Spacer,
  StatusBox,
  SummaryCard,
  SyncStatusIndicator,
  goTo,
} from "./components/ui";
import { defaultMealForm, defaultProfile } from "./utils/defaults";
import { currentTimeString, formatDate, todayString } from "./utils/dates";
import { resizeImageFile } from "./utils/image";
import { buildLocalMealPlan, type MealPlan } from "./utils/meal-planner";
import { getErrorMessage, getStorageKey, makeId, safeNumber } from "./utils/misc";
import { getOrCreateJournal, sortByDateAsc } from "./utils/nutrition";
import { useNutrition } from "./hooks/useNutrition";
import { useSync } from "./hooks/useSync";
import type {
  AiCoachResult,
  CoachMode,
  DietStyleType,
  FitnessLevel,
  FoodItem,
  GenderType,
  GoalPreset,
  GoalType,
  Journal,
  KosherType,
  Meal,
  MealForm,
  ParsedMealResult,
  Profile,
  ViewType,
  WeightEntry,
} from "./types";
import {
  aiResultHeader,
  appBg,
  bigTitle,
  bottomNav,
  card,
  centerBox,
  dangerBtn,
  headerRow,
  heroTitle,
  inputStyle,
  labelStyle,
  menuToggle,
  pageShell,
  primaryBtn,
  profileGrid,
  secondaryBtn,
  subtleText,
  summaryGrid,
  textareaStyle,
  topBar,
  twoPanelGrid,
} from "./styles";

type BarcodeDetectorResult = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

type WindowWithBarcodeDetector = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

type SpeechRecognitionResultLike = {
  transcript: string;
};

type SpeechRecognitionAlternativeListLike = {
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    [index: number]: SpeechRecognitionAlternativeListLike;
    length: number;
  };
};

type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function isMealFormDirty(form: MealForm) {
  return Boolean(
    form.name.trim() ||
      form.quantity.trim() ||
      form.calories.trim() ||
      form.protein.trim() ||
      form.carbs.trim() ||
      form.fat.trim() ||
      form.notes.trim(),
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function vibrateBrief() {
  if ("vibrate" in navigator) {
    navigator.vibrate(18);
  }
}

export default function Home() {
  const quickPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeVideoRef = useRef<HTMLVideoElement | null>(null);
  const barcodeStreamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const barcodeScanActiveRef = useRef(false);
  const handleScannedBarcodeRef = useRef<(barcode: string) => void>(() => {});
  const [authReady, setAuthReady] = useState(false);
  const [status, setStatus] = useState("");
  const [view, setView] = useState<ViewType>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const [user, setUser] = useState<User | null>(null);
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
  const [journalKosherFilter, setJournalKosherFilter] = useState<"all" | KosherType>("all");
  const [journalDetailDate, setJournalDetailDate] = useState<string | null>(null);
  const [menuDetailId, setMenuDetailId] = useState<string | null>(null);

  const [mealForm, setMealForm] = useState<MealForm>(defaultMealForm());
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingMealDate, setEditingMealDate] = useState<string | null>(null);
  const [mealEntryMode, setMealEntryMode] = useState<"choose" | "manual" | "database" | "barcode">("choose");
  const [barcodeScanning, setBarcodeScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState("");

  const [weightForm, setWeightForm] = useState({
    date: todayString(),
    weight: "",
  });

  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachMode, setCoachMode] = useState<CoachMode>("quick");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<AiCoachResult | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [mealParsing, setMealParsing] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [mealImageDataUrl, setMealImageDataUrl] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [appetiteToast, setAppetiteToast] = useState("");
  const [mealDraftLoaded, setMealDraftLoaded] = useState(false);
  const mealDraftStorageKey = useMemo(() => `diet_app_meal_draft_${user?.id ?? "guest"}`, [user?.id]);

  const { loaded, syncStatus } = useSync({
    authReady,
    user,
    profile,
    journals,
    weights,
    setProfile,
    setJournals,
    setWeights,
    setStatus,
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

  const stopBarcodeScanner = useCallback(() => {
    barcodeScanActiveRef.current = false;
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    barcodeStreamRef.current?.getTracks().forEach((track) => track.stop());
    barcodeStreamRef.current = null;
    if (barcodeVideoRef.current) barcodeVideoRef.current.srcObject = null;
    setBarcodeScanning(false);
  }, []);

  useEffect(() => {
    if (mealEntryMode !== "barcode") {
      stopBarcodeScanner();
      return;
    }

    let cancelled = false;

    async function startScanner() {
      const barcodeWindow = window as WindowWithBarcodeDetector;

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("אין גישה למצלמה בדפדפן הזה");
        setMealEntryMode("manual");
        return;
      }

      try {
        setStatus("");
        setBarcodeScanning(true);
        barcodeScanActiveRef.current = true;

        if (barcodeWindow.BarcodeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          barcodeStreamRef.current = stream;

          if (!barcodeVideoRef.current) return;
          barcodeVideoRef.current.srcObject = stream;
          await barcodeVideoRef.current.play();

          const detector = new barcodeWindow.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"],
          });

          while (!cancelled && barcodeScanActiveRef.current) {
            const results = await detector.detect(barcodeVideoRef.current);
            const barcode = results[0]?.rawValue;

            if (barcode) {
              handleScannedBarcodeRef.current(barcode);
              return;
            }

            await wait(250);
          }

          if (!cancelled) setBarcodeScanning(false);
          return;
        }

        if (!barcodeVideoRef.current) {
          setBarcodeScanning(false);
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          {
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          },
          barcodeVideoRef.current,
          (result, _error, controls) => {
            const barcode = result?.getText();

            if (!barcode || cancelled || !barcodeScanActiveRef.current) return;

            barcodeScanActiveRef.current = false;
            controls.stop();
            handleScannedBarcodeRef.current(barcode);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        zxingControlsRef.current = controls;
      } catch (error) {
        console.error("barcode scan error:", error);
        if (!cancelled) {
          setStatus("לא הצלחתי לפתוח סריקת ברקוד. אפשר להזין ידנית.");
          setBarcodeScanning(false);
          setMealEntryMode("manual");
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      stopBarcodeScanner();
    };
  }, [mealEntryMode, stopBarcodeScanner]);

  const {
    currentJournal,
    todayTotals,
    caloriesGoal,
    dailyAnalysis,
    weeklySummary,
    habitInsights,
    calorieProgress,
    caloriesRemaining,
    carbsGoal,
    fatGoal,
    latestMeals,
    filteredJournals,
    journalDetail,
    menuDetail,
    dairyWaitInfo,
    dailyFeedback,
  } = useNutrition({
    journals,
    profile,
    selectedDate,
    search,
    kosherFilter: journalKosherFilter,
    journalDetailDate,
    menuDetailId,
  });

  useEffect(() => {
    if (!saveFeedback) return;

    const timeout = setTimeout(() => {
      setSaveFeedback("");
    }, 1800);

    return () => clearTimeout(timeout);
  }, [saveFeedback]);

  useEffect(() => {
    if (!appetiteToast) return;

    const timeout = setTimeout(() => {
      setAppetiteToast("");
    }, 1800);

    return () => clearTimeout(timeout);
  }, [appetiteToast]);

  useEffect(() => {
    if (!loaded || mealDraftLoaded || editingMealId) return;

    try {
      const raw = localStorage.getItem(mealDraftStorageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<MealForm>;
        setMealForm((prev) => ({
          ...prev,
          ...draft,
          type: draft.type ?? prev.type,
          kosherType: draft.kosherType ?? prev.kosherType,
          time: draft.time ?? prev.time,
        }));
        setMealEntryMode("manual");
        setStatus("שוחזרה טיוטת ארוחה שלא נשמרה");
      }
    } catch (error) {
      console.info("meal draft restore skipped:", error);
      localStorage.removeItem(mealDraftStorageKey);
    } finally {
      setMealDraftLoaded(true);
    }
  }, [loaded, mealDraftLoaded, editingMealId, mealDraftStorageKey]);

  useEffect(() => {
    if (!loaded || !mealDraftLoaded || editingMealId) return;

    try {
      if (isMealFormDirty(mealForm)) {
        localStorage.setItem(mealDraftStorageKey, JSON.stringify(mealForm));
      } else {
        localStorage.removeItem(mealDraftStorageKey);
      }
    } catch (error) {
      console.info("meal draft save skipped:", error);
    }
  }, [loaded, mealDraftLoaded, editingMealId, mealDraftStorageKey, mealForm]);

  const sortedWeights = useMemo(() => sortByDateAsc(weights), [weights]);
  const latestWeight = useMemo(() => (sortedWeights.length ? sortedWeights[sortedWeights.length - 1] : null), [sortedWeights]);
  const recentMeals = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const counts = new Map<string, { meal: Meal; count: number; latestDate: string }>();

    for (const journal of journals) {
      const journalDate = new Date(`${journal.date}T00:00:00`);
      if (Number.isNaN(journalDate.getTime()) || journalDate < cutoff) continue;

      for (const meal of journal.meals) {
        const key = `${meal.name.trim().toLowerCase()}|${meal.quantity.trim().toLowerCase()}`;
        if (!meal.name.trim()) continue;

        const current = counts.get(key);
        if (current) {
          current.count += 1;
          if (journal.date > current.latestDate) {
            current.latestDate = journal.date;
            current.meal = meal;
          }
        } else {
          counts.set(key, { meal, count: 1, latestDate: journal.date });
        }
      }
    }

    return [...counts.values()]
      .sort((a, b) => b.count - a.count || b.latestDate.localeCompare(a.latestDate))
      .slice(0, 5);
  }, [journals]);

  const updateMealForm = useCallback((field: keyof MealForm, value: string) => {
    setMealForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const showMealSavedToast = useCallback((text = "✓ בתאבון!") => {
    setAppetiteToast(text);
  }, []);

  const submitCommunityProductCandidate = useCallback(async (barcode: string, meal: Meal) => {
    if (!user?.id || !barcode.trim()) return;

    try {
      const { error } = await supabase.from("community_food_products").insert({
        user_id: user.id,
        barcode,
        name: meal.name,
        quantity: meal.quantity,
        kosher_type: meal.kosherType,
        calories: safeNumber(meal.calories),
        protein: safeNumber(meal.protein),
        carbs: safeNumber(meal.carbs),
        fat: safeNumber(meal.fat),
        notes: meal.notes,
        status: "pending",
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.info("community product candidate skipped:", error.message);
      }
    } catch (error) {
      console.info("community product candidate crash:", error);
    }
  }, [user?.id]);

  const resetMealForm = useCallback(() => {
    setMealForm(defaultMealForm());
    setEditingMealId(null);
    setEditingMealDate(null);
    setMealImageDataUrl("");
    setScannedBarcode("");
    localStorage.removeItem(mealDraftStorageKey);
    stopBarcodeScanner();
    setMealEntryMode("choose");
  }, [mealDraftStorageKey, stopBarcodeScanner]);

  const updateProfileField = useCallback((field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateJournalMeals = useCallback((targetDate: string, buildMeals: (currentMeals: Meal[]) => Meal[]) => {
    setJournals((prev) => {
      const journal = getOrCreateJournal(prev, targetDate);
      const nextJournal: Journal = {
        ...journal,
        meals: buildMeals(journal.meals),
      };

      const without = prev.filter((j) => j.date !== targetDate);
      return [...without, nextJournal].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const saveMeal = useCallback(() => {
    if (mealParsing) {
      setStatus("חכה רגע לסיום פירוק ה-AI לפני שמירה");
      return;
    }

    if (!mealForm.name.trim()) {
      setStatus("צריך להזין שם ארוחה");
      return;
    }

    const targetDate = editingMealDate || selectedDate;
    const mealIdToHighlight = editingMealId ?? makeId();
    const savedMeal: Meal = {
      id: mealIdToHighlight,
      ...mealForm,
    };

    updateJournalMeals(targetDate, (currentMeals) => {
      if (editingMealId) {
        return currentMeals.map((meal) =>
          meal.id === editingMealId
            ? {
                ...meal,
                ...mealForm,
              }
            : meal
        );
      }

      return [
        savedMeal,
        ...currentMeals,
      ];
    });

    if (scannedBarcode && !editingMealId) {
      void submitCommunityProductCandidate(scannedBarcode, savedMeal);
    }

    vibrateBrief();
    setSaveFeedback(editingMealId ? "✓ הארוחה עודכנה" : "✓ הארוחה נוספה");
    showMealSavedToast(editingMealId ? "✓ עודכן" : "✓ בתאבון!");
    setStatus(editingMealId ? "✓ הארוחה עודכנה" : "✓ הארוחה נוספה");
    resetMealForm();
  }, [
    editingMealDate,
    editingMealId,
    mealForm,
    mealParsing,
    resetMealForm,
    scannedBarcode,
    selectedDate,
    showMealSavedToast,
    submitCommunityProductCandidate,
    updateJournalMeals,
  ]);

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
    setMealEntryMode("manual");
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

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error("signIn error:", error);
        setStatus("שגיאה בשליחת הקוד: " + error.message);
        return;
      }

      setOtpStep("code");
      setStatus("קוד אימות נשלח למייל");
    } catch (error: unknown) {
      console.error("signIn crash:", error);
      setStatus("שגיאה בשליחת הקוד: " + getErrorMessage(error));
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
    } catch (error: unknown) {
      console.error("verifyCode crash:", error);
      setStatus(`שגיאה באימות הקוד: ${getErrorMessage(error)}`);
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

    localStorage.removeItem(getStorageKey(user?.id));
    setProfile(defaultProfile());
    setJournals([]);
    setWeights([]);
    setSelectedDate(todayString());
    resetMealForm();
    setStatus("הנתונים המקומיים נמחקו");
  }

  async function askAiCoach() {
    setCoachLoading(true);
    setCoachResult(null);
    setStatus("המאמן החכם מנתח את היום...");

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: coachMode,
          question: coachPrompt,
          selectedDate,
          profile,
          journal: currentJournal,
          totals: todayTotals,
          calorieGoal: caloriesGoal,
          proteinGoal: safeNumber(profile.proteinGoal),
          dairyWaitInfo,
          latestWeight,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "לא הצלחתי לקבל תשובה מהמאמן החכם");
      }

      setCoachResult(data.result);
      setStatus(data.source === "openai" ? "התקבלה המלצת AI" : "התקבלה המלצה חכמה מקומית");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "שגיאה לא ידועה";
      setStatus(`שגיאה במאמן החכם: ${message}`);
    } finally {
      setCoachLoading(false);
    }
  }

  const parseMealMacrosFromDescription = useCallback(async (descriptionOverride?: string) => {
    const description =
      descriptionOverride ?? [mealForm.name, mealForm.quantity, mealForm.notes].filter((item) => item.trim()).join(", ");

    if (!description.trim() && !mealImageDataUrl) {
      setStatus("כתוב מה אכלת או העלה תמונה של הארוחה");
      return;
    }

    setMealParsing(true);
    setStatus("מפרק את הארוחה לקלוריות ומאקרו...");

    try {
      const response = await fetch("/api/parse-meal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description,
          imageDataUrl: mealImageDataUrl,
          profile: {
            dietStyle: profile.dietStyle,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "לא הצלחתי לפרק את הארוחה");
      }

      const result = data.result as ParsedMealResult;
      setMealForm((prev) => ({
        ...prev,
        name: result.name || prev.name,
        quantity: result.quantity || prev.quantity,
        kosherType: result.kosherType || prev.kosherType,
        calories: String(result.calories ?? ""),
        protein: String(result.protein ?? ""),
        carbs: String(result.carbs ?? ""),
        fat: String(result.fat ?? ""),
        notes: [prev.notes, result.notes].filter((item) => item.trim()).join("\n"),
      }));

      setStatus(data.source === "openai" ? "הארוחה פורקה עם AI" : "הארוחה פורקה לפי הערכה מקומית");
    } catch (error: unknown) {
      setStatus(`שגיאה בפירוק הארוחה: ${getErrorMessage(error)}`);
    } finally {
      setMealParsing(false);
    }
  }, [mealForm.name, mealForm.notes, mealForm.quantity, mealImageDataUrl, profile.dietStyle]);

  const parseMealMacros = useCallback(() => {
    void parseMealMacrosFromDescription();
  }, [parseMealMacrosFromDescription]);

  const startVoiceMeal = useCallback(() => {
    const speechWindow = window as WindowWithSpeechRecognition;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setStatus("זיהוי דיבור לא נתמך בדפדפן הזה. אפשר להשתמש בהקלדה חופשית.");
      setMealEntryMode("manual");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "he-IL";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setVoiceListening(true);
    setStatus("מקשיב... תגיד מה אכלת במשפט אחד");

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) {
        setStatus("לא זוהה טקסט. נסה שוב או הקלד ידנית.");
        return;
      }

      setMealEntryMode("manual");
      setMealForm((prev) => ({
        ...prev,
        name: transcript,
        notes: [prev.notes, "הוזן באמצעות זיהוי דיבור"].filter((item) => item.trim()).join("\n"),
      }));
      void parseMealMacrosFromDescription(transcript);
    };

    recognition.onerror = () => {
      setStatus("לא הצלחתי לשמוע את הארוחה. אפשר לנסות שוב או להקליד.");
      setVoiceListening(false);
    };

    recognition.onend = () => {
      setVoiceListening(false);
    };

    recognition.start();
  }, [parseMealMacrosFromDescription]);

  async function handleMealImageChange(file: File | undefined) {
    if (!file) return;

    try {
      setStatus("מכין את התמונה לניתוח...");
      const dataUrl = await resizeImageFile(file);
      setMealImageDataUrl(dataUrl);
      setStatus("התמונה מוכנה. לחץ על פירוק עם AI.");
    } catch (error: unknown) {
      setStatus(`שגיאה בתמונה: ${getErrorMessage(error)}`);
    }
  }

  function openQuickPhoto() {
    quickPhotoInputRef.current?.click();
  }

  async function handleQuickPhotoChange(file: File | undefined) {
    if (!file) return;

    setMealForm(defaultMealForm());
    setEditingMealId(null);
    setEditingMealDate(null);
    setMealEntryMode("manual");
    setSelectedDate(todayString());
    setView("daily");
    await handleMealImageChange(file);
  }

  const addFoodFromDatabase = useCallback((food: FoodItem, barcode?: string) => {
    const meal: Meal = {
      id: makeId(),
      type: food.mealTypes[0],
      kosherType: food.kosherType,
      name: food.name,
      quantity: food.quantity,
      calories: String(food.calories),
      protein: String(food.protein),
      carbs: String(food.carbs),
      fat: String(food.fat),
      notes: ["נוסף ממאגר המזון.", barcode ? `ברקוד: ${barcode}` : ""].filter((item) => item.trim()).join("\n"),
      time: currentTimeString(),
    };

    updateJournalMeals(selectedDate, (currentMeals) => [meal, ...currentMeals]);

    vibrateBrief();
    setSaveFeedback("✓ הארוחה נוספה מהמאגר");
    showMealSavedToast("✓ בתאבון!");
    setStatus(barcode ? `✓ המוצר נסרק ונוסף: ${food.kosherType}` : "✓ הארוחה נוספה מהמאגר");
    setMealEntryMode("choose");
    setView("dashboard");
  }, [selectedDate, showMealSavedToast, updateJournalMeals]);

  const addRecentMeal = useCallback((meal: Meal) => {
    const nextMeal: Meal = {
      ...meal,
      id: makeId(),
      time: currentTimeString(),
      notes: [meal.notes, "נוסף מהמאכלים האחרונים"].filter((item) => item.trim()).join("\n"),
    };

    updateJournalMeals(selectedDate, (currentMeals) => [nextMeal, ...currentMeals]);
    vibrateBrief();
    setSaveFeedback("✓ הארוחה נוספה מהאחרונים");
    showMealSavedToast("✓ בתאבון!");
    setStatus("✓ הארוחה נוספה מהמאכלים האחרונים");
    setMealEntryMode("choose");
    setView("dashboard");
  }, [selectedDate, showMealSavedToast, updateJournalMeals]);

  const handleScannedBarcode = useCallback((barcode: string) => {
    stopBarcodeScanner();
    setScannedBarcode(barcode);

    const product = foodDatabase.find((food) => food.barcodes?.includes(barcode));

    if (product) {
      setStatus(`הברקוד זוהה: ${product.name} · ${product.kosherType}`);
      addFoodFromDatabase(product, barcode);
      return;
    }

    setMealForm((prev) => ({
      ...prev,
      notes: [prev.notes, `ברקוד: ${barcode}`].filter((item) => item.trim()).join("\n"),
    }));
    setStatus(`ברקוד ${barcode} לא נמצא במאגר. אפשר להשלים ידנית ונשמור כמועמד למוצר חדש.`);
    setMealEntryMode("manual");
  }, [addFoodFromDatabase, stopBarcodeScanner]);

  handleScannedBarcodeRef.current = handleScannedBarcode;

  function previewFullDayPlan() {
    const plan = buildLocalMealPlan(profile, caloriesGoal);

    setMealPlan(plan);
    setCoachMode("fullDay");
    setCoachResult({
      title: `יום מלא סביב ${caloriesGoal || 1500} קלוריות`,
      summary: `נבנו ${plan.meals.length} ארוחות מתוך מאגר המזונות המקומי. סך הכל: ${plan.totals.calories} קלוריות, ${plan.totals.protein} גרם חלבון.`,
      actionItems: [
        "בדוק שהשעות והכמויות מתאימות לך.",
        "אם יש לך יומן קיים לאותו יום, שמירה תחליף אותו רק אחרי אישור.",
        ...plan.notes,
      ],
      mealIdeas: plan.meals.map(
        (meal) => `${meal.type}: ${meal.name} (${meal.calories} קלוריות, ${meal.protein} ג׳ חלבון)`
      ),
      warnings: ["זה תפריט מחושב ממאגר מקומי קטן, לא תחליף לייעוץ רפואי או תזונאי."],
    });
    setStatus("נבנה תפריט יום מלא");
  }

  function applyFullDayPlan() {
    const plan = mealPlan ?? buildLocalMealPlan(profile, caloriesGoal);

    if (currentJournal.meals.length > 0) {
      const ok = window.confirm("כבר יש ארוחות ביום הזה. להחליף אותן בתפריט האוטומטי?");
      if (!ok) return;
    }

    updateJournalMeals(selectedDate, () => plan.meals);

    setMealPlan(plan);
    vibrateBrief();
    setSaveFeedback("✓ התפריט נשמר ביומן");
    setStatus("✓ התפריט האוטומטי נשמר ביומן");
    setView("daily");
  }

  function applyMenuTemplate(template: MenuTemplate) {
    if (currentJournal.meals.length > 0) {
      const ok = window.confirm("כבר יש ארוחות ביום הזה. להחליף אותן בתפריט שבחרת?");
      if (!ok) return;
    }

    const meals: Meal[] = template.meals.map((meal) => ({
      id: makeId(),
      ...meal,
      notes: [meal.notes, `נוסף מתפריט מוכן: ${template.name}`].filter((item) => item.trim()).join("\n"),
    }));

    updateJournalMeals(selectedDate, () => meals);

    vibrateBrief();
    setSaveFeedback("✓ התפריט נשמר ביומן");
    setStatus(`✓ התפריט "${template.name}" נשמר ליומן של ${formatDate(selectedDate)}`);
    setView("daily");
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
            <div style={{ display: "grid", placeItems: "center", gap: 10, marginBottom: 12 }}>
              <Image
                src="/fitkosher-logo.png"
                alt="FitKosher"
                width={170}
                height={170}
                priority
                style={{ width: 170, height: "auto", display: "block" }}
              />
              <div style={heroTitle}>FitKosher</div>
            </div>
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
          <MenuButton label="תפריטים" active={view === "menus"} onClick={() => goTo("menus", setView, setMenuOpen)} />
          <MenuButton label="מאמן AI" active={view === "ai"} onClick={() => goTo("ai", setView, setMenuOpen)} />
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
              <button style={menuToggle} onClick={() => setMenuOpen(true)} aria-label="פתח תפריט">
                ☰
              </button>
              <SyncStatusIndicator status={syncStatus} />
              <div style={{ minWidth: 0, flex: 1, display: "grid", placeItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  <Image
                    src="/fitkosher-logo.png"
                    alt="FitKosher"
                    width={76}
                    height={76}
                    priority
                    style={{ width: 76, height: 76, objectFit: "contain", display: "block" }}
                  />
                  <div style={{ fontSize: 30, fontWeight: 950 }}>FitKosher</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <input
        ref={quickPhotoInputRef}
        style={{ display: "none" }}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          void handleQuickPhotoChange(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div key={view} className="view-shell" style={pageShell}>
        {status && <StatusBox text={status} variant={status.includes("שגיאה") || status.includes("לא תקין") ? "error" : "success"} />}

        <ErrorBoundary resetKey={view}>
        {view === "dashboard" && (
          <DashboardView
            selectedDate={selectedDate}
            profile={profile}
            calorieProgress={calorieProgress}
            todayTotals={todayTotals}
            caloriesGoal={caloriesGoal}
            caloriesRemaining={caloriesRemaining}
            dailyAnalysis={dailyAnalysis}
            carbsGoal={carbsGoal}
            fatGoal={fatGoal}
            latestMeals={latestMeals}
            dairyWaitInfo={dairyWaitInfo}
            dailyFeedback={dailyFeedback}
            weeklySummary={weeklySummary}
            habitInsights={habitInsights}
            latestWeight={latestWeight}
            onOpenQuickPhoto={openQuickPhoto}
            onStartMealEntry={() => {
              resetMealForm();
              setView("daily");
            }}
            onGoMenus={() => setView("menus")}
            onGoAi={() => setView("ai")}
            onGoProgress={() => setView("progress")}
            onEditMeal={(meal) => editMeal(meal, selectedDate)}
          />
        )}

        {view === "daily" && (
          <MealEntryFlow
            barcodeScanning={barcodeScanning}
            barcodeVideoRef={barcodeVideoRef}
            editingMealId={editingMealId}
            mealEntryMode={mealEntryMode}
            mealForm={mealForm}
            mealImageDataUrl={mealImageDataUrl}
            mealParsing={mealParsing}
            recentMeals={recentMeals}
            saveFeedback={saveFeedback}
            scannedBarcode={scannedBarcode}
            selectedDate={selectedDate}
            voiceListening={voiceListening}
            onAddFoodFromDatabase={addFoodFromDatabase}
            onAddRecentMeal={addRecentMeal}
            onMealImageChange={handleMealImageChange}
            onParseMealMacros={parseMealMacros}
            onQuickPhoto={openQuickPhoto}
            onResetMealForm={resetMealForm}
            onSaveMeal={saveMeal}
            onSelectedDateChange={setSelectedDate}
            onSetMealEntryMode={setMealEntryMode}
            onSetMealImageDataUrl={setMealImageDataUrl}
            onStartVoiceMeal={startVoiceMeal}
            onUpdateMealForm={updateMealForm}
          />
        )}

        {view === "menus" && (
          <MenuTemplatesView
            caloriesGoal={caloriesGoal}
            menuDetail={menuDetail}
            profile={profile}
            selectedDate={selectedDate}
            onApplyMenuTemplate={applyMenuTemplate}
            onBackToTemplates={() => setMenuDetailId(null)}
            onOpenTemplate={setMenuDetailId}
            onSelectedDateChange={setSelectedDate}
          />
        )}

        {view === "ai" && (
          <div style={twoPanelGrid}>
            <section style={card}>
              <SectionTitle title="מאמן AI לתזונה" />
              <div style={{ ...subtleText, marginBottom: 14 }}>
                קבל ניתוח מותאם לפרופיל, לארוחות של היום, ליעדי הקלוריות והחלבון ולכללי הבשרי/חלבי שלך.
              </div>

              <label style={labelStyle}>סוג המלצה</label>
              <select style={inputStyle} value={coachMode} onChange={(e) => setCoachMode(e.target.value as CoachMode)}>
                <option value="quick">בדיקה מהירה של היום</option>
                <option value="nextMeal">מה כדאי לאכול בארוחה הבאה</option>
                <option value="fullDay">תוכנית להמשך היום</option>
              </select>

              <Spacer />
              <label style={labelStyle}>שאלה או העדפה</label>
              <textarea
                style={textareaStyle}
                value={coachPrompt}
                onChange={(e) => setCoachPrompt(e.target.value)}
                placeholder="למשל: אני רוצה משהו חלבי, בלי הרבה פחמימות, ושיישאר לי מקום לארוחת ערב."
              />

              <Spacer />
              <button style={primaryBtn} onClick={askAiCoach} disabled={coachLoading}>
                {coachLoading ? "מנתח..." : "הפעל מאמן AI"}
              </button>

              <div style={{ height: 10 }} />
              <button style={secondaryBtn} onClick={previewFullDayPlan}>
                בנה לי יום שלם לפי {caloriesGoal || 1500} קלוריות
              </button>

              {mealPlan && (
                <>
                  <Spacer />
                  <div style={summaryGrid}>
                    <SummaryCard label="קלוריות בתפריט" value={mealPlan.totals.calories} />
                    <SummaryCard label="חלבון" value={mealPlan.totals.protein} suffix=" ג׳" />
                  </div>

                  <div style={{ height: 10 }} />
                  <button style={primaryBtn} onClick={applyFullDayPlan}>
                    שמור את התפריט ביומן של {formatDate(selectedDate)}
                  </button>
                </>
              )}
            </section>

            <section style={card}>
              <SectionTitle title="תוצאה" />
              {coachResult ? (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={aiResultHeader}>
                    <div style={{ fontSize: 20, fontWeight: 900 }}>{coachResult.title}</div>
                    <div style={{ color: "#475569", lineHeight: 1.7, marginTop: 8 }}>{coachResult.summary}</div>
                  </div>

                  <InfoList title="מה לעשות עכשיו" items={coachResult.actionItems} />
                  <InfoList title="רעיונות לארוחות" items={coachResult.mealIdeas} />
                  <InfoList title="שים לב" items={coachResult.warnings} />
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <EmptyBox text="עוד לא הופעלה המלצת AI." />
                  <MiniInfo text={`ציון יומי נוכחי: ${dailyAnalysis.score}%`} />
                  {dailyAnalysis.feedback.map((item, index) => (
                    <MiniInfo key={index} text={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {view === "progress" && (
          <WeightTrackerView
            weightForm={weightForm}
            sortedWeights={sortedWeights}
            onWeightFormChange={(patch) => setWeightForm((prev) => ({ ...prev, ...patch }))}
            onAddWeight={addWeight}
            onDeleteWeight={deleteWeight}
          />
        )}

        {view === "profile" && (
          <section style={{ ...card, maxWidth: 980, margin: "0 auto" }}>
            <SectionTitle title="פרופיל אישי" />
            <div style={profileGrid}>
  <Field label="שם מלא">
    <input style={inputStyle} value={profile.fullName} onChange={(e) => updateProfileField("fullName", e.target.value)} />
  </Field>

  <Field label="גיל">
    <input style={inputStyle} type="number" inputMode="numeric" min="0" value={profile.age} onChange={(e) => updateProfileField("age", e.target.value)} />
  </Field>

  <Field label="גובה">
    <input style={inputStyle} type="number" inputMode="numeric" min="0" value={profile.height} onChange={(e) => updateProfileField("height", e.target.value)} />
  </Field>

  <Field label="משקל התחלתי">
    <input
      style={inputStyle}
      type="number"
      inputMode="decimal"
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
      inputMode="decimal"
      step="0.1"
      min="0"
      value={profile.targetWeight}
      onChange={(e) => updateProfileField("targetWeight", e.target.value)}
    />
  </Field>

  <Field label="מין">
    <select
      style={inputStyle}
      value={profile.gender}
      onChange={(e) => updateProfileField("gender", e.target.value as GenderType)}
    >
      {genderTypes.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  </Field>

  <Field label="מטרה">
    <select
      style={inputStyle}
      value={profile.goalType}
      onChange={(e) => updateProfileField("goalType", e.target.value as GoalType)}
    >
      {goalTypes.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  </Field>

  <Field label="ארוחות ביום">
    <input
      style={inputStyle}
      type="number"
      inputMode="numeric"
      min="1"
      max="8"
      value={profile.mealsPerDay}
      onChange={(e) => updateProfileField("mealsPerDay", e.target.value)}
    />
  </Field>

  <Field label="סגנון תזונה">
    <select
      style={inputStyle}
      value={profile.dietStyle}
      onChange={(e) => updateProfileField("dietStyle", e.target.value as DietStyleType)}
    >
      {dietStyleTypes.map((item) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
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
      inputMode="numeric"
      min="0"
      value={profile.customCaloriesGoal}
      onChange={(e) => updateProfileField("customCaloriesGoal", e.target.value)}
    />
  </Field>

  <Field label="יעד חלבון יומי">
    <input
      style={inputStyle}
      type="number"
      inputMode="decimal"
      min="0"
      value={profile.proteinGoal}
      onChange={(e) => updateProfileField("proteinGoal", e.target.value)}
    />
  </Field>

  <Field label="שעות המתנה אחרי בשר">
    <input
      style={inputStyle}
      type="number"
      inputMode="numeric"
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
          <JournalView
            journalDetail={journalDetail}
            filteredJournals={filteredJournals}
            search={search}
            kosherFilter={journalKosherFilter}
            onSearchChange={setSearch}
            onKosherFilterChange={setJournalKosherFilter}
            onOpenJournal={setJournalDetailDate}
            onBackToList={() => setJournalDetailDate(null)}
            onEditMeal={editMeal}
            onDeleteMeal={deleteMeal}
          />
        )}
        </ErrorBoundary>
      </div>

      {appetiteToast && <div className="appetite-toast">{appetiteToast}</div>}

      <nav style={bottomNav} aria-label="ניווט ראשי">
        <BottomNavButton label="בית" active={view === "dashboard"} onClick={() => setView("dashboard")} />
        <BottomNavButton label="תפריטים" active={view === "menus"} onClick={() => setView("menus")} />
        <BottomNavButton label="AI" active={view === "ai"} onClick={() => setView("ai")} />
        <BottomNavButton label="משקל" active={view === "progress"} onClick={() => setView("progress")} />
      </nav>
    </main>
  );
}
