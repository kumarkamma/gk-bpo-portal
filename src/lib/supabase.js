import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://marivqxfaxmpliodxuib.supabase.co'
const supabaseKey = 'sb_publishable_ix4DJIcJ9zhYt4MwIsU_yQ_OZIkHgEr'

export const supabase = createClient(supabaseUrl, supabaseKey)
