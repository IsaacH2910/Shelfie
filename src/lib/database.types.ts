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
          category_labels: string[]
          shelf_locations: string[]
          collection_labels: string[]
          shelf_capacities: Json
          onboarding_completed: boolean
          yearly_reading_goal: number | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          category_labels?: string[]
          shelf_locations?: string[]
          collection_labels?: string[]
          shelf_capacities?: Json
          onboarding_completed?: boolean
          yearly_reading_goal?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          category_labels?: string[]
          shelf_locations?: string[]
          collection_labels?: string[]
          shelf_capacities?: Json
          onboarding_completed?: boolean
          yearly_reading_goal?: number | null
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
          categories: string[]
          cover_url: string | null
          notes: string | null
          source: string
          reading_status: string
          rating: number | null
          page_count: number | null
          current_page: number | null
          reading_started_at: string | null
          reading_finished_at: string | null
          ownership: string
          is_favorite: boolean
          collections: string[]
          series: string | null
          publisher: string | null
          published_year: number | null
          review: string | null
          last_opened_at: string | null
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
          categories?: string[]
          cover_url?: string | null
          notes?: string | null
          source?: string
          reading_status?: string
          rating?: number | null
          page_count?: number | null
          current_page?: number | null
          reading_started_at?: string | null
          reading_finished_at?: string | null
          ownership?: string
          is_favorite?: boolean
          collections?: string[]
          series?: string | null
          publisher?: string | null
          published_year?: number | null
          review?: string | null
          last_opened_at?: string | null
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
          categories?: string[]
          cover_url?: string | null
          notes?: string | null
          source?: string
          reading_status?: string
          rating?: number | null
          page_count?: number | null
          current_page?: number | null
          reading_started_at?: string | null
          reading_finished_at?: string | null
          ownership?: string
          is_favorite?: boolean
          collections?: string[]
          series?: string | null
          publisher?: string | null
          published_year?: number | null
          review?: string | null
          last_opened_at?: string | null
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
      book_annotations: {
        Row: {
          id: string
          book_id: string
          created_by: string
          kind: string
          content: string
          page: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          book_id: string
          created_by?: string
          kind: string
          content?: string
          page?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          created_by?: string
          kind?: string
          content?: string
          page?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'book_annotations_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
            referencedColumns: ['id']
          },
        ]
      }
      loans: {
        Row: {
          id: string
          book_id: string
          created_by: string
          borrower_name: string
          loaned_at: string
          due_at: string | null
          returned_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          created_by?: string
          borrower_name: string
          loaned_at?: string
          due_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          created_by?: string
          borrower_name?: string
          loaned_at?: string
          due_at?: string | null
          returned_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'loans_book_id_fkey'
            columns: ['book_id']
            isOneToOne: false
            referencedRelation: 'books'
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
