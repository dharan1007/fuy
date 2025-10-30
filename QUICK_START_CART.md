# Quick Start Guide - Shopping Cart System

## 🚀 Getting Started

### View the Shopping Cart Features

#### 1. **Shop Page** (`/shop`)
Start here to see the product listing with dummy data.

**Features:**
- Browse products with categories
- Search functionality
- Hot deals section
- New arrivals and trending products
- Featured brands

```bash
# Navigate to
http://localhost:3000/shop
```

---

#### 2. **Product Detail Page** (`/shop/product/[id]`)
Click any product to see detailed information.

**Example URLs:**
- `http://localhost:3000/shop/product/1`
- `http://localhost:3000/shop/product/2`
- etc.

**Features:**
- Product images with thumbnails
- Discount badges and pricing
- Size selection (XS, S, M, L, XL, XXL)
- Quantity selector
- Add to cart button
- Customer reviews and ratings
- Related products
- Shipping and return info

**Try This:**
1. Select a size (M is pre-selected)
2. Adjust quantity with +/- buttons
3. Click "Add to Cart"
4. Watch the cart badge in header update
5. Continue shopping or go to cart

---

#### 3. **Shopping Cart** (`/cart`)
View and manage your cart items.

**Features:**
- Cart items display with images
- Quantity controls
- Remove items functionality
- Order summary with subtotal, tax, shipping
- Free shipping threshold ($50)
- Continue shopping links
- Clear cart option
- Empty state with CTA

```bash
# Navigate to
http://localhost:3000/cart
```

**Try This:**
1. From product page, add 2-3 items
2. View cart to see items
3. Update quantities
4. Remove an item
5. See total recalculate automatically
6. Refresh page - cart persists!

---

#### 4. **Seller Product Management** (`/seller/brand/[brandId]/add-product`)
Sellers can add new products to their brand.

**Example URLs:**
- Available after creating a brand
- Navigate through seller dashboard

**Features:**
- Product name and auto-slug
- Description and category
- Pricing with optional discount
- Stock management
- Multiple product images
- Tags and keywords
- Featured/trending flags
- Form validation
- Success/error handling

**Try This:**
1. Go to seller dashboard
2. Click "Add Product"
3. Fill out form with:
   - Name: "Test Product"
   - Price: 99.99
   - Discount: 79.99
   - Stock: 50
4. Add 2-3 image URLs
5. Click "Create Product"

---

### Key Files to Review

#### Cart State Management
**File:** `src/lib/cartStore.ts`
- Zustand store with localStorage persistence
- Cart CRUD operations
- Total calculations

#### Product Detail Page
**File:** `src/app/shop/product/[id]/page.tsx`
- Complete product display
- Reviews and ratings
- Size/quantity selection
- Related products
- Add to cart integration

#### Cart Page
**File:** `src/app/cart/page.tsx`
- Cart items management
- Order summary
- Shipping and tax calculation
- Responsive design

#### Seller Product Form
**File:** `src/app/seller/brand/[id]/add-product/page.tsx`
- Product creation form
- Image management
- Validation logic

#### Header Integration
**File:** `src/components/AppHeader.tsx`
- Cart icon with badge
- Real-time item count
- Navigation integration

---

## 🔧 Development Commands

### Start Development Server
```bash
npm run dev
```
Server runs on `http://localhost:3000`

### Build for Production
```bash
npm run build
npm run start
```

### Check TypeScript
```bash
npx tsc --noEmit
```

---

## 📊 Cart Store API

### Using the Cart in Components

```typescript
import { useCartStore } from '@/lib/cartStore';

// In your component:
const items = useCartStore((state) => state.items);
const addItem = useCartStore((state) => state.addItem);
const removeItem = useCartStore((state) => state.removeItem);
const updateQuantity = useCartStore((state) => state.updateQuantity);
const getTotalPrice = useCartStore((state) => state.getTotalPrice);

// Add item
addItem({
  productId: '1',
  productName: 'Classic Jacket',
  price: 89.99,
  discountPrice: 64.99,
  quantity: 2,
  image: 'url...',
  brand: 'StyleCo',
  size: 'M'
});

// Update quantity
updateQuantity('1', 3, 'M');

// Remove item
removeItem('1', 'M');

// Get total
const total = getTotalPrice();
```

