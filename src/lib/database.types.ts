export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      households: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'households_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          household_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'household_members_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      household_invites: {
        Row: {
          id: string
          household_id: string
          code: string
          email: string | null
          invited_by: string
          created_at: string
          expires_at: string
          accepted_at: string | null
          accepted_by: string | null
        }
        Insert: {
          id?: string
          household_id: string
          code: string
          email?: string | null
          invited_by?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          code?: string
          email?: string | null
          invited_by?: string
          created_at?: string
          expires_at?: string
          accepted_at?: string | null
          accepted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'household_invites_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invites_invited_by_fkey'
            columns: ['invited_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'household_invites_accepted_by_fkey'
            columns: ['accepted_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      books: {
        Row: {
          id: string
          created_by: string
          household_id: string | null
          title: string
          author: string | null
          isbn: string | null
          language: string | null
          shelf_location: string | null
          cover_url: string | null
          notes: string | null
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          created_by?: string
          household_id?: string | null
          title: string
          author?: string | null
          isbn?: string | null
          language?: string | null
          shelf_location?: string | null
          cover_url?: string | null
          notes?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_by?: string
          household_id?: string | null
          title?: string
          author?: string | null
          isbn?: string | null
          language?: string | null
          shelf_location?: string | null
          cover_url?: string | null
          notes?: string | null
          source?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'books_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'books_household_id_fkey'
            columns: ['household_id']
            isOneToOne: false
            referencedRelation: 'households'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      accept_invite: {
        Args: { invite_code: string }
        Returns: string
      }
    }
    Enums: Record<never, never>
  }
}
