interface ScreenshotGalleryProps {
  screenshots: string[]
  onScreenshotClick: (url: string) => void
}

const ScreenshotGallery = ({ screenshots, onScreenshotClick }: ScreenshotGalleryProps) => {
  if (!screenshots || screenshots.length === 0) {
    return null
  }

  return (
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
      {screenshots.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`Screenshot ${index + 1}`}
          className="w-full h-32 object-cover rounded-lg cursor-pointer"
          onClick={() => onScreenshotClick(url)}
        />
      ))}
    </div>
  )
}

export default ScreenshotGallery
