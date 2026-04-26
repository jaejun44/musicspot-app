export type Position = '보컬' | '기타' | '베이스' | '드럼' | '건반' | '기타(other)';

export interface Musician {
  id: string;
  name: string;
  position: Position;
  genre: string[];
  location: string;
  level: '입문' | '중급' | '고급';
  bio: string;
  lookingFor: string;
  emoji: string;
  color: string;
  avatar_url?: string;
}

export const MUSICIANS: Musician[] = [
  {
    id: '1',
    name: '김재훈',
    position: '기타',
    genre: ['록', '메탈'],
    location: '홍대',
    level: '고급',
    bio: '10년차 기타리스트. 왜곡사운드 좋아해요 🎸',
    lookingFor: '드러머, 베이시스트 구합니다',
    emoji: '🎸',
    color: '#FF3D77',
  },
  {
    id: '2',
    name: '이수진',
    position: '보컬',
    genre: ['팝', '인디'],
    location: '합정',
    level: '중급',
    bio: '감성 보컬리스트. 인디팝 밴드 찾아요 🎤',
    lookingFor: '인디팝 밴드 합류 원해요',
    emoji: '🎤',
    color: '#4FC3F7',
  },
  {
    id: '3',
    name: '박민준',
    position: '드럼',
    genre: ['재즈', '펑크'],
    location: '신촌',
    level: '고급',
    bio: '재즈 드러머. 다양한 장르 가능해요 🥁',
    lookingFor: '재즈/퓨전 밴드 구합니다',
    emoji: '🥁',
    color: '#F5FF4F',
  },
  {
    id: '4',
    name: '최지현',
    position: '건반',
    genre: ['클래식', '팝'],
    location: '강남',
    level: '고급',
    bio: '피아노 전공. 다양한 장르 편곡 가능 🎹',
    lookingFor: '어쿠스틱 밴드 합류 원해요',
    emoji: '🎹',
    color: '#41C66B',
  },
  {
    id: '5',
    name: '정우성',
    position: '베이스',
    genre: ['펑크', '록'],
    location: '건대',
    level: '중급',
    bio: '그루비한 베이스라인이 특기 🎵',
    lookingFor: '펑크/록 밴드 찾아요',
    emoji: '🎵',
    color: '#FF3D77',
  },
  {
    id: '6',
    name: '한소희',
    position: '보컬',
    genre: ['R&B', '소울'],
    location: '이태원',
    level: '고급',
    bio: 'R&B/소울 보컬. 파워풀한 고음 가능 🎶',
    lookingFor: 'R&B 밴드 또는 세션 활동',
    emoji: '🎶',
    color: '#4FC3F7',
  },
  {
    id: '7',
    name: '오동현',
    position: '기타',
    genre: ['블루스', '재즈'],
    location: '마포',
    level: '중급',
    bio: '블루스 기타 3년차. 즉흥 연주 좋아해요',
    lookingFor: '블루스/재즈 세션 파트너',
    emoji: '🎸',
    color: '#F5FF4F',
  },
  {
    id: '8',
    name: '신예린',
    position: '드럼',
    genre: ['팝', '록'],
    location: '홍대',
    level: '입문',
    bio: '드럼 배운 지 1년. 열심히 합니다! 💪',
    lookingFor: '입문자 밴드 찾아요',
    emoji: '🥁',
    color: '#41C66B',
  },
];
