import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://imankmcckcociturljfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImltYW5rbWNja2NvY2l0dXJsamZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NTQ3MTMsImV4cCI6MjA4MDUzMDcxM30.2b-wFJrbtpp-cE-mkCu-Hnf_n6LHB2mcSvg7x3e-CZY';

export const supabase = createClient(supabaseUrl, supabaseKey);