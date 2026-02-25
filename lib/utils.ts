// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function formatHours(hours: number): string {
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "text-green-600";
  if (percentage >= 75) return "text-brand-500";
  if (percentage >= 50) return "text-yellow-500";
  return "text-orange-500";
}
