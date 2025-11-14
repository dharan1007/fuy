# Glass Morphic Design System - Complete Setup Guide

## 📱 Project Stack
- **Framework**: React Native with Expo
- **TypeScript**: ✅ Enabled
- **Navigation**: React Navigation (Tab Navigator)
- **Styling**: React Native StyleSheet
- **Blur Effect**: expo-blur

---

## 🎯 What This System Provides

### Core Components
1. **GlassBackground** - Full-screen glassmorphic background with gradient, blur, and noise
2. **GlassSurface** - Reusable component for cards, buttons, headers, sheets, etc.
3. **Theme Provider** - Global theme context with customization hooks
4. **Glass Tokens** - Centralized design tokens for colors, spacing, shadows, etc.

### Key Features
- ✅ Apple iOS-style glassmorphic UI (match iOS 15+)
- ✅ Full backdrop blur support with BlurView
- ✅ Gradient backgrounds (peach → coral theme)
- ✅ Soft shadows and elevation system
- ✅ Accessibility (WCAG AA contrast, reduced motion support)
- ✅ Performance optimized (lazy blur, motion reduction)
- ✅ Theme customization (blur intensity, opacity, gradients)
- ✅ 6 preset surface variants (card, header, sheet, button, list, divider)

---

## 📦 Installation & Setup

### Step 1: Install Required Dependencies

```bash
# Install if not already present
cd mobile
npm install expo-blur react-native-linear-gradient

# Or with yarn
yarn add expo-blur react-native-linear-gradient
```

**Verify installations:**
```bash
npm ls expo-blur
npm ls react-native-linear-gradient
```

### Step 2: File Structure
The design system files are already created at these paths:

```
mobile/src/
├── theme/
│   ├── glassTheme.ts           (Global tokens & config)
│   └── ThemeProvider.tsx        (Theme context & hooks)
├── components/
│   └── glass/
│       ├── GlassBackground.tsx  (Full-screen background)
│       └── GlassSurface.tsx     (Cards, containers, buttons)
```

### Step 3: Update App Entry Point

Update your main app file (e.g., `App.tsx` or `index.tsx`):

```tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './src/theme/ThemeProvider';
import TopTabNavigator from './src/navigation/MainAppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <TopTabNavigator />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

---

## 🎨 Usage Guide

### Using GlassBackground (Full Screen)

The background should wrap your entire screen:

```tsx
import { GlassBackground, GlassBackgroundPresets } from '@components/glass/GlassBackground';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <GlassBackground {...GlassBackgroundPresets.primary}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Your content here */}
      </SafeAreaView>
    </GlassBackground>
  );
}
```

**Available Presets:**
- `primary` - Default peach-to-coral gradient
- `secondary` - Peach-to-orange gradient
- `tertiary` - Light gradient
- `light` - Very light gradient
- `dark` - Dark theme (for future use)

**Custom Gradient:**
```tsx
<GlassBackground
  startColor="#FFE5DB"
  endColor="#FF7A5C"
  blurIntensity={24}
  noise={true}
  gradient={true}
>
  {/* Content */}
</GlassBackground>
```

### Using GlassSurface (Cards, Buttons, Containers)

For cards, lists, buttons, modals, etc.:

```tsx
import { GlassSurface, GLASS_SURFACE_VARIANTS } from '@components/glass/GlassSurface';

// Simple card
<GlassSurface variant="card" padding={16}>
  <Text>Card content</Text>
</GlassSurface>

// Using preset variant
<GlassSurface {...GLASS_SURFACE_VARIANTS.card}>
  <Text>Card with preset</Text>
</GlassSurface>

// Interactive button
<GlassSurface
  variant="interactive"
  interactive={true}
  onPress={() => console.log('Pressed')}
  padding={12}
>
  <Text>Tap me</Text>
</GlassSurface>

// Header bar
<GlassSurface variant="header" padding={16}>
  <Text>Header</Text>
</GlassSurface>

// Bottom sheet
<GlassSurface variant="sheet" radius={24}>
  <Text>Modal/Sheet content</Text>
