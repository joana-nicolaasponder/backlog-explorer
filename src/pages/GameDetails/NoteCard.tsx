import { GameNote } from '../../types'
import ScreenshotGallery from './ScreenshotGallery'
interface NoteCardProps {
  note: GameNote
  onEdit: (note: GameNote) => void
  onDelete: (noteId: string) => void
  onScreenshotClick: (url: string) => void
  formatDuration: (duration: number | null) => string
  getMoodEmoji: (mood: GameNote['mood']) => string
}

const NoteCard = ({ 
  note, 
  onEdit, 
  onDelete, 
  onScreenshotClick, 
  formatDuration, 
  getMoodEmoji 
}: NoteCardProps) => {
  const handleEdit = () => {
    onEdit(note)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this entry?')) {
      onDelete(note.id)
    }
  }

  return (
    <div className="card bg-base-100 shadow">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                {new Date(note.created_at).toLocaleDateString(
                  'en-US',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </h3>
            </div>
            <div className="flex gap-2 mt-1">
              {note.duration && (
                <div className="badge badge-primary">
                  Session: {formatDuration(note.duration)}
                </div>
              )}
              {note.mood && (
                <div className="badge badge-ghost">
                  {getMoodEmoji(note.mood)} {note.mood}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleEdit}
            >
              Edit
            </button>
            <button
              className="btn btn-ghost btn-sm text-error"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        </div>
        <p className="mt-2 whitespace-pre-wrap">{note.content}</p>
        
        {/* Next Session Plan */}
        {(note.next_session_plan?.intent || note.next_session_plan?.note) && (
          <div className="mt-4 bg-base-200 p-3 rounded-lg">
            <h4 className="font-semibold mb-1">🎯 Next Time</h4>
            {note.next_session_plan.intent && (
              <p className="text-sm">
                <span className="font-medium">Plan:</span> {note.next_session_plan.intent}
              </p>
            )}
            {note.next_session_plan.note && (
              <p className="text-sm mt-1">
                <span className="font-medium">Note:</span> {note.next_session_plan.note}
              </p>
            )}
          </div>
        )}

        {/* Screenshots */}
        <ScreenshotGallery 
          screenshots={note.screenshots || []} 
          onScreenshotClick={onScreenshotClick} 
        />
      </div>
    </div>
  )
}

export default NoteCard
