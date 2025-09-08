import imageCompression from 'browser-image-compression'
import supabase from '../../supabaseClient'

export const MAX_FILE_SIZE = 50 * 1024 * 1024 
export const MAX_FILES_PER_NOTE = 6 

export const compressImage = async (file: File) => {
  const options = {
    maxSizeMB: 1, 
    maxWidthOrHeight: 1920, 
    useWebWorker: true, 
    fileType: file.type, 
    initialQuality: 0.8, 
  }

  try {
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
    if (!file.type.startsWith('image/')) {
      throw new Error(
        `Invalid file type: ${file.name}. Only images are allowed.`
      )
    }

    const compressedFile = await compressImage(file)

    if (compressedFile.size > MAX_FILE_SIZE) {
      throw new Error(`File still too large after compression: ${file.name}`)
    }

    const { data: userData } = await supabase.auth.getUser()
    const user_id = userData.user?.id

    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()
      .toString(36)
      .substring(2)}${Date.now()}.${fileExt}`
    const filePath = `${user_id}/${gameId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('game-screenshots')
      .upload(filePath, compressedFile)

    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from('game-screenshots').getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading screenshot:', error)
    throw error
  }
}
