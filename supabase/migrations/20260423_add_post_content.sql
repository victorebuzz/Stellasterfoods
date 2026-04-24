-- Add post content fields to gallery_images
ALTER TABLE gallery_images 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS is_post BOOLEAN DEFAULT false;

-- Create index for posts
CREATE INDEX IF NOT EXISTS idx_gallery_images_is_post ON gallery_images(is_post);
