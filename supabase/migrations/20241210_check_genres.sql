-- Check if genres table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'genres';

-- Check RLS policies on genres table
SELECT *
FROM pg_policies
WHERE tablename = 'genres';
