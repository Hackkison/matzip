-- restaurants UPDATE 정책 추가
-- API 라우트에서 세부 권한(관리자/로그인 사용자)을 이미 검증하므로
-- DB 레벨에서는 로그인 여부만 확인
CREATE POLICY "맛집 수정" ON restaurants FOR UPDATE
USING (auth.uid() IS NOT NULL);
