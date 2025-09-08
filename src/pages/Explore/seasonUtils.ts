type Holiday = {
  name: string
  startDate: Date
  endDate: Date
  type: string
  region?: string
}

export function getSeasonalContext(extraHolidays: Holiday[] = []) {
  const now = new Date()
  now.setHours(0, 0, 0, 0) 
  const seasons = {
    winter: [0, 1, 11],
    spring: [2, 3, 4],
    summer: [5, 6, 7],
    fall: [8, 9, 10],
  }

  function thisYear(month: number, day: number) {
    const d = new Date(now.getFullYear(), month, day)
    d.setHours(0, 0, 0, 0)
    return d
  }

  const holidays: Holiday[] = [
    {
      name: 'Halloween',
      startDate: thisYear(9, 31),
      endDate: thisYear(9, 31),
      type: 'public',
    },
    {
      name: "Valentine's Day",
      startDate: thisYear(1, 14),
      endDate: thisYear(1, 14),
      type: 'public',
    },
    {
      name: 'Christmas',
      startDate: thisYear(11, 24),
      endDate: thisYear(11, 25),
      type: 'public',
    },
    {
      name: 'New Year',
      startDate: thisYear(0, 1),
      endDate: thisYear(0, 1),
      type: 'public',
    },
    {
      name: 'Summer Break',
      startDate: thisYear(5, 1),
      endDate: thisYear(7, 31),
      type: 'seasonal',
    },
    {
      name: 'Cozy Fall Gaming',
      startDate: thisYear(8, 15),
      endDate: thisYear(9, 15),
      type: 'gaming',
    },
    {
      name: 'Spring Gaming',
      startDate: thisYear(2, 1),
      endDate: thisYear(4, 31),
      type: 'gaming',
    },
    ...extraHolidays,
  ]

  const currentSeason =
    Object.keys(seasons).find((season) =>
      seasons[season as keyof typeof seasons].includes(now.getMonth())
    ) || 'unknown'

  const relevantHolidays = holidays.filter((holiday) => {
    if (now >= holiday.startDate && now <= holiday.endDate) return true
    const daysUntilStart =
      (holiday.startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilStart > 0 && daysUntilStart <= 30
  })

  return {
    season: currentSeason,
    holidays: relevantHolidays,
  }
}
