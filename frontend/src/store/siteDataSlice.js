import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getProducts, getCategories, getOffer, getBanners } from '../api';
import { isProductVisible } from '../utils/productFilters';

export const DEFAULT_OFFER = {
  headline: 'Festival Special — Get 10% off on orders above ₹999. Shop online today!',
  ctaText: 'Shop now →',
  whatsappMessage: 'Hi, I want to avail the festival 10% off on orders above ₹999.',
  enabled: true,
};

export const fetchSiteCatalog = createAsyncThunk(
  'siteData/fetchSiteCatalog',
  async ({ silent } = {}, { rejectWithValue }) => {
    try {
      const [categories, banners, offerRaw, products] = await Promise.all([
        getCategories(),
        getBanners(),
        getOffer(),
        getProducts({}),
      ]);
      const offer = offerRaw ? { ...DEFAULT_OFFER, ...offerRaw, enabled: offerRaw.enabled !== false } : { ...DEFAULT_OFFER };
      const allProducts = Array.isArray(products) ? products.filter(isProductVisible) : [];
      return { categories: Array.isArray(categories) ? categories : [], banners: Array.isArray(banners) ? banners : [], offer, products: allProducts, silent: !!silent };
    } catch (e) {
      return rejectWithValue(e?.message || 'Failed to load catalog');
    }
  }
);

const initialState = {
  categories: [],
  banners: [],
  offer: { ...DEFAULT_OFFER },
  allProducts: [],
  status: 'idle',
  error: null,
  /** Incremented on every successful catalog fetch (incl. silent) so views can react without flashing. */
  catalogRevision: 0,
};

const siteDataSlice = createSlice({
  name: 'siteData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteCatalog.pending, (state, action) => {
        const silent = action.meta.arg?.silent;
        if (!silent) state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSiteCatalog.fulfilled, (state, action) => {
        const { categories, banners, offer, products } = action.payload;
        state.categories = categories;
        state.banners = banners;
        state.offer = offer;
        state.allProducts = products;
        state.status = 'succeeded';
        state.catalogRevision += 1;
      })
      .addCase(fetchSiteCatalog.rejected, (state, action) => {
        const silent = action.meta.arg?.silent;
        if (!silent) state.status = 'failed';
        state.error = action.payload || action.error?.message || 'Failed to load catalog';
      });
  },
});

export default siteDataSlice.reducer;
