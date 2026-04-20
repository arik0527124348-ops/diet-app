import { kosherTypes } from "../constants";
import type { Journal, KosherType, Meal } from "../types";
import { formatDate } from "../utils/dates";
import { safeNumber } from "../utils/misc";
import {
  buttonRow,
  card,
  dangerBtnSmall,
  inputStyle,
  mealCard,
  mealHeader,
  secondaryBtnSmall,
  subMealCard,
} from "../styles";
import { EmptyBox, SectionTitle, Spacer } from "./ui";

type JournalDetailProps = {
  journal: Journal;
  onBack: () => void;
  onEditMeal: (meal: Meal, journalDate: string) => void;
  onDeleteMeal: (mealId: string, journalDate: string) => void;
};

export function JournalDetail({ journal, onBack, onEditMeal, onDeleteMeal }: JournalDetailProps) {
  return (
    <>
      <div style={mealHeader}>
        <div>
          <SectionTitle title={`יומן ${formatDate(journal.date)}`} />
          <div style={{ color: "#64748b", marginTop: -8 }}>
            {journal.meals.length} ארוחות · {journal.meals.reduce((sum, meal) => sum + safeNumber(meal.calories), 0)} קלוריות
          </div>
        </div>
        <button style={secondaryBtnSmall} onClick={onBack}>
          חזרה לכל הימים
        </button>
      </div>

      <Spacer />
      <div style={{ display: "grid", gap: 10 }}>
        {journal.meals.map((meal) => (
          <div key={meal.id} style={subMealCard}>
            <div style={{ fontWeight: 800 }}>
              {meal.type} · <span className={meal.kosherType === "בשרי" ? "kosher-pill kosher-meat" : meal.kosherType === "חלבי" ? "kosher-pill kosher-dairy" : "kosher-pill kosher-pareve"}>{meal.kosherType}</span> · {meal.name}
            </div>
            <div style={{ color: "#64748b", marginTop: 4 }}>
              שעה: {meal.time || "-"} | קלוריות: {meal.calories || 0} | כמות: {meal.quantity || "-"}
            </div>

            {(meal.notes || "").trim() && <div style={{ color: "#475569", marginTop: 6 }}>{meal.notes}</div>}

            <div style={{ ...buttonRow, marginTop: 10 }}>
              <button style={secondaryBtnSmall} onClick={() => onEditMeal(meal, journal.date)}>
                ערוך
              </button>
              <button style={dangerBtnSmall} onClick={() => onDeleteMeal(meal.id, journal.date)}>
                מחק
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

type JournalListProps = {
  journals: Journal[];
  search: string;
  kosherFilter: "all" | KosherType;
  onSearchChange: (value: string) => void;
  onKosherFilterChange: (value: "all" | KosherType) => void;
  onOpenJournal: (date: string) => void;
};

export function JournalList({
  journals,
  search,
  kosherFilter,
  onSearchChange,
  onKosherFilterChange,
  onOpenJournal,
}: JournalListProps) {
  return (
    <>
      <SectionTitle title="כל היומנים" />
      <input
        style={{ ...inputStyle, maxWidth: 320 }}
        placeholder="חיפוש לפי שם ארוחה / תאריך / סוג..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div style={{ height: 10 }} />
      <select
        style={{ ...inputStyle, maxWidth: 220 }}
        value={kosherFilter}
        onChange={(e) => onKosherFilterChange(e.target.value as "all" | KosherType)}
        aria-label="סינון יומנים לפי כשרות"
      >
        <option value="all">כל סוגי הכשרות</option>
        {kosherTypes.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <Spacer />
      <div style={{ display: "grid", gap: 14 }}>
        {journals.length === 0 ? (
          <EmptyBox text="אין יומנים תואמים" />
        ) : (
          journals.map((journal) => {
            const totalCalories = journal.meals.reduce((sum, meal) => sum + safeNumber(meal.calories), 0);
            const totalProtein = journal.meals.reduce((sum, meal) => sum + safeNumber(meal.protein), 0);

            return (
              <button
                key={journal.id}
                className="interactive-button lift-card"
                style={{ ...mealCard, cursor: "pointer", textAlign: "right" }}
                onClick={() => onOpenJournal(journal.date)}
              >
                <div style={mealHeader}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 950 }}>{formatDate(journal.date)}</div>
                    <div style={{ color: "#64748b", marginTop: 4 }}>
                      {journal.meals.length} ארוחות · {totalCalories} קלוריות · {totalProtein} ג׳ חלבון
                    </div>
                  </div>

                  <div style={{ ...secondaryBtnSmall, width: "auto" }}>פתח יום</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

type JournalViewProps = {
  journalDetail: Journal | null;
  filteredJournals: Journal[];
  search: string;
  kosherFilter: "all" | KosherType;
  onSearchChange: (value: string) => void;
  onKosherFilterChange: (value: "all" | KosherType) => void;
  onOpenJournal: (date: string) => void;
  onBackToList: () => void;
  onEditMeal: (meal: Meal, journalDate: string) => void;
  onDeleteMeal: (mealId: string, journalDate: string) => void;
};

export function JournalView({
  journalDetail,
  filteredJournals,
  search,
  kosherFilter,
  onSearchChange,
  onKosherFilterChange,
  onOpenJournal,
  onBackToList,
  onEditMeal,
  onDeleteMeal,
}: JournalViewProps) {
  return (
    <section style={card}>
      {journalDetail ? (
        <JournalDetail journal={journalDetail} onBack={onBackToList} onEditMeal={onEditMeal} onDeleteMeal={onDeleteMeal} />
      ) : (
        <JournalList
          journals={filteredJournals}
          search={search}
          kosherFilter={kosherFilter}
          onSearchChange={onSearchChange}
          onKosherFilterChange={onKosherFilterChange}
          onOpenJournal={onOpenJournal}
        />
      )}
    </section>
  );
}
