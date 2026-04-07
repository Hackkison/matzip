-- review_likes 테이블 생성
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(review_id, user_id)
);

-- RLS 활성화
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

-- 누구나 조회 가능
CREATE POLICY "좋아요 조회" ON review_likes
  FOR SELECT USING (true);

-- 본인만 추가
CREATE POLICY "좋아요 추가" ON review_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인만 삭제
CREATE POLICY "좋아요 삭제" ON review_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);

-- 별점 0.5 단위 지원 (integer → numeric)
ALTER TABLE reviews ALTER COLUMN rating TYPE NUMERIC(2,1);
