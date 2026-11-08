/**
 * Personalisation store.
 *
 * Works in two modes and never pretends to be the other:
 *
 *  - Signed in: rows are written to Supabase, so the data follows the user
 *    across devices and is protected by Row Level Security.
 *  - Signed out: the same operations are kept in localStorage so the features
 *    are still usable, and the UI states plainly that this is local only.
 *
 * The `mode` value tells the UI which of the two is active.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured } from '../lib/env';
import { supabase } from '../lib/supabase';

export type InterestCategory = 'world' | 'technology' | 'ai' | 'science' | 'education' | 'business';

export interface SavedArticle {
  id: string;
  articleId: string;
  title: string;
  link: string;
  source: string;
  category: InterestCategory;
  summary: string;
  savedAt: string;
}

export interface HistoryEntry {
  articleId: string;
  title: string;
  link: string;
  source: string;
  category: InterestCategory;
  viewedAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  link: string | null;
  kind: 'new-article' | 'system';
  createdAt: string;
  read: boolean;
}

export type StoreMode = 'cloud' | 'local';

export interface PersonalizationValue {
  mode: StoreMode;
  ready: boolean;
  interests: InterestCategory[];
  saved: SavedArticle[];
  history: HistoryEntry[];
  notifications: AppNotification[];
  toggleInterest: (category: InterestCategory) => void;
  saveArticle: (article: Omit<SavedArticle, 'id' | 'savedAt'>) => void;
  unsaveArticle: (articleId: string) => void;
  isSaved: (articleId: string) => boolean;
  recordView: (entry: Omit<HistoryEntry, 'viewedAt'>) => void;
  clearHistory: () => void;
  pushNotification: (entry: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAllRead: () => void;
  clearNotifications: () => void;
}

const KEYS = {
  interests: 'nexora:interests',
  saved: 'nexora:saved',
  history: 'nexora:history',
  notifications: 'nexora:notifications',
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable; the in-memory state still works for this session */
  }
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The signed-in user id, if any. Kept in module scope so the write helpers can
 * reach it without prop drilling. Set by syncPersonalization.
 */
let currentUserId: string | null = null;

/**
 * The store is exposed as a singleton so every component shares one copy
 * without a context provider, and updates re-render all subscribers.
 */
const listeners = new Set<() => void>();
let state = {
  ready: false,
  interests: [] as InterestCategory[],
  saved: [] as SavedArticle[],
  history: [] as HistoryEntry[],
  notifications: [] as AppNotification[],
};

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  emit();
}

