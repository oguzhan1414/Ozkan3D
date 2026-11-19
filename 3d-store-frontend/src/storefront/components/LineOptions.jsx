import usePalette from '../usePalette'

/** Sepet/sipariş satırındaki seçimler: renk · malzeme · Boyut: 18 cm · "Ahmet" */
const LineOptions = ({ item, className = 'sf-line-opts' }) => {
  const { colorName } = usePalette()
  const parts = []
  if (item.color) {
    parts.push(
      <span key="c" className="sf-line-opt">
        <span className="sf-dot" style={{ '--dot': item.color }} aria-hidden="true" />
        {colorName(item.color)}
      </span>
    )
  }
  if (item.material) parts.push(<span key="m" className="sf-line-opt">{item.material}</span>)
  for (const o of item.options || []) {
    parts.push(<span key={`o${o.groupId}`} className="sf-line-opt">{o.group}: {o.value}</span>)
  }
  if (item.personalization?.text) {
    parts.push(
      <span key="p" className="sf-line-opt sf-line-opt--note">
        {item.personalization.label}: “{item.personalization.text}”
      </span>
    )
  }
  if (!parts.length) return null
  return <span className={className}>{parts}</span>
}

export default LineOptions
