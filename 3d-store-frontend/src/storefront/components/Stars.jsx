// Puan gösterimi: "★ 4,8 (12)". compact modda tek yıldız + sayı.
const fmt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const Star = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
    <path
      fill="currentColor"
      d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
    />
  </svg>
)

const Stars = ({ value = 0, count = 0, compact = false, size = 12 }) => {
  const label = `5 üzerinden ${fmt.format(value || 0)} puan, ${count} değerlendirme`
  return (
    <span
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 14, whiteSpace: 'nowrap', flex: 'none' }}
    >
      <Star size={size} />
      <span aria-hidden="true">{fmt.format(value || 0)}</span>
      {!compact && <span aria-hidden="true" style={{ color: 'var(--sf-muted)' }}>({count})</span>}
      {compact && count > 0 && <span aria-hidden="true" style={{ color: 'var(--sf-muted)' }}>({count})</span>}
    </span>
  )
}

export { Star }
export default Stars
