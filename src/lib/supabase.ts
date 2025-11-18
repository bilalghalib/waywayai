/**
 * Supabase Client Configuration
 *
 * Real-time database and authentication
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Real-time channel for game rooms
 */
export function createGameChannel(roomCode: string) {
  return supabase.channel(`game:${roomCode}`);
}
