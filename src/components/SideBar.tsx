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
        w-64 bg-base-100 p-4 flex flex-col min-h-screen
      `}
      >
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-8">Backlog Explorer</h1>
          <nav className="space-y-2">
            <Link
              to="/"
              className="btn btn-ghost w-full justify-start"
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </Link>
            <Link
              to="/library"
              className="btn btn-ghost w-full justify-start"
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
              </svg>
              Library
            </Link>
            <Link
              to="/explore"
              className="btn btn-ghost w-full justify-start"
              onClick={() => setIsOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9 9a2 2 0 114 0 2 2 0 01-4 0z" />
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a4 4 0 00-3.446 6.032l-2.261 2.26a1 1 0 101.414 1.415l2.261-2.261A4 4 0 1011 5z"
                  clipRule="evenodd"
                />
              </svg>
              Explore
            </Link>
          </nav>
        </div>

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
