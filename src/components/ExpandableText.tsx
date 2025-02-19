import React, { useState } from 'react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
  className?: string
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLength = 300,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = text.length > maxLength

  if (!shouldTruncate) {
    return <div className={className}>{text}</div>
  }

  const displayText = isExpanded ? text : `${text.slice(0, maxLength)}...`

  return (
    <div className={className}>
      <div>{displayText}</div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn btn-link btn-sm mt-2 p-0 h-auto min-h-0 normal-case hover:no-underline"
      >
        {isExpanded ? 'Show less' : 'Read more'}
      </button>
    </div>
  )
}

export default ExpandableText
