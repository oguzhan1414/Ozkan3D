import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getColorsApi } from '../api/colorApi'

/**
 * Renk paleti (Admin'de yönetilir). Ürünler renkleri kod (#rrggbb) olarak tutar;
 * müşteriye görünen ad buradan gelir. Ayrıca varsayılan hazırlık süresini verir.
 */
const usePalette = () => {
  const query = useQuery({
    queryKey: ['colors'],
    queryFn: getColorsApi,
    staleTime: 10 * 60 * 1000,
  })

  const colors = useMemo(() => query.data?.data || [], [query.data])
  const byHex = useMemo(() => new Map(colors.map((c) => [c.hex.toLowerCase(), c.name])), [colors])
  const colorName = useCallback((hex) => byHex.get(String(hex || '').toLowerCase()) || 'Renk', [byHex])
  const leadDays = query.data?.leadDays || { min: 1, max: 6 }

  return { colors, colorName, leadDays, isLoading: query.isLoading, refetch: query.refetch }
}

/** "1–6 iş günü" / "3 iş günü" */
export const formatLeadDays = (min, max) => {
  if (min == null && max == null) return null
  if (min == null || max == null || min === max) return `${min ?? max} iş günü`
  return `${min}–${max} iş günü`
}

/** Ürünün geçerli hazırlık süresi (boşsa varsayılan) */
export const productLeadDays = (product, fallback) => ({
  min: product?.leadMinDays ?? fallback.min,
  max: product?.leadMaxDays ?? fallback.max,
})

export default usePalette
