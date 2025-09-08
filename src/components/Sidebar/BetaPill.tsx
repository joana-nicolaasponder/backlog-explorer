import React from 'react'

interface BetaPillProps {
  className?: string
}

const tooltipText =
  "Backlog Explorer is in Beta. Features may change, bugs may occur, and your feedback is appreciated!"

const BetaPill: React.FC<BetaPillProps> = ({ className = '' }) => (
  <div className={`relative group inline-block ${className}`} tabIndex={0}>
    <span
      className="select-none px-3 py-1 bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs font-semibold rounded-full shadow-md border border-blue-500 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
      title={tooltipText}
    >
      Beta
    </span>
    <div className="absolute left-1/2 z-50 -translate-x-1/2 mt-2 max-w-xs px-3 py-2 rounded-lg bg-gray-900 text-white text-xs shadow-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-pre-line break-words text-center">
      {tooltipText}
    </div>
  </div>
)

export default BetaPill
