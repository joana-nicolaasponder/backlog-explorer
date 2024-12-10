import { Link } from 'react-router-dom'
import { useState } from 'react'
import AddGameModal from './AddGameModal'

interface SideBarProps {
  onLogout: () => void
  onGameAdded?: () => void
}

const SideBar = ({ onLogout, onGameAdded }: SideBarProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-20 btn btn-circle btn-ghost"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed lg:static inset-y-0 left-0 z-40
        transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0
        transition-transform duration-200 ease-in-out
        w-64 h-screen bg-base-200 p-4 flex flex-col
      `}
      >
        <div className="mb-8">
          <h1 className="text-xl font-bold">Backlog Explorer</h1>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className="flex items-center p-2 rounded-lg hover:bg-base-300 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="flex items-center p-2 rounded-lg hover:bg-base-300 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/library"
                className="flex items-center p-2 rounded-lg hover:bg-base-300 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                Library
              </Link>
            </li>
            <li>
              <Link
                to="/explore"
                className="flex items-center p-2 rounded-lg hover:bg-base-300 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-3"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                    clipRule="evenodd"
                  />
                </svg>
                Explore
              </Link>
            </li>
          </ul>
        </nav>

        <div className="mt-auto space-y-4">
          <AddGameModal onGameAdded={onGameAdded} />
          <button onClick={onLogout} className="btn btn-outline w-full">
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default SideBar
