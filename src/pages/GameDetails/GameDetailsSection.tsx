import { RawgGameDetails } from '../../types'
import ExpandableText from '../../components/ExpandableText'

interface GameDetailsSectionProps {
  rawgDetails: RawgGameDetails | null
  details: any 
  selectedScreenshot: string | null
  setSelectedScreenshot: (url: string | null) => void
}

const GameDetailsSection = ({ 
  rawgDetails, 
  details, 
  selectedScreenshot, 
  setSelectedScreenshot 
}: GameDetailsSectionProps) => {
  return (
    <>
      {/* Game Details Section */}
      <div className="card bg-base-200 mb-8">
        <div className="card-body">
          <h2 className="card-title mb-4">Game Details</h2>
          {rawgDetails ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  
                </div>

                <div>
                  {/* Show IGDB details if available */}
                  {details?.summary && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">Summary</h3>
                      <ExpandableText
                        text={details.summary}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}
                  {details?.storyline && (
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">Storyline</h3>
                      <ExpandableText
                        text={details.storyline}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}

                  {/* Show RAWG/Steam description if IGDB details aren't available */}
                  {!details?.summary && rawgDetails?.description_raw && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">About</h3>
                      <ExpandableText
                        text={rawgDetails.description_raw}
                        className="text-sm opacity-70 whitespace-pre-line"
                      />
                    </div>
                  )}
                </div>
              </div>
              {rawgDetails.screenshots &&
                rawgDetails.screenshots.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Screenshots</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {rawgDetails.screenshots.map((screenshot, index) => (
                        <img
                          key={`screenshot-${index}`}
                          src={screenshot.image}
                          alt="Game Screenshot"
                          className="rounded-lg w-full h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            setSelectedScreenshot(screenshot.image)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-base-300 rounded w-3/4"></div>
              <div className="h-4 bg-base-300 rounded w-1/2"></div>
              <div className="h-32 bg-base-300 rounded"></div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl h-auto relative p-0 bg-transparent">
            <button
              className="btn btn-circle btn-ghost absolute right-2 top-2 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-70"
              onClick={() => setSelectedScreenshot(null)}
            >
              ✕
            </button>
            <img
              src={selectedScreenshot}
              alt="Game Screenshot"
              className="w-full h-auto rounded-lg"
            />
          </div>
          <div
            className="modal-backdrop"
            onClick={() => setSelectedScreenshot(null)}
          ></div>
        </div>
      )}
    </>
  )
}

export default GameDetailsSection