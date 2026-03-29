import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import LaunchScreen from './components/LaunchScreen';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Categories from './pages/Categories';
import About from './pages/About';
import Contact from './pages/Contact';
import TrackOrder from './pages/TrackOrder';
import CustomerLogin from './pages/CustomerLogin';
import MyOrders from './pages/MyOrders';
import Cart from './pages/Cart';
import CheckoutDelivery from './pages/CheckoutDelivery';
import CheckoutOnlineReview from './pages/CheckoutOnlineReview';
import OrderPlaced from './pages/OrderPlaced';
import CustomerAccountLogin from './pages/CustomerAccountLogin';
import CustomerAccountRegister from './pages/CustomerAccountRegister';
import CustomerAccount from './pages/CustomerAccount';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import {
  DashboardHome,
  AdminProducts,
  AdminCategories,
  AdminBanners,
  AdminOffer,
  AdminOrders,
} from './pages/AdminDashboard';
import AdminCoupons from './pages/AdminCoupons';

export default function App() {
  const [splashDone, setSplashDone] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem('nbf-splash-seen') === '1'
  );

  return (
    <CartProvider>
      <LaunchScreen onFinish={() => setSplashDone(true)} />
      {!splashDone ? null : (
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:slug" element={<Shop />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout/delivery" element={<CheckoutDelivery />} />
          <Route path="checkout/online-review" element={<CheckoutOnlineReview />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="track" element={<TrackOrder />} />
          <Route path="customer-login" element={<CustomerLogin />} />
          <Route path="my-orders" element={<MyOrders />} />
          <Route path="order/placed/:orderId" element={<OrderPlaced />} />
          <Route path="customer/register" element={<CustomerAccountRegister />} />
          <Route path="customer/account/login" element={<CustomerAccountLogin />} />
          <Route path="customer/account" element={<CustomerAccount />} />
          <Route path="admin" element={<AdminLogin />} />
          <Route path="admin/dashboard" element={<AdminLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="offer" element={<AdminOffer />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>
        </Route>
      </Routes>
      )}
    </CartProvider>
  );
}
