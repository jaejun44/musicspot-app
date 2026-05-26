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
