import { vi } from "vitest";

const mockUserGamesData = [
  {
    status: 'Done',
    progress: 100,
    game_id: 1,
    updated_at: '2025-05-01',
    platforms: ['Switch'],
    games: {
      id: 1,
      title: 'Cozy Grove',
      game_genres: [{ genres: { name: 'Puzzle' } }],
      game_moods: [{ moods: { name: 'Relaxing' } }],
      game_platforms: [{ platforms: { name: 'Switch' } }],
    },
  },
  {
    status: 'Currently Playing',
    progress: 40,
    game_id: 2,
    updated_at: '2025-05-20',
    platforms: ['Steam'],
    games: {
      id: 2,
      title: 'Stardew Valley',
      game_genres: [{ genres: { name: 'Farming' } }],
      game_moods: [{ moods: { name: 'Chill' } }],
      game_platforms: [{ platforms: { name: 'PC' } }],
    },
  },
]

const mockRecentNotesData = [
  {
    created_at: '2025-06-01T12:00:00Z',
    content: 'Finished Cozy Grove',
  },
]

const mockCompletedNotesData = [
  {
    id: 1,
    is_completion_entry: true,
    completion_date: '2025-04-12',
  },
]

export default {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', user_metadata: { full_name: 'Test User' } } },
    }),
  },
  from: vi.fn((tableName: string) => {
    const select = vi.fn(() => {
      return {
        eq: vi.fn(() => {
          if (tableName === 'user_games') {
            return {
              eq: vi.fn(() => ({
                returns: vi.fn().mockResolvedValue({ data: mockUserGamesData }),
                single: vi.fn().mockResolvedValue({ data: {} }),
              })),
              single: vi.fn().mockResolvedValue({ data: {} }),
            }
          }

          if (tableName === 'game_notes') {
            return {
              eq: vi.fn((col, val) => {
                if (col === 'is_completion_entry') {
                  return {
                    gte: vi.fn(() => ({
                      returns: vi.fn().mockResolvedValue({ data: mockCompletedNotesData }),
                    })),
                  }
                } else {
                  return {
                    order: vi.fn(() => ({
                      returns: vi.fn().mockResolvedValue({ data: mockRecentNotesData }),
                    })),
                  }
                }
              }),
              single: vi.fn().mockResolvedValue({ data: {} }),
            }
          }

          return {
            single: vi.fn().mockResolvedValue({ data: {} }),
          }
        }),
        single: vi.fn().mockResolvedValue({ data: {} }),
      }
    })

    return { select }
  }),
}