</GlassSurface>
```

**Variant Options:**
- `card` - Moderate blur, subtle tint (best for general containers)
- `header` - Light blur for headers/nav bars
- `sheet` - Heavy blur for modals/bottom sheets
- `interactive` - Medium blur for buttons/interactive elements
- `divider` - Minimal blur for separators
- `custom` - Build your own

**All Props:**
```tsx
interface GlassSurfaceProps {
  variant?: 'card' | 'header' | 'sheet' | 'interactive' | 'divider' | 'custom';
  blurIntensity?: number;              // 0-100
  tintColor?: string;                  // Override tint color
  withBorder?: boolean;                // Show border
  borderColor?: string;                // Custom border color
  borderWidth?: number;                // Custom border width
  radius?: number;                     // Border radius
  shadow?: 'xs' | 'sm' | 'md' | 'lg'; // Shadow elevation
  padding?: number | { horizontal?: number; vertical?: number };
  opacity?: number;                    // 0-1 opacity of tint
  disableBlur?: boolean;               // Disable blur (performance)
  style?: ViewStyle;                   // Custom styles
  interactive?: boolean;               // Enable touch
  onPress?: () => void;                // Press handler
  accessibilityLabel?: string;         // A11y
}
```

### Using Theme Hooks

Access tokens and configuration in any component:

```tsx
import { useGlassTheme, useGlassTokens, useThemeConfig } from '@theme/ThemeProvider';

export function MyComponent() {
  const { tokens, config, getBlurIntensity } = useGlassTheme();
  const { colors, spacing, shadow } = tokens;

  return (
    <View style={{ padding: spacing[4] }}>
      <Text style={{ color: colors.text.primary }}>
        Blur: {getBlurIntensity('medium')}
      </Text>
    </View>
  );
}

// Get just tokens
function AnotherComponent() {
  const tokens = useGlassTokens();
  return <View style={{ padding: tokens.spacing[3] }} />;
}

// Update theme
function Settings() {
  const { config, updateConfig } = useThemeConfig();

  return (
    <Button
      title="Toggle Blur"
      onPress={() => updateConfig({ enableGradient: !config.enableGradient })}
    />
  );
}
```

---

## 🔄 Migration Guide

### Converting Existing Screens

#### Before (Current Implementation):
```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.base,
  },
  header: {
    backgroundColor: 'rgba(255, 250, 245, 0.85)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  card: {
    backgroundColor: 'rgba(255, 250, 245, 0.75)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text>Header</Text>
      </View>
      <FlatList
        data={data}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
```

#### After (With Glass Design System):
```tsx
import { GlassBackground } from '@components/glass/GlassBackground';
import { GlassSurface } from '@components/glass/GlassSurface';
import { useGlassTokens } from '@theme/ThemeProvider';

export default function HomeScreen() {
  const { spacing, colors } = useGlassTokens();

  return (
    <GlassBackground>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <GlassSurface variant="header" padding={spacing[4]}>
          <Text>Header</Text>
        </GlassSurface>

        {/* List */}
        <FlatList
          data={data}
          renderItem={({ item }) => (
            <GlassSurface variant="card" padding={spacing[4]}>
              <Text>{item.name}</Text>
            </GlassSurface>
          )}
        />
      </SafeAreaView>
    </GlassBackground>
  );
}
```

### Find & Replace Guide

1. **Replace all container backgrounds:**
   - Find: `backgroundColor: COLORS.base` or similar
   - Replace with: Wrap with `<GlassBackground>`

2. **Replace header backgrounds:**
   - Find: `backgroundColor: 'rgba(255, 250, 245, 0.85)'`
   - Replace with: `<GlassSurface variant="header">`

3. **Replace card backgrounds:**
   - Find: `backgroundColor: 'rgba(255, 250, 245, 0.75)'`
   - Replace with: `<GlassSurface variant="card">`

4. **Replace button backgrounds:**
   - Find: `backgroundColor: COLORS.primary` (with border/padding)
   - Replace with: `<GlassSurface variant="interactive" interactive={true}>`

5. **Remove manual blur/shadow styles:**
   - Delete custom shadowColor, shadowOpacity, shadowRadius props
   - Let `GlassSurface` handle it with `shadow` prop

### Screen-by-Screen Migration Checklist

- [ ] MainAppNavigator.tsx - Update header/nav styling
- [ ] HomeScreen.tsx - Replace container + cards
- [ ] ProfileScreen.tsx - Replace cards + settings items
- [ ] NotificationsScreen.tsx - Replace notification items
- [ ] DiscoverScreen.tsx - Replace category cards + trending cards
- [ ] MessagesScreen.tsx - Replace message items + tabs
- [ ] CanvasScreen.tsx - Replace entry cards + modal
- [ ] EssenzScreen.tsx - Replace challenge cards
- [ ] ShopScreen.tsx - Replace shop items
- [ ] HoplnScreen.tsx - Replace route cards

---

## 🎛️ Customization

### Change Gradient Colors

In `src/theme/glassTheme.ts`:

```ts
export const GLASS_TOKENS = {
  gradient: {
    primary: {
      start: '#YOUR_START_COLOR',
      end: '#YOUR_END_COLOR',
    },
    // ... other gradients
  },
};
```

### Adjust Blur Intensity

```tsx
// Globally in app initialization:
import { useThemeConfig } from '@theme/ThemeProvider';

function App() {
  const { updateConfig } = useThemeConfig();

  updateConfig({ glassBlur: 32 }); // 0-100
}

// Or per-component:
<GlassSurface blurIntensity={28} variant="card" />
```

### Change Shadow Elevation

```tsx
// Use shadow prop
<GlassSurface variant="card" shadow="lg" />

// Or customize in glassTheme.ts
shadow: {
  custom: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  }
}
```

### Disable Blur (Performance)

For devices that need better performance:

```tsx
<GlassSurface variant="card" disableBlur={true} />