function useSnapshot() {
  const [, force] = useState(0);
  useEffect(() => {
    const listener = () => force((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return state;
}

// ------------------------------------------------------------- persistence

async function loadFromCloud(userId: string) {
  if (!supabase) return;
  const [interests, saved, history, notifications] = await Promise.all([
    supabase.from('user_interests').select('category').eq('user_id', userId),
    supabase
      .from('saved_articles')
      .select('id,article_id,title,link,source,category,summary,saved_at')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false }),
    supabase
      .from('reading_history')
      .select('article_id,title,link,source,category,viewed_at')
      .eq('user_id', userId)
      .order('viewed_at', { ascending: false })
      .limit(200),
    supabase
      .from('notifications')
      .select('id,title,body,link,kind,created_at,read')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  setState({
    ready: true,
    interests: (interests.data ?? []).map((row) => row.category as InterestCategory),
    saved: (saved.data ?? []).map((row) => ({
      id: row.id,
      articleId: row.article_id,
      title: row.title,
      link: row.link,
      source: row.source,
      category: row.category as InterestCategory,
      summary: row.summary ?? '',
      savedAt: row.saved_at,
    })),
    history: (history.data ?? []).map((row) => ({
      articleId: row.article_id,
      title: row.title,
      link: row.link,
      source: row.source,
      category: row.category as InterestCategory,
      viewedAt: row.viewed_at,
    })),
    notifications: (notifications.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body ?? '',
      link: row.link,
      kind: row.kind as AppNotification['kind'],
      createdAt: row.created_at,
      read: row.read,
    })),
  });
}

function loadFromLocal() {
  setState({
    ready: true,
    interests: readLocal<InterestCategory[]>(KEYS.interests, []),
    saved: readLocal<SavedArticle[]>(KEYS.saved, []),
    history: readLocal<HistoryEntry[]>(KEYS.history, []),
    notifications: readLocal<AppNotification[]>(KEYS.notifications, []),
  });
}

/**
 * Called once when the auth state is known. Switches the store between the
 * cloud and local modes and loads whichever applies.
 */
export async function syncPersonalization(userId: string | null): Promise<void> {
  currentUserId = userId;
  if (userId && isSupabaseConfigured) {
    try {
      await loadFromCloud(userId);
      return;
    } catch {
      // Fall through to local so the app stays usable if the query fails.
    }
  }
  loadFromLocal();
}

// ------------------------------------------------------------------- hook

export function usePersonalization(): PersonalizationValue {
  const snapshot = useSnapshot();
  const mode: StoreMode = currentUserId && isSupabaseConfigured ? 'cloud' : 'local';

  const toggleInterest = useCallback((category: InterestCategory) => {
    const has = state.interests.includes(category);
    const next = has
      ? state.interests.filter((item) => item !== category)
      : [...state.interests, category];
    setState({ interests: next });
    writeLocal(KEYS.interests, next);

    const userId = currentUserId;
    if (userId && supabase) {
      if (has) {
        void supabase.from('user_interests').delete().eq('user_id', userId).eq('category', category);
      } else {
        void supabase.from('user_interests').insert({ user_id: userId, category });
      }
    }
  }, []);

  const saveArticle = useCallback((article: Omit<SavedArticle, 'id' | 'savedAt'>) => {
    if (state.saved.some((item) => item.articleId === article.articleId)) return;
    const entry: SavedArticle = { ...article, id: uid(), savedAt: new Date().toISOString() };
    const next = [entry, ...state.saved];
    setState({ saved: next });
    writeLocal(KEYS.saved, next);

    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('saved_articles').insert({
        user_id: userId,
        article_id: article.articleId,
        title: article.title,
        link: article.link,
        source: article.source,
        category: article.category,
        summary: article.summary,
      });
    }
  }, []);

  const unsaveArticle = useCallback((articleId: string) => {
    const next = state.saved.filter((item) => item.articleId !== articleId);
    setState({ saved: next });
    writeLocal(KEYS.saved, next);

    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('saved_articles').delete().eq('user_id', userId).eq('article_id', articleId);
    }
  }, []);

  const recordView = useCallback((entry: Omit<HistoryEntry, 'viewedAt'>) => {
    const viewed: HistoryEntry = { ...entry, viewedAt: new Date().toISOString() };
    const next = [viewed, ...state.history.filter((item) => item.articleId !== entry.articleId)].slice(0, 200);
    setState({ history: next });
    writeLocal(KEYS.history, next);

    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('reading_history').upsert(
        {
          user_id: userId,
          article_id: entry.articleId,
          title: entry.title,
          link: entry.link,
          source: entry.source,
          category: entry.category,
          viewed_at: viewed.viewedAt,
        },
        { onConflict: 'user_id,article_id' }
      );
    }
  }, []);

  const clearHistory = useCallback(() => {
    setState({ history: [] });
    writeLocal(KEYS.history, []);
    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('reading_history').delete().eq('user_id', userId);
    }
  }, []);

  const pushNotification = useCallback((entry: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const notification: AppNotification = {
      ...entry,
      id: uid(),
      createdAt: new Date().toISOString(),
      read: false,
    };
    const next = [notification, ...state.notifications].slice(0, 50);
    setState({ notifications: next });
    writeLocal(KEYS.notifications, next);

    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('notifications').insert({
        user_id: userId,
        title: entry.title,
        body: entry.body,
        link: entry.link,
        kind: entry.kind,
      });
    }
  }, []);

  const markAllRead = useCallback(() => {
    const next = state.notifications.map((item) => ({ ...item, read: true }));
    setState({ notifications: next });
    writeLocal(KEYS.notifications, next);
    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setState({ notifications: [] });
    writeLocal(KEYS.notifications, []);
    const userId = currentUserId;
    if (userId && supabase) {
      void supabase.from('notifications').delete().eq('user_id', userId);
    }
  }, []);

  return useMemo(
    () => ({
      mode,
      ready: snapshot.ready,
      interests: snapshot.interests,
      saved: snapshot.saved,
      history: snapshot.history,
      notifications: snapshot.notifications,
      toggleInterest,
      saveArticle,
      unsaveArticle,
      isSaved: (articleId: string) => snapshot.saved.some((item) => item.articleId === articleId),
      recordView,
      clearHistory,
      pushNotification,
      markAllRead,
      clearNotifications,
    }),
    [
      mode,
      snapshot,
      toggleInterest,
      saveArticle,
      unsaveArticle,
      recordView,
      clearHistory,
      pushNotification,
      markAllRead,
      clearNotifications,
    ]
  );
}
