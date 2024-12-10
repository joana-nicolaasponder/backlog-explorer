import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import supabase from '../supabaseClient'
import { Game, GameNote, RawgGameDetails } from '../types'

interface GameDetailsProps {}

const GameDetails = () => {
  const { id } = useParams()
  const [game, setGame] = useState<Game | null>(null)
  const [notes, setNotes] = useState<GameNote[]>([])
  const [rawgDetails, setRawgDetails] = useState<RawgGameDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [editingNote, setEditingNote] = useState<GameNote | null>(null)
  const [noteForm, setNoteForm] = useState<Partial<GameNote>>({
    content: '',
    mood: null,
    rating: null,
    play_session_date: null,
    hours_played: null,
    is_completion_entry: false,
    completion_date: null
  })
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)

  useEffect(() => {
    fetchGameAndNotes()
  }, [id])

  const fetchRawgDetails = async (gameTitle: string) => {
    try {
      const apiKey = import.meta.env.VITE_RAWG_API_KEY;
      // Search for the game first
      const searchResponse = await fetch(
        `https://api.rawg.io/api/games?search=${encodeURIComponent(gameTitle)}&key=${apiKey}`
      );
      const searchData = await searchResponse.json();
      
      if (searchData.results && searchData.results.length > 0) {
        const gameId = searchData.results[0].id;
        // Get detailed game information
        const detailsResponse = await fetch(
          `https://api.rawg.io/api/games/${gameId}?key=${apiKey}`
        );
        const gameDetails = await detailsResponse.json();
        
        // Get screenshots
        const screenshotsResponse = await fetch(
          `https://api.rawg.io/api/games/${gameId}/screenshots?key=${apiKey}`
        );
        const screenshotsData = await screenshotsResponse.json();
        
        setRawgDetails({
          description_raw: gameDetails.description_raw,
          metacritic: gameDetails.metacritic,
          playtime: gameDetails.playtime,
          background_image: gameDetails.background_image,
          screenshots: screenshotsData.results || []
        });
      }
    } catch (error) {
      console.error('Error fetching RAWG details:', error);
    }
  };

  const fetchGameAndNotes = async () => {
    try {
      // Fetch game details
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', id)
        .single()

      if (gameError) throw gameError
      setGame(gameData)
      
      if (gameData) {
        fetchRawgDetails(gameData.title);
      }

      // Fetch game notes
      const { data: notesData, error: notesError } = await supabase
        .from('game_notes')
        .select('*')
        .eq('game_id', id)
        .order('created_at', { ascending: false })

      if (notesError) throw notesError
      setNotes(notesData || [])

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const addNote = async () => {
    if (!noteForm.content?.trim() || !game) return

    try {
      const { data: userData } = await supabase.auth.getUser()
      const user_id = userData.user?.id

      // Start a transaction
      const { error: noteError } = await supabase
        .from('game_notes')
        .insert([
          {
            ...noteForm,
            game_id: game.id,
            user_id
          }
        ])

      if (noteError) throw noteError

      // If this is a completion entry, update the game's progress to 100%
      if (noteForm.is_completion_entry) {
        const { error: updateError } = await supabase
          .from('games')
          .update({
            progress: 100,
            status: 'Done' // Optionally update status to Done
          })
          .eq('id', game.id)
          .eq('user_id', user_id)

        if (updateError) {
          console.error('Error updating game progress:', updateError)
          throw updateError
        }
      }

      // Refresh notes and game details
      fetchGameAndNotes()
      setNoteForm({
        content: '',
        mood: null,
        rating: null,
        play_session_date: null,
        hours_played: null,
        is_completion_entry: false,
        completion_date: null
      })
      setShowAddNote(false)
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const deleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    try {
      const { error } = await supabase
        .from('game_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // Refresh notes
      fetchGameAndNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const startEditingNote = (note: GameNote) => {
    setEditingNote(note);
    setNoteForm({
      content: note.content,
      mood: note.mood,
      rating: note.rating,
      play_session_date: note.play_session_date,
      hours_played: note.hours_played,
      is_completion_entry: note.is_completion_entry,
      completion_date: note.completion_date
    });
    setShowAddNote(true);
  };

  const updateNote = async () => {
    if (!noteForm.content?.trim() || !editingNote) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;

      const { error: noteError } = await supabase
        .from('game_notes')
        .update({
          ...noteForm,
          user_id
        })
        .eq('id', editingNote.id);

      if (noteError) throw noteError;

      // Refresh notes and reset form
      fetchGameAndNotes();
      setNoteForm({
        content: '',
        mood: null,
        rating: null,
        play_session_date: null,
        hours_played: null,
        is_completion_entry: false,
        completion_date: null
      });
      setEditingNote(null);
      setShowAddNote(false);
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const updateProgress = async (newProgress: number) => {
    if (!game) return;
    setIsUpdatingProgress(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user_id = userData.user?.id;

      const { error } = await supabase
        .from('games')
        .update({
          progress: newProgress,
          status: newProgress === 100 ? 'Done' : game.status
        })
        .eq('id', game.id)
        .eq('user_id', user_id);

      if (error) throw error;

      // Update local state
      setGame(prev => prev ? { ...prev, progress: newProgress, status: newProgress === 100 ? 'Done' : prev.status } : null);
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const getMoodEmoji = (mood: GameNote['mood']) => {
    const emojiMap = {
      Excited: '🤩',
      Satisfied: '😊',
      Frustrated: '😤',
      Confused: '🤔',
      Nostalgic: '🥹',
      Impressed: '😯',
      Disappointed: '😕'
    }
    return mood ? emojiMap[mood] : ''
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
      minute: '2-digit'
    })
  }

  if (loading) {
    return <div className="p-4">Loading...</div>
  }

  if (!game) {
    return <div className="p-4">Game not found</div>
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Game Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
        <div className="flex gap-4 text-sm">
          <span className="badge badge-primary">{game.platform}</span>
          <span className="badge badge-secondary">{game.genre}</span>
          <span className="badge badge-accent">{game.status}</span>
        </div>
      </div>

      {/* Progress Tracking */}
      <div className="card bg-base-200 mb-6">
        <div className="card-body py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm font-medium">{game.progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={game.progress}
                className="range range-primary range-sm"
                step="5"
                onChange={(e) => updateProgress(parseInt(e.target.value))}
              />
              <div className="w-full flex justify-between text-xs px-1 mt-1">
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
                <span>|</span>
              </div>
            </div>
            {isUpdatingProgress && (
              <div className="loading loading-spinner loading-xs"></div>
            )}
          </div>
        </div>
      </div>

      {/* Game Details Section */}
      <div className="card bg-base-200 mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">Game Details</h2>
          {rawgDetails ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  {rawgDetails.metacritic && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Metacritic:</span>
                      <span className={`badge ${
                        rawgDetails.metacritic >= 75 
                          ? 'badge-accent bg-opacity-50' 
                          : rawgDetails.metacritic >= 60 
                          ? 'badge-secondary bg-opacity-50' 
                          : 'badge-primary bg-opacity-50'
                      }`}>
                        {rawgDetails.metacritic}
                      </span>
                    </div>
                  )}
                  {rawgDetails.playtime > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">Average Playtime:</span>
                      <span className="badge badge-ghost">{rawgDetails.playtime} hours</span>
                    </div>
                  )}
                </div>
                {rawgDetails.description_raw && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">About</h3>
                    <p className="text-sm opacity-70">{rawgDetails.description_raw}</p>
                  </div>
                )}
              </div>
              {rawgDetails.screenshots && rawgDetails.screenshots.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Screenshots</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {rawgDetails.screenshots.map((screenshot) => (
                      <img
                        key={screenshot.id}
                        src={screenshot.image}
                        alt="Game Screenshot"
                        className="rounded-lg w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedScreenshot(screenshot.image)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-base-300 rounded w-3/4"></div>
              <div className="h-4 bg-base-300 rounded w-1/2"></div>
              <div className="h-32 bg-base-300 rounded"></div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl h-auto relative p-0 bg-transparent">
            <button
              className="btn btn-circle btn-ghost absolute right-2 top-2 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
              onClick={() => setSelectedScreenshot(null)}
            >
              ✕
            </button>
            <img
              src={selectedScreenshot}
              alt="Game Screenshot"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div className="modal-backdrop" onClick={() => setSelectedScreenshot(null)}></div>
        </div>
      )}

      {/* Game Journal Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Game Journal</h2>
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
                            minute: '2-digit'
                          })}
                        </h3>
                      </div>
                      <div className="flex gap-2 mt-1">
                        {note.mood && (
                          <div className="badge badge-ghost">
                            Mood: {note.mood}/5
                          </div>
                        )}
                        {note.rating && (
                          <div className="badge badge-ghost">
                            Rating: {note.rating}/5
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
                            hours_played: note.hours_played,
                            is_completion_entry: note.is_completion_entry,
                            completion_date: note.completion_date
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingNote ? 'Edit Journal Entry' : 'Add Journal Entry'}
            </h3>
            <div className="form-control gap-4">
              {/* Note Content */}
              <div>
                <label className="label">
                  <span className="label-text">Your thoughts</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  placeholder="Write about your experience..."
                  value={noteForm.content}
                  onChange={(e) =>
                    setNoteForm({ ...noteForm, content: e.target.value })
                  }
                ></textarea>
              </div>

              {/* Mood Selection */}
              <div>
                <label className="label">
                  <span className="label-text">How did it make you feel?</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={noteForm.mood || ''}
                  onChange={(e) =>
                    setNoteForm({
                      ...noteForm,
                      mood: e.target.value as GameNote['mood']
                    })
                  }
                >
                  <option value="">Select mood</option>
                  <option value="Excited">Excited 🤩</option>
                  <option value="Satisfied">Satisfied 😊</option>
                  <option value="Frustrated">Frustrated 😤</option>
                  <option value="Confused">Confused 🤔</option>
                  <option value="Nostalgic">Nostalgic 🥹</option>
                  <option value="Impressed">Impressed 😯</option>
                  <option value="Disappointed">Disappointed 😕</option>
                </select>
              </div>

              {/* Rating */}
              <div>
                <label className="label">
                  <span className="label-text">Rating</span>
                </label>
                <div className="rating rating-lg">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <input
                      key={star}
                      type="radio"
                      name="rating"
                      className="mask mask-star-2 bg-orange-400"
                      checked={noteForm.rating === star}
                      onChange={() =>
                        setNoteForm({ ...noteForm, rating: star })
                      }
                    />
                  ))}
                </div>
              </div>

              {/* Play Session Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <span className="label-text">Session Date</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={noteForm.play_session_date || ''}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        play_session_date: e.target.value
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Hours Played</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="input input-bordered w-full"
                    value={noteForm.hours_played || ''}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        hours_played: parseFloat(e.target.value)
                      })
                    }
                  />
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
                      const isCompletion = e.target.checked;
                      setNoteForm((prev) => ({
                        ...prev,
                        is_completion_entry: isCompletion,
                        completion_date: isCompletion ? new Date().toISOString().split('T')[0] : null
                      }));
                    }}
                  />
                </label>
              </div>

              {/* Form Actions */}
              <div className="modal-action">
                <button
                  className="btn"
                  onClick={() => {
                    setNoteForm({
                      content: '',
                      mood: null,
                      rating: null,
                      play_session_date: null,
                      hours_played: null,
                      is_completion_entry: false,
                      completion_date: null
                    });
                    setShowAddNote(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={editingNote ? updateNote : addNote}
                  disabled={!noteForm.content}
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

export default GameDetails