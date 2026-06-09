export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      band_members: {
        Row: {
          band_id: string
          display_name: string
          id: string
          instrument: string | null
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          band_id: string
          display_name: string
          id?: string
          instrument?: string | null
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          band_id?: string
          display_name?: string
          id?: string
          instrument?: string | null
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_members_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
        ]
      }
      band_schedules: {
        Row: {
          band_id: string
          created_at: string
          created_by: string
          date: string
          end_time: string | null
          id: string
          location: string | null
          notes: string | null
          start_time: string | null
          title: string
        }
        Insert: {
          band_id: string
          created_at?: string
          created_by: string
          date: string
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title: string
        }
        Update: {
          band_id?: string
          created_at?: string
          created_by?: string
          date?: string
          end_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "band_schedules_band_id_fkey"
            columns: ["band_id"]
            isOneToOne: false
            referencedRelation: "bands"
            referencedColumns: ["id"]
          },
        ]
      }
      bands: {
        Row: {
          avatar_color: string | null
          created_at: string
          created_by: string
          description: string | null
          genre: string[] | null
          id: string
          name: string
          region: string | null
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          genre?: string[] | null
          id?: string
          name: string
          region?: string | null
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          genre?: string[] | null
          id?: string
          name?: string
          region?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          band_name: string
          contact: string
          created_at: string
          date: string
          duration: number
          id: string
          payment_method: string | null
          persons: number
          price_info: string | null
          purpose: string | null
          room_type: string | null
          status: string
          studio_address: string | null
          studio_id: string
          studio_name: string
          time: string
          total_price: number | null
          user_id: string | null
        }
        Insert: {
          band_name: string
          contact: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          payment_method?: string | null
          persons?: number
          price_info?: string | null
          purpose?: string | null
          room_type?: string | null
          status?: string
          studio_address?: string | null
          studio_id: string
          studio_name: string
          time: string
          total_price?: number | null
          user_id?: string | null
        }
        Update: {
          band_name?: string
          contact?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          payment_method?: string | null
          persons?: number
          price_info?: string | null
          purpose?: string | null
          room_type?: string | null
          status?: string
          studio_address?: string | null
          studio_id?: string
          studio_name?: string
          time?: string
          total_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string | null
          feed_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feed_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feed_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_mutual_response: {
        Row: {
          challenge_id: string
          created_at: string | null
          id: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string | null
          id?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string | null
          id?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_mutual_response_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "stem_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_pass_chain: {
        Row: {
          chain_depth: number
          challenge_id: string
          country: string
          created_at: string
          from_user_id: string
          id: string
          language: string
          to_user_id: string
        }
        Insert: {
          chain_depth?: number
          challenge_id: string
          country?: string
          created_at?: string
          from_user_id: string
          id?: string
          language?: string
          to_user_id: string
        }
        Update: {
          chain_depth?: number
          challenge_id?: string
          country?: string
          created_at?: string
          from_user_id?: string
          id?: string
          language?: string
          to_user_id?: string
        }
        Relationships: []
      }
      chat_members: {
        Row: {
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          jam_session_id: string | null
          media_url: string | null
          receiver_id: string | null
          room_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          jam_session_id?: string | null
          media_url?: string | null
          receiver_id?: string | null
          room_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          jam_session_id?: string | null
          media_url?: string | null
          receiver_id?: string | null
          room_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_jam_session_id_fkey"
            columns: ["jam_session_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          id: string
          name: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          type?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          feed_id: string
          id: string
          likes: number
          parent_id: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          feed_id: string
          id?: string
          likes?: number
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          feed_id?: string
          id?: string
          likes?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      connect_likes: {
        Row: {
          created_at: string
          from_id: string
          to_id: string
        }
        Insert: {
          created_at?: string
          from_id: string
          to_id: string
        }
        Update: {
          created_at?: string
          from_id?: string
          to_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          read_at: string | null
          receiver_id: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id: string
          sender_id: string
          sender_name?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: []
      }
      feed_likes: {
        Row: {
          created_at: string | null
          feed_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          feed_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          feed_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_likes_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedbacks: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string | null
          page_path: string | null
          rating: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name?: string | null
          page_path?: string | null
          rating?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string | null
          page_path?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      feeds: {
        Row: {
          comments: number
          comments_count: number | null
          content: string
          created_at: string | null
          genre: string | null
          id: string
          jam_session_id: string | null
          likes: number
          likes_count: number | null
          media_type: string | null
          media_url: string | null
          media_urls: string[] | null
          shares: number
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comments?: number
          comments_count?: number | null
          content: string
          created_at?: string | null
          genre?: string | null
          id?: string
          jam_session_id?: string | null
          likes?: number
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: string[] | null
          shares?: number
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comments?: number
          comments_count?: number | null
          content?: string
          created_at?: string | null
          genre?: string | null
          id?: string
          jam_session_id?: string | null
          likes?: number
          likes_count?: number | null
          media_type?: string | null
          media_url?: string | null
          media_urls?: string[] | null
          shares?: number
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feeds_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      jam_participants: {
        Row: {
          joined_at: string
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          session_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jam_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jam_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      jam_sessions: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          genre: string | null
          id: string
          instruments: string[] | null
          max_participants: number | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          genre?: string | null
          id?: string
          instruments?: string[] | null
          max_participants?: number | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          genre?: string | null
          id?: string
          instruments?: string[] | null
          max_participants?: number | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jam_sessions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          chat_room_id: string | null
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          chat_room_id?: string | null
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          chat_room_id?: string | null
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_chat_room_id_fkey"
            columns: ["chat_room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          payload: Json
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          id: string
          path: string
          visited_at: string | null
        }
        Insert: {
          id?: string
          path: string
          visited_at?: string | null
        }
        Update: {
          id?: string
          path?: string
          visited_at?: string | null
        }
        Relationships: []
      }
      partner_studios: {
        Row: {
          created_at: string | null
          id: string
          studio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          studio_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_studios_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_avatar_url: string | null
          user_emoji: string
          user_id: string
          user_name: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_avatar_url?: string | null
          user_emoji?: string
          user_id: string
          user_name?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_avatar_url?: string | null
          user_emoji?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_avatar_url: string | null
          author_emoji: string
          author_id: string | null
          author_name: string
          body: string
          category: string
          country: string
          created_at: string | null
          id: string
          is_published: boolean | null
          language: string
          tags: string[] | null
          title: string
          user_id: string | null
        }
        Insert: {
          author_avatar_url?: string | null
          author_emoji?: string
          author_id?: string | null
          author_name?: string
          body: string
          category: string
          country?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          language?: string
          tags?: string[] | null
          title: string
          user_id?: string | null
        }
        Update: {
          author_avatar_url?: string | null
          author_emoji?: string
          author_id?: string | null
          author_name?: string
          body?: string
          category?: string
          country?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          language?: string
          tags?: string[] | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          instruments: string[] | null
          location: string | null
          nickname: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id: string
          instruments?: string[] | null
          location?: string | null
          nickname?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          instruments?: string[] | null
          location?: string | null
          nickname?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      stem_projects: {
        Row: {
          bpm: number
          country: string
          created_at: string
          creator_emoji: string
          creator_id: string | null
          creator_name: string
          description: string | null
          difficulty_level: number
          featured_flag: boolean
          genre: string | null
          genre_tags: Json | null
          id: string
          is_open: boolean
          key_signature: string
          language: string
          mood_tags: Json | null
          pass_count: number
          season: string | null
          share_count: number
          title: string
        }
        Insert: {
          bpm?: number
          country?: string
          created_at?: string
          creator_emoji?: string
          creator_id?: string | null
          creator_name?: string
          description?: string | null
          difficulty_level?: number
          featured_flag?: boolean
          genre?: string | null
          genre_tags?: Json | null
          id?: string
          is_open?: boolean
          key_signature?: string
          language?: string
          mood_tags?: Json | null
          pass_count?: number
          season?: string | null
          share_count?: number
          title: string
        }
        Update: {
          bpm?: number
          country?: string
          created_at?: string
          creator_emoji?: string
          creator_id?: string | null
          creator_name?: string
          description?: string | null
          difficulty_level?: number
          featured_flag?: boolean
          genre?: string | null
          genre_tags?: Json | null
          id?: string
          is_open?: boolean
          key_signature?: string
          language?: string
          mood_tags?: Json | null
          pass_count?: number
          season?: string | null
          share_count?: number
          title?: string
        }
        Relationships: []
      }
      stem_tracks: {
        Row: {
          challenge_score: number
          country: string
          created_at: string
          difficulty_level: number
          featured_flag: boolean
          file_url: string
          genre_tags: Json | null
          id: string
          instrument: string | null
          language: string
          mood_tags: Json | null
          mutual_responses: number
          pass_count: number
          project_id: string
          season: string | null
          share_count: number
          track_order: number
          user_emoji: string
          user_id: string | null
          user_name: string
          youtube_url: string | null
        }
        Insert: {
          challenge_score?: number
          country?: string
          created_at?: string
          difficulty_level?: number
          featured_flag?: boolean
          file_url: string
          genre_tags?: Json | null
          id?: string
          instrument?: string | null
          language?: string
          mood_tags?: Json | null
          mutual_responses?: number
          pass_count?: number
          project_id: string
          season?: string | null
          share_count?: number
          track_order?: number
          user_emoji?: string
          user_id?: string | null
          user_name?: string
          youtube_url?: string | null
        }
        Update: {
          challenge_score?: number
          country?: string
          created_at?: string
          difficulty_level?: number
          featured_flag?: boolean
          file_url?: string
          genre_tags?: Json | null
          id?: string
          instrument?: string | null
          language?: string
          mood_tags?: Json | null
          mutual_responses?: number
          pass_count?: number
          project_id?: string
          season?: string | null
          share_count?: number
          track_order?: number
          user_emoji?: string
          user_id?: string | null
          user_name?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stem_tracks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "stem_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_reports: {
        Row: {
          content: string
          created_at: string | null
          id: string
          report_type: string
          reporter_contact: string | null
          reporter_name: string | null
          status: string | null
          studio_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          report_type: string
          reporter_contact?: string | null
          reporter_name?: string | null
          status?: string | null
          studio_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          report_type?: string
          reporter_contact?: string | null
          reporter_name?: string | null
          status?: string | null
          studio_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "studio_reports_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_requests: {
        Row: {
          address: string
          applicant_contact: string | null
          applicant_name: string | null
          created_at: string | null
          has_drum: boolean | null
          hours: string | null
          id: string
          kakao_channel: string | null
          name: string
          naver_place_url: string | null
          notes: string | null
          options: string | null
          phone: string | null
          price_info: string | null
          price_per_hour: number | null
          region: string | null
          room_type: string | null
          status: string | null
        }
        Insert: {
          address: string
          applicant_contact?: string | null
          applicant_name?: string | null
          created_at?: string | null
          has_drum?: boolean | null
          hours?: string | null
          id?: string
          kakao_channel?: string | null
          name: string
          naver_place_url?: string | null
          notes?: string | null
          options?: string | null
          phone?: string | null
          price_info?: string | null
          price_per_hour?: number | null
          region?: string | null
          room_type?: string | null
          status?: string | null
        }
        Update: {
          address?: string
          applicant_contact?: string | null
          applicant_name?: string | null
          created_at?: string | null
          has_drum?: boolean | null
          hours?: string | null
          id?: string
          kakao_channel?: string | null
          name?: string
          naver_place_url?: string | null
          notes?: string | null
          options?: string | null
          phone?: string | null
          price_info?: string | null
          price_per_hour?: number | null
          region?: string | null
          room_type?: string | null
          status?: string | null
        }
        Relationships: []
      }
      studio_reviews: {
        Row: {
          author: string
          body: string | null
          created_at: string
          id: string
          rating_cleanliness: number | null
          rating_gear: number | null
          rating_overall: number
          rating_soundproof: number | null
          studio_id: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          author: string
          body?: string | null
          created_at?: string
          id?: string
          rating_cleanliness?: number | null
          rating_gear?: number | null
          rating_overall: number
          rating_soundproof?: number | null
          studio_id: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          author?: string
          body?: string | null
          created_at?: string
          id?: string
          rating_cleanliness?: number | null
          rating_gear?: number | null
          rating_overall?: number
          rating_soundproof?: number | null
          studio_id?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      studios: {
        Row: {
          address: string | null
          capacity: string | null
          category: string | null
          country: string
          created_at: string | null
          data_quality_score: number | null
          has_drum: boolean | null
          hours: string | null
          id: string
          is_published: boolean | null
          kakao_channel: string | null
          language: string
          lat: number | null
          lng: number | null
          name: string
          naver_place_url: string | null
          notes: string | null
          options: string | null
          phone: string | null
          photos: string[] | null
          price_info: string | null
          price_per_hour: number | null
          rating: string | null
          region: string | null
          review_avg: number | null
          review_count: number | null
          room_type: string | null
          source: string | null
          source_url: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: string | null
          category?: string | null
          country?: string
          created_at?: string | null
          data_quality_score?: number | null
          has_drum?: boolean | null
          hours?: string | null
          id?: string
          is_published?: boolean | null
          kakao_channel?: string | null
          language?: string
          lat?: number | null
          lng?: number | null
          name: string
          naver_place_url?: string | null
          notes?: string | null
          options?: string | null
          phone?: string | null
          photos?: string[] | null
          price_info?: string | null
          price_per_hour?: number | null
          rating?: string | null
          region?: string | null
          review_avg?: number | null
          review_count?: number | null
          room_type?: string | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: string | null
          category?: string | null
          country?: string
          created_at?: string | null
          data_quality_score?: number | null
          has_drum?: boolean | null
          hours?: string | null
          id?: string
          is_published?: boolean | null
          kakao_channel?: string | null
          language?: string
          lat?: number | null
          lng?: number | null
          name?: string
          naver_place_url?: string | null
          notes?: string | null
          options?: string | null
          phone?: string | null
          photos?: string[] | null
          price_info?: string | null
          price_per_hour?: number | null
          rating?: string | null
          region?: string | null
          review_avg?: number | null
          review_count?: number | null
          room_type?: string | null
          source?: string | null
          source_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_challenge_score: {
        Row: {
          country: string
          created_at: string
          genre_scores: Json
          language: string
          response_rate: number
          total_score: number
          updated_at: string
          user_id: string
          weekly_score: number
        }
        Insert: {
          country?: string
          created_at?: string
          genre_scores?: Json
          language?: string
          response_rate?: number
          total_score?: number
          updated_at?: string
          user_id: string
          weekly_score?: number
        }
        Update: {
          country?: string
          created_at?: string
          genre_scores?: Json
          language?: string
          response_rate?: number
          total_score?: number
          updated_at?: string
          user_id?: string
          weekly_score?: number
        }
        Relationships: []
      }
      user_events: {
        Row: {
          click_type: string | null
          created_at: string
          event_type: string
          id: number
          page: string | null
          referrer: string | null
          search_query: string | null
          session_id: string | null
          studio_id: string | null
          studio_name: string | null
          user_agent: string | null
        }
        Insert: {
          click_type?: string | null
          created_at?: string
          event_type: string
          id?: number
          page?: string | null
          referrer?: string | null
          search_query?: string | null
          session_id?: string | null
          studio_id?: string | null
          studio_name?: string | null
          user_agent?: string | null
        }
        Update: {
          click_type?: string | null
          created_at?: string
          event_type?: string
          id?: number
          page?: string | null
          referrer?: string | null
          search_query?: string | null
          session_id?: string | null
          studio_id?: string | null
          studio_name?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_events_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      user_mutual_responses: {
        Row: {
          country: string
          last_project_id: string | null
          response_count: number
          updated_at: string
          user_a_id: string
          user_b_id: string
        }
        Insert: {
          country?: string
          last_project_id?: string | null
          response_count?: number
          updated_at?: string
          user_a_id: string
          user_b_id: string
        }
        Update: {
          country?: string
          last_project_id?: string | null
          response_count?: number
          updated_at?: string
          user_a_id?: string
          user_b_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mutual_responses_last_project_id_fkey"
            columns: ["last_project_id"]
            isOneToOne: false
            referencedRelation: "stem_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string
          created_at: string | null
          display_name: string | null
          genres: string[] | null
          id: string
          instruments: string[] | null
          is_public: boolean | null
          language: string
          looking_for: string | null
          purposes: string[] | null
          region: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string
          created_at?: string | null
          display_name?: string | null
          genres?: string[] | null
          id?: string
          instruments?: string[] | null
          is_public?: boolean | null
          language?: string
          looking_for?: string | null
          purposes?: string[] | null
          region?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string
          created_at?: string | null
          display_name?: string | null
          genres?: string[] | null
          id?: string
          instruments?: string[] | null
          is_public?: boolean | null
          language?: string
          looking_for?: string | null
          purposes?: string[] | null
          region?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_titles: {
        Row: {
          awarded_at: string
          country: string
          created_at: string
          id: string
          language: string
          metadata: Json | null
          season_quarter: number | null
          season_year: number
          title_key: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          country?: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json | null
          season_quarter?: number | null
          season_year: number
          title_key: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          country?: string
          created_at?: string
          id?: string
          language?: string
          metadata?: Json | null
          season_quarter?: number | null
          season_year?: number
          title_key?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_season_titles: {
        Args: {
          p_country?: string
          p_season_quarter?: number
          p_season_year: number
          p_top_n?: number
        }
        Returns: {
          awarded_user_id: string
          title_key: string
        }[]
      }
      get_my_band_ids: { Args: never; Returns: string[] }
      reset_weekly_challenge_scores: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
