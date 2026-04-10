const LOCAL_CITY = 'BOLU'

const NEAR_CITIES = new Set([
  'DUZCE', 'SAKARYA', 'KOCAELI', 'ANKARA', 'ESKISEHIR',
  'BILECIK', 'ZONGULDAK', 'KARABUK', 'BARTIN', 'CANKIRI',
  'KASTAMONU',
])

const MIDDLE_CITIES = new Set([
  'ISTANBUL', 'YALOVA', 'BURSA', 'BALIKESIR', 'CANAKKALE',
  'TEKIRDAG', 'EDIRNE', 'KIRKLARELI', 'IZMIR', 'MANISA',
  'AYDIN', 'DENIZLI', 'MUGLA', 'ANTALYA', 'ISPARTA',
  'BURDUR', 'AFYONKARAHISAR', 'KUTAHYA', 'USAK', 'KONYA',
  'KIRSEHIR', 'AKSARAY', 'NIGDE', 'KAYSERI', 'YOZGAT',
  'TOKAT', 'CORUM', 'AMASYA', 'SINOP', 'SAMSUN',
  'ORDU', 'NEVSEHIR', 'KARAMAN', 'MERSIN', 'ADANA',
  'OSMANIYE', 'HATAY', 'KAHRAMANMARAS',
])

const FAR_CITIES = new Set([
  'SIVAS',
  'VAN', 'HAKKARI', 'SIRNAK', 'MARDIN', 'SIIRT', 'BATMAN',
  'BITLIS', 'AGRI', 'KARS', 'ARDAHAN', 'IGDIR', 'MUS',
  'BINGOL', 'TUNCELI', 'ELAZIG', 'DIYARBAKIR', 'SANLIURFA',
  'GAZIANTEP', 'KILIS', 'ADIYAMAN', 'MALATYA', 'ERZURUM',
  'ERZINCAN', 'BAYBURT', 'GUMUSHANE', 'TRABZON', 'RIZE',
  'ARTVIN', 'GIRESUN',
])

const CITY_ALIASES = {
  'ICEL': 'MERSIN',
}

const DEFAULT_BASE_COST_BY_ZONE = {
  local: 0,
  near: 109,
  standard: 139,
  far: 179,
}

const ETA_BY_ZONE = {
  local: 'Ayni gun / 1 is gunu',
  near: '1-2 is gunu',
  standard: '2-4 is gunu',
  far: '3-6 is gunu',
}

const DEFAULT_EXPRESS_SURCHARGE = 35
const BULKY_NAME_KEYWORDS = [
  'EJDERHA', 'KATANA', 'KASK', 'HELMET', 'HEYKEL',
  'BUST', 'VAZO', 'ORGANIZER', 'STAND', 'DUZENLEYICI',
]

const normalizeText = (value = '') => {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ğ/g, 'G')
    .replace(/Ü/g, 'U')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C')
}

const normalizeCity = (value = '') => {
  const normalized = normalizeText(value)
  const cityPart = normalized.includes('/') ? normalized.split('/')[0] : normalized

  const cleaned = cityPart
    .replace(/\bILI\b/g, '')
    .replace(/\bMERKEZ\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return CITY_ALIASES[cleaned] || cleaned
}

const getZoneByCity = (city) => {
  const cityNorm = normalizeCity(city)

  if (cityNorm === LOCAL_CITY) return 'local'
  if (NEAR_CITIES.has(cityNorm)) return 'near'
  if (FAR_CITIES.has(cityNorm)) return 'far'
  if (MIDDLE_CITIES.has(cityNorm)) return 'standard'

  return 'standard'
}

const getMaterialFactor = (material) => {
  const mat = normalizeText(material)

  if (!mat) return 1
  if (mat.includes('RESIN') || mat.includes('RECINE')) return 1.35
  if (mat.includes('ABS') || mat.includes('PETG') || mat.includes('ASA')) return 1.2
  return 1
}

const hasBulkyKeyword = (name) => {
  const nameNorm = normalizeText(name)
  return BULKY_NAME_KEYWORDS.some((keyword) => nameNorm.includes(keyword))
}

const calculateVolumeMetrics = (items = []) => {
  let totalVolumeUnits = 0
  let hasResinProduct = false

  for (const item of items) {
    const quantity = Math.max(1, Number(item.quantity) || 1)
    const materialFactor = getMaterialFactor(item.material)
    const bulkyFactor = hasBulkyKeyword(item.name) ? 0.35 : 0

    if (materialFactor >= 1.35) hasResinProduct = true

    totalVolumeUnits += quantity * (materialFactor + bulkyFactor)
  }

  const roundedUnits = Number(totalVolumeUnits.toFixed(2))
  const volumeSurcharge = Math.max(0, Math.ceil(Math.max(0, roundedUnits - 2)) * 18)
  const protectiveSurcharge = hasResinProduct ? 20 : 0

  return {
    volumeUnits: roundedUnits,
    volumeSurcharge,
    protectiveSurcharge,
  }
}

export const calculateShippingQuote = ({
  items = [],
  shippingAddress = {},
  shippingMethod = 'standard',
} = {}, shippingConfig = {}) => {
  const baseCostByZone = {
    ...DEFAULT_BASE_COST_BY_ZONE,
    ...(shippingConfig.baseCostByZone || {}),
  }
  const expressSurcharge = Number.isFinite(Number(shippingConfig.expressSurcharge))
    ? Number(shippingConfig.expressSurcharge)
    : DEFAULT_EXPRESS_SURCHARGE

  const city = shippingAddress.city || ''
  const cityNorm = normalizeCity(city)
  const zone = getZoneByCity(cityNorm)

  const baseCost = baseCostByZone[zone]
  const { volumeUnits, volumeSurcharge, protectiveSurcharge } = calculateVolumeMetrics(items)

  const standardCost = baseCost + volumeSurcharge + protectiveSurcharge
  const expressCost = standardCost + expressSurcharge

  const selectedMethod = shippingMethod === 'express' ? 'express' : 'standard'
  const methodSurcharge = selectedMethod === 'express' ? expressSurcharge : 0

  const zoneLabel = zone === 'near'
    ? 'Yakin bolge'
    : zone === 'far'
      ? 'Uzak bolge'
      : 'Orta bolge'

  return {
    city: cityNorm,
    zone,
    zoneLabel,
    eta: ETA_BY_ZONE[zone],
    shippingMethod: selectedMethod,
    baseCost,
    volumeSurcharge,
    protectiveSurcharge,
    methodSurcharge,
    costByMethod: {
      standard: standardCost,
      express: expressCost,
    },
    totalCost: selectedMethod === 'express' ? expressCost : standardCost,
    volumeUnits,
    policyNote: 'Anlasmasiz donemde kargo ucreti sehir, hacim (desi benzeri) ve urun koruma ihtiyacina gore daha yuksek tarifeden hesaplanir.',
    policyVersion: 'shipping-v2',
  }
}
