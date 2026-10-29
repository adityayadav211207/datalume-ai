import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient, ApiError } from './api'

describe('ApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('makes request with Authorization header when token is provided', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const client = new ApiClient('test-token')
    await client.request('/api/test')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toContain('/api/test')
    const headers = init.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test-token')
  })

  it('sets Content-Type to application/json for JSON body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const client = new ApiClient(undefined)
    await client.request('/api/data', { method: 'POST', body: JSON.stringify({ a: 1 }) })

    const [, init] = mockFetch.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('does NOT set Content-Type to application/json for FormData body', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)

    const client = new ApiClient(undefined)
    const formData = new FormData()
    await client.request('/api/upload', { method: 'POST', body: formData })

    const [, init] = mockFetch.mock.calls[0]
    const headers = init.headers as Headers
    expect(headers.get('Content-Type')).toBeNull()
  })

  it('throws ApiError and calls onError on HTTP 400', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Invalid parameters provided' }), { status: 400 })
    )
    vi.stubGlobal('fetch', mockFetch)

    const onError = vi.fn()
    const client = new ApiClient(undefined, onError)

    await expect(client.request('/api/error')).rejects.toThrow(ApiError)
    expect(onError).toHaveBeenCalledWith('Invalid parameters provided')
  })
})
