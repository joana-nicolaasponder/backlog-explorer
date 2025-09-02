import { GameNote } from '../../types'

interface AddNoteModalProps {
  showModal: boolean
  editingNote: GameNote | null
  noteForm: Partial<GameNote>
  setNoteForm: (form: Partial<GameNote>) => void
  onSubmit: () => void
  onCancel: () => void
  handleScreenshotUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  removeScreenshot: (index: number) => void
}

const AddNoteModal = ({
  showModal,
  editingNote,
  noteForm,
  setNoteForm,
  onSubmit,
  onCancel,
  handleScreenshotUpload,
  removeScreenshot,
}: AddNoteModalProps) => {
  if (!showModal) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">
          {editingNote ? 'Edit Journal Entry' : 'Add Journal Entry'}
        </h3>
        <div className="form-control gap-4">
          {/* Core Journal Entry */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-medium text-lg">
                📝 What happened in this session?
              </span>
              <span className="label-text-alt opacity-70">Required</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full min-h-[200px] text-base"
              placeholder="Share your gaming experience! Some ideas:
• What were the memorable moments?
• Did you discover anything interesting?
• Any frustrating parts or funny glitches?
• What strategies worked or didn't work?
• How did the story develop?"
              value={noteForm.content || ''}
              onChange={(e) =>
                setNoteForm({ ...noteForm, content: e.target.value })
              }
            ></textarea>
            <p className="text-sm opacity-70 mt-1">
              Feel free to write as much or as little as you'd like. This is
              your gaming journal!
            </p>
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <label className="label">
              <span className="label-text font-medium text-lg">
                📸 Add Screenshots
              </span>
              <span className="label-text-alt opacity-70">Optional</span>
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleScreenshotUpload}
              className="file-input file-input-bordered w-full"
            />
            {noteForm.screenshots && noteForm.screenshots.length > 0 && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                {noteForm.screenshots.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Context */}
          <div className="bg-base-200 rounded-lg p-4 space-y-6">
            <h3 className="font-medium text-base">Session Details</h3>

            {/* Date & Time */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  📅 When did you play?
                </span>
                <span className="label-text-alt opacity-70">Required</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                required
                value={noteForm.play_session_date || ''}
                onChange={(e) =>
                  setNoteForm({
                    ...noteForm,
                    play_session_date: e.target.value,
                  })
                }
              />
            </div>

            {/* Duration */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  ⏳ How long did you play?
                </span>
                <span className="label-text-alt opacity-70">Optional</span>
              </label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <input
                    type="number"
                    min="0"
                    className="input input-bordered w-full"
                    placeholder="30"
                    value={noteForm.duration || ''}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        duration: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
                <span className="text-sm opacity-70">minutes</span>
              </div>
              <p className="text-xs opacity-70 mt-1">
                Track your gaming sessions to understand your habits
              </p>
            </div>

            {/* Accomplishments */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  🏆 What did you accomplish?
                </span>
                <span className="label-text-alt opacity-70">Optional</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  'Story Progress',
                  'Side Quest',
                  'Exploration',
                  'Challenge Completed',
                  'Just Messing Around',
                  'Grinding',
                  'Boss Fight',
                  'Achievement Hunting',
                  'Learning Game Mechanics',
                ].map((accomplishment) => (
                  <label
                    key={accomplishment}
                    className="flex items-center gap-2 cursor-pointer hover:bg-base-300 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={noteForm.accomplishments?.includes(
                        accomplishment
                      )}
                      onChange={(e) => {
                        const currentAccomplishments =
                          noteForm.accomplishments || []
                        setNoteForm({
                          ...noteForm,
                          accomplishments: e.target.checked
                            ? [...currentAccomplishments, accomplishment]
                            : currentAccomplishments.filter(
                                (a) => a !== accomplishment
                              ),
                        })
                      }}
                    />
                    <span className="text-sm">{accomplishment}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* TODO(human) - Add the rest of the modal form fields */}
          <div className="bg-base-200 rounded-lg p-4 space-y-6">
            <h3 className="font-medium text-base">Reflection</h3>

            {/* Mood & Enjoyment */}
            <div>
              <label className="label">
                <span className="label-text font-medium">
                  🎭 How did this session make you feel?
                </span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'Amazing', emoji: '🤩', enjoyment: 'high' },
                  { value: 'Great', emoji: '😊', enjoyment: 'high' },
                  { value: 'Good', emoji: '🙂', enjoyment: 'medium' },
                  { value: 'Relaxing', emoji: '😌', enjoyment: 'medium' },
                  { value: 'Mixed', emoji: '🤔', enjoyment: 'medium' },
                  { value: 'Frustrating', emoji: '😤', enjoyment: 'low' },
                  { value: 'Meh', emoji: '😕', enjoyment: 'low' },
                  { value: 'Regret', emoji: '😫', enjoyment: 'low' },
                ].map(({ value, emoji, enjoyment }) => (
                  <label
                    key={value}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all hover:bg-base-300
                                    ${
                                      noteForm.mood === value
                                        ? `bg-base-300 ring-2 ${
                                            {
                                              high: 'ring-success',
                                              medium: 'ring-primary',
                                              low: 'ring-error',
                                            }[enjoyment]
                                          }`
                                        : ''
                                    }`}
                    onClick={() =>
                      setNoteForm({
                        ...noteForm,
                        mood: value as GameNote['mood'],
                      })
                    }
                  >
                    <span className="text-2xl" role="img" aria-label={value}>
                      {emoji}
                    </span>
                    <span className="text-xs text-center">{value}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Next Time Plans - Optional */}
            <div className="space-y-4">
              <label className="label">
                <span className="label-text font-medium">
                  🎯 Next time, I want to...
                </span>
                <span className="label-text-alt opacity-70">Optional</span>
              </label>

              {/* Quick Options */}
              <div className="flex flex-wrap gap-2">
                {[
                  'Continue Story',
                  'Try Different Build',
                  'Explore New Area',
                  'Beat That Boss',
                  'Grind Items/Levels',
                  'Try Different Character',
                  'Complete Side Content',
                ].map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    className={`btn btn-sm ${
                      noteForm.next_session_plan?.intent === intent
                        ? 'btn-primary'
                        : 'btn-ghost'
                    }`}
                    onClick={() =>
                      setNoteForm({
                        ...noteForm,
                        next_session_plan: {
                          ...noteForm.next_session_plan,
                          intent,
                        },
                      })
                    }
                  >
                    {intent}
                  </button>
                ))}
              </div>

              {/* Custom Note */}
              <div>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Any other thoughts about what you want to do next time? (optional)"
                  value={noteForm.next_session_plan?.note || ''}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      next_session_plan: {
                        ...noteForm.next_session_plan,
                        note: e.target.value,
                      },
                    })
                  }
                ></textarea>
              </div>
            </div>
          </div>

          {/* Completion Entry */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Is this a completion entry?</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={noteForm.is_completion_entry || false}
                onChange={(e) => {
                  const isCompletion = e.target.checked
                  setNoteForm((prev) => ({
                    ...prev,
                    is_completion_entry: isCompletion,
                    completion_date: isCompletion
                      ? new Date().toISOString().split('T')[0]
                      : null,
                  }))
                }}
              />
            </label>
          </div>

          {/* Modal Actions */}
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={onSubmit}
              disabled={
                !noteForm.content?.trim() || !noteForm.play_session_date
              }
            >
              {editingNote ? 'Update' : 'Add'} Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddNoteModal
