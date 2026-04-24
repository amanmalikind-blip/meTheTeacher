"use client";

import { FREE_LESSON_LIMIT } from "./constants";

const QUOTA_KEY = "mtt.lessonCount";

export function getLessonCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(QUOTA_KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function incrementLessonCount(): number {
  const next = getLessonCount() + 1;
  window.localStorage.setItem(QUOTA_KEY, String(next));
  return next;
}

export function lessonsRemaining(): number {
  return Math.max(0, FREE_LESSON_LIMIT - getLessonCount());
}

export function quotaExceeded(): boolean {
  return lessonsRemaining() === 0;
}
