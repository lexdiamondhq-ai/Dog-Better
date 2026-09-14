// Generated from the live Supabase schema (project zdhpwcwxbxmorfnhufhq).
// Regenerate with the Supabase MCP `generate_typescript_types` tool or `supabase gen types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      bark_sessions: {
        Row: {
          confidence: number;
          created_at: string;
          dog_id: string;
          duration_ms: number;
          features: Json;
          id: string;
          mood: string;
          owner_id: string;
        };
        Insert: {
          confidence: number;
          created_at?: string;
          dog_id: string;
          duration_ms: number;
          features?: Json;
          id?: string;
          mood: string;
          owner_id: string;
        };
        Update: {
          confidence?: number;
          created_at?: string;
          dog_id?: string;
          duration_ms?: number;
          features?: Json;
          id?: string;
          mood?: string;
          owner_id?: string;
        };
        Relationships: [
          { foreignKeyName: 'bark_sessions_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      dog_photos: {
        Row: { caption: string | null; created_at: string; dog_id: string; id: string; owner_id: string; storage_path: string };
        Insert: { caption?: string | null; created_at?: string; dog_id: string; id?: string; owner_id: string; storage_path: string };
        Update: { caption?: string | null; created_at?: string; dog_id?: string; id?: string; owner_id?: string; storage_path?: string };
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
      posts: {
        Row: { author_id: string; caption: string | null; created_at: string; dog_id: string | null; id: string; image_path: string | null };
        Insert: { author_id: string; caption?: string | null; created_at?: string; dog_id?: string | null; id?: string; image_path?: string | null };
        Update: { author_id?: string; caption?: string | null; created_at?: string; dog_id?: string | null; id?: string; image_path?: string | null };
        Relationships: [
          { foreignKeyName: 'posts_dog_id_fkey'; columns: ['dog_id']; isOneToOne: false; referencedRelation: 'dogs'; referencedColumns: ['id'] },
        ];
      };
      profiles: {
        Row: { avatar_url: string | null; created_at: string; display_name: string | null; id: string };
        Insert: { avatar_url?: string | null; created_at?: string; display_name?: string | null; id: string };
        Update: { avatar_url?: string | null; created_at?: string; display_name?: string | null; id?: string };
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
    Functions: { [_ in never]: never };
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
export type BarkSession = Tables<'bark_sessions'>;
export type FoodScan = Tables<'food_scans'>;
export type Meal = Tables<'meals'>;
export type DogPhoto = Tables<'dog_photos'>;
export type Place = Tables<'places'>;
export type PlacePulse = Tables<'place_pulses'>;
export type Post = Tables<'posts'>;
export type PostComment = Tables<'post_comments'>;
export type WeightEntry = Tables<'weight_entries'>;
