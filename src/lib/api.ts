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

  upload(
    path: string,
    formData: FormData,
    onProgress?: (pct: number) => void
  ): Promise<Response> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}${path}`)
      if (this.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.token}`)
      }

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100)
          onProgress(percent)
        }
      }

      xhr.onload = () => {
        const response = new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
        })
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(response)
        } else {
          try {
            const body = JSON.parse(xhr.responseText)
            const detail = typeof body.detail === 'string' ? body.detail : 'Upload failed'
            if (this.onError) this.onError(detail)
            reject(new ApiError(detail, xhr.status))
          } catch {
            const msg = `Upload failed with status ${xhr.status}`
            if (this.onError) this.onError(msg)
            reject(new ApiError(msg, xhr.status))
          }
        }
      }

      xhr.onerror = () => {
        const msg = 'Network error during upload'
        if (this.onError) this.onError(msg)
        reject(new ApiError(msg, 0))
      }

      xhr.send(formData)
    })
  }
}
