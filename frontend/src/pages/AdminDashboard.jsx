import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import CategoryIcon, { isCategoryIconImage } from '../components/CategoryIcon';
import {
  getProducts,
  getCategories,
  getOffer,
  adminCreateProduct,
  adminUpdateProduct,
  getSuggestedNbf,
  adminDeleteProduct,
  adminUpdateOffer,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminGetBanners,
  adminCreateBanner,
  adminUpdateBanner,
  adminDeleteBanner,
  adminParseOrder,
  adminCreateOrder,
  adminGetOrders,
  adminUpdateOrder,
  adminGetOrderBill,
} from '../api';
import { formatOrderItemOptionsLine } from '../utils/orderItemOptions';
import {
  formatInrAmount,
  getHighestVariantTotal,
  getLowestVariantTotal,
  variantPriceHasRange,
} from '../utils/variantPrice';

/** Min–max selling price (base + option extras), same rules as storefront ProductCard */
function adminProductPriceLabel(p) {
  const low = getLowestVariantTotal(p);
  const high = getHighestVariantTotal(p);
  if (variantPriceHasRange(p)) {
    return `₹${formatInrAmount(low)} – ₹${formatInrAmount(high)}`;
  }
  return `₹${formatInrAmount(low)}`;
}

/** Product.category is stored as slug; show category name in lists */
function categoryDisplayName(categorySlug, categories) {
  if (categorySlug == null || String(categorySlug).trim() === '') return '—';
  const s = String(categorySlug).trim();
  const c = (categories || []).find(
    (x) => x.slug === s || String(x.slug || '').toLowerCase() === s.toLowerCase()
  );
  return c?.name || s;
}

/** Bill from API may be full HTML (invoice) or legacy plain text */
function isBillHtml(content) {
  return typeof content === 'string' && (content.trim().startsWith('<!') || content.includes('</html>'));
}

function printHtmlBill(html) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
}

/** True if order has saved delivery (from WhatsApp *Delivery address* block) */
function orderHasDelivery(o) {
  const d = o?.delivery;
  if (!d || typeof d !== 'object') return false;
  return !!(String(d.address || '').trim() || String(d.pincode || '').trim() || String(d.state || '').trim());
}

function DashboardPage({ title, children }) {
  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl min-w-0">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-rose-800 mb-4 sm:mb-6">{title}</h1>
      {children}
    </div>
  );
}

export function DashboardHome() {
  const [counts, setCounts] = useState({ products: 0, categories: 0 });
  useEffect(() => {
    Promise.all([getProducts({ includeHidden: 'true' }), getCategories()])
      .then(([products, categories]) => setCounts({ products: products?.length ?? 0, categories: categories?.length ?? 0 }))
      .catch(() => {});
  }, []);
  const cards = [
    { to: '/admin/dashboard/products', label: 'Products', count: counts.products, icon: '🛍️', color: 'bg-rose-500' },
    { to: '/admin/dashboard/categories', label: 'Categories', count: counts.categories, icon: '📁', color: 'bg-amber-500' },
    { to: '/admin/dashboard/banners', label: 'Banners', icon: '🖼️', color: 'bg-purple-500' },
    { to: '/admin/dashboard/offer', label: 'Offer Banner', icon: '🏷️', color: 'bg-lavender-500' },
    { to: '/admin/dashboard/coupons', label: 'Coupons', icon: '🎟️', color: 'bg-emerald-500' },
    { to: '/admin/dashboard/orders', label: 'Orders', icon: '📋', color: 'bg-sky-500' },
  ];
  return (
    <DashboardPage title="Dashboard">
      <p className="text-gray-600 mb-8">Manage your store from the sections below.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="flex items-center gap-4 p-6 rounded-2xl bg-white border border-rose-100 hover:border-rose-200 hover:shadow-soft transition"
          >
            <span className={`w-14 h-14 rounded-xl ${card.color} text-white flex items-center justify-center text-2xl`}>
              {card.icon}
            </span>
            <div>
              <h2 className="font-semibold text-gray-800">{card.label}</h2>
              {card.count != null && <p className="text-sm text-gray-500">{card.count} items</p>}
            </div>
          </Link>
        ))}
      </div>
    </DashboardPage>
  );
}

