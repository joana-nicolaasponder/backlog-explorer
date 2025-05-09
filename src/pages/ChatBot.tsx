// components/ChatBot.tsx
import { useState, useEffect, useRef } from 'react'
import supabase from '../supabaseClient'

interface Message {
  sender: 'user' | 'bot'
  text: string
}

export default function ChatBot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [recommendedGames, setRecommendedGames] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = { sender: 'user', text: input }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User not logged in:', userError)
      setIsLoading(false)
      return
    }

    const { data: userGames, error } = await supabase
      .from('user_games')
      .select(`
        game_id,
        status,
        progress,
        games (
          id,
          title,
          background_image,
          game_genres (
            genres (
              name
            )
          )
        )
      `)
      .eq('user_id', user.id)
      .not('status', 'in.("Done","Endless","Satisfied","DNF")')

    if (error || !userGames) {
      console.error('Failed to fetch games:', error)
      setIsLoading(false)
      return
    }

    const payload = {
      mode: 'chat',
      messages, // full chat history
      userMessage: input,
      backlog: userGames.map((entry) => ({
        title: entry.games?.title || '',
        genre: entry.games?.game_genres?.map((g) => g.genres.name).join(', ') || '',
        playStyle: '',
        playtime: '',
      })),
    }

    try {
      const res = await fetch('http://localhost:3001/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      const botReply = result.recommendation || 'Hmm, I couldn’t think of anything!'
      console.log('GPT raw reply:', botReply)

      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }])

      // Parse botReply for recommended games with quoted titles or numbered + bold format
      const recommended: any[] = []
      const lines = botReply.split('\n')
      console.log('Split lines:', lines)
      for (const line of lines) {
        // Replace quoteMatch block with global regex to find all quoted titles in the line
        const quoteRegex = /"([^"]+?)"/g
        let match: RegExpExecArray | null
        while ((match = quoteRegex.exec(line)) !== null) {
          const title = match[1].trim()
          const description = line.trim()
          const matchedGame = userGames.find(
            (entry) => entry.games?.title.toLowerCase().includes(title.toLowerCase())
          )
          if (matchedGame) {
            recommended.push({
              id: matchedGame.games?.id,
              title: matchedGame.games?.title,
              description,
              background_image: matchedGame.games?.background_image,
              genres: matchedGame.games?.game_genres?.map((g) => g.genres.name) || [],
            })
            console.log('Matched game:', title, matchedGame)
          }
        }
        if (!line.match(/"([^"]+?)"/)) {
          const boldMatch = line.match(/^\d+\.\s\*\*(.+?)\*\*\s*-\s*(.+)$/)
          if (boldMatch) {
            const title = boldMatch[1].trim()
            const description = boldMatch[2].trim()
            const matchedGame = userGames.find(
              (entry) => entry.games?.title.toLowerCase().includes(title.toLowerCase())
            )
            if (matchedGame) {
              recommended.push({
                id: matchedGame.games?.id,
                title: matchedGame.games?.title,
                description,
                background_image: matchedGame.games?.background_image,
                genres: matchedGame.games?.game_genres?.map((g) => g.genres.name) || [],
              })
              console.log('Matched game (bold):', title, matchedGame)
            }
          }
        }
      }
      console.log('Final recommendedGames array:', recommended)
      setRecommendedGames(recommended)
      setIsLoading(false)
    } catch (err) {
      console.error('Error fetching GPT reply:', err)
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Oops! Something went wrong.' },
      ])
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto h-[80vh] flex flex-col border rounded-lg shadow-md bg-base-100">
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat ${msg.sender === 'user' ? 'chat-end' : 'chat-start'}`}>
            <div
              className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-primary' : 'chat-bubble-secondary'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="chat chat-start">
            <div className="chat-bubble chat-bubble-secondary">
              <span className="loading loading-dots loading-xs"></span>
            </div>
          </div>
        )}
        <div />
      </div>

      {recommendedGames.length > 0 && (
        <div className="p-4 border-t bg-base-200 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-48">
          {recommendedGames.map((game) => (
            <div key={game.id} className="card card-compact bg-base-100 shadow-md">
              {game.background_image && (
                <figure>
                  <img src={game.background_image} alt={game.title} className="w-full h-32 object-cover rounded-t-md" />
                </figure>
              )}
              <div className="card-body p-3">
                <h2 className="card-title text-sm font-semibold">{game.title}</h2>
                <p className="text-xs text-gray-600 mb-2">{game.description}</p>
                <div className="flex flex-wrap gap-1">
                  {game.genres.map((genre: string, i: number) => (
                    <span key={i} className="badge badge-outline badge-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          sendMessage()
        }}
        className="p-4 flex gap-2 border-t bg-base-200"
      >
        <input
          type="text"
          placeholder="I’ve got your backlog. What are you in the mood to play?"
          className="input input-bordered w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  )
}