// Or globally:
updateConfig({ enableGradient: false });
```

---

## ♿ Accessibility (WCAG AA Compliant)

### Features Built-In
- ✅ Minimum 4.5:1 contrast ratio for all text
- ✅ Accessible labels and roles
- ✅ Reduced Motion support (auto-disables blur)
- ✅ High contrast mode fallbacks

### Test Accessibility
```tsx
import { AccessibilityInfo } from 'react-native';

// Check screen reader
const enabled = await AccessibilityInfo.isScreenReaderEnabled();

// Set labels
<GlassSurface
  accessibilityLabel="Profile card"
  accessibilityRole="button"
  interactive={true}
>
  <Text>User Name</Text>
</GlassSurface>
```

### Reduced Motion Handling
Motion is automatically reduced when system settings indicate preference:

```tsx
const { isMotionReduced } = useGlassTheme();

if (isMotionReduced) {
  // Disable animations
}
```

---

## 📊 Visual Specification

### Glass Surface Spec (Apple iOS Style)

| Property | Value |
|----------|-------|
| **Blur Radius** | 20-28px (variable by variant) |
| **Tint Color** | White/peach with 25-40% opacity |
| **Border** | 1px, white/black at 12-18% opacity |
| **Corner Radius** | 8-20px (8=small, 12=medium, 16=large, 20=xl) |
| **Shadow** | Soft drop shadow, 1-4 elevation levels |
| **Inner Highlight** | 1px white line at top, 40% opacity |
| **Gradient** | Soft peach→coral (3-5% noise overlay) |

### Color Tokens

```
Primary:     #FF7A5C (Warm coral/orange-red)
Secondary:   #FFB3A7 (Soft peachy pink)
Success:     #FFD4C5 (Very light peach)
Warning:     #FFB3A7 (Peachy pink)
Danger:      #FF6464 (Coral red)
Text:        #000000 (Black)
Text Muted:  #666666 (Dark gray)
Border:      #E5D7D0 (Soft warm)
```

### Spacing Scale (8px base)
- 0 = 0px
- 1 = 4px
- 2 = 8px
- 3 = 12px
- 4 = 16px
- 5 = 20px
- 6 = 24px

---

## 🚀 Performance Tips

1. **Disable blur on older devices:**
   ```tsx
   <GlassSurface disableBlur={true} />
   ```

2. **Use minimal variant for lists:**
   ```tsx
   <GlassSurface variant="minimal" /> // No blur
   ```

3. **Avoid deep nesting:**
   ```tsx
   // ❌ Bad - multiple blurs
   <GlassSurface><GlassSurface><GlassSurface>

   // ✅ Good
   <GlassSurface><Text/></GlassSurface>
   ```

4. **Memoize components:**
   ```tsx
   const CardItem = React.memo(({ item }) => (
     <GlassSurface variant="card">{/* ... */}</GlassSurface>
   ));
   ```

---

## 🔗 Component API Reference

### GlassBackground
Full-screen background with gradient and blur.

```tsx
<GlassBackground
  startColor="#FFE5DB"
  endColor="#FF7A5C"
  blurred={true}
  blurIntensity={24}
  gradient={true}
  noise={true}
  accessibilityLabel="App background"
