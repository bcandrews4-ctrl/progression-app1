export async function fetchStravaConnection() { return null; }
export async function fetchStravaActivities() { return []; }
export async function syncStrava() { return { importedCount: 0, updatedCount: 0 }; }
export async function connectStrava() {}
export async function disconnectStrava() {}
export function mapStravaTypeToCategory(type: string): "Running" | "Cardio" {
  return type === "Run" ? "Running" : "Cardio";
}
