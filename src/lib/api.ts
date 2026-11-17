import { API_BASE } from './constants'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ApiClient {
  private readonly token: string | undefined
  private readonly onError?: (msg: string) => void

  constructor(
    token: string | undefined,
    onError?: (msg: string) => void
  ) {
    this.token = token
    this.onError = onError
  }

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`)
    if (init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }
    const res = await fetch(`${API_BASE}${path}`, { ...init, headers })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const detail =
        Array.isArray(body.detail)
          ? body.detail
              .map((i: { msg?: string; loc?: (string | number)[] }) =>
                `${i.loc?.slice(-1)[0] ?? 'Request'}: ${i.msg || 'Invalid value'}`
              )
              .join(' ')
          : typeof body.detail === 'string'
          ? body.detail
          : 'The request could not be completed.'
      if (this.onError) {
        this.onError(detail)
      }
      throw new ApiError(detail, res.status)
    }
    return res
  }

  async upload(
    path: string,
    formData: FormData,
    onProgress?: (pct: number) => void
  ): Promise<Response> {
    // Signal progress start
    if (onProgress) onProgress(0)

    const headers: Record<string, string> = {}
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (onProgress) onProgress(100)

      if (res.ok) {
        return res
      }

      // Handle error responses
      const body = await res.json().catch(() => ({}))
      const detail =
        typeof body.detail === 'string'
          ? body.detail
          : `Upload failed with status ${res.status}`
      if (this.onError) this.onError(detail)
      throw new ApiError(detail, res.status)
    } catch (err) {
      if (err instanceof ApiError) throw err
      const msg = 'Network error during upload'
      if (this.onError) this.onError(msg)
      throw new ApiError(msg, 0)
    }
  }
}
