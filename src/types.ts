export interface RawgGameDetails {
  description_raw: string
  metacritic: number
  playtime: number
  background_image: string
  screenshots: RawgScreenshot[]
}

export interface RawgScreenshot {
  id: number
  image: string
  width: number
  height: number
}
