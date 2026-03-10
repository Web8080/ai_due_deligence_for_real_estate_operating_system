"use client";

export function getApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.hostname}:8000`;
  return "http://localhost:8000";
}

export function getStoredAuth() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("reos_auth");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("reos_auth");
}

export function authHeaders(token, contentType = "application/json") {
  if (!token) return {};
  if (!contentType) return { Authorization: `Bearer ${token}` };
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": contentType,
  };
}
