import { supabase } from '../config/supabase.js'
import { must } from '../utils/db.js'

/** Tek satırlık ayar tablosu; yoksa varsayılanlarla oluşturur. Ham DB satırı döner. */
export const getSettingsRow = async (columns = '*') => {
  const existing = must(
    await supabase.from('settings').select(columns).order('created_at').limit(1).maybeSingle()
  )
  if (existing) return existing
  return must(await supabase.from('settings').insert({}).select(columns).single())
}

export const getShippingConfig = async () => {
  const s = await getSettingsRow(
    'local_shipping_cost, near_shipping_cost, standard_shipping_cost, far_shipping_cost, express_shipping_surcharge'
  )
  return {
    baseCostByZone: {
      local: Number(s?.local_shipping_cost ?? 89),
      near: Number(s?.near_shipping_cost ?? 109),
      standard: Number(s?.standard_shipping_cost ?? 139),
      far: Number(s?.far_shipping_cost ?? 179),
    },
    expressSurcharge: Number(s?.express_shipping_surcharge ?? 35),
  }
}
