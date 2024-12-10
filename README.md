# Backlog Explorer

A web application for gamers to track their gaming backlog, built with React, TypeScript, and Supabase.

## Features

- Track your gaming backlog with standardized game data from RAWG
- Add games with consistent metadata (genres, platforms, images)
- Track progress and status for each game
- Add notes and completion entries
- Filter and sort your game library

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Authentication)
- APIs: RAWG for game data

## Project Evolution & Learnings

### Database Design Evolution

1. **Initial Structure**
   - Single `games` table with user-specific data
   - Simple but led to duplicate game data across users

2. **Improved Structure with RAWG Integration**
   - Split into `games` (shared data) and `user_games` (user-specific data)
   - Better data normalization and consistency
   - Standardized game information from RAWG

### Key Learnings

1. **Database Management**
   - Always use separate development and production databases
   - Plan database migrations carefully
   - Consider data migration strategies early in development
   - Document database schema changes

2. **API Integration**
   - Using RAWG API improved data consistency
   - Standardized game metadata (genres, platforms)
   - Better user experience with game search and addition

3. **Data Normalization**
   - Splitting game data from user progress improved efficiency
   - Reduced data duplication
   - Made it easier to maintain consistent game information

4. **Migration Challenges**
   - Learned importance of testing migrations
   - Backup strategies are crucial
   - Consider impact on existing data when restructuring

### Future Improvements

1. **Database**
   - Implement proper development/production database separation
   - Add database backup strategies
   - Improve migration testing process

2. **Features**
   - Enhanced game search capabilities
   - More detailed progress tracking
   - Social features (share libraries, recommendations)

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_RAWG_API_KEY=your_rawg_api_key
   ```
4. Run development server: `npm run dev`

## Contributing

Feel free to submit issues and enhancement requests!
