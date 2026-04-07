-- ================================================================
-- 핵심 테이블 RLS 감사 및 누락 정책 추가
-- ================================================================

-- restaurants 테이블
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "맛집 전체 조회" ON restaurants;
DROP POLICY IF EXISTS "맛집 등록" ON restaurants;
DROP POLICY IF EXISTS "맛집 삭제" ON restaurants;

CREATE POLICY "맛집 전체 조회" ON restaurants FOR SELECT USING (true);
CREATE POLICY "맛집 등록" ON restaurants FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "맛집 삭제" ON restaurants FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ================================================================

-- reviews 테이블
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "리뷰 전체 조회" ON reviews;
DROP POLICY IF EXISTS "리뷰 등록" ON reviews;
DROP POLICY IF EXISTS "리뷰 수정" ON reviews;
DROP POLICY IF EXISTS "리뷰 삭제" ON reviews;

CREATE POLICY "리뷰 전체 조회" ON reviews FOR SELECT USING (true);
CREATE POLICY "리뷰 등록" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "리뷰 수정" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "리뷰 삭제" ON reviews FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- ================================================================

-- profiles 테이블
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "프로필 전체 조회" ON profiles;
DROP POLICY IF EXISTS "프로필 수정" ON profiles;

CREATE POLICY "프로필 전체 조회" ON profiles FOR SELECT USING (true);
CREATE POLICY "프로필 수정" ON profiles FOR UPDATE USING (auth.uid() = id);
