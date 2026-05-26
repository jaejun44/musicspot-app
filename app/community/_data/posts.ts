export type Category = '후기' | '구인' | '자유' | '질문';

export interface Post {
  id: string;
  category: Category;
  title: string;
  body: string;
  author: string;
  authorEmoji: string;
  author_id?: string;
  author_avatar_url?: string;
  createdAt: string;
  tags: string[];
  likes_count?: number;
  comments_count?: number;
}

