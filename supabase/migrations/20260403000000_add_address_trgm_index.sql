-- 주소 검색 성능 개선: pg_trgm 확장 + GIN 인덱스
-- %검색어% 형태의 ilike 쿼리를 인덱스로 가속

-- pg_trgm 확장 활성화 (이미 활성화된 경우 무시)
create extension if not exists pg_trgm;

-- road_address ilike 검색 인덱스
create index if not exists idx_restaurants_road_address_trgm
  on restaurants using gin (road_address gin_trgm_ops);

-- address ilike 검색 인덱스
create index if not exists idx_restaurants_address_trgm
  on restaurants using gin (address gin_trgm_ops);
