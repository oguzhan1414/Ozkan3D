import { useState } from 'react'
import {
  FiFileText, FiLayers, FiMessageSquare, FiTruck, FiFile, FiPackage, FiBox,
} from 'react-icons/fi'
import SEO from '../../components/SEO'
import examplesImage from '../../images/custom-print-examples.webp'
import {
  ServicePage, ServiceHero, ServiceSection, Steps, UseCases, SpecCards, Factors, RequestForm, Faq, CrossLink, scrollToId,
} from '../components/service/ServiceKit'
import '../storefront.css'

const WA_TEXT = 'Merhaba, özel 3D baskı için teklif almak istiyorum.'
const FORM_ID = 'teklif'

const INITIAL = { idea: '', size: '', quantity: '1', material: '', link: '' }

const STEPS = [
  { icon: FiMessageSquare, who: 'Sen', title: 'Anlat ya da dosyanı gönder', text: 'STL, OBJ ya da 3MF dosyan varsa gönder. Yoksa ne istediğini birkaç cümleyle yaz; fotoğraf ya da çizim de olur.' },
  { icon: FiFileText, who: 'Biz', title: 'Yazılı teklif al', text: 'Ölçü, malzeme, fiyat ve hazırlanma süresini yazılı olarak iletiriz. Teklif ücretsizdir.' },
  { icon: FiLayers, who: 'Biz', title: 'Onayla, basalım', text: 'Sen onaylayınca Bolu’daki atölyemizde parçanı katman katman basarız.' },
  { icon: FiTruck, who: 'Kargo', title: 'Kapına gelsin', text: 'Paketleyip kargoya veririz, takip numarası e-postana gelir. Kargo şehrine göre 1–6 iş günü.' },
]

const EXAMPLES = [
  {
    tag: 'Hediye',
    title: 'Kişiye özel hediye',
    text: 'İsimlik, anahtarlık, plaket. İsim, yazı ve renkleri sen seçersin.',
    media: <img src={examplesImage} alt="" className="cp-crop is-center" loading="lazy" />,
    prefill: { idea: 'İsme özel bir masa isimliği yaptırmak istiyorum. Yazı: … Renk: …' },
  },
  {
    tag: 'Ölçüye özel',
    title: 'Ölçüye özel aparat',
    text: 'Telefon standı, tutucu, kırılan bir parçanın yenisi. Ölçünü ver, ona göre basalım.',
    media: <img src={examplesImage} alt="" className="cp-crop is-left" loading="lazy" />,
    prefill: { idea: 'Masam için bir telefon standı istiyorum.', size: 'Yaklaşık 12 cm yükseklik' },
  },
  {
    tag: 'Prototip',
    title: 'Prototip ve yedek parça',
    text: 'Tasarladığın bir parçanın ilk örneği ya da piyasada bulunmayan küçük bir parça.',
    media: <img src={examplesImage} alt="" className="cp-crop is-right" loading="lazy" />,
    prefill: { idea: 'Bir bağlantı parçası bastırmak istiyorum. Nerede kullanılacak: …' },
  },
]

const MATERIALS = [
  {
    title: 'PLA',
    subtitle: 'Varsayılan seçim',
    badge: 'En ekonomik',
    color: '#ff6b5a',
    text: 'Çoğu dekor, hediye ve aparat için yeterlidir. Renk seçeneği geniştir, yüzeyi temiz çıkar.',
    meters: [['Darbe dayanımı', 2], ['Esneklik', 1], ['Isı dayanımı', 2], ['Ekonomi', 5]],
    best: ['Dekor', 'İsimlik', 'Stand', 'Figür'],
  },
  {
    title: 'PETG',
    subtitle: 'Dayanıklı kullanım',
    color: '#5c8fb8',
    text: 'Isıya ve darbeye PLA’dan daha dayanıklıdır. Sık kullanılacak ya da dışarıda duracak parçalar için.',
    meters: [['Darbe dayanımı', 4], ['Esneklik', 2], ['Isı dayanımı', 4], ['Ekonomi', 4]],
    best: ['Tutucu', 'Bağlantı parçası', 'Dış mekân'],
  },
  {
    title: 'TPU',
    subtitle: 'Esnek malzeme',
    color: '#3a3a3a',
    text: 'Lastik gibi esner, darbeyi emer. Kılıf, conta ve tampon gibi bükülmesi gereken parçalar için.',
    meters: [['Darbe dayanımı', 5], ['Esneklik', 5], ['Isı dayanımı', 3], ['Ekonomi', 3]],
    best: ['Conta', 'Tampon', 'Kılıf'],
  },
]

