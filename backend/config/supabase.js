import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL?.trim()
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!url || !serviceKey) {
  throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.')
}

// Backend tüm veriye service_role ile erişir (RLS'i bypass eder).
// Bu anahtar ASLA frontend'e verilmemeli.
export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export const SUPABASE_URL = url.replace(/\/+$/, '')
export const SUPABASE_SERVICE_ROLE_KEY = serviceKey
