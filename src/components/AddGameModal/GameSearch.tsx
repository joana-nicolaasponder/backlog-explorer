import { useState, useEffect, useRef } from 'react';
import { gameService } from '../../services/gameService';
import { GameBasic } from '../../types/game';
import debounce from 'lodash/debounce';

interface GameSearchProps {
  onGameSelect: (game: GameBasic) => void;
}

const GameSearch: React.FC<GameSearchProps> = ({ onGameSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GameBasic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useRef(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResult = await gameService.searchGames(searchQuery);
        setResults(searchResult.results);
      } catch (err) {
        setError('Error searching for games. Please try again.');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSearch(query);

    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  return (
    <div className="space-y-4">
      <div className="form-control">
        <input
          type="text"
          className="input input-bordered w-full"
          placeholder="Search for a game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div className="flex justify-center">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((game) => (
            <div
              key={game.id}
              className="flex items-center gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 cursor-pointer transition-colors"
              onClick={() => onGameSelect(game)}
            >
              {game.background_image ? (
                <img
                  src={game.background_image}
                  alt={game.name}
                  className="w-16 h-16 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-16 bg-base-300 rounded flex items-center justify-center">
                  <span className="text-2xl">🎮</span>
                </div>
              )}
              <div>
                <h3 className="font-semibold">{game.name}</h3>
                <div className="text-sm text-base-content/70 space-y-1">
                  {game.released && (
                    <p>Released: {new Date(game.released).getFullYear()}</p>
                  )}
                  {game.metacritic && (
                    <p>Metacritic: {game.metacritic}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-4 text-base-content/70">
          No games found matching "{query}"
        </div>
      )}
    </div>
  );
};

export default GameSearch;
