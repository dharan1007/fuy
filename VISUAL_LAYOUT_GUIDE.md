# Visual Layout Guide - Updated UI Components

---

## Chat Page Layout (Three Column)

```
┌────────────────────────────────────────────────────────────────┐
│                         HEADER (64px)                          │
│   [← Logo] [Home] [Explore] [Profile] [💬 Chat] [Settings]    │
├─────────────┬──────────────────────────┬──────────────────────┤
│             │                          │                      │
│   SIDEBAR   │    CENTER - CHAT AREA    │   RIGHT - PROFILE    │
│  (280px)    │      (Dynamic)           │     (320px)          │
│             │                          │                      │
│ ┌─────────┐ │ ┌──────────────────────┐ │ ┌──────────────────┐ │
│ │← Back   │ │ │ Header (Gradient)    │ │ │   User Avatar    │ │
│ │────────┐│ │ │ Name | Time: 2m 45s  │ │ │   Display Name   │ │
│ │Search..│ │ │ │─────────────────────│ │ │   Email Addr     │ │
│ │        │ │ │ │                      │ │ │──────────────────│ │
│ │────────┐│ │ │  MESSAGE AREA        │ │ │ Messages: 42      │ │
│ │Jasmine│ │ │ │                      │ │ │ Status: Online    │ │
│ │Alex   │ │ │ │  [Your msg] →        │ │ │──────────────────│ │
│ │Jordan │ │ │ │  ← [Their msg]       │ │ │ 📔 Journal       │ │
│ │Jacob  │ │ │ │                      │ │ │ ☕ Hopping       │ │
│ │Carmen │ │ │ │  [Your msg] →        │ │ │ 💬 Breathe       │ │
│ │       │ │ │ │                      │ │ │──────────────────│ │
│ │────────┐│ │ │ ┌──────────────────┐ │ │                    │ │
│ │Type msg...│ │ │ Send message...  │ │ │                    │ │
│ │           │ │ │ [Send Button]    │ │ │                    │ │
│ └──────────┘ │ └──────────────────┘ │ │ │                    │ │
│              │                        │ │ │                    │ │
└──────────────┴────────────────────────┴──────────────────────┘
```

