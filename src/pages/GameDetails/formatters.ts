import { GameNote } from '../../types'

export const formatDuration = (duration: number | null): string => {
  if (!duration) return ''
  // Duration is stored in minutes, so convert to hours and remaining minutes
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  } else {
    return `${minutes}m`
  }
}

export const getMoodEmoji = (mood: GameNote['mood']) => {
  const emojiMap: Record<string, string> = {
    Amazing: '🤩',
    Great: '😊',
    Good: '🙂',
    Relaxing: '😌',
    Mixed: '🤔',
    Frustrating: '😤',
    Meh: '😕',
    Regret: '😫',
  }
  return mood ? emojiMap[mood] || '' : ''
}

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