export function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    Promise.all([getProducts({ includeHidden: 'true' }), getCategories()])
      .then(([p, c]) => {
        setProducts(p || []);
        setCategories(c || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || products.length === 0) return;
    const p = products.find((x) => String(x._id) === String(editId));
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('edit');
        return next;
      },
      { replace: true }
    );
    if (p) {
      setModal({ product: p });
    }
  }, [products, searchParams, setSearchParams]);

  const openAdd = () => setModal('add');
  const openEdit = (product) => setModal({ product });
  const closeModal = () => { setModal(null); setFormError(''); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await adminDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <DashboardPage title="Products"><p className="text-gray-500">Loading...</p></DashboardPage>;

  const productSearchLower = productSearch.trim().toLowerCase();
  const filteredProducts = productSearchLower
    ? products.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(productSearchLower)) ||
          (p.nbfCode && String(p.nbfCode).toLowerCase().includes(productSearchLower))
      )
    : products;

  return (
    <DashboardPage title="Products">
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="text"
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          placeholder="Search by name or NBF code..."
          className="border border-rose-200 rounded-xl px-3 py-2.5 w-full sm:max-w-xs text-sm"
        />
        <button onClick={openAdd} className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-rose-600 touch-manipulation flex-shrink-0">
          Add Product
        </button>
      </div>

      {/* Mobile: product cards */}
      <div className="md:hidden space-y-4">
        {products.length === 0 && <p className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-rose-100">No products yet. Add your first product.</p>}
        {products.length > 0 && filteredProducts.length === 0 && <p className="p-8 text-center text-gray-500 bg-white rounded-2xl border border-rose-100">No products match your search.</p>}
        {filteredProducts.map((p) => (
          <div key={p._id} className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm flex gap-3">
            <img src={p.images?.[0] || 'https://placehold.co/60x60/fce7f3/9f1239?text=No+Image'} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 truncate">{p.name}</p>
              {p.nbfCode && <p className="text-xs text-gray-500">NBF: {p.nbfCode}</p>}
              <p className="text-sm text-gray-600 mt-0.5">{categoryDisplayName(p.category, categories)}</p>
              <p className="text-rose-600 font-semibold mt-1">{adminProductPriceLabel(p)}</p>
              <p className="text-xs text-gray-500">{p.inStock ? 'In stock' : 'Out of stock'}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-sm font-medium">Edit</button>
                <button onClick={() => handleDelete(p._id)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block bg-white rounded-2xl border border-rose-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-cream-100 border-b border-rose-100">
              <tr>
                <th className="p-3 font-semibold text-gray-700">Image</th>
                <th className="p-3 font-semibold text-gray-700">Name</th>
                <th className="p-3 font-semibold text-gray-700">Category</th>
                <th className="p-3 font-semibold text-gray-700">Price</th>
                <th className="p-3 font-semibold text-gray-700">Stock</th>
                <th className="p-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p._id} className="border-b border-rose-50">
                  <td className="p-3">
                    <img src={p.images?.[0] || 'https://placehold.co/60x60/fce7f3/9f1239?text=No+Image'} alt="" className="w-12 h-12 object-cover rounded" />
                  </td>
                  <td className="p-3 font-medium">{p.name}{p.nbfCode && <span className="block text-xs text-gray-500">NBF: {p.nbfCode}</span>}</td>
                  <td className="p-3">{categoryDisplayName(p.category, categories)}</td>
                  <td className="p-3 whitespace-nowrap">{adminProductPriceLabel(p)}</td>
                  <td className="p-3">{p.inStock ? 'In stock' : 'Out of stock'}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => openEdit(p)} className="text-rose-600 text-sm font-medium hover:underline">Edit</button>
                    <button onClick={() => handleDelete(p._id)} className="text-red-600 text-sm font-medium hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {products.length === 0 && <p className="p-8 text-center text-gray-500">No products yet. Add your first product.</p>}
        {products.length > 0 && filteredProducts.length === 0 && <p className="p-8 text-center text-gray-500">No products match your search.</p>}
      </div>
      {modal && (
        <ProductFormModal
          product={modal === 'add' ? null : modal.product}
          categories={categories}
          saving={saving}
          formError={formError}
          onClose={closeModal}
          onSave={async (formData) => {
            setFormError('');
            setSaving(true);
            try {
              if (modal === 'add') {
                const created = await adminCreateProduct(formData);
                setProducts((prev) => [created, ...prev]);
              } else {
                const updated = await adminUpdateProduct(modal.product._id, formData);
                setProducts((prev) => prev.map((p) => (p._id === updated._id ? updated : p)));
              }
              closeModal();
            } catch (e) {
              setFormError(e.message || 'Failed to save');
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </DashboardPage>
  );
}

export function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getCategories().then(setCategories).catch(() => []).finally(() => setLoading(false));
  }, []);
  return (
    <DashboardPage title="Categories">
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <CategoriesPageContent categories={categories} onUpdate={() => getCategories().then(setCategories)} />
      )}
    </DashboardPage>
  );
}

export function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([adminGetBanners(), getCategories()])
      .then(([b, c]) => { setBanners(b || []); setCategories(c || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <DashboardPage title="Banners">
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <BannersPageContent banners={banners} setBanners={setBanners} categories={categories} />
      )}
    </DashboardPage>
  );
}

export function AdminOffer() {
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  return (
    <DashboardPage title="Offer Banner">
      <OfferBannerModal
        onClose={() => {}}
        onSave={async (data) => {
          setSaving(true);
          setFormError('');
          try {
            await adminUpdateOffer(data);
          } catch (e) {
            setFormError(e.message);
          } finally {
            setSaving(false);
          }
        }}
        saving={saving}
        formError={formError}
        setFormError={setFormError}
        asPage
      />
    </DashboardPage>
  );
}

export function AdminProcessing() {
  const [formError, setFormError] = useState('');
  return (
    <DashboardPage title="Processing">
      <ProcessingTab formError={formError} setFormError={setFormError} />
    </DashboardPage>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [trackingInput, setTrackingInput] = useState({});
  const [carrierInput, setCarrierInput] = useState({});
  const [generatingBillId, setGeneratingBillId] = useState(null);
  const [packingOrder, setPackingOrder] = useState(null);
  const [editItemsOrder, setEditItemsOrder] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [viewAddressOrder, setViewAddressOrder] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [ordersTab, setOrdersTab] = useState('confirmation-pending'); // default: confirmation pending; all = last tab
  const [orderSearch, setOrderSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    adminGetOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  const refreshData = () => {
    adminGetOrders().then(setOrders).catch(() => {});
    setUpdatingOrderId(null);
  };

  const handleGenerateBill = async (orderId) => {
    setGeneratingBillId(orderId);
    try {
      const data = await adminGetOrderBill(orderId);
      printDocument(data.bill, `Bill-${data.order.orderId}`, 'Bill');
    } catch (e) {
      alert(e.message || 'Failed to generate bill');
    } finally {
      setGeneratingBillId(null);
    }
  };

  const printDocument = (content, filename, title) => {
    const printWindow = window.open('', '_blank');
    const isHtml = typeof content === 'string' && (content.trim().startsWith('<!') || content.includes('</html>'));
    if (isHtml) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
      return;
    }
    const lines = content.split('\n');
    const formattedContent = lines
      .map((line) => {
        if (line.trim() === '') return '<br>';
        if (line.includes('===') || line.includes('---')) {
          return `<div style="border-top: 2px solid #e11d48; margin: 15px 0;"></div>`;
        }
        if (line.includes('Order ID:') || line.includes('TOTAL AMOUNT:') || line.includes('Total:')) {
          return `<div style="font-weight: bold; color: #e11d48; margin: 8px 0; font-size: 16px;">${line.replace(/:/g, ': ')}</div>`;
        }
        if (line.match(/^\d+\./)) {
          return `<div style="margin: 10px 0; padding-left: 10px; border-left: 3px solid #fce7f3;">${line}</div>`;
        }
        return `<div style="margin: 5px 0;">${line}</div>`;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${filename}</title>
          <style>
            @media print {
              @page {
                margin: 15mm;
                size: A4;
              }
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 30px 20px;
              background: white;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #e11d48;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #e11d48;
              margin: 0;
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            .header h2 {
              color: #9f1239;
              margin: 10px 0 0 0;
              font-size: 20px;
              font-weight: 600;
              text-transform: uppercase;
            }
            .content {
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.8;
              color: #333;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              padding-top: 20px;
              border-top: 2px solid #fce7f3;
              color: #666;
              font-style: italic;
            }
            .print-button {
              position: fixed;
              top: 20px;
              right: 20px;
              padding: 10px 20px;
              background: #e11d48;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
            }
            .print-button:hover {
              background: #9f1239;
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">🖨️ Print</button>
          <div class="header">
            <h1>NEW BALAJI BANGLES & FANCY</h1>
            <h2>${title}</h2>
          </div>
          <div class="content">
            ${formattedContent}
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
            <p>Thank you for your business!</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
    }, 250);
  };

  const orderFilters = {
    all: () => true,
    'confirmation-pending': (o) => (o.status || '') === 'pending',
    'payment-pending': (o) => (o.status || '') === 'confirmed' && (o.paymentStatus || 'pending') !== 'paid',
    'packing-pending': (o) => (o.status || '') === 'confirmed',
    'shipment-pending': (o) => (o.status || '') === 'packed',
    local: (o) => String(o?.delivery?.pincode || '').replace(/\D/g, '') === '517501',
    completed: (o) => (o.status || '') === 'shipped',
    returned: (o) => (o.status || '') === 'returned',
    cancelled: (o) => (o.status || '') === 'cancelled',
  };
  const tabFilteredOrders = orders.filter(orderFilters[ordersTab] || orderFilters.all);
  const orderSearchLower = orderSearch.trim().toLowerCase();
  const filteredOrders = orderSearchLower
    ? tabFilteredOrders.filter((o) => (o.orderId || '').toLowerCase().includes(orderSearchLower))
    : tabFilteredOrders;
  const counts = {
    all: orders.length,
    'confirmation-pending': orders.filter(orderFilters['confirmation-pending']).length,
    'payment-pending': orders.filter(orderFilters['payment-pending']).length,
    'packing-pending': orders.filter(orderFilters['packing-pending']).length,
    'shipment-pending': orders.filter(orderFilters['shipment-pending']).length,
    local: orders.filter(orderFilters.local).length,
    completed: orders.filter(orderFilters.completed).length,
    returned: orders.filter(orderFilters.returned).length,
    cancelled: orders.filter(orderFilters.cancelled).length,
  };

  const tabs = [
    { id: 'confirmation-pending', label: 'Confirmation pending', count: counts['confirmation-pending'] },
    { id: 'payment-pending', label: 'Payment pending', count: counts['payment-pending'] },
    { id: 'packing-pending', label: 'Packing pending', count: counts['packing-pending'] },
    { id: 'shipment-pending', label: 'Shipment pending', count: counts['shipment-pending'] },
    { id: 'local', label: 'Local orders (517501)', count: counts.local },
    { id: 'completed', label: 'Completed orders', count: counts.completed },
    { id: 'returned', label: 'Returned', count: counts.returned },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
    { id: 'all', label: 'All orders', count: counts.all },
  ];

  const statusBadgeClass = (o) =>
    o.status === 'cancelled'
      ? 'bg-red-100 text-red-800'
      : o.status === 'returned'
      ? 'bg-orange-100 text-orange-900'
      : o.status === 'shipped'
      ? 'bg-green-100 text-green-800'
      : o.status === 'packed'
      ? 'bg-amber-100 text-amber-800'
      : o.status === 'confirmed' || o.status === 'completed'
      ? 'bg-gray-100 text-gray-700'
      : 'bg-sky-100 text-sky-800';
  const statusLabel = (o) =>
    o.status === 'completed'
      ? 'Confirmed'
      : o.status === 'pending'
      ? 'Pending'
      : o.status === 'cancelled'
      ? 'Cancelled'
      : o.status === 'returned'
      ? 'Returned'
      : o.status === 'shipped'
      ? 'Shipped'
      : o.status === 'packed'
      ? 'Packed'
      : o.status === 'confirmed'
      ? 'Confirmed'
      : o.status || 'Pending';

  const canMarkOrderReturned = (o) => o.status === 'shipped' || o.status === 'packed';

  const handleMarkReturned = async (orderId) => {
    if (!window.confirm('Mark this order as returned? (e.g. customer sent items back.)')) return;
    setUpdatingOrderId(orderId);
    try {
      await adminUpdateOrder(orderId, { status: 'returned' });
      refreshData();
    } catch (e) {
      alert(e.message || 'Failed to mark as returned');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <DashboardPage title="Orders">
      <p className="text-gray-600 mb-4 text-sm md:text-base">
        Order status: Pending until you confirm, then Confirmed → Payment → Packed → Shipped.
      </p>

      {/* Search by Order ID (applies to current tab) */}
      <div className="mb-4">
        <input
          type="text"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          placeholder="Search by Order ID..."
          className="border border-rose-200 rounded-xl px-3 py-2.5 w-full sm:max-w-xs text-sm"
        />
      </div>

      {/* Tabs: horizontal scroll on mobile, wrap on desktop */}
      <div className="overflow-x-auto overflow-y-hidden -mx-4 px-4 md:mx-0 md:px-0 border-b border-rose-100 pb-4 mb-6">
        <div className="flex gap-2 flex-nowrap md:flex-wrap min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOrdersTab(tab.id)}
              className={`flex-shrink-0 px-3 py-2.5 md:px-4 rounded-xl text-sm font-medium transition touch-manipulation ${
                ordersTab === tab.id
                  ? 'bg-rose-500 text-white shadow'
                  : 'bg-white border border-rose-200 text-gray-700 hover:bg-rose-50'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span className={`ml-1 ${ordersTab === tab.id ? 'text-rose-100' : 'text-gray-500'}`}>({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 py-8">No orders yet. Process orders from the Processing dashboard.</p>
      ) : tabFilteredOrders.length === 0 ? (
        <p className="text-gray-500 py-8">No orders in this tab.</p>
      ) : filteredOrders.length === 0 ? (
        <p className="text-gray-500 py-8">No orders match the Order ID search.</p>
      ) : (
        <>
          {/* Mobile: order cards */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((o) => (
              <div key={o._id} className="bg-white rounded-2xl border border-rose-100 p-4 shadow-sm">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="font-mono text-sm font-semibold text-rose-800">{o.orderId}</span>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${statusBadgeClass(o)}`}>
                    {statusLabel(o)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-700">{o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : '–'}</span>
                  <span className="text-gray-500">Total</span>
                  <span className="font-medium">
                    ₹{(Number(o.total) + Number(o.shippingCharge || 0)).toFixed(2)}
                    {(o.shippingCharge || 0) > 0 && <span className="text-xs text-gray-500"> +ship</span>}
                  </span>
                  <span className="text-gray-500">Payment</span>
                  <span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </span>
                  {(o.status === 'shipped' || o.status === 'completed') && o.trackingNumber && (
                    <>
                      <span className="text-gray-500">Tracking</span>
                      <span className="font-mono text-xs">{o.trackingNumber}</span>
                    </>
                  )}
                  {(o.status === 'shipped' || o.status === 'completed') && o.shippingCarrier && (
                    <>
                      <span className="text-gray-500">Shipped by</span>
                      <span className="text-xs text-gray-800">{o.shippingCarrier}</span>
                    </>
                  )}
                </div>
                <div className="pt-3 border-t border-rose-100 space-y-2">
                  <OrderStatusActions
                    order={o}
                    updatingOrderId={updatingOrderId}
                    trackingInput={trackingInput}
                    setTrackingInput={setTrackingInput}
                    carrierInput={carrierInput}
                    setCarrierInput={setCarrierInput}
                    setUpdatingOrderId={setUpdatingOrderId}
                    onUpdate={refreshData}
                    onOpenPackingChecklist={() => setPackingOrder(o)}
                    onAfterAccept={(updated) => {
                      setViewOrder(updated);
                      setEditItemsOrder(null);
                    }}
                    onAfterDecline={(updated) => {
                      setViewOrder(updated);
                      setEditItemsOrder(null);
                    }}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setViewOrder(o)} className="text-xs px-3 py-2 rounded-lg bg-sky-100 text-sky-800 font-medium hover:bg-sky-200" title="View bill details">
                      👁 View
                    </button>
                    {orderHasDelivery(o) && (
                      <button
                        type="button"
                        onClick={() => setViewAddressOrder(o)}
                        className="text-xs px-3 py-2 rounded-lg bg-teal-100 text-teal-800 font-medium hover:bg-teal-200"
                        title="View delivery address"
                      >
                        📍 Address
                      </button>
                    )}
                    <button type="button" onClick={() => setEditItemsOrder(o)} className="text-xs px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200">
                      ✏️ Edit items
                    </button>
                    <button type="button" onClick={() => handleGenerateBill(o._id)} disabled={generatingBillId === o._id} className="text-xs px-3 py-2 rounded-lg bg-purple-100 text-purple-800 font-medium hover:bg-purple-200 disabled:opacity-50">
                      {generatingBillId === o._id ? '…' : '📄 Bill'}
                    </button>
                    {canMarkOrderReturned(o) && (
                      <button
                        type="button"
                        onClick={() => handleMarkReturned(o._id)}
                        disabled={updatingOrderId === o._id}
                        className="text-xs px-3 py-2 rounded-lg bg-orange-100 text-orange-900 font-medium hover:bg-orange-200 disabled:opacity-50"
                        title="Mark order as returned"
                      >
                        ↩ Returned
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl border border-rose-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-cream-100 border-b border-rose-100">
                  <tr>
                    <th className="p-3 font-semibold text-gray-700">Order ID</th>
                    <th className="p-3 font-semibold text-gray-700">Date</th>
                    <th className="p-3 font-semibold text-gray-700">Total</th>
                    <th className="p-3 font-semibold text-gray-700">Payment</th>
                    <th className="p-3 font-semibold text-gray-700">Status</th>
                    <th className="p-3 font-semibold text-gray-700">Tracking / courier</th>
                    <th className="p-3 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o._id} className="border-b border-rose-50 hover:bg-rose-50/50">
                      <td className="p-3 font-mono text-sm">{o.orderId}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN') : '–'}
                      </td>
                      <td className="p-3 font-medium">
                        ₹{(Number(o.total) + Number(o.shippingCharge || 0)).toFixed(2)}
                        {(o.shippingCharge || 0) > 0 && (
                          <span className="block text-xs text-gray-500">incl. ₹{Number(o.shippingCharge).toFixed(2)} ship</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${statusBadgeClass(o)}`}>
                          {statusLabel(o)}
                        </span>
                      </td>
                      <td className="p-3">
                        {(o.status === 'shipped' || o.status === 'completed') && (o.trackingNumber || o.shippingCarrier) ? (
                          <div>
                            {o.trackingNumber ? (
                              <span className="font-mono text-sm block">{o.trackingNumber}</span>
                            ) : null}
                            {o.shippingCarrier ? (
                              <span className="text-xs text-gray-600 block mt-0.5">{o.shippingCarrier}</span>
                            ) : null}
                          </div>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <OrderStatusActions
                            order={o}
                            updatingOrderId={updatingOrderId}
                            trackingInput={trackingInput}
                            setTrackingInput={setTrackingInput}
                            carrierInput={carrierInput}
                            setCarrierInput={setCarrierInput}
                            setUpdatingOrderId={setUpdatingOrderId}
                            onUpdate={refreshData}
                            onOpenPackingChecklist={() => setPackingOrder(o)}
                            onAfterAccept={(updated) => {
                              setViewOrder(updated);
                              setEditItemsOrder(null);
                            }}
                            onAfterDecline={(updated) => {
                              setViewOrder(updated);
                              setEditItemsOrder(null);
                            }}
                          />
                          <div className="flex gap-2 flex-wrap">
                            <button type="button" onClick={() => setViewOrder(o)} className="text-xs px-2 py-1 rounded bg-sky-100 text-sky-800 font-medium hover:bg-sky-200" title="View bill details">
                              👁 View
                            </button>
                            {orderHasDelivery(o) && (
                              <button
                                type="button"
                                onClick={() => setViewAddressOrder(o)}
                                className="text-xs px-2 py-1 rounded bg-teal-100 text-teal-800 font-medium hover:bg-teal-200"
                                title="View delivery address"
                              >
                                📍 Address
                              </button>
                            )}
                            <button type="button" onClick={() => setEditItemsOrder(o)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 font-medium hover:bg-gray-200" title="Edit order items">
                              ✏️ Edit items
                            </button>
                            <button type="button" onClick={() => handleGenerateBill(o._id)} disabled={generatingBillId === o._id} className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800 font-medium hover:bg-purple-200 disabled:opacity-50" title="Generate bill">
                              {generatingBillId === o._id ? 'Generating...' : '📄 Bill'}
                            </button>
                            {canMarkOrderReturned(o) && (
                              <button
                                type="button"
                                onClick={() => handleMarkReturned(o._id)}
                                disabled={updatingOrderId === o._id}
                                className="text-xs px-2 py-1 rounded bg-orange-100 text-orange-900 font-medium hover:bg-orange-200 disabled:opacity-50"
                                title="Mark order as returned"
                              >
                                ↩ Returned
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Packing checklist popup */}
      {packingOrder && (
        <PackingChecklistModal
          order={packingOrder}
          onClose={() => setPackingOrder(null)}
          onConfirm={async (packedItemIndices) => {
            setUpdatingOrderId(packingOrder._id);
            try {
              await adminUpdateOrder(packingOrder._id, { status: 'packed', packedItemIndices });
              setPackingOrder(null);
              refreshData();
            } catch (e) {
              alert(e.message || 'Failed to update');
            } finally {
              setUpdatingOrderId(null);
            }
          }}
          onImageClick={(url) => setLightboxImage(url)}
        />
      )}

      {/* Edit order items modal */}
      {editItemsOrder && (
        <EditOrderItemsModal
          order={editItemsOrder}
          onClose={() => setEditItemsOrder(null)}
          onSave={async (items) => {
            setUpdatingOrderId(editItemsOrder._id);
            try {
              await adminUpdateOrder(editItemsOrder._id, { items });
              setEditItemsOrder(null);
              refreshData();
            } catch (e) {
              alert(e.message || 'Failed to update items');
            } finally {
              setUpdatingOrderId(null);
            }
          }}
          onImageClick={(url) => setLightboxImage(url)}
        />
      )}

      {/* View bill details modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-rose-100 flex justify-between items-center">
              <h2 className="font-display text-lg font-bold text-rose-800">Bill details — {viewOrder.orderId}</h2>
              <button type="button" onClick={() => setViewOrder(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Customer details</h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium">{viewOrder.customerName || '—'}</span>
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium">{viewOrder.customerPhone || '—'}</span>
                </div>
              </div>
              {orderHasDelivery(viewOrder) && (
                <div className="rounded-lg border border-teal-100 bg-teal-50/40 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-2">Delivery address</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewOrder.delivery.address}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Pincode: {viewOrder.delivery.pincode || '—'} · State: {viewOrder.delivery.state || '—'}
                  </p>
                </div>
              )}
              <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Order details</h3>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <span className="text-gray-500">Order No</span>
                  <span className="font-mono font-medium">{viewOrder.orderId}</span>
                  <span className="text-gray-500">Date</span>
                  <span>{viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleString('en-IN') : '—'}</span>
                  <span className="text-gray-500">Payment</span>
                  <span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${viewOrder.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {viewOrder.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </span>
                  {(viewOrder.status === 'shipped' || viewOrder.status === 'completed') && viewOrder.trackingNumber ? (
                    <>
                      <span className="text-gray-500">Tracking</span>
                      <span className="font-mono">{viewOrder.trackingNumber}</span>
                    </>
                  ) : null}
                  {(viewOrder.status === 'shipped' || viewOrder.status === 'completed') && viewOrder.shippingCarrier ? (
                    <>
                      <span className="text-gray-500">Courier</span>
                      <span>{viewOrder.shippingCarrier}</span>
                    </>
                  ) : null}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Items</h3>
                <div className="overflow-x-auto border border-black rounded">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-rose-100 border-b border-black">
                        <th className="p-2 font-semibold text-gray-800 border-r border-black">S.No</th>
                        <th className="p-2 font-semibold text-gray-800 border-r border-black">Product Name</th>
                        <th className="p-2 font-semibold text-gray-800 border-r border-black text-center">Qty</th>
                        <th className="p-2 font-semibold text-gray-800 border-r border-black">Rate</th>
                        <th className="p-2 font-semibold text-gray-800 border-black text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewOrder.items || []).map((item, idx) => {
                        const optionsLine = formatOrderItemOptionsLine(item.selectedOptions);
                        return (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                          <td className="p-2 border-r border-b border-black">{idx + 1}</td>
                          <td className="p-2 border-r border-b border-black align-top">
                            <div>{item.name}{item.nbfCode ? ` (${item.nbfCode})` : ''}</div>
                            {optionsLine ? (
                              <div className="text-xs text-gray-600 mt-1 leading-snug">{optionsLine}</div>
                            ) : null}
                          </td>
                          <td className="p-2 border-r border-b border-black text-center">{item.quantity}</td>
                          <td className="p-2 border-r border-b border-black">₹ {Number(item.price).toFixed(2)}</td>
                          <td className="p-2 border-b border-black text-right">₹ {Number(item.lineTotal).toFixed(2)}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-right space-y-1 text-sm">
                {(() => {
                  const itemsSub = (viewOrder.items || []).reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);
                  const cd = Number(viewOrder.couponDiscount) || 0;
                  return (
                    <>
                      <div className="flex justify-end gap-4">
                        <span className="text-gray-500">Items subtotal</span>
                        <span>₹ {itemsSub.toFixed(2)}</span>
                      </div>
                      {cd > 0 && (
                        <div className="flex justify-end gap-4 text-emerald-800">
                          <span className="text-gray-500">
                            Coupon{viewOrder.couponCode ? ` (${viewOrder.couponCode})` : ''}
                          </span>
                          <span>− ₹ {cd.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  );
                })()}
                {(Number(viewOrder.shippingCharge) || 0) > 0 && (
                  <div className="flex justify-end gap-4">
                    <span className="text-gray-500">Shipping</span>
                    <span>₹ {Number(viewOrder.shippingCharge).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-end gap-4 font-semibold text-rose-800 border-t border-rose-200 pt-2 mt-2">
                  <span>Total Amount</span>
                  <span>₹ {(Number(viewOrder.total) + Number(viewOrder.shippingCharge || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-rose-100 flex justify-end gap-2">
              <button type="button" onClick={() => setViewOrder(null)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-medium hover:bg-gray-200">
                Close
              </button>
              <button type="button" onClick={() => { handleGenerateBill(viewOrder._id); setViewOrder(null); }} disabled={generatingBillId === viewOrder._id} className="px-4 py-2 rounded-lg bg-purple-100 text-purple-800 font-medium hover:bg-purple-200 disabled:opacity-50">
                {generatingBillId === viewOrder._id ? '…' : '📄 Generate Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery address (from WhatsApp order) */}
      {viewAddressOrder && orderHasDelivery(viewAddressOrder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-rose-100 flex justify-between items-center">
              <h2 className="font-display text-lg font-bold text-rose-800">Delivery address</h2>
              <button type="button" onClick={() => setViewAddressOrder(null)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-4 text-sm">
              <p className="font-mono text-xs text-gray-500">{viewAddressOrder.orderId}</p>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">Address</span>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{viewAddressOrder.delivery.address || '—'}</p>
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                <span className="text-gray-500">Pincode</span>
                <span className="font-medium">{viewAddressOrder.delivery.pincode || '—'}</span>
                <span className="text-gray-500">State</span>
                <span className="font-medium">{viewAddressOrder.delivery.state || '—'}</span>
              </div>
            </div>
            <div className="p-4 border-t border-rose-100">
              <button
                type="button"
                onClick={() => setViewAddressOrder(null)}
                className="w-full px-4 py-2.5 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox for packers */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white text-2xl hover:opacity-80"
          >
            ×
          </button>
          <img
            src={lightboxImage}
            alt="Product"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DashboardPage>
  );
}

function PackingChecklistModal({ order, onClose, onConfirm, onImageClick }) {
  const items = order?.items || [];
  const [checked, setChecked] = useState(() => items.map((_, i) => false));
  const allChecked = items.length > 0 && checked.every(Boolean);
  const toggle = (idx) => setChecked((c) => c.map((v, i) => (i === idx ? !v : v)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-rose-800">Packing checklist — {order?.orderId}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-600 mb-3">Tick each item when packed. Confirm when all are done.</p>
          <ul className="space-y-3">
            {items.map((item, idx) => {
              const optionsLine = formatOrderItemOptionsLine(item.selectedOptions);
              return (
              <li
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl border ${checked[idx] ? 'bg-green-50 border-green-200' : 'bg-cream-50 border-rose-100'}`}
              >
                <input
                  type="checkbox"
                  checked={checked[idx]}
                  onChange={() => toggle(idx)}
                  className="w-5 h-5 text-rose-500 rounded"
                />
                <button
                  type="button"
                  onClick={() => item.image && onImageClick(item.image)}
                  className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-rose-200 hover:ring-2 hover:ring-rose-400 focus:outline-none"
                >
                  <img
                    src={item.image || 'https://placehold.co/56x56/fce7f3/9f1239?text=No+Image'}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {optionsLine ? (
                    <p className="text-xs text-rose-800 mt-0.5 leading-snug">{optionsLine}</p>
                  ) : null}
                  <p className="text-sm text-gray-600">₹{item.price} × {item.quantity} = ₹{item.lineTotal}</p>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
        <div className="p-4 border-t border-rose-100 flex justify-between items-center">
          <span className="text-sm text-gray-600">{checked.filter(Boolean).length} / {items.length} packed</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(checked.map((v, i) => v ? i : -1).filter((i) => i >= 0))}
              disabled={!allChecked}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditOrderItemsModal({ order, onClose, onSave, onImageClick }) {
  const [items, setItems] = useState(() => (order?.items || []).map((i) => ({ ...i })));
  const [saving, setSaving] = useState(false);

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [field]: value };
      if (field === 'price' || field === 'quantity') {
        next.lineTotal = (Number(next.price) || 0) * (Number(next.quantity) || 1);
      }
      return next;
    }));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const withTotals = items.map((it) => ({
      ...it,
      quantity: Number(it.quantity) || 1,
      price: Number(it.price) || 0,
      lineTotal: Number(it.lineTotal) || (Number(it.price) || 0) * (Number(it.quantity) || 1),
    }));
    setSaving(true);
    onSave(withTotals).finally(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-rose-800">Edit items — {order?.orderId}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <li key={idx} className="flex items-center gap-3 p-3 rounded-xl border bg-cream-50 border-rose-100">
                <button
                  type="button"
                  onClick={() => item.image && onImageClick(item.image)}
                  className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-rose-200 hover:ring-2 hover:ring-rose-400"
                >
                  <img src={item.image || 'https://placehold.co/56x56/fce7f3/9f1239?text=No+Image'} alt="" className="w-full h-full object-cover" />
                </button>
                <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    className="border border-rose-200 rounded px-2 py-1"
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    value={item.nbfCode ?? ''}
                    onChange={(e) => updateItem(idx, 'nbfCode', e.target.value)}
                    className="border border-rose-200 rounded px-2 py-1"
                    placeholder="NBF code"
                  />
                  <div className="col-span-2 flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updateItem(idx, 'price', e.target.value)}
                      className="w-24 border border-rose-200 rounded px-2 py-1"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className="w-20 border border-rose-200 rounded px-2 py-1"
                    />
                    <span className="py-1">= ₹{Number(item.quantity || 0) * Number(item.price || 0)}</span>
                  </div>
                </div>
                <button type="button" onClick={() => removeItem(idx)} className="text-red-600 text-sm px-2">× Remove</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 border-t border-rose-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg font-medium">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || items.length === 0} className="px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoriesPageContent({ categories, onUpdate }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [iconEmoji, setIconEmoji] = useState('🛍️');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!iconFile) {
      setIconPreview(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name || slug || '');
      fd.append('slug', slug || name?.toLowerCase().replace(/\s+/g, '-') || '');
      if (iconFile) {
        fd.append('image', iconFile);
      } else {
        fd.append('icon', iconEmoji || '🛍️');
      }
      fd.append('description', description.trim());
      await adminCreateCategory(fd);
      setName('');
      setSlug('');
      setDescription('');
      setIconEmoji('🛍️');
      setIconFile(null);
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, newName, newSlug, existingIcon) => {
    setError('');
    try {
      const file = document.getElementById(`edit-file-${id}`)?.files?.[0];
      const emojiRaw = document.getElementById(`edit-icon-${id}`)?.value?.trim() ?? '';
      const fd = new FormData();
      fd.append('name', newName);
      fd.append('slug', newSlug);
      if (file) {
        fd.append('image', file);
      } else {
        fd.append('icon', emojiRaw !== '' ? emojiRaw : (existingIcon || '🛍️'));
      }
      const desc = document.getElementById(`edit-desc-${id}`)?.value ?? '';
      fd.append('description', String(desc).trim());
      await adminUpdateCategory(id, fd);
      setEditing(null);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category?')) return;
    setError('');
    try {
      await adminDeleteCategory(id);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-rose-100 p-4 sm:p-6">
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
      <form onSubmit={handleAdd} className="space-y-3 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap gap-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="border border-rose-200 rounded-lg px-3 py-2.5 w-full" />
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug" className="border border-rose-200 rounded-lg px-3 py-2.5 w-full" />
          <button type="submit" disabled={saving} className="bg-rose-500 text-white px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 touch-manipulation md:shrink-0">
            Add Category
          </button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categories page blurb</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description shown under the category name on the storefront Categories page"
            rows={2}
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[2.75rem]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-600 shrink-0">Icon</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setIconFile(e.target.files?.[0] || null)}
            className="text-sm max-w-[200px]"
          />
          <span className="text-sm text-gray-500">or emoji</span>
          <input
            type="text"
            value={iconEmoji}
            onChange={(e) => setIconEmoji(e.target.value)}
            placeholder="🛍️"
            disabled={!!iconFile}
            className="w-24 border border-rose-200 rounded-lg px-3 py-2.5 text-center disabled:opacity-50"
          />
          <div className="w-11 h-11 rounded-lg border border-rose-100 bg-cream-50 flex items-center justify-center overflow-hidden text-xl">
            {iconPreview ? (
              <img src={iconPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{iconEmoji || '🛍️'}</span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500">Upload an image (square works best) or leave emoji when no file is chosen.</p>
      </form>
      <ul className="divide-y divide-rose-100">
        {categories.map((c) => (
          <li key={c._id} className="py-3 sm:py-4">
            {editing?._id === c._id ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
                  <input type="text" defaultValue={editing.name} id={`edit-name-${c._id}`} className="flex-1 min-w-0 border border-rose-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="text" defaultValue={editing.slug} id={`edit-slug-${c._id}`} className="flex-1 min-w-0 border border-rose-200 rounded-lg px-3 py-2 text-sm" />
                  <input type="file" accept="image/*" id={`edit-file-${c._id}`} className="text-sm max-w-[200px]" />
                  <input
                    type="text"
                    key={isCategoryIconImage(editing.icon) ? 'url' : 'emoji'}
                    defaultValue={isCategoryIconImage(editing.icon) ? '' : (editing.icon || '🛍️')}
                    id={`edit-icon-${c._id}`}
                    placeholder="Emoji if no new image"
                    className="w-36 border border-rose-200 rounded-lg px-2 py-2 text-sm text-center"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          c._id,
                          document.getElementById(`edit-name-${c._id}`)?.value,
                          document.getElementById(`edit-slug-${c._id}`)?.value,
                          editing.icon
                        )
                      }
                      className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-medium"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm">
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categories page blurb</label>
                  <textarea
                    id={`edit-desc-${c._id}`}
                    defaultValue={editing.description || ''}
                    rows={2}
                    placeholder="Short description on the Categories page"
                    className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 rounded-lg border border-rose-100 overflow-hidden flex items-center justify-center flex-shrink-0 bg-cream-50">
                  <CategoryIcon
                    icon={c.icon}
                    className="text-2xl"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{c.name}</span>
                  {(c.description && String(c.description).trim()) ? (
                    <span className="text-xs text-gray-500 line-clamp-2">{c.description}</span>
                  ) : null}
                </div>
                <span className="text-gray-500 text-sm">{c.slug}</span>
                <span className="text-gray-400 text-sm">({c.count ?? 0} products)</span>
                <div className="flex gap-2 flex-shrink-0">
                  <button type="button" onClick={() => setEditing(c)} className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-sm font-medium touch-manipulation">Edit</button>
                  <button type="button" onClick={() => handleDelete(c._id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium touch-manipulation">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {categories.length === 0 && <p className="text-gray-500 text-sm py-4">No categories. Add one above.</p>}
    </div>
  );
}

function BannersPageContent({ banners, setBanners, categories }) {
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await adminDeleteBanner(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
      <div className="mb-4">
        <button onClick={() => setModal('add')} className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-rose-600 touch-manipulation">
          + Add Banner
        </button>
      </div>
      {banners.length === 0 ? (
        <p className="text-gray-500 py-8">No banners. Add your first banner.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden">
          <div className="divide-y divide-rose-100">
            {banners.map((banner) => (
              <div key={banner._id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <img src={banner.image} alt={banner.title} className="w-full sm:w-32 h-40 sm:h-20 object-cover rounded-xl flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800">{banner.title}</h3>
                  {banner.description && <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{banner.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Link: {banner.linkType === 'category' ? `Category: ${banner.linkValue}` : banner.linkType === 'shop' ? 'Shop' : banner.linkValue}
                    {banner.active ? ' • Active' : ' • Inactive'} • Order: {banner.order}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => setModal({ banner })} className="px-3 py-2 rounded-lg bg-rose-100 text-rose-700 text-sm font-medium touch-manipulation">Edit</button>
                  <button onClick={() => handleDelete(banner._id)} className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium touch-manipulation">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {modal && (
        <BannerFormModal
          banner={modal === 'add' ? null : modal.banner}
          categories={categories}
          onClose={() => { setModal(null); setError(''); }}
          onSave={async (formData) => {
            setError('');
            setSaving(true);
            try {
              if (modal === 'add') {
                const created = await adminCreateBanner(formData);
                setBanners((prev) => [created, ...prev]);
              } else {
                const updated = await adminUpdateBanner(modal.banner._id, formData);
                setBanners((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
              }
              setModal(null);
            } catch (e) {
              setError(e.message || 'Failed to save');
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function ProcessingTab({ formError, setFormError }) {
  const navigate = useNavigate();
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null); // { order, bill }
  const [includeShipping, setIncludeShipping] = useState(false);
  const [shippingCharge, setShippingCharge] = useState('');

  const isValid =
    parsed &&
    parsed.items.length > 0 &&
    !parsed.messageTampered &&
    parsed.totalValid &&
    parsed.allItemsValid &&
    parsed.deliveryComplete !== false;

  const handleParse = async () => {
    setFormError('');
    setParsed(null);
    setCreatedOrder(null);
    if (!rawText.trim()) {
      setFormError('Paste order text first.');
      return;
    }
    setParsing(true);
    try {
      const data = await adminParseOrder(rawText.trim());
      setParsed(data);
    } catch (e) {
      setFormError(e.message || 'Failed to parse');
    } finally {
      setParsing(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!isValid || !parsed) return;
    const shipCharge = includeShipping ? (parseFloat(shippingCharge) || 0) : 0;
    if (includeShipping && (shippingCharge === '' || isNaN(parseFloat(shippingCharge)) || parseFloat(shippingCharge) < 0)) {
      setFormError('Enter a valid shipping charge amount.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const data = await adminCreateOrder({
        rawMessage: rawText,
        items: parsed.items,
        total: parsed.total,
        totalValid: true,
        shippingCharge: shipCharge,
        delivery: parsed.delivery || undefined,
      });
      setCreatedOrder(data);
    } catch (e) {
      setFormError(e.message || 'Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const resetFlow = () => {
    setRawText('');
    setParsed(null);
    setCreatedOrder(null);
    setIncludeShipping(false);
    setShippingCharge('');
    setFormError('');
  };

  return (
    <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden p-6">
      <h2 className="font-display text-xl font-bold text-rose-800 mb-4">Process Order</h2>
      <p className="text-sm text-gray-600 mb-4">
        Paste the WhatsApp order message below. We validate line items (NBF), totals, and—if present—the{' '}
        <strong>*Delivery address*</strong> block (Address / Pincode / State). That address is saved on the order and shown on the bill.
      </p>
      {formError && (
        <div className="mb-4 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
      )}
      <textarea
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        placeholder={`Paste full message including optional footer:\n\nHi, I would like to place an order:\n• name (NBF: x) – ₹price x qty = ₹lineTotal\nTotal: ₹total\n\n*Delivery address*\nAddress: …\nPincode: …\nState: …`}
        rows={6}
        className="w-full border border-rose-200 rounded-lg px-3 py-2 font-mono text-sm"
      />
      <div className="flex gap-3 mt-3">
        <button
          type="button"
          onClick={handleParse}
          disabled={parsing}
          className="bg-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50"
        >
          {parsing ? 'Parsing…' : 'Parse & validate'}
        </button>
        {parsed && (
          <button
            type="button"
            onClick={resetFlow}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {parsed && parsed.items.length > 0 && (
        <div className="mt-6 pt-6 border-t border-rose-100">
          {parsed.messageTampered && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-800">
              <strong>Message may be tampered.</strong> Prices or total do not match our product (NBF) prices. Fix the order message or verify with the customer before creating an order.
            </div>
          )}
          {parsed.hasDeliverySection && !parsed.deliveryComplete && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 border border-red-200 text-red-800">
              <strong>Delivery section incomplete.</strong> After <code className="text-xs">*Delivery address*</code> we need{' '}
              <strong>Address:</strong>, <strong>Pincode:</strong>, and <strong>State:</strong> lines (as in the customer WhatsApp message). Fix the paste or ask the customer to resend.
            </div>
          )}
          {!parsed.messageTampered && parsed.totalValid && parsed.allItemsValid && parsed.deliveryComplete !== false && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-green-50 text-green-800">
              Order validated: all NBF prices and total match
              {parsed.hasDeliverySection ? ' and delivery address parsed.' : '.'} Create order to generate order ID and send to confirmation state.
            </div>
          )}
          {!parsed.messageTampered && (!parsed.totalValid || !parsed.allItemsValid) && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-amber-50 text-amber-800">
              {!parsed.totalValid && `Total mismatch: calculated ₹${parsed.calculatedTotal} vs stated ₹${parsed.totalFromMessage ?? parsed.total}. `}
              {!parsed.allItemsValid && 'Some line prices or totals do not match product (NBF) price. '}
              Resolve errors before creating order.
            </div>
          )}

          {/* Valid – show items review and Create order button */}
          {isValid && !createdOrder && (
            <>
              {parsed.hasDeliverySection && parsed.delivery && parsed.deliveryComplete && (
                <div className="mb-4 p-4 rounded-xl border border-teal-100 bg-teal-50/80">
                  <p className="text-sm font-semibold text-teal-900 mb-2">Delivery (saved on order)</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{parsed.delivery.address}</p>
                  <p className="text-sm text-gray-600 mt-2">
                    Pincode: {parsed.delivery.pincode} · State: {parsed.delivery.state}
                  </p>
                </div>
              )}
              <p className="text-sm font-medium text-gray-700 mb-2">Review items:</p>
              <ul className="space-y-3 mb-4">
                {parsed.items.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-4 p-3 rounded-xl border bg-cream-50 border-rose-100">
                    <img src={item.image || 'https://placehold.co/64x64/fce7f3/9f1239?text=No+Image'} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      {item.nbfCode && <span className="text-gray-500 text-sm ml-1">(NBF: {item.nbfCode})</span>}
                      <span className="block text-sm text-gray-600">₹{item.price} × {item.quantity} = ₹{item.lineTotal}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mb-4 p-4 rounded-xl border border-rose-100 bg-cream-50">
                <label className="flex items-center gap-3 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={includeShipping}
                    onChange={(e) => setIncludeShipping(e.target.checked)}
                    className="w-4 h-4 text-rose-500 rounded"
                  />
                  <span className="font-medium text-gray-800">Include shipping charge</span>
                </label>
                {includeShipping && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-gray-600">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingCharge}
                      onChange={(e) => setShippingCharge(e.target.value)}
                      placeholder="Enter amount"
                      className="w-32 border border-rose-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">
                  Subtotal: ₹{parsed.total}
                  {includeShipping && !Number.isNaN(parseFloat(shippingCharge)) && (
                    <span className="ml-2 text-rose-600">
                      | Shipping: ₹{(parseFloat(shippingCharge) || 0).toFixed(2)} | Total: ₹{(Number(parsed.total) + (parseFloat(shippingCharge) || 0)).toFixed(2)}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  disabled={saving}
                  className="bg-rose-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
                >
                  {saving ? 'Creating…' : 'Create order & generate order ID'}
                </button>
              </div>
            </>
          )}

          {/* Order created – show order ID and bill */}
          {createdOrder && (
            <>
              <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-200">
                <p className="font-semibold text-green-800">Order created</p>
                <p className="text-lg font-mono font-bold text-green-900 mt-1">Order ID: {createdOrder.order?.orderId}</p>
                <p className="text-sm text-green-700 mt-2">Status: Pending — confirm in Orders tab to proceed.</p>
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                {isBillHtml(createdOrder.bill) && (
                  <button
                    type="button"
                    onClick={() => printHtmlBill(createdOrder.bill)}
                    className="text-sm px-3 py-1.5 rounded-lg bg-rose-500 text-white font-medium hover:bg-rose-600"
                  >
                    Print / Save as PDF
                  </button>
                )}
                <Link to="/admin/dashboard/orders" className="text-rose-600 font-medium hover:underline">
                  View in Orders →
                </Link>
                <button type="button" onClick={resetFlow} className="text-green-700 font-medium hover:underline">
                  Process another order
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {parsed && parsed.items.length === 0 && (
        <p className="mt-4 text-amber-700 text-sm">
          No order lines found. Use: • name (NBF: x) – ₹price x qty = ₹lineTotal and Total: ₹total. Optional: *Delivery address* then Address / Pincode / State lines.
        </p>
      )}
    </div>
  );
}

function ConfirmOrderModal({ orderId, customerName, customerPhone, setCustomerName, setCustomerPhone, onClose, onConfirm, updating }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h3 className="font-display text-lg font-bold text-rose-800 mb-1">Confirm order</h3>
        <p className="text-sm text-gray-500 mb-4">Order ID: {orderId}</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              className="w-full border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Enter phone number"
              className="w-full border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onConfirm}
            disabled={updating}
            className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
          >
            {updating ? 'Confirming...' : 'Confirm order'}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderStatusActions({
  order,
  updatingOrderId,
  trackingInput,
  setTrackingInput,
  carrierInput,
  setCarrierInput,
  setUpdatingOrderId,
  onUpdate,
  onOpenPackingChecklist,
  onAfterAccept,
  onAfterDecline,
}) {
  const [showTracking, setShowTracking] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [updatePopupOpen, setUpdatePopupOpen] = useState(false);
  const [confirmCustomerName, setConfirmCustomerName] = useState(order.customerName || '');
  const [confirmCustomerPhone, setConfirmCustomerPhone] = useState(order.customerPhone || '');
  const status =
    order.status === 'completed' ? 'confirmed' : order.status === 'returned' ? 'returned' : order.status || 'pending';
  const paymentStatus = order.paymentStatus || 'pending';
  const isPaid = paymentStatus === 'paid';
  const isPending = status === 'pending';
  const isCancelled = status === 'cancelled';
  const isReturned = status === 'returned';
  const showAcceptDecline = isPending;

  useEffect(() => {
    if (!updatePopupOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setUpdatePopupOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [updatePopupOpen]);

  useEffect(() => {
    if (!showTracking) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowTracking(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showTracking]);

  const openShipForm = () => {
    setUpdatePopupOpen(false);
    setTrackingInput((prev) => ({
      ...prev,
      [order._id]: order.trackingNumber || prev[order._id] || '',
    }));
    setCarrierInput((prev) => ({
      ...prev,
      [order._id]: order.shippingCarrier || prev[order._id] || '',
    }));
    setShowTracking(true);
  };

  const handlePaymentStatus = async (newPaymentStatus) => {
    setUpdatingOrderId(order._id);
    try {
      await adminUpdateOrder(order._id, { paymentStatus: newPaymentStatus });
      onUpdate();
    } catch (e) {
      alert(e.message || 'Failed to update payment status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleStatus = async (newStatus) => {
    setUpdatingOrderId(order._id);
    try {
      const payload = { status: newStatus };
      if (newStatus === 'shipped') {
        payload.trackingNumber = String(trackingInput[order._id] || '').trim();
        payload.shippingCarrier = String(carrierInput[order._id] || '').trim();
      }
      await adminUpdateOrder(order._id, payload);
      onUpdate();
      if (newStatus === 'shipped') {
        setShowTracking(false);
        setTrackingInput((prev) => {
          const next = { ...prev };
          delete next[order._id];
          return next;
        });
        setCarrierInput((prev) => {
          const next = { ...prev };
          delete next[order._id];
          return next;
        });
      }
    } catch (e) {
      alert(e.message || 'Failed to update');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const submitShipped = () => {
    const tn = String(trackingInput[order._id] || '').trim();
    const sc = String(carrierInput[order._id] || '').trim();
    if (!tn || !sc) {
      alert('Please enter the tracking ID and the shipping company name.');
      return;
    }
    handleStatus('shipped');
  };

  const handleCancelOrder = () => {
    if (!confirm('Mark this order as cancelled? (e.g. customer cancelled the order)')) return;
    setUpdatePopupOpen(false);
    handleStatus('cancelled');
  };

  const handleAcceptOrder = () => {
    // Open confirm modal to capture/adjust customer details before confirming.
    setUpdatePopupOpen(false);
    setConfirmCustomerName(order.customerName || '');
    setConfirmCustomerPhone(order.customerPhone || '');
    setShowConfirmModal(true);
  };

  const handleDeclineOrder = async () => {
    if (!confirm('Decline this order?')) return;
    setUpdatingOrderId(order._id);
    try {
      await adminUpdateOrder(order._id, { status: 'cancelled' });
      const updated = { ...order, status: 'cancelled' };
      onUpdate();
      onAfterDecline?.(updated);
    } catch (e) {
      alert(e.message || 'Failed to decline order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleMarkReturnedOrder = () => {
    if (!confirm('Mark this order as returned? (e.g. customer sent items back.)')) return;
    setUpdatePopupOpen(false);
    handleStatus('returned');
  };

  const showCancelInMenu = !isCancelled && !isReturned && status !== 'shipped';
  const showConfirmInMenu = isPending;
  const showMarkPaidInMenu = !isPending && !isPaid && !isCancelled && !isReturned;
  const showMarkPackedInMenu =
    !isPending && isPaid && status !== 'packed' && status !== 'shipped' && !isCancelled && !isReturned;
  const showMarkShippedInMenu = status === 'packed' && !showTracking && !isReturned;
  const showAddTrackingInMenu =
    status === 'shipped' && (!order.trackingNumber || !order.shippingCarrier) && !showTracking && !isReturned;
  const showMarkReturnedInMenu = (status === 'shipped' || status === 'packed') && !isReturned && !isCancelled;
  const hasUpdateMenu =
    showCancelInMenu ||
    showConfirmInMenu ||
    showMarkPaidInMenu ||
    showMarkPackedInMenu ||
    showMarkShippedInMenu ||
    showAddTrackingInMenu ||
    showMarkReturnedInMenu;

  const popupBtnClass =
    'block w-full text-left text-sm px-4 py-3 rounded-xl border-0 font-medium transition disabled:opacity-50';

  return (
    <div className="flex flex-wrap items-start gap-2">
      {showAcceptDecline ? (
        <>
          <button
            type="button"
            onClick={handleAcceptOrder}
            disabled={updatingOrderId === order._id}
            className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-medium hover:bg-emerald-100 disabled:opacity-50"
          >
            ✅ Accept
          </button>
          <button
            type="button"
            onClick={handleDeclineOrder}
            disabled={updatingOrderId === order._id}
            className="text-xs px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 font-medium hover:bg-rose-100 disabled:opacity-50"
          >
            ❌ Decline
          </button>
        </>
      ) : (
        hasUpdateMenu && (
          <button
            type="button"
            onClick={() => setUpdatePopupOpen(true)}
            disabled={updatingOrderId === order._id}
            className="text-xs px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-800 font-medium hover:bg-rose-50 disabled:opacity-50"
            aria-haspopup="dialog"
          >
            Update order
          </button>
        )
      )}

      {updatePopupOpen && hasUpdateMenu && !showAcceptDecline && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="update-order-popup-title"
          onClick={() => setUpdatePopupOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] overflow-y-auto border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-rose-100 flex items-center justify-between gap-2">
              <div>
                <h3 id="update-order-popup-title" className="font-display text-lg font-bold text-rose-800">
                  Update order
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{order.orderId}</p>
              </div>
              <button
                type="button"
                onClick={() => setUpdatePopupOpen(false)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {showCancelInMenu && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-red-50 text-red-800 hover:bg-red-100`}
                >
                  Cancel order
                </button>
              )}
              {showConfirmInMenu && (
                <button
                  type="button"
                  onClick={() => {
                    setUpdatePopupOpen(false);
                    setConfirmCustomerName(order.customerName || '');
                    setConfirmCustomerPhone(order.customerPhone || '');
                    setShowConfirmModal(true);
                  }}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-rose-50 text-rose-800 hover:bg-rose-100`}
                >
                  Confirm order
                </button>
              )}
              {showMarkPaidInMenu && (
                <button
                  type="button"
                  onClick={() => {
                    setUpdatePopupOpen(false);
                    handlePaymentStatus('paid');
                  }}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-blue-50 text-blue-800 hover:bg-blue-100`}
                >
                  Mark Paid
                </button>
              )}
              {showMarkPackedInMenu && (
                <button
                  type="button"
                  onClick={() => {
                    setUpdatePopupOpen(false);
                    if (onOpenPackingChecklist) {
                      onOpenPackingChecklist();
                    } else {
                      handleStatus('packed');
                    }
                  }}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-amber-50 text-amber-800 hover:bg-amber-100`}
                >
                  Mark Packed
                </button>
              )}
              {showMarkShippedInMenu && (
                <button
                  type="button"
                  onClick={openShipForm}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-green-50 text-green-800 hover:bg-green-100`}
                >
                  Mark Shipped
                </button>
              )}
              {showAddTrackingInMenu && (
                <button
                  type="button"
                  onClick={openShipForm}
                  className={`${popupBtnClass} bg-green-50 text-green-700 hover:bg-green-100`}
                >
                  Add tracking
                </button>
              )}
              {showMarkReturnedInMenu && (
                <button
                  type="button"
                  onClick={handleMarkReturnedOrder}
                  disabled={updatingOrderId === order._id}
                  className={`${popupBtnClass} bg-orange-50 text-orange-900 hover:bg-orange-100`}
                >
                  Mark returned
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <ConfirmOrderModal
          orderId={order.orderId}
          customerName={confirmCustomerName}
          customerPhone={confirmCustomerPhone}
          setCustomerName={setConfirmCustomerName}
          setCustomerPhone={setConfirmCustomerPhone}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={async () => {
            setUpdatingOrderId(order._id);
            try {
              const nextCustomerName = confirmCustomerName.trim();
              const nextCustomerPhone = confirmCustomerPhone.trim();
              await adminUpdateOrder(order._id, {
                status: 'confirmed',
                customerName: nextCustomerName,
                customerPhone: nextCustomerPhone,
              });
              setShowConfirmModal(false);
              onUpdate();
              onAfterAccept?.({
                ...order,
                status: 'confirmed',
                customerName: nextCustomerName,
                customerPhone: nextCustomerPhone,
              });
            } catch (e) {
              alert(e.message || 'Failed to confirm order');
            } finally {
              setUpdatingOrderId(null);
            }
          }}
          updating={updatingOrderId === order._id}
        />
      )}

      {showTracking && (
        <div
          className="fixed inset-0 z-[301] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ship-order-modal-title"
          onClick={() => setShowTracking(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full border border-rose-100 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="ship-order-modal-title" className="font-display text-lg font-bold text-rose-800">
              Shipment details
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-1 mb-4">{order.orderId}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tracking ID</label>
                <input
                  type="text"
                  autoComplete="off"
                  value={trackingInput[order._id] || ''}
                  onChange={(e) => setTrackingInput((prev) => ({ ...prev, [order._id]: e.target.value }))}
                  className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. AWB / consignment number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipped by (company)</label>
                <input
                  type="text"
                  autoComplete="organization"
                  value={carrierInput[order._id] || ''}
                  onChange={(e) => setCarrierInput((prev) => ({ ...prev, [order._id]: e.target.value }))}
                  className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="e.g. Blue Dart, DTDC, India Post"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowTracking(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  submitShipped();
                  setUpdatePopupOpen(false);
                }}
                disabled={updatingOrderId === order._id}
                className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {updatingOrderId === order._id ? 'Saving…' : 'Mark shipped'}
              </button>
            </div>
          </div>
        </div>
      )}
      {(order.status === 'shipped' || order.status === 'completed') &&
        (order.trackingNumber || order.shippingCarrier) && (
        <div className="text-xs text-gray-500 space-y-0.5 w-full min-w-0">
          {order.trackingNumber ? <p className="font-mono break-all">{order.trackingNumber}</p> : null}
          {order.shippingCarrier ? <p className="text-gray-600">{order.shippingCarrier}</p> : null}
        </div>
      )}
    </div>
  );
}

function ProductFormModal({ product, categories = [], saving, formError, onClose, onSave }) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price ?? '');
  const [originalPrice, setOriginalPrice] = useState(product?.originalPrice ?? '');
  const [category, setCategory] = useState(product?.category || (categories[0]?.slug || ''));
  const [nbfCode, setNbfCode] = useState(product?.nbfCode || '');
  const [suggestingNbf, setSuggestingNbf] = useState(false);
  const [options, setOptions] = useState(
    product?.options?.length 
      ? product.options.map((o) => {
          const values = (o.values || []).map(v => {
            if (typeof v === 'string') {
              return { value: v, inStock: true, price: '' };
            }
            const price = v.price != null && v.price !== '' ? v.price : '';
            return { value: v.value || v, inStock: v.inStock !== false, price };
          });
          return { name: o.name, values };
        })
      : []
  );
  const [inStock, setInStock] = useState(product?.inStock !== false);
  const [featured, setFeatured] = useState(product?.featured || false);
  const [newArrivals, setNewArrivals] = useState(product?.newArrivals || false);
  const [visible, setVisible] = useState(product?.visible !== false);
  const [images, setImages] = useState(product?.images || []);
  const [newFiles, setNewFiles] = useState([]);

  const addOption = () => setOptions((o) => [...o, { name: '', values: [] }]);
  const removeOption = (i) => setOptions((o) => o.filter((_, idx) => idx !== i));
  const updateOption = (i, field, value) =>
    setOptions((o) => o.map((opt, idx) => (idx === i ? { ...opt, [field]: value } : opt)));
  
  const addOptionValue = (optIndex) => {
    setOptions((o) => o.map((opt, idx) => 
      idx === optIndex 
        ? { ...opt, values: [...(opt.values || []), { value: '', inStock: true, price: '' }] }
        : opt
    ));
  };
  
  const removeOptionValue = (optIndex, valIndex) => {
    setOptions((o) => o.map((opt, idx) => 
      idx === optIndex 
        ? { ...opt, values: opt.values.filter((_, vIdx) => vIdx !== valIndex) }
        : opt
    ));
  };
  
  const updateOptionValue = (optIndex, valIndex, field, value) => {
    setOptions((o) => o.map((opt, idx) => 
      idx === optIndex 
        ? {
            ...opt,
            values: opt.values.map((v, vIdx) => 
              vIdx === valIndex ? { ...v, [field]: value } : v
            )
          }
        : opt
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('price', String(price));
    if (originalPrice) formData.append('originalPrice', String(originalPrice));
    formData.append('category', category);
    if (nbfCode) formData.append('nbfCode', nbfCode.trim());
    formData.append('options', JSON.stringify(
      options
        .filter((o) => o.name.trim())
        .map((o) => ({
          name: o.name.trim(),
          values: (o.values || [])
            .filter(v => v.value && v.value.trim())
            .map((v) => {
              const val = typeof v === 'string' ? { value: v.trim(), inStock: true, price: 0 } : v;
              const price = val.price !== '' && val.price != null && !Number.isNaN(Number(val.price)) ? Number(val.price) : 0;
              return {
                value: (val.value || '').trim(),
                inStock: val.inStock !== false,
                price
              };
            })
        }))
    ));
    formData.append('inStock', inStock);
    formData.append('featured', featured);
    formData.append('newArrivals', newArrivals);
    formData.append('visible', visible);
    if (isEdit) formData.append('existingImages', JSON.stringify(images));
    newFiles.forEach((file) => formData.append('images', file));
    onSave(formData);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-rose-800">
            {isEdit ? 'Edit Product' : 'Add Product'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Original Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            >
              {categories.map((c) => (
                <option key={c.id || c.slug} value={c.slug}>{c.name}</option>
              ))}
              {categories.length === 0 && <option value="">Add categories first</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">NBF Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nbfCode}
                onChange={(e) => setNbfCode(e.target.value)}
                placeholder="e.g. 001 (shown in orders)"
                className="flex-1 border border-rose-200 rounded-lg px-3 py-2"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setSuggestingNbf(true);
                    getSuggestedNbf()
                      .then((d) => setNbfCode(d.suggestedNbf || ''))
                      .catch(() => {})
                      .finally(() => setSuggestingNbf(false));
                  }}
                  disabled={suggestingNbf}
                  className="px-3 py-2 border border-rose-300 rounded-lg text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 whitespace-nowrap"
                >
                  {suggestingNbf ? '…' : 'Suggest next'}
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Options (e.g. Size, Color)</label>
            {options.map((opt, i) => (
              <div key={i} className="mb-4 p-3 border border-rose-200 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={opt.name}
                    onChange={(e) => updateOption(i, 'name', e.target.value)}
                    placeholder="Option name (e.g. Size)"
                    className="flex-1 border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button type="button" onClick={() => removeOption(i)} className="text-red-600 text-sm px-2">×</button>
                </div>
                <div className="ml-2 space-y-2">
                  {(opt.values || []).map((val, valIdx) => (
                    <div key={valIdx} className="flex gap-2 items-center flex-wrap">
                      <input
                        type="text"
                        value={typeof val === 'string' ? val : (val.value || '')}
                        onChange={(e) => updateOptionValue(i, valIdx, 'value', e.target.value)}
                        placeholder="Value (e.g. Small)"
                        className="flex-1 min-w-[80px] border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">+₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={typeof val === 'string' ? '' : (val.price ?? '')}
                          onChange={(e) => updateOptionValue(i, valIdx, 'price', e.target.value === '' ? '' : e.target.value)}
                          placeholder="0"
                          className="w-16 border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
                          title="Extra price for this option"
                        />
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={typeof val === 'string' ? true : (val.inStock !== false)}
                          onChange={(e) => updateOptionValue(i, valIdx, 'inStock', e.target.checked)}
                          className="text-rose-500"
                        />
                        <span>In Stock</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeOptionValue(i, valIdx)}
                        className="text-red-600 text-sm px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOptionValue(i)}
                    className="text-xs text-rose-600 font-medium hover:underline"
                  >
                    + Add value
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addOption} className="text-sm text-rose-600 font-medium hover:underline">
              + Add option
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              <span className="text-sm">In stock</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              <span className="text-sm">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newArrivals} onChange={(e) => setNewArrivals(e.target.checked)} />
              <span className="text-sm">New Arrivals</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} />
              <span className="text-sm">Visible on website</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {images.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded" />
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setNewFiles(Array.from(e.target.files || []))}
              className="w-full text-sm"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Product'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoriesModal({ categories, onClose, onUpdate }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [iconEmoji, setIconEmoji] = useState('🛍️');
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!iconFile) {
      setIconPreview(null);
      return;
    }
    const url = URL.createObjectURL(iconFile);
    setIconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [iconFile]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name || slug || '');
      fd.append('slug', slug || name?.toLowerCase().replace(/\s+/g, '-') || '');
      if (iconFile) {
        fd.append('image', iconFile);
      } else {
        fd.append('icon', iconEmoji || '🛍️');
      }
      fd.append('description', description.trim());
      await adminCreateCategory(fd);
      setName('');
      setSlug('');
      setDescription('');
      setIconEmoji('🛍️');
      setIconFile(null);
      onUpdate();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id, newName, newSlug, existingIcon) => {
    setError('');
    try {
      const file = document.getElementById(`modal-edit-file-${id}`)?.files?.[0];
      const emojiRaw = document.getElementById(`modal-edit-icon-${id}`)?.value?.trim() ?? '';
      const fd = new FormData();
      fd.append('name', newName);
      fd.append('slug', newSlug);
      if (file) {
        fd.append('image', file);
      } else {
        fd.append('icon', emojiRaw !== '' ? emojiRaw : (existingIcon || '🛍️'));
      }
      const desc = document.getElementById(`modal-edit-desc-${id}`)?.value ?? '';
      fd.append('description', String(desc).trim());
      await adminUpdateCategory(id, fd);
      setEditing(null);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products using it may need a new category.')) return;
    setError('');
    try {
      await adminDeleteCategory(id);
      onUpdate();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-rose-800">Manage Categories</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="flex-1 border border-rose-200 rounded-lg px-3 py-2" />
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug" className="flex-1 border border-rose-200 rounded-lg px-3 py-2" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input type="file" accept="image/*" onChange={(e) => setIconFile(e.target.files?.[0] || null)} className="text-sm flex-1 min-w-0" />
              <input
                type="text"
                value={iconEmoji}
                onChange={(e) => setIconEmoji(e.target.value)}
                placeholder="Emoji"
                disabled={!!iconFile}
                className="w-20 border border-rose-200 rounded-lg px-2 py-2 text-center text-sm disabled:opacity-50"
              />
              <div className="w-9 h-9 rounded-lg border border-rose-100 overflow-hidden flex items-center justify-center bg-cream-50 text-lg">
                {iconPreview ? <img src={iconPreview} alt="" className="w-full h-full object-cover" /> : <span>{iconEmoji || '🛍️'}</span>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categories page blurb</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description under the category name on the storefront"
                rows={2}
                className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-rose-500 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50">Add Category</button>
          </form>
          <ul className="divide-y divide-rose-100 mt-4">
            {categories.map((c) => (
              <li key={c._id} className={`py-3 ${editing?._id === c._id ? '' : 'flex flex-wrap items-center justify-between gap-2'}`}>
                {editing?._id === c._id ? (
                  <div className="space-y-2 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="text" defaultValue={editing.name} id={`modal-edit-name-${c._id}`} className="flex-1 min-w-[100px] border rounded px-2 py-1 text-sm" />
                      <input type="text" defaultValue={editing.slug} id={`modal-edit-slug-${c._id}`} className="flex-1 min-w-[100px] border rounded px-2 py-1 text-sm" />
                      <input type="file" accept="image/*" id={`modal-edit-file-${c._id}`} className="text-xs max-w-[120px]" />
                      <input
                        type="text"
                        key={isCategoryIconImage(editing.icon) ? 'm-url' : 'm-emoji'}
                        defaultValue={isCategoryIconImage(editing.icon) ? '' : (editing.icon || '🛍️')}
                        id={`modal-edit-icon-${c._id}`}
                        placeholder="Emoji"
                        className="w-16 border rounded px-2 py-1 text-sm text-center"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdate(
                            c._id,
                            document.getElementById(`modal-edit-name-${c._id}`)?.value,
                            document.getElementById(`modal-edit-slug-${c._id}`)?.value,
                            editing.icon
                          )
                        }
                        className="text-rose-600 text-sm font-medium"
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="text-gray-500 text-sm">Cancel</button>
                    </div>
                    <textarea
                      id={`modal-edit-desc-${c._id}`}
                      defaultValue={editing.description || ''}
                      rows={2}
                      placeholder="Categories page blurb"
                      className="w-full border border-rose-200 rounded-lg px-2 py-1 text-sm"
                    />
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded overflow-hidden border border-rose-100 flex items-center justify-center bg-cream-50 flex-shrink-0">
                      <CategoryIcon icon={c.icon} className="text-lg" imgClassName="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium flex-1 min-w-0">{c.name}</span>
                    <span className="text-gray-500 text-sm">{c.slug}</span>
                    <span className="text-gray-400 text-sm">({c.count ?? 0} products)</span>
                    <button type="button" onClick={() => setEditing(c)} className="text-rose-600 text-sm">Edit</button>
                    <button type="button" onClick={() => handleDelete(c._id)} className="text-red-600 text-sm">Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {categories.length === 0 && <p className="text-gray-500 text-sm">No categories. Add one above or run seed.</p>}
        </div>
      </div>
    </div>
  );
}

function OfferBannerModal({ onClose, onSave, saving, formError, setFormError, asPage }) {
  const [headline, setHeadline] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    getOffer()
      .then((o) => {
        if (o) {
          setHeadline(o.headline ?? '');
          setCtaText(o.ctaText ?? '');
          setWhatsappMessage(o.whatsappMessage ?? '');
          setEnabled(o.enabled !== false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    onSave({ headline, ctaText, whatsappMessage, enabled });
  };

  const formContent = loading ? (
    <div className="p-6 text-center text-gray-500">Loading...</div>
  ) : (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {formError && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">{formError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Banner headline</label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Festival Special — Get 10% off..."
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Button text</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="e.g. Order now →"
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp pre-filled message</label>
              <textarea
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
                rows={2}
                placeholder="Message when customer clicks the button"
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span>Show offer banner on website</span>
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              {!asPage && (
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">
                  Cancel
                </button>
              )}
            </div>
          </form>
  );

  if (asPage) {
    return (
      <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden max-w-lg">
        <div className="p-6 border-b border-rose-100">
          <h2 className="font-display text-xl font-bold text-rose-800">Edit Offer Banner</h2>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-rose-800">Edit Offer Banner</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        {formContent}
      </div>
    </div>
  );
}

function BannersModal({ onClose, categories }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | { banner }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetBanners()
      .then(setBanners)
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try {
      await adminDeleteBanner(id);
      setBanners((prev) => prev.filter((b) => b._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-rose-800">Manage Banners</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <div className="p-6">
          {error && <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-4">{error}</div>}
          <div className="mb-4">
            <button
              onClick={() => setModal('add')}
              className="bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600"
            >
              + Add Banner
            </button>
          </div>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : banners.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No banners. Add your first banner.</p>
          ) : (
            <div className="space-y-4">
              {banners.map((banner) => (
                <div key={banner._id} className="border border-rose-100 rounded-lg p-4 flex items-center gap-4">
                  <img src={banner.image} alt={banner.title} className="w-32 h-20 object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{banner.title}</h3>
                    <p className="text-sm text-gray-500">{banner.description}</p>
                    <p className="text-xs text-gray-400">
                      Link: {banner.linkType === 'category' ? `Category: ${banner.linkValue}` : banner.linkType === 'shop' ? 'Shop' : banner.linkValue}
                      {banner.active ? ' • Active' : ' • Inactive'} • Order: {banner.order}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal({ banner })}
                      className="text-rose-600 text-sm font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner._id)}
                      className="text-red-600 text-sm font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {modal && (
        <BannerFormModal
          banner={modal === 'add' ? null : modal.banner}
          categories={categories}
          onClose={() => {
            setModal(null);
            setError('');
          }}
          onSave={async (formData) => {
            setError('');
            setSaving(true);
            try {
              if (modal === 'add') {
                const created = await adminCreateBanner(formData);
                setBanners((prev) => [created, ...prev]);
              } else {
                const updated = await adminUpdateBanner(modal.banner._id, formData);
                setBanners((prev) => prev.map((b) => (b._id === updated._id ? updated : b)));
              }
              setModal(null);
            } catch (e) {
              setError(e.message || 'Failed to save');
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
        />
      )}
    </div>
  );
}

function BannerFormModal({ banner, categories, onClose, onSave, saving }) {
  const isEdit = !!banner;
  const [title, setTitle] = useState(banner?.title || '');
  const [description, setDescription] = useState(banner?.description || '');
  const [image, setImage] = useState(banner?.image || '');
  const [imageFile, setImageFile] = useState(null);
  const [linkType, setLinkType] = useState(banner?.linkType || 'shop');
  const [linkValue, setLinkValue] = useState(banner?.linkValue || '');
  const [active, setActive] = useState(banner?.active !== false);
  const [order, setOrder] = useState(banner?.order || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    if (imageFile) {
      formData.append('image', imageFile);
    } else if (image) {
      formData.append('image', image);
    }
    formData.append('linkType', linkType);
    formData.append('linkValue', linkValue);
    formData.append('active', active);
    formData.append('order', String(order));
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-rose-100 flex justify-between items-center">
          <h2 className="font-display text-xl font-bold text-rose-800">
            {isEdit ? 'Edit Banner' : 'Add Banner'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image *</label>
            <p className="text-xs text-gray-500 mb-2">
              Recommended banner size: <span className="font-mono">41:20</span> ratio (e.g.{' '}
              <span className="font-mono">2050×1000</span> or <span className="font-mono">1230×600</span>).
            </p>
            {image && !imageFile && (
              <img src={image} alt="Preview" className="w-full h-48 object-cover rounded-lg mb-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImageFile(file);
                  setImage('');
                }
              }}
              className="w-full text-sm mb-2"
            />
            <input
              type="text"
              value={image}
              onChange={(e) => {
                setImage(e.target.value);
                setImageFile(null);
              }}
              placeholder="Or enter image URL"
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link Type</label>
            <select
              value={linkType}
              onChange={(e) => {
                setLinkType(e.target.value);
                setLinkValue('');
              }}
              className="w-full border border-rose-200 rounded-lg px-3 py-2"
            >
              <option value="shop">Shop (All Products)</option>
              <option value="category">Category</option>
              <option value="custom">Custom URL</option>
            </select>
          </div>
          {linkType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          {linkType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom URL</label>
              <input
                type="text"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="/shop or https://..."
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                className="w-full border border-rose-200 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-rose-500 text-white py-2 rounded-lg font-semibold hover:bg-rose-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Banner'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
