/** localStorage that never throws (private mode, blocked storage, quota). */
export function readJSON<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const text = localStorage.getItem(key);
    if (text === null) return fallback;
    const value: unknown = JSON.parse(text);
    return isValid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the app keeps working for this session.
  }
}
