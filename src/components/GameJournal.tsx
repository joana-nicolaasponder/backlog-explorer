import React, { useState, useEffect } from 'react'
import { GameNote } from '../types'
import supabase from '../supabaseClient'
import imageCompression from 'browser-image-compression'

interface GameJournalProps {
  gameId: string
  onNoteAdded?: () => void
  onGameProgressUpdate?: (progress: number) => void
}

const GameJournal: React.FC<GameJournalProps> = ({
  gameId,
  onNoteAdded,
  onGameProgressUpdate,
}) => {
  const [notes, setNotes] = useState<GameNote[]>([])
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNote, setEditingNote] = useState<GameNote | null>(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  )
  const [noteForm, setNoteForm] = useState<Partial<GameNote>>({
    content: '',
    play_session_date: null,
    duration: null,
    accomplishments: [],
    mood: null,
    next_session_plan: {
      intent: null,
      note: null,
    },
    is_completion_entry: false,
    completion_date: null,
    screenshots: [],
  })

  useEffect(() => {
    fetchNotes()
  }, [gameId])

  const fetchNotes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      const { data: notesData, error: notesError } = await supabase
        .from('game_notes')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
  const MAX_FILES_PER_NOTE = 6 // Reasonable limit per note

  const formatDuration = (duration: number | null): string => {
    if (!duration) return ''
    const hours = Math.floor(duration / 3600)
    const minutes = Math.floor((duration % 3600) / 60)
    const seconds = duration % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  const getMoodEmoji = (mood: GameNote['mood']) => {
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

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null
    return '⭐'.repeat(rating)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 1, // Max file size of 1MB
      maxWidthOrHeight: 1920, // Max width/height of 1920px
      useWebWorker: true, // Use web worker for better performance
      fileType: file.type, // Maintain original file type
      initialQuality: 0.8, // Initial quality (0.8 is a good balance)
    }

    try {
      // Show compression progress
      const progress = document.createElement('div')
      progress.className =
        'fixed bottom-4 right-4 bg-base-200 p-4 rounded-lg shadow-lg'
      progress.innerHTML = `Compressing ${file.name}...`
      document.body.appendChild(progress)

      const compressedFile = await imageCompression(file, options)
      document.body.removeChild(progress)

      // Log compression results

      //   originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      //   compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`,
      //   ratio: `${((1 - compressedFile.size / file.size) * 100).toFixed(
      //     1
      //   )}% reduction`,
      // })

      return compressedFile
    } catch (error) {
      console.error('Error compressing image:', error)
      throw error
    }
  }

  const uploadScreenshot = async (file: File) => {
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error(
          `Invalid file type: ${file.name}. Only images are allowed.`
        )
      }

      // Compress image before size check
      const compressedFile = await compressImage(file)

      // Validate compressed file size
      if (compressedFile.size > MAX_FILE_SIZE) {
        throw new Error(`File still too large after compression: ${file.name}`)
      }

      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      // Create a unique file path
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}${Date.now()}.${fileExt}`
      const filePath = `${user_id}/${gameId}/${fileName}`

      // Upload to Supabase storage
      const { error: uploadError, data } = await supabase.storage
        .from('game-screenshots')
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('game-screenshots').getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading screenshot:', error)
      throw error
    }
  }

  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      // Check total number of files
      const currentCount = noteForm.screenshots?.length || 0
      if (currentCount + files.length > MAX_FILES_PER_NOTE) {
        alert(
          `You can only add up to ${MAX_FILES_PER_NOTE} screenshots per note. Please select fewer files.`
        )
        return
      }

      // Upload files
      const uploadPromises = Array.from(files).map((file) =>
        uploadScreenshot(file)
      )
      const results = await Promise.allSettled(uploadPromises)

      // Filter successful uploads and handle errors
      const successfulUrls = results
        .filter(
          (result): result is PromiseFulfilledResult<string> =>
            result.status === 'fulfilled'
        )
        .map((result) => result.value)

      const errors = results
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected'
        )
        .map((result) => result.reason)

      if (errors.length > 0) {
        alert(`Some files failed to upload:
