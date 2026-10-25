/**
 * 지역 SEO 페이지(/region/[slug])용 메타데이터.
 * 검색어 별칭(region-alias.ts)과 1:1 매칭되는 SEO 지역 목록.
 * slug 는 URL 안전한 로마자, label 은 화면 표기, keyword 는 expandRegion 입력값.
 */
export interface RegionMeta {
  slug: string;
  label: string; // 화면/타이틀 표기명 (예: "홍대")
  keyword: string; // region-alias.ts 의 키 (expandRegion 입력)
  city: string; // 상위 도시 (서울/경기/부산 등)
  /** 서울 지역은 주소 문자열 대신 이 기준으로 연습실을 고른다 (lib/region-select.ts) */
  area?: RegionArea;
}

/**
 * station: 역 좌표에서 반경 안(기본 1km, 8곳 미만이면 1.5km) — 도로명 주소처럼 '○○동'이 없는 주소도 잡힌다.
 * gu: 구 전체 (마포·강남처럼 구 이름이 곧 검색어인 곳). 좌표는 구청 — '가까운 동네' 계산용.
 */
export type RegionArea =
  | { kind: 'station'; name: string; lat: number; lng: number }
  | { kind: 'gu'; gu: string; lat: number; lng: number };

/** 도시명 → ISO 3166-2:KR 코드 (geo.region 메타태그용) */
export const CITY_ISO: Record<string, string> = {
  서울: 'KR-11',
  경기: 'KR-41',
  인천: 'KR-28',
  부산: 'KR-26',
  대구: 'KR-27',
  대전: 'KR-30',
};

export const REGIONS: RegionMeta[] = [
  { slug: 'hongdae', label: '홍대', keyword: '홍대', city: '서울',
    area: { kind: 'station', name: '홍대입구역', lat: 37.5572, lng: 126.9245 } },
  { slug: 'hapjeong', label: '합정', keyword: '합정', city: '서울',
    area: { kind: 'station', name: '합정역', lat: 37.5495, lng: 126.9139 } },
  { slug: 'yeonnam', label: '연남', keyword: '연남', city: '서울',
    area: { kind: 'station', name: '연남동 경의선숲길', lat: 37.5629, lng: 126.9254 } },
  { slug: 'mangwon', label: '망원', keyword: '망원', city: '서울',
    area: { kind: 'station', name: '망원역', lat: 37.556, lng: 126.9101 } },
  { slug: 'sangsu', label: '상수', keyword: '상수', city: '서울',
    area: { kind: 'station', name: '상수역', lat: 37.5477, lng: 126.9229 } },
  { slug: 'sinchon', label: '신촌', keyword: '신촌', city: '서울',
    area: { kind: 'station', name: '신촌역', lat: 37.5552, lng: 126.9369 } },
  { slug: 'gangnam', label: '강남', keyword: '강남', city: '서울',
    area: { kind: 'gu', gu: '강남구', lat: 37.5172, lng: 127.0473 } },
  { slug: 'apgujeong', label: '압구정', keyword: '압구정', city: '서울',
    area: { kind: 'station', name: '압구정역', lat: 37.527, lng: 127.0286 } },
  { slug: 'seolleung', label: '선릉', keyword: '선릉', city: '서울',
    area: { kind: 'station', name: '선릉역', lat: 37.5045, lng: 127.049 } },
  { slug: 'jamsil', label: '잠실', keyword: '잠실', city: '서울',
    area: { kind: 'station', name: '잠실역', lat: 37.5133, lng: 127.1001 } },
  { slug: 'seongsu', label: '성수', keyword: '성수', city: '서울',
    area: { kind: 'station', name: '성수역', lat: 37.5446, lng: 127.0557 } },
  { slug: 'konkuk', label: '건대', keyword: '건대', city: '서울',
    area: { kind: 'station', name: '건대입구역', lat: 37.5404, lng: 127.0692 } },
  { slug: 'hyehwa', label: '혜화', keyword: '혜화', city: '서울',
    area: { kind: 'station', name: '혜화역', lat: 37.5822, lng: 127.0019 } },
  { slug: 'jongno', label: '종로', keyword: '종로', city: '서울',
    area: { kind: 'gu', gu: '종로구', lat: 37.5735, lng: 126.979 } },
  { slug: 'itaewon', label: '이태원', keyword: '이태원', city: '서울',
    area: { kind: 'station', name: '이태원역', lat: 37.5345, lng: 126.9946 } },
  { slug: 'mapo', label: '마포', keyword: '마포', city: '서울',
    area: { kind: 'gu', gu: '마포구', lat: 37.5663, lng: 126.9019 } },
  { slug: 'sillim', label: '신림', keyword: '신림', city: '서울',
    area: { kind: 'station', name: '신림역', lat: 37.4842, lng: 126.9297 } },
  { slug: 'sadang', label: '사당', keyword: '사당', city: '서울',
    area: { kind: 'station', name: '사당역', lat: 37.4766, lng: 126.9816 } },
  { slug: 'gangbuk', label: '강북', keyword: '강북', city: '서울',
    area: { kind: 'gu', gu: '강북구', lat: 37.6396, lng: 127.0257 } },
  { slug: 'nowon', label: '노원', keyword: '노원', city: '서울',
    area: { kind: 'gu', gu: '노원구', lat: 37.6542, lng: 127.0568 } },
  { slug: 'suwon', label: '수원', keyword: '수원', city: '경기' },
  { slug: 'incheon', label: '인천', keyword: '인천', city: '인천' },
  { slug: 'busan', label: '부산', keyword: '부산', city: '부산' },
  { slug: 'daegu', label: '대구', keyword: '대구', city: '대구' },
  { slug: 'daejeon', label: '대전', keyword: '대전', city: '대전' },
];

const BY_SLUG = new Map(REGIONS.map((r) => [r.slug, r]));

export function getRegionBySlug(slug: string): RegionMeta | undefined {
  return BY_SLUG.get(slug);
}
