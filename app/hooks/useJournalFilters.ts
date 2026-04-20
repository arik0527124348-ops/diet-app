import { useMemo } from "react";
import { menuTemplates } from "../data/menu-templates";
import type { Journal, KosherType } from "../types";

export function useJournalFilters({
  journals,
  search,
  kosherFilter,
  journalDetailDate,
  menuDetailId,
}: {
  journals: Journal[];
  search: string;
  kosherFilter: "all" | KosherType;
  journalDetailDate: string | null;
  menuDetailId: string | null;
}) {
  const filteredJournals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...journals].sort((a, b) => b.date.localeCompare(a.date));

    return list.filter((journal) => {
      const matchesKosher = kosherFilter === "all" || journal.meals.some((meal) => meal.kosherType === kosherFilter);

      if (!matchesKosher) return false;
      if (!q) return true;

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
  }, [journals, search, kosherFilter]);

  const journalDetail = useMemo(() => {
    if (!journalDetailDate) return null;
    return journals.find((journal) => journal.date === journalDetailDate) ?? null;
  }, [journals, journalDetailDate]);

  const menuDetail = useMemo(() => {
    if (!menuDetailId) return null;
    return menuTemplates.find((template) => template.id === menuDetailId) ?? null;
  }, [menuDetailId]);

  return {
    filteredJournals,
    journalDetail,
    menuDetail,
  };
}
