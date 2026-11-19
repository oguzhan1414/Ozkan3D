// Hesabım sayfası yardımcıları

const dateTime = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
const dateOnly = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' })

export const formatDateTime = (v) => (v ? dateTime.format(new Date(v)) : '—')
export const formatDate = (v) => (v ? dateOnly.format(new Date(v)) : '—')

// Sipariş üretim adımları (gerçek sıra)
export const ORDER_STEPS = ['Bekliyor', 'Basımda', 'Hazırlanıyor', 'Kargoda', 'Teslim Edildi']

export const STATUS_INFO = {
  Bekliyor: { label: 'Sıraya alındı', text: 'Siparişin alındı, baskı sırasına eklendi.' },
  Basımda: { label: 'Basılıyor', text: 'Parçan şu an 3D yazıcıda, katman katman basılıyor.' },
  Hazırlanıyor: { label: 'Paketleniyor', text: 'Baskı bitti; kontrol edilip paketleniyor.' },
  Kargoda: { label: 'Kargoda', text: 'Paketin yolda. Takip numarasıyla izleyebilirsin.' },
  'Teslim Edildi': { label: 'Teslim edildi', text: 'Siparişin teslim edildi. Ürünü değerlendirmeyi unutma.' },
  İptal: { label: 'İptal edildi', text: 'Bu sipariş iptal edildi.' },
}

export const statusInfo = (status) =>
  STATUS_INFO[status] || { label: status || 'İşleniyor', text: 'Durum güncellemeleri burada görünür.' }

/** Sipariş kalemindeki ürün: populate edilmiş nesne ya da sadece kimlik */
export const itemProduct = (item) => (item?.product && typeof item.product === 'object' ? item.product : null)
export const itemHref = (item) => {
  const p = itemProduct(item)
  return `/product/${p?.slug || p?._id || item?.product}`
}
export const itemImage = (item) => item?.image || itemProduct(item)?.images?.[0] || ''
