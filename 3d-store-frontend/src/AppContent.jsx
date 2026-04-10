import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import ScrollToTop from './components/ScrollToTop'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import WhatsAppButton from './components/WhatsAppButton'
import SEO from './components/SEO'

const HomePage = lazy(() => import('./pages/HomePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VerifyPendingPage = lazy(() => import('./pages/VerifyPendingPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const CustomPrintPage = lazy(() => import('./pages/CustomPrintPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ScanServicePage = lazy(() => import('./pages/ScanServicePage'))

const KvkkPage = lazy(() => import('./pages/KvkkPage'))
const DistanceSellingPage = lazy(() => import('./pages/DistanceSellingPage'))
const DeliveryPage = lazy(() => import('./pages/DeliveryPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const FaqPage = lazy(() => import('./pages/FaqPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))

const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/Admin/AdminOverview'))
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'))
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'))
const AdminCustomers = lazy(() => import('./pages/Admin/AdminCustomers'))
const AdminCoupons = lazy(() => import('./pages/Admin/AdminCoupons'))
const AdminReports = lazy(() => import('./pages/Admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'))
const AdminReviews = lazy(() => import('./pages/Admin/AdminReviews'))
export const AppContent = () => {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  const getSeoForPath = (pathname) => {
    if (pathname === '/') return null

    if (pathname.startsWith('/product/')) {
      return {
        title: 'Ürün Detayı',
        description: 'Ürün özellikleri, renk seçenekleri, fiyat bilgisi ve müşteri yorumlarını inceleyin.',
      }
    }

    if (pathname.startsWith('/admin')) {
      return {
        title: 'Yönetim Paneli',
        description: 'Özkan3D yönetim paneli.',
        noIndex: true,
      }
    }

    if (pathname.startsWith('/blog/')) {
      return {
        title: 'Blog Detayı',
        description: 'Seçtiğiniz blog yazısının detaylı içeriğini okuyun.',
      }
    }

    if (pathname.startsWith('/verify-email/')) {
      return {
        title: 'E-posta Doğrulama',
        description: 'Hesabınızı güvenli şekilde aktifleştirmek için e-posta doğrulama adımını tamamlayın.',
        noIndex: true,
      }
    }

    if (pathname === '/verify-pending') {
      return {
        title: 'E-posta Onayı Bekleniyor',
        description: 'E-posta onay süresi dolmadan hesabınızı aktifleştirmek için doğrulama adımını tamamlayın.',
        noIndex: true,
      }
    }

    const seoMap = {
      '/shop': {
        title: 'Mağaza',
        description: '3D baskı figürler, masa düzenleyiciler, kulaklık tutucular ve özel tasarım ürünleri keşfedin.',
      },
      '/contact': {
        title: 'İletişim',
        description: 'Sorularınız ve özel sipariş talepleriniz için bize WhatsApp, telefon veya e-posta ile ulaşın.',
      },
      '/custom': {
        title: 'Özel Tasarım Hizmeti',
        description: 'Kendi 3D modelinizi gönderin veya fikrinizi paylaşın, size özel üretim yapalım.',
      },
      '/about': {
        title: 'Hakkımızda',
        description: 'Özkan3D hikayesi, üretim yaklaşımımız ve kalite standartlarımız hakkında bilgi alın.',
      },
      '/scan': {
        title: '3D Tarama Hizmeti',
        description: 'Nesnelerinizi yüksek doğrulukla dijital ortama aktaran profesyonel 3D tarama hizmeti.',
      },
      '/blog': {
        title: 'Blog',
        description: '3D baskı dünyasından ipuçları, rehberler ve ilham verici içerikler.',
      },
      '/faq': {
        title: 'Sıkça Sorulan Sorular',
        description: 'Sipariş, üretim süresi, teslimat ve ürünler hakkında merak edilen tüm soruların cevapları.',
      },
      '/delivery': {
        title: 'Teslimat ve Sipariş Koşulları',
        description: 'Kargo, teslimat süreleri ve sipariş süreçlerine dair tüm detayları inceleyin.',
      },
      '/returns': {
        title: 'İade İşlemleri',
        description: 'İade ve değişim süreçleri hakkında güncel bilgilere buradan ulaşabilirsiniz.',
      },
      '/distance-selling': {
        title: 'Mesafeli Satış Sözleşmesi',
        description: 'Mesafeli satış sözleşmesi ve yasal bilgilendirme metinleri.',
      },
      '/terms': {
        title: 'Mesafeli Satış Sözleşmesi',
        description: 'Mesafeli satış sözleşmesi ve yasal bilgilendirme metinleri.',
      },
      '/kvkk': {
        title: 'KVKK Politikası',
        description: 'Kişisel verilerinizin nasıl işlendiğini ve korunduğunu açıklayan KVKK metni.',
      },
      '/privacy': {
        title: 'KVKK Politikası',
        description: 'Kişisel verilerinizin nasıl işlendiğini ve korunduğunu açıklayan KVKK metni.',
      },
      '/cart': {
        title: 'Sepetim',
        description: 'Sepetinizdeki ürünleri kontrol edin ve siparişinizi tamamlayın.',
        noIndex: true,
      },
      '/checkout': {
        title: 'Ödeme',
        description: 'Güvenli ödeme adımı ile siparişinizi tamamlayın.',
        noIndex: true,
      },
      '/account': {
        title: 'Hesabım',
        description: 'Sipariş geçmişiniz, profil bilgileriniz ve hesap ayarlarınız.',
        noIndex: true,
      },
      '/order-success': {
        title: 'Sipariş Başarılı',
        description: 'Siparişiniz başarıyla alındı. Teşekkür ederiz.',
        noIndex: true,
      },
      '/login': {
        title: 'Giriş Yap',
        description: 'Hesabınıza giriş yaparak siparişlerinizi yönetebilir ve alışverişe devam edebilirsiniz.',
        noIndex: true,
      },
      '/register': {
        title: 'Üye Ol',
        description: 'Hızlıca hesap oluşturun ve Özkan3D ayrıcalıklarından yararlanın.',
        noIndex: true,
      },
    }

    return seoMap[pathname] || {
      title: 'Sayfa Bulunamadı',
      description: 'Aradığınız sayfa bulunamadı. Ana sayfaya dönerek gezinmeye devam edebilirsiniz.',
      noIndex: true,
    }
  }

  const seo = getSeoForPath(location.pathname)

  return (
    <>
      {seo && (
        <SEO
          title={seo.title}
          description={seo.description}
          noIndex={seo.noIndex}
        />
      )}
      <ScrollToTop />
      {!isAdmin && <Header />}
      <main style={!isAdmin ? { paddingTop: '64px' } : {}}>
        <Suspense fallback={<div style={{ padding: '28px', textAlign: 'center' }}>Yükleniyor...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/custom" element={<CustomPrintPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-pending" element={<VerifyPendingPage />} />
            <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
            <Route path="/scan" element={<ScanServicePage />} />
            <Route path="/kvkk" element={<KvkkPage />} />
            <Route path="/privacy" element={<KvkkPage />} />
            <Route path="/distance-selling" element={<DistanceSellingPage />} />
            <Route path="/terms" element={<DistanceSellingPage />} />
            <Route path="/delivery" element={<DeliveryPage />} />
            <Route path="/returns" element={<ReturnsPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />

            {/* Protected Routes — giriş gerekli */}
            <Route path="/cart" element={
              <ProtectedRoute><CartPage /></ProtectedRoute>
            } />
            <Route path="/checkout" element={
              <ProtectedRoute><CheckoutPage /></ProtectedRoute>
            } />
            <Route path="/account" element={
              <ProtectedRoute><AccountPage /></ProtectedRoute>
            } />
            <Route path="/order-success" element={
              <ProtectedRoute><OrderSuccessPage /></ProtectedRoute>
            } />

            {/* Admin Routes — admin yetkisi gerekli */}
            <Route path="/admin" element={
              <AdminRoute><AdminLayout /></AdminRoute>
            }>
              <Route index element={<AdminOverview />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="reviews" element={<AdminReviews />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <Footer />}
    </>
  )
}