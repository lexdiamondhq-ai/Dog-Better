// Generated from the live Supabase schema (project zdhpwcwxbxmorfnhufhq), then hand-tightened with string unions.
// Regenerate with the Supabase MCP `generate_typescript_types` tool or `supabase gen types`, and re-apply the unions.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ReportReason = 'spam' | 'harassment' | 'animal_welfare' | 'explicit' | 'other';
export type ReportTarget = 'post' | 'comment' | 'user' | 'place';

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      dog_photos: {
        Row: { caption: string | null; created_at: string; dog_id: string; id: string; kind: 'snap' | 'vet_visit'; owner_id: string; storage_path: string };
        Insert: { caption?: string | null; created_at?: string; dog_id: string; id?: string; kind?: 'snap' | 'vet_visit'; owner_id: string; storage_path: string };
        Update: { caption?: string | null; created_at?: string; dog_id?: string; id?: string; kind?: 'snap' | 'vet_visit'; owner_id?: string; storage_path?: string };
        Relationships: [
          { foreignKeyName: 'dog_photos_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      dogs: {
        Row: {
          allergies: string[];
          avatar_url: string | null;
          birthdate: string | null;
          breed: string | null;
          created_at: string;
          id: string;
          microchip: string | null;
          name: string;
          notes: string | null;
          owner_id: string;
          sex: string | null;
          vet_name: string | null;
          vet_phone: string | null;
          weight_kg: number | null;
        };
        Insert: {
          allergies?: string[];
          avatar_url?: string | null;
          birthdate?: string | null;
          breed?: string | null;
          created_at?: string;
          id?: string;
          microchip?: string | null;
          name: string;
          notes?: string | null;
          owner_id: string;
          sex?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          weight_kg?: number | null;
        };
        Update: {
          allergies?: string[];
          avatar_url?: string | null;
          birthdate?: string | null;
          breed?: string | null;
          created_at?: string;
          id?: string;
          microchip?: string | null;
          name?: string;
          notes?: string | null;
          owner_id?: string;
          sex?: string | null;
          vet_name?: string | null;
          vet_phone?: string | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      food_scans: {
        Row: {
          barcode: string | null;
          brand: string | null;
          created_at: string;
          dog_id: string;
          flagged: Json;
          id: string;
          owner_id: string;
          product_name: string | null;
          verdict: string;
        };
        Insert: {
          barcode?: string | null;
          brand?: string | null;
          created_at?: string;
          dog_id: string;
          flagged?: Json;
          id?: string;
          owner_id: string;
          product_name?: string | null;
          verdict: string;
        };
        Update: {
          barcode?: string | null;
          brand?: string | null;
          created_at?: string;
          dog_id?: string;
          flagged?: Json;
          id?: string;
          owner_id?: string;
          product_name?: string | null;
          verdict?: string;
        };
        Relationships: [
          { foreignKeyName: 'food_scans_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      health_logs: {
        Row: {
          created_at: string;
          dog_id: string;
          duration: string | null;
          guidance: string | null;
          id: string;
          notes: string | null;
          owner_id: string;
          severity: number;
          symptoms: string[];
          triage: string;
        };
        Insert: {
          created_at?: string;
          dog_id: string;
          duration?: string | null;
          guidance?: string | null;
          id?: string;
          notes?: string | null;
          owner_id: string;
          severity: number;
          symptoms: string[];
          triage: string;
        };
        Update: {
          created_at?: string;
          dog_id?: string;
          duration?: string | null;
          guidance?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string;
          severity?: number;
          symptoms?: string[];
          triage?: string;
        };
        Relationships: [
          { foreignKeyName: 'health_logs_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      meals: {
        Row: { calories: number | null; dog_id: string; id: string; kind: string; label: string | null; logged_at: string; owner_id: string };
        Insert: { calories?: number | null; dog_id: string; id?: string; kind: string; label?: string | null; logged_at?: string; owner_id: string };
        Update: { calories?: number | null; dog_id?: string; id?: string; kind?: string; label?: string | null; logged_at?: string; owner_id?: string };
        Relationships: [
          { foreignKeyName: 'meals_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      place_pulses: {
        Row: {
          created_at: string;
          crowd: string;
          ground: string;
          id: string;
          note: string | null;
          place_id: string;
          shade: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          crowd: string;
          ground: string;
          id?: string;
          note?: string | null;
          place_id: string;
          shade?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          crowd?: string;
          ground?: string;
          id?: string;
          note?: string | null;
          place_id?: string;
          shade?: boolean;
          user_id?: string;
        };
        Relationships: [
          { foreignKeyName: 'place_pulses_place_id_fkey'; columns: ['place_id']; isOneToOne: false; referencedRelation: 'places'; referencedColumns: ['id'] },
        ];
      };
      places: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          lat: number;
          lng: number;
          name: string;
          osm_id: number | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          lat: number;
          lng: number;
          name: string;
          osm_id?: number | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          lat?: number;
          lng?: number;
          name?: string;
          osm_id?: number | null;
        };
        Relationships: [];
      };
      post_comments: {
        Row: { author_id: string; body: string; created_at: string; id: string; post_id: string };
        Insert: { author_id: string; body: string; created_at?: string; id?: string; post_id: string };
        Update: { author_id?: string; body?: string; created_at?: string; id?: string; post_id?: string };
        Relationships: [
          { foreignKeyName: 'post_comments_post_id_fkey'; columns: ['post_id']; isOneToOne: false; referencedRelation: 'posts'; referencedColumns: ['id'] },
        ];
      };
      post_likes: {
        Row: { created_at: string; post_id: string; user_id: string };
        Insert: { created_at?: string; post_id: string; user_id: string };
        Update: { created_at?: string; post_id?: string; user_id?: string };
        Relationships: [
          { foreignKeyName: 'post_likes_post_id_fkey'; columns: ['post_id']; isOneToOne: false; referencedRelation: 'posts'; referencedColumns: ['id'] },
        ];
      };
      circles: {
        Row: { created_at: string; id: string; invite_code: string; kind: 'nearby' | 'contacts' | 'custom'; name: string; owner_id: string };
        Insert: { created_at?: string; id?: string; invite_code: string; kind: 'nearby' | 'contacts' | 'custom'; name: string; owner_id: string };
        Update: { created_at?: string; id?: string; invite_code?: string; kind?: 'nearby' | 'contacts' | 'custom'; name?: string; owner_id?: string };
        Relationships: [];
      };
      circle_members: {
        Row: { circle_id: string; joined_at: string; user_id: string };
        Insert: { circle_id: string; joined_at?: string; user_id: string };
        Update: { circle_id?: string; joined_at?: string; user_id?: string };
        Relationships: [{ foreignKeyName: 'circle_members_circle_id_fkey'; columns: ['circle_id']; isOneToOne: false; referencedRelation: 'circles'; referencedColumns: ['id'] }];
      };
      posts: {
        Row: { author_id: string; caption: string | null; circle_id: string | null; created_at: string; dog_id: string | null; id: string; image_path: string | null; kind: 'photo' | 'video' };
        Insert: { author_id: string; caption?: string | null; circle_id?: string | null; created_at?: string; dog_id?: string | null; id?: string; image_path?: string | null; kind?: 'photo' | 'video' };
        Update: { author_id?: string; caption?: string | null; circle_id?: string | null; created_at?: string; dog_id?: string | null; id?: string; image_path?: string | null; kind?: 'photo' | 'video' };
        Relationships: [
          { foreignKeyName: 'posts_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      walks: {
        Row: { created_at: string; dog_id: string; ended_at: string; id: string; notes: string | null; owner_id: string; started_at: string; steps: number };
        Insert: { created_at?: string; dog_id: string; ended_at: string; id?: string; notes?: string | null; owner_id: string; started_at: string; steps: number };
        Update: { created_at?: string; dog_id?: string; ended_at?: string; id?: string; notes?: string | null; owner_id?: string; started_at?: string; steps?: number };
        Relationships: [
          { foreignKeyName: 'walks_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: { avatar_url: string | null; created_at: string; display_name: string | null; id: string; premium_until: string | null; rc_app_user_id: string | null };
        Insert: { avatar_url?: string | null; created_at?: string; display_name?: string | null; id: string; premium_until?: string | null; rc_app_user_id?: string | null };
        Update: { avatar_url?: string | null; created_at?: string; display_name?: string | null; id?: string; premium_until?: string | null; rc_app_user_id?: string | null };
        Relationships: [];
      };
      blocked_users: {
        Row: { blocked_id: string; blocker_id: string; created_at: string };
        Insert: { blocked_id: string; blocker_id: string; created_at?: string };
        Update: { blocked_id?: string; blocker_id?: string; created_at?: string };
        Relationships: [];
      };
      reports: {
        Row: { created_at: string; details: string | null; id: string; reason: ReportReason; reporter_id: string; status: 'open' | 'reviewed' | 'actioned'; target_id: string; target_kind: ReportTarget };
        Insert: { created_at?: string; details?: string | null; id?: string; reason: ReportReason; reporter_id: string; status?: 'open' | 'reviewed' | 'actioned'; target_id: string; target_kind: ReportTarget };
        Update: { created_at?: string; details?: string | null; id?: string; reason?: ReportReason; reporter_id?: string; status?: 'open' | 'reviewed' | 'actioned'; target_id?: string; target_kind?: ReportTarget };
        Relationships: [];
      };
      ai_daily_uses: {
        Row: { count: number; day: string; kind: string; user_id: string };
        Insert: { count?: number; day: string; kind: string; user_id: string };
        Update: { count?: number; day?: string; kind?: string; user_id?: string };
        Relationships: [];
      };
      analytics_events: {
        Row: { app_version: string | null; created_at: string; id: number; name: string; platform: string | null; props: Json; user_id: string | null };
        Insert: { app_version?: string | null; created_at?: string; id?: never; name: string; platform?: string | null; props?: Json; user_id?: string | null };
        Update: { app_version?: string | null; created_at?: string; id?: never; name?: string; platform?: string | null; props?: Json; user_id?: string | null };
        Relationships: [];
      };
      weight_entries: {
        Row: { dog_id: string; id: string; owner_id: string; recorded_at: string; weight_kg: number };
        Insert: { dog_id: string; id?: string; owner_id: string; recorded_at?: string; weight_kg: number };
        Update: { dog_id?: string; id?: string; owner_id?: string; recorded_at?: string; weight_kg?: number };
        Relationships: [
          { foreignKeyName: 'weight_entries_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_blocked_either_way: { Args: { other: string }; Returns: boolean };
      is_circle_member: { Args: { cid: string }; Returns: boolean };
      owns_circle: { Args: { cid: string }; Returns: boolean };
      join_circle: { Args: { code: string }; Returns: string };
      create_circle: {
        Args: { p_name: string; p_kind?: 'nearby' | 'contacts' | 'custom' };
        Returns: { created_at: string; id: string; invite_code: string; kind: 'nearby' | 'contacts' | 'custom'; name: string; owner_id: string };
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update'];

export type Dog = Tables<'dogs'>;
export type Profile = Tables<'profiles'>;
export type HealthLog = Tables<'health_logs'>;
export type FoodScan = Tables<'food_scans'>;
export type Meal = Tables<'meals'>;
export type DogPhoto = Tables<'dog_photos'>;
export type Place = Tables<'places'>;
export type PlacePulse = Tables<'place_pulses'>;
export type WeightEntry = Tables<'weight_entries'>;
export type Post = Tables<'posts'>;
export type PostComment = Tables<'post_comments'>;
export type Circle = Tables<'circles'>;
export type CircleMember = Tables<'circle_members'>;
export type Walk = Tables<'walks'>;
export type Report = Tables<'reports'>;
export type BlockedUser = Tables<'blocked_users'>;
