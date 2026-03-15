import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IoLAdapter } from './IoLAdapter'

const BASE_URL = 'https://api.invertironline.com'

describe('IoLAdapter auth', () => {
  let adapter: IoLAdapter

  beforeEach(() => {
    adapter = new IoLAdapter(BASE_URL)
    vi.stubGlobal('fetch', vi.fn())
  })

  it('login calls token endpoint with credentials', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'tok123',
        refresh_token: 'ref456',
        expires_in: 900,
      }),
    } as Response)

    await adapter.login('user@test.com', 'pass123')

    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE_URL}/token`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('grant_type=password'),
      })
    )
    expect(adapter.isAuthenticated()).toBe(true)
  })

  it('login throws on bad credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response)

    await expect(adapter.login('bad', 'creds')).rejects.toThrow()
  })

  it('isAuthenticated returns false before login', () => {
    expect(adapter.isAuthenticated()).toBe(false)
  })
})
