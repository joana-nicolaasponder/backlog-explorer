


export function getSeasonalContext() {
  const now = new Date()
  const month = now.getMonth()
  const day = now.getDate()

  const seasons = {
    winter: [0, 1, 11],
    spring: [2, 3, 4],
    summer: [5, 6, 7],
    fall: [8, 9, 10],
  }

  const holidays = [
    { name: 'Halloween', month: 9, start: 1, end: 31 },
    { name: 'Christmas', month: 11, start: 1, end: 25 },
    { name: 'Summer Break', month: 5, start: 1, end: 31 },
    { name: "Valentine's Day", month: 1, start: 1, end: 14 },
    { name: 'Cozy Fall Gaming', month: 8, start: 15, end: 30 },
    { name: 'Spring Gaming', month: 2, start: 1, end: 31 },
  ]

  const currentSeason = Object.keys(seasons).find((season) =>
    seasons[season as keyof typeof seasons].includes(month)
  ) || 'unknown'

  const relevantHolidays = holidays.filter((holiday) => {
    if (holiday.month === month && day >= holiday.start && day <= holiday.end) {
      return true
    }
    const holidayDate = new Date(now.getFullYear(), holiday.month, holiday.start)
    const daysDiff = (holidayDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff >= 0 && daysDiff <= 30
  })

  return {
    season: currentSeason,
    holidays: relevantHolidays,
  }
}