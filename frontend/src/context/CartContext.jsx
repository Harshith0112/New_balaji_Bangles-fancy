import { createContext, useContext, useReducer, useEffect } from 'react';

const CART_KEY = 'womens-emporium-cart';

const cartReducer = (state, action) => {
  const key = (id, opts) => `${id}|${JSON.stringify(opts || {})}`;
  switch (action.type) {
    case 'ADD': {
      const { productId, name, price, nbfCode, quantity = 1, selectedOptions = {} } = action.payload;
      const k = key(productId, selectedOptions);
      const existing = state.items.find((i) => key(i.productId, i.selectedOptions) === k);
      const items = existing
        ? state.items.map((i) =>
            key(i.productId, i.selectedOptions) === k
              ? { ...i, quantity: i.quantity + quantity }
              : i
          )
        : [...state.items, { productId, name, price, nbfCode, quantity, selectedOptions: selectedOptions || {} }];
      return { ...state, items };
    }
    case 'UPDATE_QTY': {
      const { productId, selectedOptions, quantity } = action.payload;
      const k = key(productId, selectedOptions);
      if (quantity <= 0) {
        return { ...state, items: state.items.filter((i) => key(i.productId, i.selectedOptions) !== k) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          key(i.productId, i.selectedOptions) === k ? { ...i, quantity } : i
        ),
      };
    }
    case 'REMOVE': {
      const { productId, selectedOptions } = action.payload;
      const k = key(productId, selectedOptions);
      return { ...state, items: state.items.filter((i) => key(i.productId, i.selectedOptions) !== k) };
    }
    case 'CLEAR':
      return { ...state, items: [] };
    default:
      return state;
  }
};

const loadCart = () => {
  try {
    const s = localStorage.getItem(CART_KEY);
    if (s) {
      const data = JSON.parse(s);
      return { items: data.items || [] };
    }
  } catch (_) {}
  return { items: [] };
};

const saveCart = (items) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items }));
  } catch (_) {}
};

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, loadCart);

  useEffect(() => {
    saveCart(state.items);
  }, [state.items]);

  const addToCart = (payload) => dispatch({ type: 'ADD', payload });
  const updateQty = (productId, selectedOptions, quantity) =>
    dispatch({ type: 'UPDATE_QTY', payload: { productId, selectedOptions, quantity } });
  const removeItem = (productId, selectedOptions) =>
    dispatch({ type: 'REMOVE', payload: { productId, selectedOptions } });
  const clearCart = () => dispatch({ type: 'CLEAR' });

  const count = state.items.reduce((n, i) => n + i.quantity, 0);
  const total = state.items.reduce((n, i) => n + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        count,
        total,
        addToCart,
        updateQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
