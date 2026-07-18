import { apiUrl } from "@/lib/api"

export type ApiResult<T> = { success: boolean; data: T; message?: string; pagination?: Pagination }
export type Pagination = { page: number; limit: number; total: number; pages: number }
export type Status = "ACTIVE" | "INACTIVE" | "BLOCKED"

export async function superAdminApi<T>(endpoint: string, init?: RequestInit): Promise<ApiResult<T>> {
  const response = await fetch(apiUrl(`/super-admin${endpoint}`), {
    credentials: "include",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  })
  const result = await response.json().catch(() => ({ success: false, message: "Invalid server response" }))
  if (!response.ok || !result.success) throw new Error(result.message || "Request failed")
  return result as ApiResult<T>
}

export const money = (value: unknown) => `₹${Number(value || 0).toLocaleString("en-IN")}`
export const titleCase = (value: string) => value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
