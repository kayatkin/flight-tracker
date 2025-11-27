// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izwtfezysnzweeftxkhk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d3RmZXp5c256d2VlZnR4a2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNzQyNTMsImV4cCI6MjA3OTc1MDI1M30.dRw-f9BSZ2p2jldeClT7Bc1G4l5-gfZQmNFSGt-Ieus';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);