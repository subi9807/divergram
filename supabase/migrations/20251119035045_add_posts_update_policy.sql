/*
  # Add UPDATE policy for posts table

  1. Changes
    - Add UPDATE policy to posts table to allow users to update their own posts
  
  2. Security
    - Users can only update posts they own (user_id = auth.uid())
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'posts' 
    AND policyname = 'Users can update own posts'
  ) THEN
    CREATE POLICY "Users can update own posts"
      ON posts
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