>
  {/* Content */}
</GlassBackground>
```

### GlassSurface
Reusable glassmorphic container.

```tsx
<GlassSurface
  variant="card"
  blurIntensity={20}
  tintColor="rgba(255, 250, 245, 0.35)"
  withBorder={true}
  borderColor="#E5D7D0"
  radius={16}
  shadow="sm"
  padding={{ horizontal: 16, vertical: 12 }}
  opacity={0.85}
  disableBlur={false}
  interactive={false}
>
  {/* Content */}
</GlassSurface>
```

### useGlassTheme
Get theme config and utilities.

```tsx
const {
  config,        // ThemeConfig
  tokens,        // GLASS_TOKENS
  updateConfig,  // (partial: Partial<ThemeConfig>) => void
  resetConfig,   // () => void
  getBlurIntensity,  // (intensity: 'light'|'medium'|'heavy') => number
  getGlassTint,      // (density: 'light'|'medium'|'heavy') => string
  getShadow,         // (elevation: 'xs'|'sm'|'md'|'lg') => any
  isAccessibilityEnabled,
  isMotionReduced,
} = useGlassTheme();
```

---

## 📝 File Locations

```
mobile/
├── src/
│   ├── theme/
│   │   ├── glassTheme.ts              ← Global tokens (GLASS_TOKENS, GLASS_SURFACES, A11Y)
│   │   └── ThemeProvider.tsx          ← Theme context (useGlassTheme, useGlassTokens hooks)
│   ├── components/
│   │   └── glass/
│   │       ├── GlassBackground.tsx    ← Full-screen background component
│   │       └── GlassSurface.tsx       ← Reusable surface component
│   ├── screens/
│   │   ├── HomeScreen.tsx             ← [TO MIGRATE]
│   │   ├── ProfileScreen.tsx          ← [TO MIGRATE]
│   │   ├── NotificationsScreen.tsx    ← [TO MIGRATE]
│   │   ├── DiscoverScreen.tsx         ← [TO MIGRATE]
│   │   ├── MessagesScreen.tsx         ← [TO MIGRATE]
│   │   └── features/
│   │       ├── CanvasScreen.tsx       ← [TO MIGRATE]
│   │       ├── EssenzScreen.tsx       ← [TO MIGRATE]
│   │       ├── ShopScreen.tsx         ← [TO MIGRATE]
│   │       └── HoplnScreen.tsx        ← [TO MIGRATE]
│   └── navigation/
│       └── MainAppNavigator.tsx       ← [UPDATE NAV STYLING]
```

---

## 🆘 Troubleshooting

### Blur not showing
- Ensure `expo-blur` is installed: `npm install expo-blur`
- Check if `disableBlur={true}` is set somewhere
- Try increasing `blurIntensity` prop

### Performance issues
- Set `disableBlur={true}` on non-critical surfaces
- Use `minimal` variant for long lists
- Memoize components with `React.memo`
- Profile with React DevTools

### Colors don't match design
- Check `glassTheme.ts` color values
- Verify `tintColor` prop is correctly passed
- Ensure gradient start/end colors are correct

### Accessibility issues
- Add `accessibilityLabel` to interactive elements
- Use `accessibilityRole="button"` for tappable items
- Check contrast ratios in GLASS_TOKENS.A11Y.minContrast

---

## ✅ Next Steps

1. Install dependencies: `npm install expo-blur react-native-linear-gradient`
2. Wrap app with `ThemeProvider` in entry point
3. Start with one screen and migrate to use `GlassBackground` + `GlassSurface`
4. Test accessibility with screen reader
5. Adjust colors/blur as needed using theme tokens

**Start with HomeScreen** - it's the simplest to migrate!

---

## 📚 Resources

- [Expo Blur Documentation](https://docs.expo.dev/versions/latest/sdk/blur-view/)
- [React Native StyleSheet](https://reactnative.dev/docs/stylesheet)
- [WCAG 2.1 Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Apple HIG - Materials](https://developer.apple.com/design/human-interface-guidelines/materials/overview)

---

**Version**: 1.0.0
**Last Updated**: November 2024
**Status**: Production Ready ✅
