import { useState } from 'react'
import SEO from '../../components/SEO'
import examplesImage from '../../images/custom-print-examples.webp'
import {
  ServiceCinema, QuickPicks, FactorList, ServiceSection, RequestForm, Faq, CrossLink, scrollToId,
} from '../components/service/ServiceKit'
import '../storefront.css'
import './CustomPrintPage.css'

const WA_TEXT = 'Merhaba, özel 3D baskı için teklif almak istiyorum.'
const FORM_ID = 'teklif'

const INITIAL = { idea: '', size: '', quantity: '1', material: '', link: '' }

const EXAMPLES = [
  {
    title: 'Kişiye özel hediye',
    text: 'İsimlik, anahtarlık, plaket. İsim, yazı ve renkleri sen seçersin.',
    media: <img src={examplesImage} alt="" className="cp-crop is-center" loading="lazy" />,
    prefill: { idea: 'İsme özel bir masa isimliği yaptırmak istiyorum. Yazı: … Renk: …' },
  },
  {
    title: 'Ölçüye özel aparat',
    text: 'Telefon standı, tutucu, kırılan bir parçanın yenisi. Ölçünü ver, ona göre basalım.',
    media: <img src={examplesImage} alt="" className="cp-crop is-left" loading="lazy" />,
    prefill: { idea: 'Masam için bir telefon standı istiyorum.', size: 'Yaklaşık 12 cm yükseklik' },
  },
  {
    title: 'Prototip ve yedek parça',
    text: 'Tasarladığın bir parçanın ilk örneği ya da piyasada bulunmayan küçük bir parça.',
    media: <img src={examplesImage} alt="" className="cp-crop is-right" loading="lazy" />,
    prefill: { idea: 'Bir bağlantı parçası bastırmak istiyorum. Nerede kullanılacak: …' },
  },
]


const FACTORS = [
  ['Boyut ve ağırlık', 'Parça büyüdükçe kullanılan malzeme ve baskı süresi artar. Fiyatı en çok etkileyen şey budur.'],
  ['Malzeme', 'PLA en ekonomik seçenektir ve çoğu dekor ve aparat için yeterlidir. Isıya ve darbeye dayanıklılık gerekirse PETG, esneklik gerekirse TPU kullanılır.'],
  ['Dayanım ihtiyacı', 'Taşıyıcı ya da sık kullanılacak parçalar daha yoğun basılır. Bu da süreyi ve malzemeyi artırır.'],
  ['Adet', 'Aynı parçadan birden fazla basılınca hazırlık bir kez yapıldığı için birim fiyat genelde düşer.'],
  ['Model hazırlığı', 'Hazır bir 3D model dosyan varsa doğrudan baskıya geçeriz. Model yoksa ya da ölçüye göre değişiklik gerekiyorsa modelleme ücreti eklenir.'],
]

const FAQ = [
  ['3D model dosyam yok, yine de olur mu?', 'Olur. Ne istediğini anlat, varsa fotoğraf ya da çizim gönder. Hazır bir model bulabiliriz ya da modelleme gerekiyorsa teklife ekleriz.'],
  ['Hangi dosya formatlarını kabul ediyorsunuz?', 'STL, OBJ ve 3MF. Dosyanı WhatsApp ya da e-postayla gönder; form üzerinden dosya eklenemiyor. İnternette bulduğun bir modelin bağlantısını formdaki alana yapıştırabilirsin.'],
  ['Tek bir parça bastırabilir miyim?', 'Evet, tek parça için de teklif veriyoruz.'],
  ['Ne kadar sürede elime ulaşır?', 'Parçanın boyutuna, adedine ve sıradaki işlere göre değişir. Teklifte hazırlanma süresini yazarız; kargo süresi de şehrine göre 1–6 iş günüdür.'],
  ['İnternette bulduğum bir modeli bastırabilir miyim?', 'Modelin lisansı ticari üretime izin veriyorsa evet. Bağlantıyı gönder, lisansına birlikte bakalım.'],
]

