# Progress — 맛집 기록 & 공유 서비스

## MVP

### 디자인 컬러 가이드 (전 Phase 공통 적용)

| 항목 | 값 |
|------|-----|
| Primary (브랜드) | `#1B4332` — HR 앱 메인 포레스트 그린 |
| Primary Text | `#ffffff` — 그린 배경 위 텍스트 |
| 일반 배경 | `#ffffff` |
| 서브 배경 | `#f5f5f5` |
| 버튼 Primary | `#1B4332` |
| 버튼 Secondary | `#e5e5e5` |
| 폰트 | Geist |

> 버튼·헤더·선택 강조에 `#1B4332` 적용. 콘텐츠 영역 배경은 흰색 유지.

---

### Phase 0 — 프로젝트 기반 세팅
- [x] Next.js 프로젝트 생성 (App Router)
- [x] Tailwind CSS + shadcn/ui 설정
- [x] Geist 폰트 적용
- [x] Supabase 프로젝트 생성 (ap-northeast-2, etcemkbhguzcmzzcabxy)
- [x] DB 스키마 설계 및 테이블 생성
  - [x] `restaurants` (식당 정보)
  - [x] `reviews` (우리 리뷰)
  - [x] `profiles` (사용자 프로필, auth.users 트리거 연동)
- [x] Vercel 연동 + 환경변수 설정 (https://matzip-two.vercel.app)
- [x] GitHub 레포 연결

---

### Phase 1 — 인증
- [x] Supabase Auth 설정
- [x] 로그인 / 로그아웃 페이지
- [x] 사용자 세션 관리 (미들웨어)
- [x] 로그인 상태에 따른 접근 제어

---

### Phase 2 — SVG 지도 (지역 선택)
- [x] 공식 GeoJSON 데이터 확보 (southkorea/korea-maps, kostat 2018)
- [x] 시/도별 municipalities JSON 분리 (lazy-load용, /public/maps/municipalities/{code}.json)
- [x] 전국 시/도 지도 컴포넌트 제작 (KoreaMap.tsx, d3-geo geoMercator)
- [x] 시/도 클릭 → 시/군/구 드릴다운 모달
  - [x] 시/군/구 단위 SVG 지도 (17개 시/도 전체)
  - [x] 클릭 시 선택/해제 토글
  - [x] 리스트 뷰 전환 옵션
  - [x] 전체선택 + 선택 확정 버튼
- [x] 선택 확정 시 맛집 목록으로 이동 (/restaurants?region=&name=)

---

### Phase 3 — 맛집 등록
- [x] 등록 페이지 UI
- [x] Kakao Local API 연동 (FD6+CE7 검색 후 필터링)
- [x] 가게명 입력 → 자동완성 (디바운싱 300ms, 최소 2글자)
- [x] 선택 시 가게명·주소·카테고리·전화번호·좌표 자동 입력
- [x] Kakao 카테고리 → 서비스 카테고리 매핑
- [x] Supabase DB 저장
- [x] 등록 완료 후 상세 페이지 이동

---

### Phase 4 — 맛집 목록
- [x] 지역별 식당 리스트 페이지
- [x] 리스트 카드 (이름, 카테고리, 위치)
- [x] 카테고리 필터 (한식/중식/일식/양식/디저트/기타)
- [x] Supabase 데이터 연동

---

### Phase 5 — 맛집 상세
- [x] 상세 페이지 (이름, 카테고리, 주소, 전화번호)
- [x] 카카오맵 링크 (카카오맵에서 보기)

---

### Phase 6 — 리뷰 시스템 (우리 리뷰)
- [x] 리뷰 작성 (별점 + 텍스트)
- [x] 리뷰 목록 표시
- [x] 본인 리뷰 수정 / 삭제
- [x] 평점 집계 표시

---

### Phase 6.5 — 버그 수정 & 개선
- [x] 맛집 삭제 시 실제로 삭제되지 않는 문제 해결 (서비스 롤 API 라우트로 RLS 우회)
- [x] 닉네임 중복 사용 불가 (서버 API에서 서비스 롤로 중복 체크)

---

### Phase 6.6 — 추가 개선
- [x] 맛집 삭제 권한: 관리자만 가능하도록 변경
- [x] 유저 프로필 공개 페이지: 특정 유저가 등록한 맛집 + 작성한 리뷰 조회 (/users/[id])
- [x] 맛집 중복 등록 방지: kakao_id 기준 이미 등록된 가게 재등록 차단
- [x] 정렬 기능 추가: 최신순 / 이름순 / 금액 낮은순 / 높은순
- [x] 금액대 필드 추가 (₩~₩₩₩₩): 등록 시 선택, 카드에 표시, 금액별 정렬
- [x] 관리자 리뷰 삭제 기능
- [x] 회원 탈퇴 기능 (탈퇴 후 리뷰 익명 보존)

---

## Post-MVP

### Phase 7 — 사진 업로드
- [x] Supabase Storage 설정 (restaurant-images, review-images 버킷 + 정책)
- [x] 클라이언트 사이드 이미지 리사이즈 (최대 1200px, WebP)
- [x] 식당 대표 사진 업로드
- [x] 리뷰 사진 첨부 (최대 5장)
- [x] 썸네일: CSS object-fit으로 표시, 클릭 시 원본 열기

---

### Phase 8 — 검색
- [x] 식당명 / 지역명 / 카테고리 통합 검색 (`ilike` OR 조건 + 카테고리 필터)

---

### Phase 9 — 카카오맵 음식점 마커 표시
- [ ] Kakao Maps JavaScript SDK 연동
- [ ] 지도 영역 이동 시 해당 영역 내 음식점(FD6) 검색
- [ ] 검색 결과 마커로 표시 (한 번에 최대 45개, 영역 기반)
- [ ] 마커 클릭 시 가게 정보 표시

> 제한: Kakao API는 한 번에 최대 45개 결과. "모든" 음식점 한번에 불가 — 지도 이동마다 해당 영역 재검색 방식.

---

### Phase 11 — 최적화 & 배포
- [ ] SVG 지도 lazy-load (시/도별 파일 분리)
- [ ] 모바일 UX 최적화
- [ ] Core Web Vitals 점검 (LCP 3초 이내)
- [ ] HR 앱 인증 이관 검토 (JWT 공유, CORS, SameSite 정책)
- [ ] Vercel 프로덕션 배포
- [ ] 운영자 콘텐츠 관리 기능
