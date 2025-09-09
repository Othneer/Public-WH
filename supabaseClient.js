import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';

const supabaseUrl = 'https://zsckapojwxmcusongpcn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzY2thcG9qd3htY3Vzb25ncGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4OTQwMTEsImV4cCI6MjA3MjQ3MDAxMX0.kikaKO8JcgEekB1OcVOZHWFZ_S_SjZlrNPbtHsAMVio';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
