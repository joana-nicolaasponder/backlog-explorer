-- -- Insert a test user
-- INSERT INTO Users (id, email, created_at)
-- VALUES (gen_random_uuid(), 'jopo@example.com', now());

-- Insert a game for the test user
INSERT INTO Games (id, user_id, title, platform, genre, tags, status, progress, created_at)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM Users WHERE email = 'jopo@example.com'), -- Use the test user's ID
    'Moonstone Island',
    'Switch',
    'Farming Sim',
    '[{"mood": "relaxing"}]',
    'Unplayed',
    0,
    now()
);

-- -- Insert a playlist for the test user
-- INSERT INTO Playlists (id, user_id, name, description, created_at)
-- VALUES (
--     gen_random_uuid(),
--     (SELECT id FROM Users WHERE email = 'jopo@example.com'),
--     'Farming Sims',
--     'My favorite farming sims.',
--     now()
-- );

-- Link the game to the playlist
INSERT INTO Playlist_Games (id, playlist_id, game_id)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM Playlists WHERE name = 'Farming Sims'),
    (SELECT id FROM Games WHERE title = 'Moonstone Island')
);