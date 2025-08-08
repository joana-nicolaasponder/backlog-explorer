import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import BetaPill from './BetaPill'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faGauge,
  faLayerGroup,
  faMagnifyingGlass,
  faUser,
  faCommentDots,
  faFaceSmile,
  faPlus,
  faRightFromBracket,
  faTools,
  faChartSimple
} from '@fortawesome/free-solid-svg-icons'

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
      <div className="fixed top-0 left-0 right-0 h-16 bg-base-100 z-50 lg:hidden flex items-center justify-between px-4">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-circle btn-ghost"
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
        <div className="flex items-center gap-2">
  <h1 className="text-2xl font-bold">Backlog Explorer</h1>
  <span className="lg:hidden align-middle"><BetaPill /></span>
</div>
        <div className="w-10"></div> {/* Spacer to center the title */}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen w-64 bg-base-100 text-base-content shadow-lg flex-col overflow-y-auto overflow-x-hidden">
        {/* Sidebar Content */}
        <div className="p-4 flex-1">
          <div className="mb-8">
            <div>
  <h1 className="text-2xl font-bold mb-1">Backlog Explorer</h1>
  <div className="hidden lg:block mt-2"><BetaPill /></div>
</div>
          </div>

          <nav className="space-y-2">
            <Link
              to="/app"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
              <span>Home</span>
            </Link>

            <Link
              to="/app/dashboard"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/dashboard' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faChartSimple} className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/app/library"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/library' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5" />
              <span>Library</span>
            </Link>

            <Link
              to="/app/explore"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/explore' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5" />
              <span>Explore</span>
            </Link>

            <Link
              to="/app/profile"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/profile' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
              <span>Profile</span>
            </Link>

            <Link
              to="/app/feedback"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/feedback' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faCommentDots} className="h-5 w-5" />
              <span>Send Feedback</span>
            </Link>

            <Link
              to="/app/coming-soon"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/coming-soon' ? 'bg-base-200' : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTools} className="h-5 w-5" />
              <span>Coming Soon</span>
            </Link>

            {/* <Link
              to="/app/mood-recommendations"
              className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                location.pathname === '/app/mood-recommendations'
                  ? 'bg-base-200'
                  : ''
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faFaceSmile} className="h-5 w-5" />
              <span>Mood Recommendations</span>
            </Link> */}
          </nav>
        </div>

        <div className="mt-16 space-y-4 mb-2 mr-2 ml-2">
          <button onClick={onAddGame} className="w-full btn btn-primary">
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Add Game
          </button>
          <button onClick={onLogout} className="btn btn-outline w-full">
            <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
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
            className="fixed top-16 left-0 bottom-0 z-30 w-64 bg-base-100 shadow-lg flex flex-col p-4
              transform transition-transform duration-200 ease-in-out lg:hidden overflow-y-auto"
          >
            <div className="flex-1">
              <nav className="space-y-2">
                <Link
                  to="/app"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
                  <span>Home</span>
                </Link>

                <Link
                  to="/app/dashboard"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/dashboard' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faGauge} className="h-5 w-5" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  to="/app/library"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/library' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faLayerGroup} className="h-5 w-5" />
                  <span>Library</span>
                </Link>

                <Link
                  to="/app/explore"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/explore' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="h-5 w-5" />
                  <span>Explore</span>
                </Link>

                <Link
                  to="/app/profile"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/profile' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faUser} className="h-5 w-5" />
                  <span>Profile</span>
                </Link>

                <Link
                  to="/app/feedback"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/feedback' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faCommentDots} className="h-5 w-5" />
                  <span>Send Feedback</span>
                </Link>

                <Link
                  to="/app/coming-soon"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/coming-soon' ? 'bg-base-200' : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faTools} className="h-5 w-5" />
                  <span>Coming Soon</span>
                </Link>

                {/* <Link
                  to="/app/mood-recommendations"
                  className={`flex items-center space-x-2 p-2 rounded-lg hover:bg-base-200 ${
                    location.pathname === '/app/mood-recommendations'
                      ? 'bg-base-200'
                      : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={faFaceSmile} className="h-5 w-5" />
                  <span>Mood Recommendations</span>
                </Link> */}
              </nav>
            </div>

            <div className="mt-16 space-y-4">
              <button onClick={onAddGame} className="w-full btn btn-primary">
                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                Add Game
              </button>
              <button onClick={onLogout} className="btn btn-outline w-full">
                <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
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
