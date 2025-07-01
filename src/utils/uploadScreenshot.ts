import imageCompression from 'browser-image-compression'

export const uploadScreenshot = async (file: File): Promise<string> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }

  const compressed = await imageCompression(file, options)

  if (compressed.size > 50 * 1024 * 1024) {
    throw new Error('File is too large')
  }

  return URL.createObjectURL(compressed)
}
