export type Category = '후기' | '구인' | '자유' | '질문';

export interface Post {
  id: string;
  category: Category;
  title: string;
  body: string;
  author: string;
  authorEmoji: string;
  createdAt: string;
  tags: string[];
}

export const POSTS: Post[] = [
  {
    id: '1',
    category: '후기',
    title: '홍대 밴드하우스 후기 🎸',
    body: '어제 처음 가봤는데 방음이 진짜 최고였어요. T룸이 넓어서 5인 밴드도 여유롭게 연습 가능. 주차도 돼서 드럼 장비 들고 가기 편했습니다!',
    author: '록스타_지망생',
    authorEmoji: '🎸',
    createdAt: '2025-04-20',
    tags: ['홍대', '합주실', '추천'],
  },
  {
    id: '2',
    category: '구인',
    title: '인디팝 밴드 드러머 구해요!',
    body: '현재 3인 밴드 활동 중입니다. 장르는 인디팝/드림팝이고 매주 주말 홍대 근처에서 합주해요. 연락 주세요 🥁',
    author: '드림팝_기타',
    authorEmoji: '🎵',
    createdAt: '2025-04-19',
    tags: ['구인', '드러머', '인디팝'],
  },
  {
    id: '3',
    category: '질문',
    title: '입문자 드럼 합주실 추천해주세요',
    body: '드럼 배운 지 6개월 됐는데 처음으로 합주실 가려고 해요. 신촌/홍대 근처 입문자도 부담없이 갈 수 있는 곳 있을까요?',
    author: '드럼_초보',
    authorEmoji: '🥁',
    createdAt: '2025-04-18',
    tags: ['질문', '드럼', '입문'],
  },
  {
    id: '4',
    category: '후기',
    title: '강남 뮤직스페이스 M룸 후기',
    body: '녹음 목적으로 갔는데 방음이 엄청 좋았어요. 미디 장비도 갖춰져 있어서 좋았습니다. 가격이 좀 있지만 그 값어치는 해요.',
    author: '미디_프로듀서',
    authorEmoji: '🎹',
    createdAt: '2025-04-17',
    tags: ['강남', 'M룸', '녹음'],
  },
  {
    id: '5',
    category: '자유',
    title: '첫 공연 앞두고 긴장되는 분들께',
    body: '저도 작년에 첫 공연이 엄청 떨렸는데요. 결국 연습밖에 없더라고요 ㅎㅎ 연습실 자주 가면서 준비하시면 분명 잘 하실 거예요! 응원합니다 🎤',
    author: '무대_고수',
    authorEmoji: '🎤',
    createdAt: '2025-04-16',
    tags: ['공연', '응원', '자유'],
  },
  {
    id: '6',
    category: '구인',
    title: '재즈 세션 베이시스트/피아니스트 구인',
    body: '재즈 정기 세션 모임입니다. 매월 2~3회 합주하며 스탠다드 곡 위주로 연주해요. 중급 이상 환영합니다.',
    author: '재즈_드러머',
    authorEmoji: '🎵',
    createdAt: '2025-04-15',
    tags: ['재즈', '세션', '구인'],
  },
];
