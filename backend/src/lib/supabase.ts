import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../env.js';

// Node 20 não tem WebSocket global (só a partir do Node 22); o realtime-js
// usado internamente pelo supabase-js exige um, mesmo sem usarmos realtime.
if (!globalThis.WebSocket) {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

/** Cliente único do Supabase para toda a aplicação (chave service_role). */
export const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false },
});
