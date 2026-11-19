import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import SiteShell from './storefront/components/SiteShell'
import SiteFooter from './storefront/components/SiteFooter'
import './storefront/storefront.css'
import ScrollToTop from './components/ScrollToTop'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import WhatsAppButton from './components/WhatsAppButton'
import SEO from './components/SEO'

const HomePage = lazy(() => import('./storefront/pages/HomePage'))
const ShopPage = lazy(() => import('./storefront/pages/ShopPage'))
const ThreeDPrintingPage = lazy(() => import('./pages/ThreeDPrintingPage'))
const ProductDetailPage = lazy(() => import('./storefront/pages/ProductDetailPage'))
const CartPage = lazy(() => import('./storefront/pages/CartPage'))
const LoginPage = lazy(() => import('./storefront/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('./storefront/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./storefront/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./storefront/pages/auth/ResetPasswordPage'))
const VerifyPendingPage = lazy(() => import('./storefront/pages/auth/VerifyPendingPage'))
const VerifyEmailPage = lazy(() => import('./storefront/pages/auth/VerifyEmailPage'))
const ContactPage = lazy(() => import('./storefront/pages/support/ContactPage'))
const CustomPrintPage = lazy(() => import('./storefront/pages/CustomPrintPage'))
const AccountPage = lazy(() => import('./storefront/pages/account/AccountPage'))
const CheckoutPage = lazy(() => import('./storefront/pages/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const AboutPage = lazy(() => import('./storefront/pages/AboutPage'))
const ScanServicePage = lazy(() => import('./storefront/pages/ScanServicePage'))

const KvkkPage = lazy(() => import('./pages/KvkkPage'))
const DistanceSellingPage = lazy(() => import('./pages/DistanceSellingPage'))
const DeliveryPage = lazy(() => import('./storefront/pages/support/DeliveryPage'))
const ReturnsPage = lazy(() => import('./storefront/pages/support/ReturnsPage'))
const FaqPage = lazy(() => import('./storefront/pages/support/FaqPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const BlogDetailPage = lazy(() => import('./pages/BlogDetailPage'))

const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/Admin/AdminOverview'))
const AdminOrders = lazy(() => import('./pages/Admin/AdminOrders'))
const AdminProducts = lazy(() => import('./pages/Admin/AdminProducts'))
const AdminCategories = lazy(() => import('./pages/Admin/AdminCategories'))
const AdminProductEditor = lazy(() => import('./pages/Admin/AdminProductEditor'))
const AdminSupport = lazy(() => import('./pages/Admin/AdminSupport'))
const AdminCustomers = lazy(() => import('./pages/Admin/AdminCustomers'))
const AdminCoupons = lazy(() => import('./pages/Admin/AdminCoupons'))
const AdminReports = lazy(() => import('./pages/Admin/AdminReports'))
const AdminSettings = lazy(() => import('./pages/Admin/AdminSettings'))
const AdminReviews = lazy(() => import('./pages/Admin/AdminReviews'))
export const AppContent = () => {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  const getSeoForPath = (pathname) => {
    const seoHandledInPage =
      pathname === '/' ||
      pathname === '/shop' ||
      pathname === '/faq' ||
      pathname === '/blog' ||
      pathname === '/3d-baski' ||
      pathname.startsWith('/product/') ||
      pathname.startsWith('/blog/')

    if (seoHandledInPage) return null

    if (pathname.startsWith('/admin')) {
      return {
        title: 'Yönetim Paneli',
        description: 'Ozkan3D yonetim paneli.',
        noIndex: true,
      }
    }

    if (pathname.startsWith('/verify-email/')) {
      return {
        title: 'E-posta Doğrulama',
        description: 'Hesabınızı güvenli şekilde aktifleştirmek için e-posta doğrulama adımını tamamlayın.',
        noIndex: true,
      }
    }

    if (pathname.startsWith('/reset-password/')) {
      return {
        title: 'Yeni Şifre Belirle',
        description: 'Hesabınız için yeni ve güvenli bir şifre belirleyin.',
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
        description: 'Ozkan3D hikayesi, uretim yaklasimimiz ve kalite standartlarimiz hakkinda bilgi alin.',
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
      '/forgot-password': {
        title: 'Şifremi Unuttum',
        description: 'E-posta adresinize şifre sıfırlama bağlantısı gönderin.',
        noIndex: true,
      },
      '/register': {
        title: 'Üye Ol',
        description: 'Hizlica hesap olusturun ve Ozkan3D ayricaliklarindan yararlanin.',
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
      {!isAdmin && <SiteShell />}
      <main className={isAdmin ? undefined : 'sf-main'}>
        <Suspense fallback={<div style={{ padding: '28px', textAlign: 'center' }}>Yükleniyor...</div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/3d-baski" element={<ThreeDPrintingPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/custom" element={<CustomPrintPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
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
              <Route path="products/new" element={<AdminProductEditor />} />
              <Route path="products/:id" element={<AdminProductEditor />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="support" element={<AdminSupport />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdmin && <WhatsAppButton />}
      {!isAdmin && <SiteFooter />}
    </>
  )
}