### Color Scheme
- **Sidebar Background:** White (#ffffff)
- **Header Gradient:** Blue → Indigo (from-blue-500 to-indigo-600)
- **Borders:** Light Gray (#e5e7eb)
- **User Avatars:** Blue → Purple gradient
- **Own Messages:** Blue (#3b82f6) right-aligned
- **Other Messages:** Light Gray (#d1d5db) left-aligned

---

## AWE Routes Map Layout (Fixed Sidebar)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HEADER (Navigation)                          │
├──────────────────┬─────────────────────────────────────────────┤
│                  │                                              │
│    SIDEBAR       │        MAIN CONTENT AREA (Dynamic)          │
│  (350px Fixed)   │                                              │
│                  │                                              │
│ ┌──────────────┐ │  ┌─────────────────────────────────────┐  │
│ │← Back        │ │  │                                     │  │
│ │Awe Routes    │ │  │      FULL-WIDTH MAP (600px)         │  │
│ │────────────┐ │  │  │ - Click to add waypoints            │  │
│ │            │ │  │  │ - View POIs (Cafés, Restaurants)   │  │
│ │ Stats Card │ │  │  │ - Toggle map styles                │  │
│ │ Distance   │ │  │  │ - Real-time distance calc          │  │
│ │ Points: 5  │ │  │  │                                     │  │
│ │ Type: Loop │ │  │  └─────────────────────────────────────┘  │
│ │            │ │  │                                              │
│ │ ────────┐  │ │  │ ┌─────┬─────┬─────┐                        │
│ │ ETA     │  │ │  │ │ Effort & Calories │                      │
│ │ 🚶 Walk │  │ │  │ │ 🚴 Bike          │                      │
│ │ 🚴 Bike │  │ │  │ │ 🏃 Run           │                      │
│ │ 🏃 Run  │  │ │  │ └─────┴─────┴─────┘                        │
│ │         │  │ │  │                                              │
│ │ ────────┐  │ │  │ ┌──────────────────────────────────────┐  │
│ │ Tips    │  │ │  │ Attention Cue Sheet │ Plans & Invites  │  │
│ │ • Add   │  │ │  │                     │                  │  │
│ │ • Export│  │ │  │ [Cues]              │ [Plans]          │  │
│ │         │  │ │  │                     │                  │  │
│ │ ────────┐  │ │  │                     │                  │  │
│ │ POIs    │  │ │  │                     │                  │  │
│ │ Cafés   │  │ │  │                     │                  │  │
│ │ Museums │  │ │  └──────────────────────────────────────┘  │
│ │ Parking │  │ │  │                                              │
│ │         │  │ │  │                                              │
│ │ ────────┐  │ │  │                                              │
│ │ Styles  │  │ │  │                                              │
│ │ Dark    │  │ │  │                                              │
│ │ Light   │  │ │  │                                              │
│ │ Sepia   │  │ │  │                                              │
│ │         │  │ │  │                                              │
│ └──────────┘ │ │                                              │
└──────────────┴────────────────────────────────────────────────┘
```

### Color Scheme
- **Sidebar Background:** White (#ffffff)
- **Stats Card:** Blue gradient (from-blue-50 to-indigo-50)
- **ETA Card:** Green gradient (from-green-50 to-emerald-50)
- **Tips Card:** Amber background (bg-amber-50)
- **Current Conditions:** Blue background (bg-blue-50)
- **Buttons:** Gray → Blue on hover
- **Map Tiles:** Multiple styles (Dark, Light, Sepia)

---

## Component Styling

### Chat Cards
```
┌─────────────────────────────┐
│ Name                        │
│ ─────────────────────────── │
│ Small subtitle or status    │
│                             │
│ Additional info or actions  │
└─────────────────────────────┘
```

### Stats Cards
```
┌─────────────────────────────┐
│ 📊 TITLE                    │
│ ─────────────────────────── │
│ Label    Value              │
│ Label    Value              │
│ Label    Value              │
└─────────────────────────────┘
```

### Action Buttons
```
Default:       Hover:         Active:
┌─────────┐   ┌─────────┐   ┌─────────┐
│ Button  │   │ Button  │   │ Button  │
└─────────┘   └─────────┘   └─────────┘
```

---

## Typography Scale

```
h1: 24px / 600 weight (Page titles)
h2: 20px / 600 weight (Section titles)
h3: 18px / 600 weight (Card titles)
p:  16px / 400 weight (Body text)
sm: 14px / 400 weight (Secondary text)
xs: 12px / 400 weight (Helper text)
```

---

## Responsive Breakpoints

### Mobile (< 640px)
```
┌──────────────────┐
│    HEADER        │
├──────────────────┤
│    SIDEBAR       │ (Stacked)
├──────────────────┤
│   CHAT/MAP       │
├──────────────────┤
│    RIGHT         │ (Stacked)
└──────────────────┘
```

### Tablet (640px - 1024px)
```
┌─────────────────────────────────┐
│           HEADER                │
├────────┬───────────┬────────────┤
│SIDEBAR │   MAIN    │   RIGHT    │
│ (slim) │  (wider)  │ (narrow)   │
│        │           │            │
└────────┴───────────┴────────────┘
```

### Desktop (> 1024px)
```
┌─────────────────────────────────────────┐
│              HEADER                     │
├────────────────┬──────────────────────┬─┤
│    SIDEBAR     │    MAIN CONTENT      │R│
│  (Fixed 280px) │   (Dynamic width)    │I│
│  (Fixed 350px) │                      │G│
│                │                      │H│
│  (Scrollable)  │  (Full featured)     │T│
│                │                      │  │
└────────────────┴──────────────────────┴─┘
```

---

## Color Palette

### Primary Colors
- **Blue:** #3b82f6 (messages, buttons)
- **Indigo:** #4f46e5 (headers, accents)
- **Green:** #10b981 (status, success)
- **Amber:** #f59e0b (warnings, tips)
- **Gray:** #6b7280 (secondary text)

### Background Colors
- **White:** #ffffff (primary background)
- **Gray 50:** #f9fafb (light background)
- **Gray 100:** #f3f4f6 (hover states)
- **Dark:** #111827 (dark theme option)

### Border Colors
- **Light Gray:** #e5e7eb (default)
- **Blue:** #dbeafe (on focus)

---

## Icons Used

### Navigation
- `←` Back arrow (SVG)
- `💬` Chat bubble
- `🏠` Home

### Activities
- `🚶` Walking
- `🚴` Cycling
- `🏃` Running

### Locations
- `☕` Cafés
- `🍽️` Restaurants
- `🏦` ATMs
- `🚌` Bus Stops
- `🏛️` Museums
- `🅿️` Parking
- `🏥` Hospitals
- `⚽` Sports Centers

### Actions
- `💾` Save
- `📤` Export
- `📋` Copy
- `📝` Edit
- `❌` Delete
- `✓` Confirm

---

## Spacing System

```
xs: 4px   (tight spacing)
sm: 8px   (small gaps)
md: 16px  (medium gaps)
lg: 24px  (large gaps)
xl: 32px  (extra large gaps)
2xl: 48px (huge gaps)
```

---

## Shadow System

```
Light: box-shadow: 0 1px 2px rgba(0,0,0,0.05)
Medium: box-shadow: 0 4px 6px rgba(0,0,0,0.1)
Large: box-shadow: 0 20px 25px rgba(0,0,0,0.1)
```

---

## Animations

- **Transitions:** 150ms - 300ms ease
- **Hover:** Subtle brightness/shadow change
- **Active:** Slightly darker shade
- **Loading:** Smooth spinner
- **Tooltips:** Fade in/out

---

## Accessibility

✅ **Color Contrast:**
- Text: WCAG AA minimum (4.5:1)
- UI: WCAG AA minimum (3:1)

✅ **Touch Targets:**
- Minimum 44x44px for buttons
- Adequate spacing between interactive elements

✅ **Keyboard Navigation:**
- Full keyboard support
- Visible focus indicators
- Logical tab order

✅ **Screen Readers:**
- Semantic HTML
- ARIA labels where needed
- Descriptive alt text

---

## Best Practices Implemented

1. **Mobile-First Design:** Layouts start simple and expand
2. **Progressive Enhancement:** Core features work without JS
3. **Semantic HTML:** Proper heading hierarchy and elements
4. **CSS Grid & Flexbox:** Modern layout techniques
5. **Component Isolation:** Reusable, predictable patterns
6. **Consistent Spacing:** Uses defined scale
7. **Clear Typography:** Readable, scalable fonts
8. **Intuitive Interactions:** Familiar patterns and feedback

---

**Last Updated:** October 29, 2025
**Version:** 2.0 (Enhanced layouts)

