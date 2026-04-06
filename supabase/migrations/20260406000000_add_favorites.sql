-- 즐겨찾기 테이블
CREATE TABLE IF NOT EXISTS favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- RLS 활성화
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 본인 즐겨찾기만 조회
CREATE POLICY "즐겨찾기 조회" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 즐겨찾기만 추가
CREATE POLICY "즐겨찾기 추가" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 즐겨찾기만 삭제
CREATE POLICY "즐겨찾기 삭제" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON favorites(restaurant_id);
