import type { ApiResponse } from '@monitor-me/shared'

/**
 * Thin fetch wrapper for the application (non-auth) API.
 *
 * - `credentials: 'include'` sends the session cookie; the cookie is httpOnly, so
 *   no token is ever held in JS and an XSS payload cannot read it.
 * - Responses are parsed as JSON only. Nothing from the server is ever inserted
 *   as HTML, so a malicious string in a field stays inert text in React.
 */

const baseUrl = import.meta.env.VITE_SERVER_URL?.trim() ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string[]>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null

  if (!payload) {
    throw new ApiError(response.status, 'INTERNAL_ERROR', 'Unexpected server response.')
  }

  if (!payload.ok) {
    throw new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.fields,
    )
  }

  return payload.data
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}
