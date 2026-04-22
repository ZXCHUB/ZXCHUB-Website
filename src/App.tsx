import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const Storefront = lazy(() => import('./pages/Storefront'));
const Profile = lazy(() => import('./pages/Profile'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Products = lazy(() => import('./pages/Products'));
const GetKey = lazy(() => import('./pages/GetKey'));
const Feedback = lazy(() => import('./pages/Feedback'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderComplete = lazy(() => import('./pages/OrderComplete'));

const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminInstructions = lazy(() => import('./pages/admin/Instructions'));
const AdminKeys = lazy(() => import('./pages/admin/Keys'));
const AdminPromoCodes = lazy(() => import('./pages/admin/PromoCodes'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminInvoices = lazy(() => import('./pages/admin/Invoices'));
const AdminFeedbacks = lazy(() => import('./pages/admin/Feedbacks'));
const AdminTickets = lazy(() => import('./pages/admin/Tickets'));
const AdminDiscord = lazy(() => import('./pages/admin/Discord'));
const AdminPayments = lazy(() => import('./pages/admin/Payments'));
const AdminTeam = lazy(() => import('./pages/admin/Team'));
const AdminDiscounts = lazy(() => import('./pages/admin/Discounts'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminThemes = lazy(() => import('./pages/admin/Themes'));

function AffiliateTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('a');
    if (ref) {
      localStorage.setItem('affiliate_ref', JSON.stringify({
        code: ref,
        timestamp: Date.now()
      }));
    }
  }, []);
  return null;
}

function PageviewTracker() {
  const location = useLocation();
  useEffect(() => {
    if (!location.pathname.startsWith('/admin')) {
      addDoc(collection(db, 'pageviews'), {
        path: location.pathname,
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      }).catch(e => console.error('Failed to track pageview', e));
    }
  }, [location.pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center text-zinc-400">
      Loading...
    </div>
  );
}

function AdminNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-start justify-center">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">404</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">Section not found</h2>
      <p className="mt-2 max-w-md text-slate-400">
        The admin section you are looking for is not available. Use the sidebar to continue.
      </p>
      <Link
        to="/admin"
        className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AffiliateTracker />
        <PageviewTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Storefront />} />
            <Route path="/products" element={<Products />} />
            <Route path="/get-key" element={<GetKey />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/checkout/cart" element={<Checkout />} />
            <Route path="/checkout/:productId/:variantId" element={<Checkout />} />
            <Route path="/order/:transactionId" element={<OrderComplete />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/keys" element={<AdminKeys />} />
              <Route path="products/instructions" element={<AdminInstructions />} />
              <Route path="orders/customers" element={<AdminCustomers />} />
              <Route path="orders/invoices" element={<AdminInvoices />} />
              <Route path="orders/feedbacks" element={<AdminFeedbacks />} />
              <Route path="orders/promocodes" element={<AdminPromoCodes />} />
              <Route path="orders/tickets" element={<AdminTickets />} />
              <Route path="settings/discord" element={<AdminDiscord />} />
              <Route path="settings/payments" element={<AdminPayments />} />
              <Route path="settings/team" element={<AdminTeam />} />
              <Route path="settings/discounts" element={<AdminDiscounts />} />
              <Route path="settings/announcements" element={<AdminAnnouncements />} />
              <Route path="settings/themes" element={<AdminThemes />} />
              <Route path="*" element={<AdminNotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
