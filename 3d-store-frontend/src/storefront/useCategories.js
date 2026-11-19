import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCategoriesApi } from '../api/categoryApi'

/**
 * Mağaza kategorileri veritabanından (/api/categories, sadece aktifler).
 * Admin panelinde eklenen/düzenlenen kategoriler burada otomatik görünür.
 *
 * Dönen ağaç:
 *   [{ _id, name, slug, icon, subs: ['Katana', …], children: [{ _id, name, … }], hint }]
 */
export const buildCategoryTree = (rows = []) => {
  const mains = rows
    .filter((c) => !c.parent)
    .map((c) => ({ ...c, children: [] }))
  const byId = new Map(mains.map((m) => [m._id, m]))

  for (const c of rows) {
    const parentId = c.parent?._id || c.parent
    if (parentId && byId.has(parentId)) byId.get(parentId).children.push(c)
  }

  const order = (a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name, 'tr')
  return mains.sort(order).map((m) => {
    const children = m.children.sort(order)
    return {
      ...m,
      children,
      subs: children.map((c) => c.name),
      // Kartlarda kısa açıklama: ilk birkaç alt kategori
      hint: children.slice(0, 3).map((c) => c.name).join(', ') + (children.length > 3 ? '…' : ''),
    }
  })
}

const useCategories = () => {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: getCategoriesApi,
    staleTime: 5 * 60 * 1000,
  })

  const categories = useMemo(() => buildCategoryTree(query.data?.data || []), [query.data])

  return { categories, isLoading: query.isLoading, isError: query.isError }
}

export default useCategories
