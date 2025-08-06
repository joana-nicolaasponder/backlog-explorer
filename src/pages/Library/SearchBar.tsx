import { useState, useRef, useEffect } from 'react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onClear }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!value) {
          setIsExpanded(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [value])

  const handleSearchClick = () => {
    setIsExpanded(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  return (
    <div ref={containerRef} className="relative z-10">
      <div
        className={`flex items-center transition-all duration-300 ease-in-out ${
          isExpanded ? 'w-64' : 'w-10'
        }`}
      >
        <div className="relative flex items-center w-full">
          <button
            type="button"
            onClick={handleSearchClick}
            className={`absolute left-0 flex items-center justify-center w-10 h-10 text-gray-500 transition-opacity duration-300 ${
              isExpanded ? 'opacity-50' : 'opacity-100 hover:text-gray-700'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search games..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`input input-bordered pl-10 w-full h-10 transition-all duration-300 ${
              isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          />
          {value && isExpanded && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-2 w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchBar
