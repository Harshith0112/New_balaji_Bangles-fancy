# NEW BALAJI BANGLES & FANCY — Hybrid E-commerce Website

A modern, mobile-first website for a women's accessories store: **bangles, jewellery, cosmetics, and fashion accessories**. Customers browse products and order via **WhatsApp** (no mandatory online payment). Includes an **admin dashboard** for product management.

## Tech Stack

| Layer    | Technology        |
|----------|-------------------|
| Frontend | React 18 + Vite   |
| Styling  | Tailwind CSS     |
| Backend  | Node.js + Express |
| Database | MongoDB (Mongoose)|
| Images   | Cloudinary        |
| Hosting  | Vercel (frontend), Render (backend) |

## Project Structure

```
├── frontend/                 # React + Vite app
│   ├── public/
│   ├── src/
│   │   ├── components/      # Layout, ProductCard
│   │   ├── pages/           # Home, Shop, ProductDetail, Categories, About, Contact, Admin
│   │   ├── api.js           # API helpers
│   │   └── utils/whatsapp.js
│   ├── index.html
│   └── package.json
├── backend/                  # Express API
│   ├── config/              # Cloudinary
│   ├── middleware/          # auth
│   ├── models/              # Product, Admin
│   ├── routes/              # products, admin, categories
│   ├── scripts/seed.js      # Sample data + default admin
│   └── server.js
├── .env.example
└── README.md
```

## Setup (Local)

### 1. Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- (Optional) [Cloudinary](https://cloudinary.com) account for image uploads

### 2. Install dependencies

From the project root:

```bash
npm run install:all
```

Or manually:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 3. Environment variables

- **Backend:** Copy `.env.example` to `.env` in the **project root** (or inside `backend/` if you run from there). Set:
  - `MONGODB_URI` — MongoDB connection string
  - `JWT_SECRET` — any long random string for admin auth
  - `CLOUDINARY_*` — only if you want image uploads (optional for local)

- **Frontend:** Create `frontend/.env`:
  - `VITE_API_URL=http://localhost:5000/api`
  - `VITE_WHATSAPP_NUMBER=919876543210` (your WhatsApp number with country code, no + or spaces)

### 4. Seed database (optional)

Creates sample products and a default admin:

```bash
npm run seed
```

Default admin (change after first login in production):

- **Email:** admin@newbalajibanglesfancy.com  
- **Password:** admin123  

### 5. Run locally

**Terminal 1 — Backend:**

```bash
cd backend && npm run dev
```

Server runs at `http://localhost:5000`.

**Terminal 2 — Frontend:**

```bash
cd frontend && npm run dev
```

App runs at `http://localhost:5173`. The Vite proxy forwards `/api` to the backend.

---

## Pages & Features

- **Home:** Hero, featured categories, new arrivals, offers banner, WhatsApp CTA  
- **Shop:** Product grid, filters (category, price, search), “Order on WhatsApp” per product  
- **Product detail:** Gallery, description, price, stock, WhatsApp order (pre-filled message)  
- **Categories:** Bangles, Fancy Jewellery, Cosmetics, Hair & Fashion Accessories  
- **About:** Store story and trust content  
- **Contact:** Address, phone, opening hours, WhatsApp button, optional Google Maps embed  
- **Admin:** Login → Dashboard to add/edit/delete products, upload images, set price/category/offers, toggle in-stock  

WhatsApp URL format: `https://wa.me/<PHONE>?text=<ENCODED_MESSAGE>`. Message is auto-filled with product name and price where applicable.

---

## Deployment

### Backend (Render)

1. Create a **Web Service** on [Render](https://render.com).
2. Connect your repo; set **Root Directory** to `backend` (or build command to run from backend).
3. **Build command:** `npm install` (or leave default).
4. **Start command:** `npm start` (runs `node server.js`).
5. Add **Environment Variables** in Render dashboard:
   - `MONGODB_URI` (e.g. MongoDB Atlas URI)
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (if using Cloudinary)
   - `FRONTEND_URL` = your Vercel frontend URL (e.g. `https://your-app.vercel.app`)
6. Deploy. Note the backend URL (e.g. `https://your-api.onrender.com`).

### Frontend (Vercel)

1. Create a new project on [Vercel](https://vercel.com); connect your repo.
2. **Root Directory:** `frontend`.
3. **Build command:** `npm run build`.
4. **Output directory:** `dist`.
5. Add **Environment Variables** in Vercel:
   - `VITE_API_URL` = `https://your-api.onrender.com/api`
   - `VITE_WHATSAPP_NUMBER` = your WhatsApp number (e.g. `919876543210`)
   - Optionally: `VITE_STORE_PHONE`, `VITE_STORE_ADDRESS`, `VITE_GOOGLE_MAP_EMBED`
6. Deploy.

### Post-deploy

- Run seed (if needed) against production MongoDB (e.g. from your machine with `MONGODB_URI` set to Atlas).
- Change default admin password after first login.
- In backend CORS, `FRONTEND_URL` should match your Vercel URL.

---

## API Overview

| Method | Endpoint              | Description           |
|--------|------------------------|------------------------|
| GET    | /api/products          | List products (query: category, minPrice, maxPrice, search, featured) |
| GET    | /api/products/:id      | Single product        |
| GET    | /api/categories        | Categories with counts|
| POST   | /api/admin/login       | Admin login (returns JWT) |
| GET    | /api/admin/me          | Current admin (Bearer token) |
| POST   | /api/products          | Create product (admin, multipart: images) |
| PUT    | /api/products/:id     | Update product (admin)|
| DELETE | /api/products/:id     | Delete product (admin)|

---

## UI/UX

- Soft, feminine palette (rose, lavender, cream).
- Playfair Display (headings) + DM Sans (body).
- Mobile-first, responsive layout.
- Sticky WhatsApp floating button.
- Clear CTAs and hover states.

---

## License

MIT.
