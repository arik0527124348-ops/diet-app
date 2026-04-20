import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Journal, Profile, SyncPayload, WeightEntry } from "../types";
import { defaultProfile } from "../utils/defaults";
import { getStorageKey } from "../utils/misc";
import { loadFromSupabase, syncAllToSupabase } from "../utils/sync";

const REMOTE_SYNC_DEBOUNCE_MS = 900;
const REMOTE_SYNC_RETRY_DELAYS_MS = [700, 1600];
const OFFLINE_QUEUE_KEY_PREFIX = "diet_app_sync_queue";

export type SyncStatus = "synced" | "syncing" | "pending" | "offline" | "error" | "local";

type UseSyncParams = {
  authReady: boolean;
  user: User | null;
  profile: Profile;
  journals: Journal[];
  weights: WeightEntry[];
  setProfile: (profile: Profile) => void;
  setJournals: (journals: Journal[]) => void;
  setWeights: (weights: WeightEntry[]) => void;
  setStatus: (status: string) => void;
};

function serializeSyncPayload(payload: SyncPayload) {
  return JSON.stringify(payload);
}

function safePersistLocalPayload(storageKey: string, payload: SyncPayload) {
  localStorage.setItem(storageKey, serializeSyncPayload(payload));
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getOfflineQueueKey(userId: string) {
  return `${OFFLINE_QUEUE_KEY_PREFIX}_${userId}`;
}

function queueRemoteSync(userId: string, payload: SyncPayload) {
  localStorage.setItem(getOfflineQueueKey(userId), serializeSyncPayload(payload));
}

function readQueuedRemoteSync(userId: string) {
  const raw = localStorage.getItem(getOfflineQueueKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SyncPayload;
  } catch {
    localStorage.removeItem(getOfflineQueueKey(userId));
    return null;
  }
}

function normalizePayload(value: Partial<SyncPayload> | null | undefined): SyncPayload {
  return {
    profile: value?.profile ?? defaultProfile(),
    journals: Array.isArray(value?.journals) ? value.journals : [],
    weights: Array.isArray(value?.weights) ? value.weights : [],
    updatedAt: value?.updatedAt,
  };
}

function parseStoredPayload(raw: string | null) {
  if (!raw) return null;

  try {
    return normalizePayload(JSON.parse(raw) as Partial<SyncPayload>);
  } catch {
    return null;
  }
}

function getPayloadTime(payload: SyncPayload | null | undefined) {
  const time = Date.parse(payload?.updatedAt ?? "");
  return Number.isFinite(time) ? time : 0;
}

function chooseNewestPayload(...payloads: Array<SyncPayload | null | undefined>) {
  return payloads
    .filter((payload): payload is SyncPayload => Boolean(payload))
    .sort((a, b) => getPayloadTime(b) - getPayloadTime(a))[0] ?? null;
}

function stampPayload(payload: Omit<SyncPayload, "updatedAt">, updatedAt = new Date().toISOString()): SyncPayload {
  return {
    ...payload,
    updatedAt,
  };
}

async function syncWithSilentRetry(userId: string, payload: SyncPayload) {
  for (let attempt = 0; attempt <= REMOTE_SYNC_RETRY_DELAYS_MS.length; attempt += 1) {
    const synced = await syncAllToSupabase(userId, payload);
    if (synced) return true;

    const delay = REMOTE_SYNC_RETRY_DELAYS_MS[attempt];
    if (delay) await wait(delay);
  }

  return false;
}

export function useSync({
  authReady,
  user,
  profile,
  journals,
  weights,
  setProfile,
  setJournals,
  setWeights,
  setStatus,
}: UseSyncParams) {
  const [loaded, setLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");
  const lastLocalSnapshotRef = useRef("");
  const lastRemoteSnapshotRef = useRef("");

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function loadAll() {
      setLoaded(false);
      setSyncStatus(user?.id ? "syncing" : "local");

      try {
        const storageKey = getStorageKey(user?.id);
        const localPayload = parseStoredPayload(localStorage.getItem(storageKey));

        if (!user?.id && localPayload) {
          if (!cancelled) {
            const nextPayload = normalizePayload(localPayload);

            setProfile(nextPayload.profile);
            setJournals(nextPayload.journals);
            setWeights(nextPayload.weights);
            lastLocalSnapshotRef.current = serializeSyncPayload(nextPayload);
            setSyncStatus("local");
          }
        } else if (!user?.id && !cancelled) {
          const emptyPayload = stampPayload({
            profile: defaultProfile(),
            journals: [],
            weights: [],
          });

          setProfile(emptyPayload.profile);
          setJournals(emptyPayload.journals);
          setWeights(emptyPayload.weights);
          lastLocalSnapshotRef.current = serializeSyncPayload(emptyPayload);
          setSyncStatus("local");
        }

        if (user?.id) {
          const queued = readQueuedRemoteSync(user.id);
          const remote = await loadFromSupabase(user.id);
          const nextPayload = chooseNewestPayload(queued, localPayload, normalizePayload(remote));
          const hasQueuedWinner = Boolean(queued && nextPayload && queued.updatedAt === nextPayload.updatedAt);
          const shouldPushRemote = Boolean(nextPayload && getPayloadTime(nextPayload) > getPayloadTime(normalizePayload(remote)));

          if (nextPayload && !cancelled) {
            setProfile(nextPayload.profile);
            setJournals(nextPayload.journals);
            setWeights(nextPayload.weights);
            safePersistLocalPayload(storageKey, nextPayload);
            const snapshot = serializeSyncPayload(nextPayload);
            lastLocalSnapshotRef.current = snapshot;
            lastRemoteSnapshotRef.current = hasQueuedWinner || shouldPushRemote ? "" : snapshot;
            setSyncStatus(hasQueuedWinner || shouldPushRemote ? "pending" : "synced");
          } else if (!cancelled) {
            const emptyPayload = stampPayload({
              profile: defaultProfile(),
              journals: [],
              weights: [],
            });
            setProfile(emptyPayload.profile);
            setJournals(emptyPayload.journals);
            setWeights(emptyPayload.weights);
            safePersistLocalPayload(storageKey, emptyPayload);
            const snapshot = serializeSyncPayload(emptyPayload);
            lastLocalSnapshotRef.current = snapshot;
            lastRemoteSnapshotRef.current = "";
            setSyncStatus("pending");
          }
        }
      } catch (error) {
        console.error("load error:", error);
        if (!cancelled) {
          setStatus("שגיאה בטעינת הנתונים");
          setSyncStatus("error");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.id, setProfile, setJournals, setWeights, setStatus]);

  useEffect(() => {
    if (!loaded) return;

    const previousPayload = parseStoredPayload(localStorage.getItem(getStorageKey(user?.id)));
    const snapshotWithoutTimestamp = serializeSyncPayload({ profile, journals, weights });
    const previousSnapshotWithoutTimestamp = previousPayload
      ? serializeSyncPayload({
          profile: previousPayload.profile,
          journals: previousPayload.journals,
          weights: previousPayload.weights,
        })
      : "";
    const payload = stampPayload(
      { profile, journals, weights },
      snapshotWithoutTimestamp === previousSnapshotWithoutTimestamp && previousPayload?.updatedAt
        ? previousPayload.updatedAt
        : new Date().toISOString(),
    );
    const snapshot = serializeSyncPayload(payload);

    if (snapshot !== lastLocalSnapshotRef.current) {
      try {
        safePersistLocalPayload(getStorageKey(user?.id), payload);
        lastLocalSnapshotRef.current = snapshot;
      } catch (error) {
        console.error("local save error:", error);
        setStatus("שגיאה בשמירה המקומית");
      }
    }

    if (!user?.id) {
      setSyncStatus("local");
      return;
    }
    if (snapshot === lastRemoteSnapshotRef.current) return;

    if (!navigator.onLine) {
      queueRemoteSync(user.id, payload);
      setSyncStatus("offline");
      setStatus("אין חיבור כרגע. השינויים נשמרו ויסתנכרנו כשהאינטרנט יחזור.");
      return;
    }

    let cancelled = false;
    setSyncStatus("pending");
    const timeout = setTimeout(async () => {
      setSyncStatus("syncing");
      const synced = await syncWithSilentRetry(user.id, payload);
      if (cancelled) return;

      if (synced) {
        lastRemoteSnapshotRef.current = snapshot;
        localStorage.removeItem(getOfflineQueueKey(user.id));
        setSyncStatus("synced");
      } else {
        queueRemoteSync(user.id, payload);
        setSyncStatus("error");
        setStatus("שגיאה בסנכרון הנתונים. השינוי נשמר וינוסה שוב בהמשך.");
      }
    }, REMOTE_SYNC_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [profile, journals, weights, loaded, user?.id, setStatus]);

  useEffect(() => {
    if (!user?.id) return;

    async function flushQueuedSync() {
      if (!navigator.onLine || !user?.id) {
        setSyncStatus("offline");
        return;
      }

      const queued = readQueuedRemoteSync(user.id);
      if (!queued) return;

      setSyncStatus("syncing");
      const synced = await syncWithSilentRetry(user.id, queued);
      if (!synced) {
        setSyncStatus("error");
        return;
      }

      const snapshot = serializeSyncPayload(queued);
      lastRemoteSnapshotRef.current = snapshot;
      localStorage.removeItem(getOfflineQueueKey(user.id));
      setSyncStatus("synced");
      setStatus("הנתונים סונכרנו אחרי חזרה לאינטרנט");
    }

    window.addEventListener("online", flushQueuedSync);
    void flushQueuedSync();

    return () => {
      window.removeEventListener("online", flushQueuedSync);
    };
  }, [user?.id, setStatus]);

  return { loaded, syncStatus };
}