${errors.map((e) => e.message).join('\n')}`)
      }

      if (successfulUrls.length > 0) {
        setNoteForm((prev) => ({
          ...prev,
          screenshots: [...(prev.screenshots || []), ...successfulUrls],
        }))
      }
    } catch (error) {
      console.error('Error handling screenshots:', error)
      alert('Error uploading screenshots. Please try again.')
    }
  }

  const removeScreenshot = (index: number) => {
    setNoteForm((prev) => ({
      ...prev,
      screenshots: prev.screenshots?.filter((_, i) => i !== index) || [],
    }))
  }

  const addNote = async () => {
    if (!noteForm.content?.trim()) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      // Prepare note data with required fields
      const noteData = {
        ...noteForm,
        game_id: gameId,
        user_id,
        play_session_date: noteForm.play_session_date || null,
        duration: noteForm.duration || null,
        accomplishments: noteForm.accomplishments || [],
        mood: noteForm.mood || null,
        next_session_plan: noteForm.next_session_plan || {
          intent: null,
          note: null,
        },
        is_completion_entry: noteForm.is_completion_entry || false,
        completion_date: noteForm.completion_date || null,
        screenshots: noteForm.screenshots || [],
      }

      // Insert note
      const { error: noteError } = await supabase
        .from('game_notes')
        .insert([noteData])

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry && onGameProgressUpdate) {
        onGameProgressUpdate(100)
      }

      // Refresh notes
      fetchNotes()

      // Reset form
      resetForm()
      setShowAddNote(false)

      // Notify parent component
      if (onNoteAdded) {
        onNoteAdded()
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const updateNote = async () => {
    if (!noteForm.content?.trim() || !editingNote) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      const { error: noteError } = await supabase
        .from('game_notes')
        .update({
          ...noteForm,
          user_id,
        })
        .eq('id', editingNote.id)

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry && onGameProgressUpdate) {
        onGameProgressUpdate(100)
      }

      // Refresh notes
      fetchNotes()
      resetForm()

      // Notify parent component
      if (onNoteAdded) {
        onNoteAdded()
      }
    } catch (error) {
      console.error('Error updating note:', error)
    }
  }

  const resetForm = () => {
    setNoteForm({
      content: '',
      play_session_date: null,
      duration: null,
      accomplishments: [],
      mood: null,
      next_session_plan: {
        intent: null,
        note: null,
      },
      is_completion_entry: false,
      completion_date: null,
      screenshots: [],
    })
    setShowAddNote(false)
    setEditingNote(null)
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Game Journal</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddNote(true)}
        >
          Add Entry
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-center py-4 bg-base-200 rounded-lg">
          No journal entries yet. Start tracking your gaming journey!
        </p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">
                        {new Date(note.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
                      {note.rating && (
                        <div className="badge badge-ghost">
                          {getRatingStars(note.rating)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingNote(note)
                        setNoteForm({
                          content: note.content,
                          mood: note.mood,
                          rating: note.rating,
                          play_session_date: note.play_session_date,
                          duration: note.duration,
                          is_completion_entry: note.is_completion_entry,
                          completion_date: note.completion_date,
                          screenshots: note.screenshots || [],
                        })
                        setShowAddNote(true)
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-error"
                      onClick={() => deleteNote(note.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{note.content}</p>

                {/* Screenshots */}
                {note.screenshots && note.screenshots.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {note.screenshots.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg cursor-pointer"
                        onClick={() => setSelectedScreenshot(url)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Note Modal */}
      {showAddNote && (
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
                  value={noteForm.content}
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

              {/* Reflection Section */}
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
                        <span
                          className="text-2xl"
                          role="img"
                          aria-label={value}
                        >
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
                  <span className="label-text">
                    Is this a completion entry?
                  </span>
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

              {/* Form Actions */}
              <div className="modal-action">
                <button className="btn" onClick={resetForm}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={editingNote ? updateNote : addNote}
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
      )}
    </div>
  )
}

export default GameJournal
