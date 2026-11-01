// Used only by server code (page metadata). The browser talks to the API through the /api proxy instead.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:5000";

/** GET from the Express API. Returns null on any failure, so metadata never breaks a page. */
export async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_ORIGIN}/api${path}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const json = (await response.json()) as { success: boolean; data?: T };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}