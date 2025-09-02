interface EmptyStateProps {
  message: string
}

const EmptyState = ({ message }: EmptyStateProps) => {
  return (
    <p className="text-center py-4 bg-base-200 rounded-lg">
      {message}
    </p>
  )
}

export default EmptyState
