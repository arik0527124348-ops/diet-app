import { supabase } from "@/lib/supabase";
import type { SyncPayload } from "../types";
import { defaultProfile } from "./defaults";
import { getErrorMessage } from "./misc";

export async function syncAllToSupabase(userId: string, payload: SyncPayload) {
  try {
    const updatedAt = payload.updatedAt ?? new Date().toISOString();
    const row = {
      user_id: userId,
      profile: payload.profile ?? defaultProfile(),
      journals: Array.isArray(payload.journals) ? payload.journals : [],
      weights: Array.isArray(payload.weights) ? payload.weights : [],
      updated_at: updatedAt,
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
  } catch (error: unknown) {
    console.error("sync crash:", {
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack ?? null : null,
      raw: error,
    });
    return false;
  }
}

export async function loadFromSupabase(userId: string) {
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
      updatedAt: data.updated_at ?? undefined,
    };
  } catch (error: unknown) {
    console.error("loadFromSupabase crash:", {
      message: getErrorMessage(error),
      stack: error instanceof Error ? error.stack ?? null : null,
      raw: error,
    });
    return null;
  }
}
