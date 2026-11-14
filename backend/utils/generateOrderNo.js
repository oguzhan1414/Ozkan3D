import { supabase } from '../config/supabase.js'
import { must } from './db.js'

// OZ + YYMMDD + günlük sıra (ör. OZ261114001). Sayaç Postgres'te atomik tutulur.
export const generateOrderNo = async () => must(await supabase.rpc('next_order_no'))
