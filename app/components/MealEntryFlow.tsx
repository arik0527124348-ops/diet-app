import type { RefObject } from "react";
import { foodDatabase } from "../data/food-database";
import { kosherTypes, mealTypes } from "../constants";
import type { FoodItem, KosherType, Meal, MealForm, MealType } from "../types";
import { formatDate } from "../utils/dates";
import {
  buttonRow,
  card,
  contentGrid,
  fileInputStyle,
  inputStyle,
  labelStyle,
  macroGrid,
  mealBadge,
  mealCard,
  mealHeader,
  mealPhotoBox,
  mealPhotoPreview,
  primaryBtn,
  secondaryBtn,
  secondaryBtnSmall,
  subtleText,
  textareaStyle,
  twoCols,
} from "../styles";
import { Field, MiniInfo, SectionTitle, Spacer } from "./ui";

type MealEntryMode = "choose" | "manual" | "database" | "barcode";

type RecentMeal = {
  meal: Meal;
  count: number;
};

function kosherClassName(kosherType: KosherType) {
  if (kosherType === "בשרי") return "kosher-pill kosher-meat";
  if (kosherType === "חלבי") return "kosher-pill kosher-dairy";
  return "kosher-pill kosher-pareve";
}

type RecentMealButtonProps = {
  meal: Meal;
  count: number;
  onClick: () => void;
  keyPrefix: string;
};

function RecentMealButton({ meal, count, onClick, keyPrefix }: RecentMealButtonProps) {
  return (
    <button
      key={`${keyPrefix}-${meal.name}-${meal.quantity}-${count}`}
      className="interactive-button lift-card"
      style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderRight: "4px solid #16a34a" }}
      onClick={onClick}
    >
      <div style={mealHeader}>
        <div>
          <div style={mealBadge}>
            <span className={kosherClassName(meal.kosherType)}>{meal.kosherType}</span> נאכל {count} פעמים
          </div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>{meal.name}</div>
          <div style={{ color: "#64748b", marginTop: 4 }}>{meal.quantity || "כמות לא צוינה"}</div>
        </div>
        <div style={{ fontWeight: 950, color: "#16a34a" }}>{meal.calories || 0} קל׳</div>
      </div>
    </button>
  );
}

type MealEntryFlowProps = {
  barcodeScanning: boolean;
  barcodeVideoRef: RefObject<HTMLVideoElement | null>;
  editingMealId: string | null;
  mealEntryMode: MealEntryMode;
  mealForm: MealForm;
  mealImageDataUrl: string;
  mealParsing: boolean;
  recentMeals: RecentMeal[];
  saveFeedback: string;
  scannedBarcode: string;
  selectedDate: string;
  voiceListening: boolean;
  onAddFoodFromDatabase: (food: FoodItem) => void;
  onAddRecentMeal: (meal: Meal) => void;
  onMealImageChange: (file: File | undefined) => void;
  onParseMealMacros: () => void;
  onQuickPhoto: () => void;
  onResetMealForm: () => void;
  onSaveMeal: () => void;
  onSelectedDateChange: (value: string) => void;
  onSetMealEntryMode: (mode: MealEntryMode) => void;
  onSetMealImageDataUrl: (value: string) => void;
  onStartVoiceMeal: () => void;
  onUpdateMealForm: (field: keyof MealForm, value: string) => void;
};

