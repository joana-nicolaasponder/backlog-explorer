// import OpenAI from 'openai';
// import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// export interface RecommendationParams {
//   backlog: Array<{ title: string; genre?: string; mood?: string }>;
//   season: string;
//   holidays?: Array<{ name: string }>;
// }

// export async function getRecommendation({ backlog, season, holidays }: RecommendationParams): Promise<string> {
//   const formattedBacklog = backlog
//     .map((game) => `${game.title} - Genre: ${game.genre || 'N/A'}, Mood: ${game.mood || 'N/A'}`)
//     .join('\n');

//   const messages: ChatCompletionMessageParam[] = [
//     {
//       role: 'system',
//       content: `You are a helpful assistant that recommends video games based on seasons and user preferences.`,
//     },
//     {
//       role: 'user',
//       content:
//         `Backlog:\n${formattedBacklog}\n\nSeason: ${season}\n` +
//         (holidays?.length ? `Events: ${holidays.map((h) => h.name).join(', ')}\n` : '') +
//         `Recommend games that fit the current season and events.`,
//     },
//   ];

//   const response = await openai.chat.completions.create({
//     model: 'gpt-4',
//     messages,
//     temperature: 0.7,
//     max_tokens: 400,
//   });

//   return response.choices[0]?.message?.content ?? 'No recommendation available.';
// }
