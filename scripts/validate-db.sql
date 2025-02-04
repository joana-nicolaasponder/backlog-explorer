-- Script to validate database structure between environments
-- Run this in both dev and prod to compare the output

-- Table Structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    tc.constraint_type,
    tc.constraint_name
FROM 
    information_schema.columns c
LEFT JOIN 
    information_schema.key_column_usage kcu
    ON c.table_name = kcu.table_name 
    AND c.column_name = kcu.column_name
LEFT JOIN 
    information_schema.table_constraints tc
    ON kcu.constraint_name = tc.constraint_name
WHERE 
    c.table_schema = 'public'
    AND c.table_name IN (
        'games',
        'genres',
        'platforms',
        'game_genres',
        'game_platforms',
        'rawg_platform_mappings',
        'rawg_genre_mappings'
    )
ORDER BY 
    c.table_name,
    c.ordinal_position;

-- RLS Policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    schemaname = 'public'
ORDER BY
    tablename, policyname;
