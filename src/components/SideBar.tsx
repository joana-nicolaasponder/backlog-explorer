import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

interface SideBarProps {
  onLogout: () => void
  onAddGame: () => void
}

const SideBar = ({ onLogout, onAddGame }: SideBarProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  return (
    <aside>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 btn btn-circle btn-ghost lg:hidden"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          className="inline-block w-5 h-5 stroke-current"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen w-64 bg-base-100 text-base-content shadow-lg flex-col">
        {/* Sidebar Content */}
        <div className="p-4 flex-1">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-4">Backlog Explorer</h1>
          </div>

          <nav className="space-y-2">
            <Link
              to="/app"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span>Home</span>
            </Link>

            <Link
              to="/app/dashboard"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/dashboard' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              to="/app/library"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/library' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              <span>Library</span>
            </Link>

            <Link
              to="/app/explore"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/explore' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Explore</span>
            </Link>
          </nav>
        </div>

        <div className="mt-16 space-y-4">
          <button onClick={onAddGame} className="w-full btn btn-primary">
            Add Game
          </button>
          <button onClick={onLogout} className="btn btn-outline w-full">
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setIsOpen(false)}
          ></div>
          <div
            className="fixed inset-y-0 left-0 z-30 w-64 bg-base-100 shadow-lg flex flex-col p-4
              transform transition-transform duration-200 ease-in-out lg:hidden"
          >
            <div className="flex-1">
              <div className="mb-8">
                <h1 className="text-2xl font-bold mb-4">Backlog Explorer</h1>
              </div>

              <nav className="space-y-2">
                <Link
                  to="/app"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span>Home</span>
                </Link>

                <Link
                  to="/app/dashboard"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/dashboard' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/app/library"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/library' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  <span>Library</span>
                </Link>

                <Link
                  to="/app/explore"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/explore' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Explore</span>
                </Link>
              </nav>
            </div>

            <div className="mt-16 space-y-4">
              <button onClick={onAddGame} className="w-full btn btn-primary">
                Add Game
              </button>
              <button onClick={onLogout} className="btn btn-outline w-full">
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  )
}

export default SideBar
