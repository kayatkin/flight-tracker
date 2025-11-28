// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iptnzxnbcrxczcowjead.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwdG56eG5iY3J4Y3pjb3dqZWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODk0NDgsImV4cCI6MjA3OTg2NTQ0OH0.rKvAmtkFKCMY3j6pshDscm6uxk0CH0RQnIsCPaEZ_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);