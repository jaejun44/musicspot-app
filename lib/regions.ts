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
}

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
  { slug: 'hongdae', label: '홍대', keyword: '홍대', city: '서울' },
  { slug: 'hapjeong', label: '합정', keyword: '합정', city: '서울' },
  { slug: 'yeonnam', label: '연남', keyword: '연남', city: '서울' },
  { slug: 'mangwon', label: '망원', keyword: '망원', city: '서울' },
  { slug: 'sangsu', label: '상수', keyword: '상수', city: '서울' },
  { slug: 'sinchon', label: '신촌', keyword: '신촌', city: '서울' },
  { slug: 'gangnam', label: '강남', keyword: '강남', city: '서울' },
  { slug: 'apgujeong', label: '압구정', keyword: '압구정', city: '서울' },
  { slug: 'seolleung', label: '선릉', keyword: '선릉', city: '서울' },
  { slug: 'jamsil', label: '잠실', keyword: '잠실', city: '서울' },
  { slug: 'seongsu', label: '성수', keyword: '성수', city: '서울' },
  { slug: 'konkuk', label: '건대', keyword: '건대', city: '서울' },
  { slug: 'hyehwa', label: '혜화', keyword: '혜화', city: '서울' },
  { slug: 'jongno', label: '종로', keyword: '종로', city: '서울' },
  { slug: 'itaewon', label: '이태원', keyword: '이태원', city: '서울' },
  { slug: 'mapo', label: '마포', keyword: '마포', city: '서울' },
  { slug: 'sillim', label: '신림', keyword: '신림', city: '서울' },
  { slug: 'sadang', label: '사당', keyword: '사당', city: '서울' },
  { slug: 'gangbuk', label: '강북', keyword: '강북', city: '서울' },
  { slug: 'nowon', label: '노원', keyword: '노원', city: '서울' },
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
