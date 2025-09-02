interface ScreenshotModalProps {
  imageUrl: string | null
  onClose: () => void
}

const ScreenshotModal = ({ imageUrl, onClose }: ScreenshotModalProps) => {
  if (!imageUrl) return null

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-5xl h-auto relative p-0 bg-transparent">
        <button
          className="btn btn-circle btn-ghost absolute right-2 top-2 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
          onClick={onClose}
        >
          ✕
        </button>
        <img
          src={imageUrl}
          alt="Game Screenshot"
          className="w-full h-auto rounded-lg"
        />
      </div>
      <div
        className="modal-backdrop"
        onClick={onClose}
      ></div>
    </div>
  )
}

export default ScreenshotModal
