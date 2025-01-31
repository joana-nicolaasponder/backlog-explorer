import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import GameSearch from './GameSearch'
import { RAWGGame } from '../types/rawg'
import { mapRAWGGameToIds } from '../services/rawgMappings'

interface Mood {
  id: string
  name: string
  category: 'primary' | 'secondary'
  description: string
  created_at: string
}

interface GameFormData {
  title: string
  platforms: string[]
  genres: string[]
  status: string
  progress: number
  image: string
  moods: string[]
  rawg_id?: number
  rawg_slug?: string
  metacritic_rating?: number
  release_date?: string
  background_image?: string
  description?: string
}

interface AddGameModalProps {
  onGameAdded: () => void
  isOnboarding?: boolean
  showModal: boolean
  setShowModal: (showModal: boolean) => void
}

const AddGameModal: React.FC<AddGameModalProps> = ({ onGameAdded, isOnboarding = false, showModal, setShowModal }) => {
  const [formData, setFormData] = useState<GameFormData>({
    title: '',
    platforms: [],
    genres: [],
    status: 'Not Started',
    progress: 0,
    image: '',
    moods: [],
  })
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
  const [availableMoods, setAvailableMoods] = useState<Mood[]>([])
  const [selectedGame, setSelectedGame] = useState<RAWGGame | null>(null)
  const [statusOptions] = useState<string[]>([
    'Endless',
    'Satisfied',
    'DNF',
    'Wishlist',
    'Try Again',
    'Started',
    'Owned',
    'Come back!',
    'Currently Playing',
    'Done'
  ])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchOptions()
    fetchMoods()
  }, []) // Run once when component mounts

  const fetchMoods = async () => {
    try {
      const { data: moods, error } = await supabase
        .from('moods')
        .select('*')
        .order('name')

      if (error) throw error
      setAvailableMoods(moods)
    } catch (error) {
      console.error('Error fetching moods:', error)
    }
  }

  const fetchOptions = async () => {
    try {
      // Fetch platforms
      const { data: platforms, error: platformError } = await supabase
        .from('platforms')
        .select('name')
        .order('name')

      if (platformError) throw platformError
      setPlatformOptions(platforms.map(p => p.name))

      // Fetch genres
      const { data: genres, error: genreError } = await supabase
        .from('genres')
        .select('name')
        .order('name')

      if (genreError) throw genreError
      setGenreOptions(genres.map(g => g.name))
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const handleGameSelect = async (game: RAWGGame) => {
    setSelectedGame(game)
    
    // Check if user already has this game
    const { data: existingUserGame } = await supabase
      .from('user_games')
      .select(`
        id,
        status,
        progress,
        game:games (
          id,
          title,
          rawg_id,
          background_image,
          platforms (id, name),
          genres (id, name)
        )
      `)
      .eq('game:games.rawg_id', game.id)
      .single();

    if (existingUserGame) {
      // If user already has this game, populate form with existing data
      setFormData({
        title: game.name,
        platforms: existingUserGame.game.platforms?.map(p => p.name) || [],
        genres: game.genres.map(g => g.name),
        status: existingUserGame.status,
        progress: existingUserGame.progress,
        moods: [],
        image: game.background_image || '',
        rawg_id: game.id,
        rawg_slug: game.slug,
        metacritic_rating: game.metacritic || undefined,
        release_date: game.released || undefined,
        background_image: game.background_image || undefined,
        description: game.description || undefined
      });
    } else {
      // Get available platforms from RAWG
      const availablePlatforms = game.platforms.map(p => p.platform.name);
      setPlatformOptions(availablePlatforms);

      // Set form data with RAWG data
      setFormData({
        title: game.name,
        platforms: [], // User will select from availablePlatforms
        genres: game.genres.map(g => g.name), // Use RAWG genres directly
        status: 'Not Started',
        progress: 0,
        moods: [],
        image: game.background_image || '',
        rawg_id: game.id,
        rawg_slug: game.slug,
        metacritic_rating: game.metacritic || undefined,
        release_date: game.released || undefined,
        background_image: game.background_image || undefined,
        description: game.description || undefined
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // First, get or create the game
      let gameId: string;
      
      // Check if game exists by RAWG ID
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('rawg_id', formData.rawg_id)
        .single();

      if (existingGame) {
        gameId = existingGame.id;
      } else {
        // Create new game
        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert([{
            title: formData.title,
            rawg_id: formData.rawg_id,
            rawg_slug: formData.rawg_slug,
            metacritic_rating: formData.metacritic_rating,
            release_date: formData.release_date,
            background_image: formData.background_image,
            description: formData.description
          }])
          .select()
          .single();

        if (gameError) throw gameError;
        if (!newGame) throw new Error('Failed to create game');
        gameId = newGame.id;

        // Set up platform and genre relationships for the new game
        if (formData.platforms.length > 0) {
          const { data: platformIds } = await supabase
            .from('platforms')
            .select('id')
            .in('name', formData.platforms);

          if (platformIds && platformIds.length > 0) {
            await supabase
              .from('game_platforms')
              .insert(
                platformIds.map(platform => ({
                  game_id: gameId,
                  platform_id: platform.id
                }))
              );
          }
        }

        if (formData.genres.length > 0) {
          const { data: genreIds } = await supabase
            .from('genres')
            .select('id')
            .in('name', formData.genres);

          if (genreIds && genreIds.length > 0) {
            await supabase
              .from('game_genres')
              .insert(
                genreIds.map(genre => ({
                  game_id: gameId,
                  genre_id: genre.id
                }))
              );
          }
        }
      }

      // Now create or update the user_game relationship
      const { data: existingUserGame } = await supabase
        .from('user_games')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single();

      if (existingUserGame) {
        // Update existing user_game
        await supabase
          .from('user_games')
          .update({
            status: formData.status,
            progress: formData.progress
          })
          .eq('id', existingUserGame.id);
      } else {
        // Create new user_game
        await supabase
          .from('user_games')
          .insert({
            user_id: user.id,
            game_id: gameId,
            status: formData.status,
            progress: formData.progress
          });
      }

      // Insert moods if any are selected
      if (formData.moods.length > 0) {
        const moodData = formData.moods.map(moodId => ({
          user_id: user.id,
          game_id: gameId,
          mood_id: moodId,
          weight: 1,
          created_at: new Date().toISOString()
        }))

        const { error: moodError } = await supabase
          .from('game_moods')
          .insert(moodData)
          .throwOnError()

        if (moodError) {
          console.error('Failed to insert moods:', moodError)
          throw moodError
        }
      }

      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: 'Not Started',
        progress: 0,
        image: '',
        moods: []
      });

      onGameAdded();
    } catch (error) {
      console.error('Error adding game:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`modal ${showModal ? 'modal-open' : ''} ${isOnboarding ? 'z-[100]' : ''}`}>
      <div className="modal-box max-w-2xl relative">
        <button
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={() => setShowModal(false)}
        >
          ✕
        </button>
        <h3 className="font-bold text-lg mb-4">Add New Game</h3>
        
        <div className="mb-6">
          <GameSearch onGameSelect={handleGameSelect} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-base-content">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-base-content">
              Available Platforms <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => {
                    const newPlatforms = formData.platforms.includes(platform)
                      ? formData.platforms.filter(p => p !== platform)
                      : [...formData.platforms, platform];
                    setFormData({ ...formData, platforms: newPlatforms });
                  }}
                  className={`px-3 py-1.5 rounded text-sm transition-colors duration-200 ${
                    formData.platforms.includes(platform)
                      ? 'bg-zinc-700 text-white border border-zinc-600'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
            {formData.platforms.length === 0 && (
              <p className="mt-2 text-sm text-red-400">Please select the platforms you own this game on</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-base-content">
              Genres
            </label>
            <div className="flex flex-wrap gap-2">
              {formData.genres.map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1.5 rounded text-sm bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-lg font-medium mb-4 text-base-content">
              How would you describe this game?
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Primary Moods */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-base-content/70 mb-2">Primary Feelings</h3>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter(mood => mood.category === 'primary')
                    .map((mood) => (
                      <label
                        key={mood.id}
                        className={`
                          btn btn-sm normal-case px-4
                          ${formData.moods.includes(mood.id) 
                            ? 'bg-primary text-primary-content hover:bg-primary-focus border-primary'
                            : 'btn-ghost hover:bg-base-200 border border-base-300'}
                          transition-all duration-200
                        `}
                        title={mood.description}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.moods.includes(mood.id)}
                          onChange={(e) => {
                            const newMoods = e.target.checked
                              ? [...formData.moods, mood.id]
                              : formData.moods.filter(id => id !== mood.id)
                            setFormData({ ...formData, moods: newMoods })
                          }}
                        />
                        {mood.name}
                      </label>
                    ))}
                </div>
              </div>

              {/* Secondary Moods */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-base-content/70 mb-2">Additional Traits</h3>
                <div className="flex flex-wrap gap-2">
                  {availableMoods
                    .filter(mood => mood.category === 'secondary')
                    .map((mood) => (
                      <label
                        key={mood.id}
                        className={`
                          btn btn-sm normal-case px-4
                          ${formData.moods.includes(mood.id)
                            ? 'bg-secondary text-secondary-content hover:bg-secondary-focus border-secondary'
                            : 'btn-ghost hover:bg-base-200 border border-base-300'}
                          transition-all duration-200
                        `}
                        title={mood.description}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={formData.moods.includes(mood.id)}
                          onChange={(e) => {
                            const newMoods = e.target.checked
                              ? [...formData.moods, mood.id]
                              : formData.moods.filter(id => id !== mood.id)
                            setFormData({ ...formData, moods: newMoods })
                          }}
                        />
                        {mood.name}
                      </label>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-base-content">Status</span>
            </label>
            <select
              className="select select-bordered"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-base-content">Progress</span>
            </label>
            <input
              type="number"
              className="input input-bordered"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              min="0"
              max="100"
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text text-base-content">Image URL</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div className="modal-action">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Game'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => onGameAdded()}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
      <div className="modal-backdrop" onClick={() => onGameAdded()}></div>
    </div>
  )
}

export default AddGameModal