---

## 🎨 UI Components Overview

### Product Card
Shows product with image, price, discount

### Size Selector
Grid of size buttons with visual selection

### Quantity Selector
+/- buttons with input field

### Cart Item Card
Displays item with all details and controls

### Order Summary
Subtotal, shipping, tax, total

### Price Display
Shows original and discounted prices

---

## 📱 Responsive Breakpoints

- **Mobile:** < 640px - Single column
- **Tablet:** 640px - 1024px - Two columns
- **Desktop:** > 1024px - Three columns (with sidebar)

---

## 🔗 URL Routes

### Customer Routes
```
/shop                              - Shop homepage
/shop/product/:id                  - Product detail
/cart                              - Shopping cart
```

### Seller Routes
```
/seller/create-brand               - Create brand
/seller/brand/:id                  - Brand dashboard
/seller/brand/:id/add-product      - Add product
/seller/brand/:id/product/:id/edit - Edit product (future)
```

---

## 💾 Data Persistence

### Cart Storage
- **Type:** localStorage
- **Key:** `cart-storage`
- **Persists:** Cart items across page reload
- **Clears:** When user clears cart or browser cache

### Product Data
- **Type:** Dummy data in components (for now)
- **Future:** Connect to `/api/shop/products` API

---

## 🧪 Testing Scenarios

### Scenario 1: Add Item to Cart
1. Go to /shop
2. Click product
3. Select size
4. Change quantity to 2
5. Click "Add to Cart"
6. ✅ Badge shows 2
7. Go to /cart
8. ✅ Item displays with size and quantity

### Scenario 2: Cart Persistence
1. Add items to cart
2. Refresh page (F5)
3. ✅ Cart items still there
4. ✅ Badge count preserved

### Scenario 3: Multiple Sizes
1. Add product size M, qty 1
2. Go back and add same product size L, qty 1
3. Go to cart
4. ✅ Shows as 2 separate items
5. ✅ Total is sum of both

### Scenario 4: Calculations
1. Add $100 item
2. Add $100 item (total $200)
3. ✅ Subtotal = $200
4. ✅ Shipping = Free (over $50)
5. ✅ Tax = $20 (10%)
6. ✅ Total = $220

---

## 🐛 Troubleshooting

### Cart Badge Not Showing
- Clear browser cache
- Restart dev server
- Check console for errors

### Add to Cart Not Working
- Ensure you're on product page
- Check browser console for errors
- Verify Zustand is installed

### Cart Not Persisting
- Check browser localStorage enabled
- Check browser privacy settings
- Try different browser

### Images Not Loading
- Unsplash URLs require internet
- Check CORS if using custom URLs
- Verify image URL is valid

---

## 📚 API Endpoints (Ready for Integration)

### GET Endpoints
```
GET /api/shop/products              - List products
GET /api/shop/products?featured=true - Featured only
GET /api/shop/brands                - List brands
GET /api/shop/deals                 - Get deals
```

### POST Endpoints (Future)
```
POST /api/cart                      - Create cart
POST /api/orders                    - Create order
POST /api/reviews                   - Submit review
```

---

## 🚀 Next Features to Build

1. **Checkout Flow**
   - Shipping address
   - Payment method selection
   - Order confirmation

2. **Payment Integration**
   - Stripe/PayPal
   - Card validation
   - Transaction handling

3. **Order Management**
   - Order history
   - Order tracking
   - Return management

4. **Advanced Features**
   - Wishlist
   - Product recommendations
   - Coupon codes
   - Guest checkout

---

## 📞 Support

For detailed documentation, see:
- `IMPLEMENTATION_COMPLETE.md` - Full technical details
- `SHOPPING_CART_IMPLEMENTATION.md` - Architecture details

For questions about specific files:
- Ask about the component you're working on
- Reference the file path
- Include what you're trying to do

---

**Happy Shopping! 🛒**
