# 🧪 Sprint Plan: Steam Integration
Integrate Steam with Backlog Explorer 

## 🎯 Goal
Briefly describe what this sprint aims to accomplish.

> Users should be able to connect their steam account to backlog explorer so that they can import their steam games into their backlog explorer library for tracking

---

## 🧱 Tasks

- [ ] Create a "Connect Steam" button in the user profile/settings page
- [ ] Set up Steam OpenID authentication flow
- [ ] Store user's Steam ID securely in Supabase
- [ ] Build a Supabase function or edge function to fetch user's owned games from the Steam Web API
- [ ] Normalize Steam game data into your `games` or `user_games` schema
- [ ] Update UI to show imported Steam games in user's library
- [ ] Allow users to tag or move imported games into their backlog categories
- [ ] Handle edge cases (e.g. private Steam profiles, empty libraries)
- [ ] Optional: Add ability to manually trigger a Steam library refresh

---

## 🧠 Prompts + Iterations

### Prompt: Create Supabase Table
```
I need a Supabase SQL snippet to create a table called [table_name] with:
- id (UUID, primary key)
- text (string, not null)
- mood_tag (optional string)
- created_at (timestamp, default now)
```

### Prompt: Fetch Random Challenge in Supabase Client
```
Write a TypeScript function using `@supabase/supabase-js` to fetch a random entry from the `[table_name]` table. Return only the `text` field.
```

---

## ⏪ One-Shot Prompting Log (if things go wrong)
| Attempt | What went wrong | How I changed the prompt |
|--------|------------------|---------------------------|
| #1 |  |  |
| #2 |  |  |

---

## ✅ Sprint Result
Summarize the outcome. Add links to commits or testable branches.

---

## 🧰 Tools Used
| Tool      | Role                         |
|-----------|------------------------------|
| Cursor    | Inline edits + quick coding  |
| ChatGPT   | Prompt refinement + strategy |
| Supabase  | DB + API                     |