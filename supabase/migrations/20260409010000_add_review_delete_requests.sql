-- 리뷰 삭제 요청 테이블
CREATE TABLE review_delete_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id    UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (review_id, requester_id)
);

ALTER TABLE review_delete_requests ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자: 본인 요청 생성
CREATE POLICY "rdr_insert" ON review_delete_requests
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

-- 요청자 본인: 자신의 요청 조회
CREATE POLICY "rdr_requester_select" ON review_delete_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid());

-- 관리자: 모든 요청 조회
CREATE POLICY "rdr_admin_select" ON review_delete_requests
  FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
