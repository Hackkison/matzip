-- 영업시간 컬럼 추가
-- 구조: {"mon": {"open": "11:00", "close": "21:00"}, "sun": null(휴무), ...}
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_hours JSONB;
