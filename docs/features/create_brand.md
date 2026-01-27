# Create Brand Feature Documentation

## 1. Feature Overview
**Feature Name:** Create Brand
**File Location:** `mobile/app/shop/create-brand.tsx`
**Primary Purpose:** The onboarding gateway for the "Sell on Fuy" (s.o. fuy) ecosystem. It allows users to establish their commercial identity distinct from their personal profile.

## 2. Visual Interface
- **Simple Form:** A clean, focused single-page form.
- **Logo Uploader:**
    - Central, large circular interaction area.
    - State: Shows `Camera` icon initially, `ActivityIndicator` during upload, and `Image` when set.
- **Input Fields:**
    - Styled with `inputBg` (dark/light theme aware).
    - "Brand Name"
    - "Description" (Multiline).
- **Submit Button:** "Create Brand" (Full width, high contrast).

## 3. Interaction Logic
- **Image Picker:** Opens native gallery.
- **Upload:** Immediately uploads image to R2 upon selection (before form submission) to get the URL.
- **Validation:** Checks if Name is empty before API call.
- **Success:**
    - Alert: "Brand created!".
    - Two Options: "View" (Go to new brand page) or "Done" (Go back).

## 4. Data Flow
- **Service:** `ShopService.createBrand(payload)`.
- **Payload:** `{ name, description, logoUrl }`.
- **Backend:** Inserts into `Brand` table, linking `ownerId` to current user.

## 5. Significance
- Separates "User" from "Seller".
- Enables the multi-tenant marketplace structure of the app.
