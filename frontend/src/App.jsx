import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import LaunchScreen from './components/LaunchScreen';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Categories from './pages/Categories';
import About from './pages/About';
import Contact from './pages/Contact';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import {
  DashboardHome,
  AdminProducts,
  AdminCategories,
  AdminBanners,
  AdminOffer,
  AdminProcessing,
  AdminOrders,
} from './pages/AdminDashboard';

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
          <Route path="checkout" element={<Checkout />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="admin" element={<AdminLogin />} />
          <Route path="admin/dashboard" element={<AdminLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="offer" element={<AdminOffer />} />
            <Route path="processing" element={<AdminProcessing />} />
            <Route path="orders" element={<AdminOrders />} />
          </Route>
        </Route>
      </Routes>
      )}
    </CartProvider>
  );
}
