/*
  # 동영상 파일을 post_media로 마이그레이션

  1. 변경사항
    - image_url에 저장된 동영상 파일(.mp4, .mov, .avi, .webm)을 post_media 테이블로 이동
    - 해당 posts의 image_url을 NULL로 설정
    - post_media에 올바른 media_type='video'로 저장

  2. 이유
    - 동영상이 이미지로 표시되는 문제 해결
    - 미디어 타입을 올바르게 구분하여 저장
*/

-- image_url에 동영상 파일이 있는 posts를 post_media로 복사
INSERT INTO post_media (post_id, media_url, media_type, order_index)
SELECT 
  id as post_id,
  image_url as media_url,
  'video' as media_type,
  0 as order_index
FROM posts
WHERE (
  image_url LIKE '%.mp4%' 
  OR image_url LIKE '%.mov%' 
  OR image_url LIKE '%.avi%' 
  OR image_url LIKE '%.webm%'
  OR image_url LIKE '%.MP4%'
  OR image_url LIKE '%.MOV%'
)
AND image_url IS NOT NULL;

-- 마이그레이션 완료 후 posts 테이블의 image_url을 NULL로 설정
UPDATE posts
SET image_url = NULL
WHERE (
  image_url LIKE '%.mp4%' 
  OR image_url LIKE '%.mov%' 
  OR image_url LIKE '%.avi%' 
  OR image_url LIKE '%.webm%'
  OR image_url LIKE '%.MP4%'
  OR image_url LIKE '%.MOV%'
)
AND image_url IS NOT NULL;
