import { useQuery } from '@tanstack/react-query'
import { getSettingsApi } from '../api/settingsApi'

// Havale / EFT bilgileri Admin > Ayarlar > Mağaza'dan yönetilir.
// Ayarlar yüklenene kadar (ya da okunamazsa) aşağıdaki değerler gösterilir.
export const BANK = {
  label: 'Garanti Bankası',
  owner: 'Özkan Şekerci',
  iban: 'TR91 0006 2000 0300 0006 1823 92',
}

/** Ödeme sayfası, sipariş sonucu ve Hesabım aynı kaynaktan okur */
export const useBank = () => {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: getSettingsApi,
    staleTime: 5 * 60 * 1000,
  })
  const s = data?.data
  return {
    label: s?.bankName || BANK.label,
    owner: s?.bankOwner || BANK.owner,
    iban: s?.bankIban || BANK.iban,
  }
}
