import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header/Header'
import Footer from './components/Footer/Footer'
import ScrollToTop from './components/ScrollToTop'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'

import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CartPage from './pages/CartPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ContactPage from './pages/ContactPage'
import CustomPrintPage from './pages/CustomPrintPage'
import AccountPage from './pages/AccountPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import NotFoundPage from './pages/NotFoundPage'
import AboutPage from './pages/AboutPage'
import ScanServicePage from './pages/ScanServicePage'

import KvkkPage from './pages/KvkkPage'
import DistanceSellingPage from './pages/DistanceSellingPage'
import DeliveryPage from './pages/DeliveryPage'
import ReturnsPage from './pages/ReturnsPage'
import FaqPage from './pages/FaqPage'
import BlogPage from './pages/BlogPage'

import AdminLayout from './pages/Admin/AdminLayout'
import AdminOverview from './pages/Admin/AdminOverview'
import AdminOrders from './pages/Admin/AdminOrders'
import AdminProducts from './pages/Admin/AdminProducts'
import AdminCustomers from './pages/Admin/AdminCustomers'
import AdminCoupons from './pages/Admin/AdminCoupons'
import AdminReports from './pages/Admin/AdminReports'
import AdminSettings from './pages/Admin/AdminSettings'
import AdminReviews from './pages/Admin/AdminReviews'
export const AppContent = () => {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      <ScrollToTop />
      {!isAdmin && <Header />}
      <main style={!isAdmin ? { paddingTop: '64px' } : {}}>
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
          <Route path="/scan" element={<ScanServicePage />} />
          <Route path="/kvkk" element={<KvkkPage />} />
          <Route path="/distance-selling" element={<DistanceSellingPage />} />
          <Route path="/delivery" element={<DeliveryPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/blog" element={<BlogPage />} />

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
      </main>
      {!isAdmin && <Footer />}
    </>
  )
}