const buildMessage = (v) => [
  `Ne istiyor: ${v.idea.trim()}`,
  `Yaklaşık ölçü: ${v.size.trim() || 'Belirtilmedi'}`,
  `Adet: ${v.quantity || 1}`,
  `Malzeme: ${v.material || 'Emin değil, öneri bekliyor'}`,
  v.link.trim() ? `Model / referans bağlantısı: ${v.link.trim()}` : '',
].filter(Boolean).join('\n')

const CustomPrintPage = () => {
  const [values, setValues] = useState(INITIAL)
  const change = (name, value) => setValues((v) => ({ ...v, [name]: value }))

  const pickExample = (prefill) => {
    setValues({ ...INITIAL, ...prefill })
    scrollToId(FORM_ID)
    window.setTimeout(() => document.querySelector(`#${FORM_ID} textarea`)?.focus({ preventScroll: true }), 350)
  }

  return (
    <div className="sf-root sf-page sv-page">
      <SEO
        title="Özel 3D Baskı"
        description="Aklındaki parçayı 3D yazıcıyla basalım. STL, OBJ, 3MF dosyanı gönder ya da ne istediğini anlat; PLA, PETG ve TPU ile tek parçadan seri üretime teklif al."
        url="/custom"
      />
      <ServiceCinema
        kicker="Özel 3D baskı"
        title="Aklındaki parçayı basalım."
        lead="3D model dosyan varsa gönder, yoksa ne istediğini anlat. Ölçüyü, malzemeyi ve fiyatı yazılı teklifle iletelim, onaylarsan basalım."
        primaryLabel="Teklif iste"
        onPrimary={() => scrollToId(FORM_ID)}
        whatsappText={WA_TEXT}
        facts={[
          ['Dosya', 'STL · OBJ · 3MF ya da sadece bir fikir'],
          ['Malzeme', 'PLA · PETG · TPU'],
          ['Adet', 'Tek parçadan itibaren'],
        ]}
        film="print"
      />
      <div className="sf-container">
        <RequestForm
          id={FORM_ID}
          aside={(
            <>
              <QuickPicks items={EXAMPLES} onPick={pickExample} />
              <FactorList rows={FACTORS} note="Teklif istemek ücretsizdir ve seni hiçbir şeye bağlamaz." />
            </>
          )}
          title="Teklif iste"
          lead="Ne istediğini kendi cümlelerinle yaz. Teknik terim bilmen gerekmiyor; eksik bir şey olursa biz sorarız."
          subject="Özel 3D Baskı Talebi"
          whatsappText={WA_TEXT}
          values={values}
          onChange={change}
          buildMessage={buildMessage}
          submitLabel="Teklif talebini gönder"
          successTitle="Talebin bize ulaştı."
          fields={[
            {
              name: 'idea', label: 'Ne bastırmak istiyorsun?', type: 'textarea', required: true, wide: true, rows: 5,
              requiredMessage: 'Ne istediğini kısaca anlat.',
              placeholder: 'Örn. Masam için mercan renkli bir telefon standı. Telefon kalın kılıflı.',
            },
            { name: 'size', label: 'Yaklaşık ölçü', placeholder: 'Örn. 12 cm yükseklik' },
            { name: 'quantity', label: 'Adet', type: 'number' },
            { name: 'material', label: 'Malzeme', type: 'select', options: ['Emin değilim, önerin', 'PLA', 'PETG', 'TPU (esnek)'] },
            { name: 'link', label: 'Model ya da örnek bağlantısı', type: 'url', placeholder: 'https://…' },
          ]}
        />

        <ServiceSection id="sss" title="Sık sorulanlar">
          <Faq items={FAQ} />
        </ServiceSection>

        <CrossLink
          title="Elinde fiziksel bir parça mı var?"
          text="Kırılan ya da artık bulunmayan bir parçayı önce 3D tarayıp dijital modelini çıkarabilir, sonra yenisini basabiliriz."
          to="/scan"
          label="3D taramaya bak"
        />
      </div>
    </div>
  )
}

export default CustomPrintPage
