-- Add INSERT policy for genres table
CREATE POLICY "Allow authenticated users to insert genres"
    ON genres
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Verify the policy was created
SELECT *
FROM pg_policies
WHERE tablename = 'genres';
