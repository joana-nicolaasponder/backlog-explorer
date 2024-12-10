import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'
import GameSearch from './GameSearch'
import { RAWGGame } from '../types/rawg'
import { mapRAWGGameToIds } from '../services/rawgMappings'

interface GameFormData {
  title: string
  platforms: string[]
  genres: string[]
  status: string
  progress: number
  image: string
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
  })
  const [platformOptions, setPlatformOptions] = useState<string[]>([])
  const [genreOptions, setGenreOptions] = useState<string[]>([])
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
  }, []) // Run once when component mounts

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
    
    // Check if game already exists for this user
    const { data: existingGame } = await supabase
      .from('games')
      .select(`
        id,
        title,
        status,
        progress,
        platforms (id, name),
        genres (id, name)
      `)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('title', game.name)
      .single();

    if (existingGame) {
      // If game exists, populate form with existing data
      setFormData({
        title: existingGame.title,
        platforms: existingGame.platforms?.map(p => p.name) || [],
        genres: existingGame.genres?.map(g => g.name) || [],
        status: existingGame.status,
        progress: existingGame.progress,
        image: game.background_image || '',
        rawg_id: game.id,
        rawg_slug: game.slug,
        metacritic_rating: game.metacritic || undefined,
        release_date: game.released || undefined,
        background_image: game.background_image || undefined,
        description: game.description || undefined
      });
    } else {
      // If game doesn't exist, proceed with RAWG data
      const { platformIds, genreIds } = await mapRAWGGameToIds(game);
      
      // Fetch platform and genre names for the mapped IDs
      const { data: platforms } = await supabase
        .from('platforms')
        .select('name')
        .in('id', platformIds);
      
      const { data: genres } = await supabase
        .from('genres')
        .select('name')
        .in('id', genreIds);

      setFormData({
        title: game.name,
        platforms: platforms?.map(p => p.name) || [],
        genres: genres?.map(g => g.name) || [],
        status: 'Not Started',
        progress: 0,
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

      // Check if game already exists
      const { data: existingGame } = await supabase
        .from('games')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', formData.title)
        .single();

      let gameId: string;

      if (existingGame) {
        // Update existing game
        const { error: updateError } = await supabase
          .from('games')
          .update({
            status: formData.status,
            progress: formData.progress,
            image: formData.image,
            rawg_id: formData.rawg_id,
            rawg_slug: formData.rawg_slug,
            metacritic_rating: formData.metacritic_rating,
            release_date: formData.release_date,
            background_image: formData.background_image,
            description: formData.description
          })
          .eq('id', existingGame.id);

        if (updateError) throw updateError;
        gameId = existingGame.id;

        // Delete existing platform and genre relationships
        await supabase.from('game_platforms').delete().eq('game_id', gameId);
        await supabase.from('game_genres').delete().eq('game_id', gameId);
      } else {
        // Create new game
        const { data: newGame, error: gameError } = await supabase
          .from('games')
          .insert([{
            title: formData.title,
            status: formData.status,
            progress: formData.progress,
            image: formData.image,
            user_id: user.id,
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
      }

      // Get platform IDs
      if (formData.platforms.length > 0) {
        const { data: platformIds, error: platformError } = await supabase
          .from('platforms')
          .select('id')
          .in('name', formData.platforms);

        if (platformError) throw platformError;

        if (platformIds && platformIds.length > 0) {
          const { error: linkError } = await supabase
            .from('game_platforms')
            .insert(
              platformIds.map(platform => ({
                game_id: gameId,
                platform_id: platform.id
              }))
            );

          if (linkError) throw linkError;
        }
      }

      // Get genre IDs
      if (formData.genres.length > 0) {
        const { data: genreIds, error: genreError } = await supabase
          .from('genres')
          .select('id')
          .in('name', formData.genres);

        if (genreError) throw genreError;

        if (genreIds && genreIds.length > 0) {
          const { error: linkError } = await supabase
            .from('game_genres')
            .insert(
              genreIds.map(genre => ({
                game_id: gameId,
                genre_id: genre.id
              }))
            );

          if (linkError) throw linkError;
        }
      }

      setFormData({
        title: '',
        platforms: [],
        genres: [],
        status: 'Not Started',
        progress: 0,
        image: ''
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
              <span className="label-text">Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Platforms</span>
            </label>
            <select
              className="select select-bordered"
              multiple
              value={formData.platforms}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                setFormData({ ...formData, platforms: selectedOptions })
              }}
            >
              {platformOptions.map((platform) => (
                <option key={platform} value={platform}>
                  {platform}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Genres</span>
            </label>
            <select
              className="select select-bordered"
              multiple
              value={formData.genres}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
                setFormData({ ...formData, genres: selectedOptions })
              }}
            >
              {genreOptions.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text">Status</span>
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
              <span className="label-text">Progress</span>
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
              <span className="label-text">Image URL</span>
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
