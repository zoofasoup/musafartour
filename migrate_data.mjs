import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://gmcbpcazyeaulwlmgmot.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY2JwY2F6eWVhdWx3bG1nbW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NzQ5NDQsImV4cCI6MjA3NzA1MDk0NH0.e9Cew8ZGIE0Bb2QBm6NB0NlG3AFVW18KT8mAurYmyeo';
const oldDb = createClient(oldUrl, oldKey);

const newUrl = 'https://lcpjuaxiwbdzdozitwzi.supabase.co';
const newKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcGp1YXhpd2JkemRveml0d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDM4NDUsImV4cCI6MjA5OTY3OTg0NX0.vj42rEICtLaREhNm1f2HfgNKbfZonV46ZTrf5lvDFvA';
// We need SERVICE_ROLE_KEY to bypass RLS on inserts into the new DB.
// Wait, do we have the service role key for the new DB?
// I can get it using supabase cli!
