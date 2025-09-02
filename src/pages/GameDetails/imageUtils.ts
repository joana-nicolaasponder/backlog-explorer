import imageCompression from 'browser-image-compression'
import supabase from '../../supabaseClient'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
export const MAX_FILES_PER_NOTE = 6 // Reasonable limit per note

export const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1, // Max file size of 1MB
    maxWidthOrHeight: 1920, // Max width/height of 1920px
    useWebWorker: true, // Use web worker for better performance
    fileType: file.type, // Maintain original file type
    initialQuality: 0.8, // Initial quality (0.8 is a good balance)
  }

  try {
    // Show compression progress
    const progress = document.createElement('div')
    progress.className =
      'fixed bottom-4 right-4 bg-base-200 p-4 rounded-lg shadow-lg'
    progress.innerHTML = `Compressing ${file.name}...`
    document.body.appendChild(progress)

    const compressedFile = await imageCompression(file, options)
    document.body.removeChild(progress)

    return compressedFile
  } catch (error) {
    console.error('Error compressing image:', error)
    throw error
  }
}

export const uploadScreenshot = async (file: File, gameId: string) => {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error(
        `Invalid file type: ${file.name}. Only images are allowed.`
      )
    }

    // Compress image before size check
    const compressedFile = await compressImage(file)

    // Validate compressed file size
    if (compressedFile.size > MAX_FILE_SIZE) {
      throw new Error(`File still too large after compression: ${file.name}`)
    }

    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData.user?.id

    // Create a unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()
      .toString(36)
      .substring(2)}${Date.now()}.${fileExt}`
    const filePath = `${user_id}/${gameId}/${fileName}`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('game-screenshots')
      .upload(filePath, compressedFile)

    if (uploadError) throw uploadError

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('game-screenshots').getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading screenshot:', error)
    throw error
  }
}
