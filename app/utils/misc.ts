export function getStorageKey(userId?: string | null) {
  return userId ? `diet_app_pro_${userId}` : "diet_app_pro_guest";
}

export function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function safeNumber(value: string | number | null | undefined) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "שגיאה לא ידועה";
}
