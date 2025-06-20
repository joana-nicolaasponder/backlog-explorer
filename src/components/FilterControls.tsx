import React from 'react';
import SearchBar from './SearchBar';

interface FilterControlsProps {
  filters: {
    filterStatus: string[];
    filterPlatform: string;
    filterGenre: string;
    filterMood: string;
    filterYear: number | null;
    sortOrder: string;
    searchQuery: string;
  };
  setters: {
    setFilterStatus: (statuses: string[]) => void;
    setFilterPlatform: (platform: string) => void;
    setFilterGenre: (genre: string) => void;
    setFilterMood: (mood: string) => void;
    setFilterYear: (year: number | null) => void;
    setSortOrder: (order: string) => void;
    setSearchQuery: (query: string) => void;
  };
  options: {
    statusOptions: string[];
    platformOptions: string[];
    genreOptions: string[];
    moodOptions: string[];
    yearOptions: number[];
  };
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, setters, options }) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div className="flex flex-wrap gap-4">
        <div className="dropdown dropdown-hover">
          <div tabIndex={0} role="button" className="btn m-1">
            {filters.filterStatus.length === 0
              ? 'All Statuses'
              : `${filters.filterStatus.length} Selected`}
          </div>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
          >
            {options.statusOptions.map((status) => (
              <li key={status}>
                <label className="label cursor-pointer justify-start gap-2">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={filters.filterStatus.includes(status)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setters.setFilterStatus([...filters.filterStatus, status]);
                      } else {
                        setters.setFilterStatus(
                          filters.filterStatus.filter((s) => s !== status)
                        );
                      }
                    }}
                  />
                  <span data-testid={`status-option-${status.toLowerCase().replace(/\s/g, '-')}`}>
                    {status}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <select
          aria-label="All Platforms"
          className="select select-bordered"
          value={filters.filterPlatform}
          onChange={(e) => setters.setFilterPlatform(e.target.value)}
        >
          <option value="">All Platforms</option>
          {options.platformOptions.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>

        <select
          aria-label="All Genres"
          className="select select-bordered"
          value={filters.filterGenre}
          onChange={(e) => setters.setFilterGenre(e.target.value)}
        >
          <option value="">All Genres</option>
          {options.genreOptions.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>

        <select
          aria-label="All Moods"
          className="select select-bordered"
          value={filters.filterMood}
          onChange={(e) => setters.setFilterMood(e.target.value)}
        >
          <option value="">All Moods</option>
          {options.moodOptions.map((mood) => (
            <option key={mood} value={mood}>
              {mood}
            </option>
          ))}
        </select>

        <select
          id="year-filter"
          aria-label="Year Completed"
          className="select select-bordered"
          value={filters.filterYear ?? ''}
          onChange={(e) =>
            setters.setFilterYear(e.target.value ? parseInt(e.target.value) : null)
          }
          title="Filters by year the game was completed (based on last update)"
        >
          <option value="">Year Completed (All)</option>
          {options.yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <select
          aria-label="Title (A → Z)"
          className="select select-bordered"
          value={filters.sortOrder}
          onChange={(e) => setters.setSortOrder(e.target.value)}
        >
          <option value="alphabetical-asc">Title (A → Z)</option>
          <option value="alphabetical-desc">Title (Z → A)</option>
          <option value="progress-asc">Progress (0% → 100%)</option>
          <option value="progress-desc">Progress (100% → 0%)</option>
          <option value="date-newest">Date Added (Newest)</option>
          <option value="date-oldest">Date Added (Oldest)</option>
        </select>
      </div>
      <SearchBar
        value={filters.searchQuery}
        onChange={setters.setSearchQuery}
        onClear={() => setters.setSearchQuery('')}
      />
    </div>
  );
};

export default FilterControls;