export function MealEntryFlow({
  barcodeScanning,
  barcodeVideoRef,
  editingMealId,
  mealEntryMode,
  mealForm,
  mealImageDataUrl,
  mealParsing,
  recentMeals,
  saveFeedback,
  scannedBarcode,
  selectedDate,
  voiceListening,
  onAddFoodFromDatabase,
  onAddRecentMeal,
  onMealImageChange,
  onParseMealMacros,
  onQuickPhoto,
  onResetMealForm,
  onSaveMeal,
  onSelectedDateChange,
  onSetMealEntryMode,
  onSetMealImageDataUrl,
  onStartVoiceMeal,
  onUpdateMealForm,
}: MealEntryFlowProps) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <section style={card}>
        <SectionTitle title={editingMealId ? "עריכת ארוחה" : "הוספת ארוחה"} />
        <label style={labelStyle}>תאריך</label>
        <input style={inputStyle} type="date" value={selectedDate} onChange={(e) => onSelectedDateChange(e.target.value)} />

        {!editingMealId && mealEntryMode === "choose" ? (
          <>
            {recentMeals.length > 0 && (
              <>
                <Spacer />
                <div style={{ fontWeight: 950, marginBottom: 10 }}>נאכל לאחרונה</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {recentMeals.slice(0, 3).map(({ meal, count }) => (
                    <RecentMealButton
                      key={`${meal.name}-${meal.quantity}-${count}`}
                      keyPrefix="quick-recent"
                      meal={meal}
                      count={count}
                      onClick={() => onAddRecentMeal(meal)}
                    />
                  ))}
                </div>
              </>
            )}
            <Spacer />
            <div style={contentGrid}>
              <button
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderTop: "4px solid #16a34a" }}
                onClick={onQuickPhoto}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>צלם ארוחה</div>
                <div style={{ ...subtleText, marginTop: 6 }}>פתח מצלמה, העלה תמונה, ואז פרק עם AI.</div>
              </button>

              <button
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderTop: "4px solid #6366f1" }}
                onClick={() => onSetMealEntryMode("database")}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>בחר ממאגר</div>
                <div style={{ ...subtleText, marginTop: 6 }}>טונה, ביצים, קוטג׳, עוף ועוד בלחיצה אחת.</div>
              </button>

              <button
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderTop: "4px solid #0ea5e9" }}
                onClick={() => onSetMealEntryMode("barcode")}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>סרוק ברקוד</div>
                <div style={{ ...subtleText, marginTop: 6 }}>כוון את המצלמה לברקוד. אם המוצר מוכר, הכשרות תופיע מיד.</div>
              </button>

              <button
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderTop: "4px solid #f59e0b" }}
                onClick={() => onSetMealEntryMode("manual")}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>כתוב ידנית</div>
                <div style={{ ...subtleText, marginTop: 6 }}>פתח את הטופס המלא והזן מה שאכלת.</div>
              </button>

              <button
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right", borderTop: "4px solid #dc2626" }}
                onClick={onStartVoiceMeal}
                disabled={voiceListening || mealParsing}
              >
                <div style={{ fontSize: 22, fontWeight: 950 }}>{voiceListening ? "מקשיב..." : "דבר ארוחה"}</div>
                <div style={{ ...subtleText, marginTop: 6 }}>אמור למשל: אכלתי שתי פרוסות לחם עם חומוס וביצה קשה.</div>
              </button>
            </div>
          </>
        ) : !editingMealId && mealEntryMode === "barcode" ? (
          <>
            <Spacer />
            <div style={mealHeader}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>סריקת ברקוד</div>
                <div style={{ ...subtleText, marginTop: 4 }}>מקם את הברקוד בתוך המסגרת.</div>
              </div>
              <button style={secondaryBtnSmall} onClick={() => onSetMealEntryMode("choose")}>
                ביטול
              </button>
            </div>

            <Spacer />
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#0f172a",
                minHeight: 280,
              }}
            >
              <video
                ref={barcodeVideoRef}
                muted
                playsInline
                style={{ width: "100%", minHeight: 280, objectFit: "cover", display: "block" }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "78%",
                    maxWidth: 360,
                    height: 118,
                    border: "3px solid #16a34a",
                    borderRadius: 8,
                    boxShadow: "0 0 0 999px rgba(15,23,42,0.42)",
                  }}
                />
              </div>
            </div>

            <Spacer />
            <MiniInfo text={barcodeScanning ? "מחפש ברקוד..." : "פותח מצלמה..."} />
            {scannedBarcode && <MiniInfo text={`ברקוד אחרון: ${scannedBarcode}`} />}
          </>
        ) : !editingMealId && mealEntryMode === "database" ? (
          <>
            <Spacer />
            <div style={mealHeader}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 950 }}>מאגר מזונות</div>
                <div style={{ ...subtleText, marginTop: 4 }}>בחר פריט והוא יתווסף ליומן של {formatDate(selectedDate)}.</div>
              </div>
              <button style={secondaryBtnSmall} onClick={() => onSetMealEntryMode("choose")}>
                חזרה
              </button>
            </div>

            <Spacer />
            <div style={{ display: "grid", gap: 10 }}>
              {recentMeals.length > 0 && (
                <>
                  <div style={{ fontWeight: 950, marginTop: 2 }}>נאכלו הרבה בשבועיים האחרונים</div>
                  {recentMeals.map(({ meal, count }) => (
                    <RecentMealButton
                      key={`${meal.name}-${meal.quantity}-${count}`}
                      keyPrefix="database-recent"
                      meal={meal}
                      count={count}
                      onClick={() => onAddRecentMeal(meal)}
                    />
                  ))}
                  <Spacer small />
                  <div style={{ fontWeight: 950 }}>מאגר מזונות</div>
                </>
              )}
              {foodDatabase.map((food) => (
                <button
                  key={food.id}
                  className="interactive-button lift-card"
                  style={{ ...mealCard, cursor: "pointer", textAlign: "right" }}
                  onClick={() => onAddFoodFromDatabase(food)}
                >
                  <div style={mealHeader}>
                    <div>
                      <div style={mealBadge}>
                        <span className={kosherClassName(food.kosherType)}>{food.kosherType}</span> {food.mealTypes.join(" / ")}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 950 }}>{food.name}</div>
                      <div style={{ color: "#64748b", marginTop: 4 }}>{food.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 950, color: "#16a34a" }}>{food.calories} קל׳</div>
                  </div>
                  <div style={{ color: "#64748b", marginTop: 8 }}>
                    {food.protein} ג׳ חלבון · {food.carbs} ג׳ פחמימות · {food.fat} ג׳ שומן
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <Spacer />
            <label style={labelStyle}>סוג ארוחה</label>
            <select style={inputStyle} value={mealForm.type} onChange={(e) => onUpdateMealForm("type", e.target.value as MealType)}>
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
              onChange={(e) => onUpdateMealForm("kosherType", e.target.value as KosherType)}
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
              onChange={(e) => onUpdateMealForm("name", e.target.value)}
              placeholder="למשל: 2 ביצים, קוטג׳ 5%, פרוסת לחם וסלט"
            />
            <div style={{ height: 10 }} />
            <button style={secondaryBtn} onClick={onParseMealMacros} disabled={mealParsing}>
              {mealParsing ? "מפרק ארוחה..." : "פרק עם AI לקלוריות וחלבון"}
            </button>
            <div style={{ ...subtleText, fontSize: 13, marginTop: 8 }}>
              כתוב חופשי מה אכלת, והמערכת תמלא קלוריות, חלבון, פחמימות ושומן לפי הערכה.
            </div>

            <Spacer />
            <label style={labelStyle}>צילום ארוחה</label>
            <input
              style={fileInputStyle}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onMealImageChange(e.target.files?.[0])}
            />
            {mealImageDataUrl && (
              <>
                <div style={{ height: 10 }} />
                <div style={mealPhotoBox}>
                  <div
                    aria-label="תמונת ארוחה לניתוח"
                    role="img"
                    style={{
                      ...mealPhotoPreview,
                      backgroundImage: `url(${mealImageDataUrl})`,
                    }}
                  />
                  <button style={secondaryBtnSmall} onClick={() => onSetMealImageDataUrl("")}>
                    הסר תמונה
                  </button>
                </div>
              </>
            )}

            <Spacer />
            <div style={twoCols}>
              <Field label="כמות">
                <input
                  style={inputStyle}
                  value={mealForm.quantity}
                  onChange={(e) => onUpdateMealForm("quantity", e.target.value)}
                  placeholder="למשל: 2 פרוסות"
                />
              </Field>
              <Field label="שעה">
                <input
                  style={inputStyle}
                  type="time"
                  value={mealForm.time}
                  onChange={(e) => onUpdateMealForm("time", e.target.value)}
                />
              </Field>
            </div>

            <Spacer />
            <div style={macroGrid}>
              <Field label="קלוריות">
                <input
                  style={inputStyle}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={mealForm.calories}
                  onChange={(e) => onUpdateMealForm("calories", e.target.value)}
                />
              </Field>
              <Field label="חלבון">
                <input
                  style={inputStyle}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={mealForm.protein}
                  onChange={(e) => onUpdateMealForm("protein", e.target.value)}
                />
              </Field>
              <Field label="פחמימות">
                <input
                  style={inputStyle}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={mealForm.carbs}
                  onChange={(e) => onUpdateMealForm("carbs", e.target.value)}
                />
              </Field>
              <Field label="שומן">
                <input
                  style={inputStyle}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={mealForm.fat}
                  onChange={(e) => onUpdateMealForm("fat", e.target.value)}
                />
              </Field>
            </div>

            <Spacer />
            <label style={labelStyle}>הערות</label>
            <textarea
              style={textareaStyle}
              value={mealForm.notes}
              onChange={(e) => onUpdateMealForm("notes", e.target.value)}
              placeholder="איך הרגשת, מה היה חסר, הערות אישיות..."
            />

            <Spacer />
            <div style={buttonRow}>
              <button style={primaryBtn} onClick={onSaveMeal} disabled={mealParsing}>
                {mealParsing ? "ממתין ל-AI..." : editingMealId ? "עדכן ארוחה" : "הוסף ארוחה"}
              </button>
              <button style={secondaryBtn} onClick={onResetMealForm}>
                נקה טופס
              </button>
            </div>
            {saveFeedback && <div className="save-feedback">{saveFeedback}</div>}
          </>
        )}
      </section>
    </div>
  );
}
