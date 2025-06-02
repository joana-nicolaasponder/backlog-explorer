import { vi } from "vitest";

// tests/__mocks__/supabaseClient.ts
export default {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', user_metadata: { full_name: 'Test User' } } },
    }),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          returns: vi.fn().mockResolvedValue({ data: [] }),
        })),
        single: vi.fn().mockResolvedValue({ data: {} }),
      })),
      single: vi.fn().mockResolvedValue({ data: {} }),
      count: 'exact',
    })),
  })),
}