const FACTORS = [
  ['Boyut ve ağırlık', 'Parça büyüdükçe kullanılan malzeme ve baskı süresi artar. Fiyatı en çok etkileyen şey budur.'],
  ['Malzeme', 'PLA en ekonomik seçenektir. Isı ve darbe dayanımı gerekirse PETG, esneklik gerekirse TPU kullanılır.'],
  ['Dayanım ihtiyacı', 'Taşıyıcı ya da sık kullanılacak parçalar daha yoğun basılır. Bu da süreyi ve malzemeyi artırır.'],
  ['Adet', 'Aynı parçadan birden fazla basılınca hazırlık bir kez yapıldığı için birim fiyat genelde düşer.'],
  ['Model hazırlığı', 'Hazır model dosyan varsa doğrudan baskıya geçeriz. Model yoksa ya da değişiklik gerekiyorsa modelleme ücreti eklenir.'],
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
    window.setTimeout(() => document.querySelector(`#${FORM_ID} textarea`)?.focus({ preventScroll: true }), 450)
  }

  return (
    <ServicePage variant="print">
      <SEO
        title="Özel 3D Baskı"
        description="Aklındaki parçayı 3D yazıcıyla basalım. STL, OBJ, 3MF dosyanı gönder ya da ne istediğini anlat; PLA, PETG ve TPU ile tek parçadan seri üretime teklif al."
        url="/custom"
      />

      <ServiceHero
        film="print"
        kicker="Özel 3D baskı"
        title="Aklındaki parçayı"
        accent="basalım."
        lead="3D model dosyan varsa gönder, yoksa ne istediğini anlat. Ölçüyü, malzemeyi ve fiyatı yazılı teklifle iletelim, onaylarsan basalım."
        primaryLabel="Teklif iste"
        onPrimary={() => scrollToId(FORM_ID)}
        whatsappText={WA_TEXT}
        
        facts={[
          ['Dosya', 'STL, OBJ, 3MF ya da sadece bir fikir', FiFile],
          ['Adet', 'Tek parçadan itibaren', FiBox],
          ['Kargo', 'Şehrine göre 1–6 iş günü', FiPackage],
        ]}
      />

      <ServiceSection
        id="nasil"
        eyebrow="Nasıl çalışır"
        title="Fikirden kapına dört adım."
        lead="Teknik bilgi gerekmiyor. Ne istediğini anlatman yeterli; gerisini birlikte netleştiririz."
      >
        <Steps items={STEPS} />
      </ServiceSection>

      <ServiceSection
        id="ornekler"
        eyebrow="Neler basıyoruz"
        title="Bir örnek seç, formu senin için dolduralım."
        lead="Kartlardan birine dokun; teklif formu o örneğe göre hazır gelsin, sadece detayları değiştir."
      >
        <UseCases items={EXAMPLES} onPick={pickExample} />
      </ServiceSection>

      <ServiceSection
        id="malzeme"
        tone="stone"
        eyebrow="Malzemeler"
        title="Hangi malzeme sana uygun?"
        lead="Emin değilsen formda “Emin değilim” seç; parçanın nerede kullanılacağına göre biz önerelim."
      >
        <SpecCards items={MATERIALS} />
      </ServiceSection>

      <ServiceSection
        id="fiyat"
        eyebrow="Şeffaf fiyat"
        title="Fiyatı ne belirler?"
        lead="Her parça farklı olduğu için sabit fiyat yerine parçana özel teklif veriyoruz. Teklifi etkileyen başlıca etkenler:"
      >
        <Factors rows={FACTORS} note="Teklif istemek ücretsizdir ve seni hiçbir şeye bağlamaz." />
      </ServiceSection>

      <RequestForm
        id={FORM_ID}
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

      <ServiceSection id="sss" eyebrow="SSS" title="Sık sorulanlar">
        <Faq items={FAQ} />
      </ServiceSection>

      <CrossLink
        eyebrow="3D tarama"
        title="Elinde fiziksel bir parça mı var?"
        text="Kırılan ya da artık bulunmayan bir parçayı önce 3D tarayıp dijital modelini çıkarabilir, sonra yenisini basabiliriz."
        to="/scan"
        label="3D taramaya bak"
      />
    </ServicePage>
  )
}

export default CustomPrintPage
