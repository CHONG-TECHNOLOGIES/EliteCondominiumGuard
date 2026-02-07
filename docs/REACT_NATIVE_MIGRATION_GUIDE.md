# React Native Migration Guide for Elite Condominium Guard

This guide provides a comprehensive plan for migrating your Elite Condominium Guard web application to React Native.

## Overview

Your current app is a Progressive Web Application (PWA) built with:
- **Frontend**: React + TypeScript + Vite
- **Routing**: React Router DOM
- **Database**: Supabase (backend) + Dexie (offline storage)
- **Key Features**: Access control, visitor management, resident directory, incident reporting, QR scanning

The migration to React Native will enable native mobile apps for iOS and Android while preserving most of your business logic.

---

## Library Mappings: Web → React Native

### Core Dependencies

| Web Library | React Native Equivalent | Notes |
|------------|------------------------|-------|
| `react-router-dom` | **Expo Router** or **React Navigation** | Expo Router recommended for file-based routing |
| `dexie` (IndexedDB) | **@react-native-async-storage/async-storage** + **WatermelonDB** | WatermelonDB for complex offline data, AsyncStorage for simpler key-value |
| `leaflet` + `react-leaflet` | **react-native-maps** | Native maps for iOS/Android |
| `html5-qrcode` | **expo-camera** + **expo-barcode-scanner** | Native camera access for QR scanning |
| `jspdf` + `jspdf-autotable` | **react-native-html-to-pdf** or **expo-print** | Generate PDFs natively |
| `lucide-react` | **lucide-react-native** | Same icon library, React Native version |
| `vite` | **Metro bundler** (built into Expo/RN) | Different bundler, similar dev experience |
| `vite-plugin-pwa` | **expo-updates** | Over-the-air updates |

### Services & Logic (Reusable)

| Component | Reusability | Migration Notes |
|-----------|------------|----------------|
| `@supabase/supabase-js` | ✅ **100% reusable** | Works identically in React Native |
| `services/Supabase.ts` | ✅ **95% reusable** | Minor changes for file uploads (use Expo FileSystem) |
| `services/dataService.ts` | ✅ **90% reusable** | Update Dexie calls to WatermelonDB or AsyncStorage |
| `types.ts` | ✅ **100% reusable** | No changes needed |
| `services/geminiService.ts` | ✅ **100% reusable** | Google AI SDK works in RN |
| `services/logger.ts` | ✅ **80% reusable** | May need adjustments for native logging |
| `services/audioService.ts` | ⚠️ **Needs rewrite** | Use **expo-av** for native audio |
| `services/deviceUtils.ts` | ⚠️ **Needs adaptation** | Use **expo-device** + **expo-application** |

---

## Recommended Approach: Expo (Managed Workflow)

**Why Expo?**
- ✅ Faster development with pre-built modules (Camera, Location, Print, etc.)
- ✅ Easy OTA updates similar to PWA
- ✅ Simplified build process (no need for Xcode/Android Studio initially)
- ✅ Great developer experience with Expo Go for testing

**Alternative**: Bare React Native if you need custom native modules not supported by Expo.

---

## Project Structure for React Native

```
elite-condo-guard-mobile/
├── app/                          # Expo Router file-based routing
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── setup.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── daily-list.tsx
│   │   ├── new-entry.tsx
│   │   ├── incidents.tsx
│   │   └── settings.tsx
│   ├── admin/                    # Admin screens
│   │   ├── devices.tsx
│   │   ├── incidents.tsx
│   │   └── ...
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── ui/                       # Base UI components
│   └── features/                 # Feature-specific components
├── services/                     # COPY from web app (with minor changes)
│   ├── supabaseClient.ts        # ✅ No changes
│   ├── Supabase.ts              # ⚠️ Minor file upload changes
│   ├── dataService.ts           # ⚠️ Replace Dexie with WatermelonDB
│   ├── geminiService.ts         # ✅ No changes
│   └── audioService.ts          # ⚠️ Rewrite with expo-av
├── database/                     # WatermelonDB schemas & models
│   ├── models/
│   ├── schema.ts
│   └── index.ts
├── types/                        # COPY from web app
│   └── index.ts                 # ✅ No changes
├── constants/                    # Theme, colors, etc.
│   ├── Colors.ts
│   └── Theme.ts
└── utils/                        # COPY from web app
    └── formatters.ts            # ✅ Minimal changes
```

---

## Step-by-Step Migration Plan

### Phase 1: Project Setup & Core Infrastructure

#### 1.1 Create Expo Project
```bash
# Create new Expo app with TypeScript & Expo Router
npx create-expo-app elite-condo-guard-mobile --template tabs

cd elite-condo-guard-mobile
```

#### 1.2 Install Essential Dependencies
```bash
# Navigation & Routing (if not using Expo Router)
npx expo install expo-router react-native-safe-area-context react-native-screens

# Supabase
npm install @supabase/supabase-js
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill

# Offline Database
npm install @nozbe/watermelondb @nozbe/with-observables
npx expo install @nozbe/watermelondb

# UI & Icons
npm install lucide-react-native
npx expo install react-native-svg

# Other essentials
npx expo install expo-constants expo-device expo-application
```

#### 1.3 Copy Reusable Code
- **Copy `types.ts`** → No changes needed
- **Copy `services/supabaseClient.ts`** → Update imports for AsyncStorage
- **Copy Supabase configuration** from `.env.local`

#### 1.4 Configure Supabase Client
```typescript
// services/supabaseClient.ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

### Phase 2: Replace Offline Storage (Dexie → WatermelonDB)

#### 2.1 Why WatermelonDB?
- Built for React Native with excellent performance
- Supports complex queries and relationships
- Lazy loading for large datasets
- Similar schema-based approach to Dexie

#### 2.2 Define WatermelonDB Schemas
Based on your `db.ts`, create models for:
- Visits
- VisitEvents
- Units
- Residents
- Staff
- Incidents
- Devices
- Settings (use AsyncStorage for simpler key-value)

**Example Schema** (based on your Dexie structure):
```typescript
// database/schema.ts
import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'visits',
      columns: [
        { name: 'condominium_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_status', type: 'string' },
        { name: 'check_in_at', type: 'number' },
        { name: 'device_id', type: 'string', isOptional: true },
        // ... other fields
      ],
    }),
    tableSchema({
      name: 'residents',
      columns: [
        { name: 'condominium_id', type: 'string' },
        { name: 'unit_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'phone', type: 'string', isOptional: true },
        // ... other fields
      ],
    }),
    // ... other tables
  ],
});
```

#### 2.3 Update `dataService.ts`
- Replace `db.visits.add()` → `database.write(async () => await visitsCollection.create())`
- Replace `db.visits.where()` → `visitsCollection.query(Q.where())`
- Keep the same API surface to minimize changes

---

### Phase 3: Rebuild UI Screens

#### 3.1 Authentication Flow
**Web:** `Login.tsx` → **Mobile:** `app/(auth)/login.tsx`

**Changes needed:**
- Replace HTML forms with React Native `<TextInput>`
- Use `KeyboardAvoidingView` for keyboard handling
- Style with React Native StyleSheet (no CSS)
- Keep authentication logic from `services/Supabase.ts`

#### 3.2 Main Navigation
**Web:** React Router + sidebar → **Mobile:** Tab Navigator or Drawer

**Recommended tab structure:**
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Home, List, PlusCircle, AlertCircle, Settings } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: Home }} />
      <Tabs.Screen name="daily-list" options={{ title: 'Registos', tabBarIcon: List }} />
      <Tabs.Screen name="new-entry" options={{ title: 'Nova Entrada', tabBarIcon: PlusCircle }} />
      <Tabs.Screen name="incidents" options={{ title: 'Ocorrências', tabBarIcon: AlertCircle }} />
      <Tabs.Screen name="settings" options={{ title: 'Definições', tabBarIcon: Settings }} />
    </Tabs>
  );
}
```

#### 3.3 Convert Key Screens

**Priority screens to convert:**

1. **Dashboard** (`pages/Dashboard.tsx` → `app/(tabs)/dashboard.tsx`)
   - Replace CSS with StyleSheet
   - Use `FlatList` or `ScrollView` for lists
   - Keep stats calculation logic

2. **New Entry** (`pages/NewEntry.tsx` → `app/(tabs)/new-entry.tsx`)
   - Replace QR scanner with `expo-camera`
   - Use React Native forms
   - Keep validation logic from web version

3. **Daily List** (`pages/DailyList.tsx` → `app/(tabs)/daily-list.tsx`)
   - Use `FlatList` with pull-to-refresh
   - Keep filtering/search logic

4. **Resident Search** (`pages/ResidentSearch.tsx` → `app/resident-search.tsx`)
   - Use `FlatList` with search bar
   - Keep search logic from `dataService.ts`

5. **Incidents** (`pages/Incidents.tsx` → `app/(tabs)/incidents.tsx`)
   - Similar to Daily List approach

---

### Phase 4: Hardware Features

#### 4.1 QR Code Scanning
Replace `html5-qrcode` with native camera:

```typescript
// Example with expo-camera
import { CameraView, useCameraPermissions } from 'expo-camera';

function QRScanner({ onScan }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission?.granted) {
    return <Button onPress={requestPermission} title="Enable Camera" />;
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      barcodeScannerSettings={{
        barcodeTypes: ['qr'],
      }}
      onBarcodeScanned={({ data }) => onScan(data)}
    />
  );
}
```

#### 4.2 PDF Generation (Visitor Passes)
Replace `jspdf` with `expo-print`:

```typescript
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

async function generateVisitorPass(visit: Visit) {
  const html = `
    <html>
      <body>
        <h1>Passe de Visitante</h1>
        <p>Nome: ${visit.visitor_name}</p>
        <!-- Add QR code as base64 image -->
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await shareAsync(uri);
}
```

#### 4.3 Audio Notifications
Replace Web Audio API with `expo-av`:

```typescript
import { Audio } from 'expo-av';

export class AudioService {
  private sound: Audio.Sound | null = null;

  async playSuccess() {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/success.mp3')
    );
    this.sound = sound;
    await sound.playAsync();
  }

  async cleanup() {
    await this.sound?.unloadAsync();
  }
}
```

#### 4.4 Maps (if using location features)
Replace `react-leaflet` with `react-native-maps`:

```typescript
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={{ flex: 1 }}
  initialRegion={{
    latitude: condominium.latitude,
    longitude: condominium.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
>
  <Marker coordinate={{ latitude: lat, longitude: lng }} />
</MapView>
```

---

### Phase 5: Styling & Theme

#### 5.1 Theme System
Your web app uses CSS custom properties. Convert to React Native theme:

```typescript
// constants/Colors.ts
export const Colors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    // ... other colors
  },
  dark: {
    background: '#1C1C1E',
    text: '#FFFFFF',
    primary: '#0A84FF',
    // ... other colors
  },
};
```

#### 5.2 Design Considerations
- **Large buttons** (as per your user preferences) → Set `minHeight: 48` on touchable elements
- **White backgrounds** → Use theme provider with white as default
- **Accessible UI** → Ensure touch targets are at least 44x44 points
- **No CSS** → All styling via StyleSheet or styled-components

---

## Code Reusability Summary

### ✅ Reuse with Minimal Changes (80-100%)
- `types.ts` - All TypeScript types
- `services/Supabase.ts` - Supabase queries and mutations
- `services/geminiService.ts` - AI service
- Business logic in all services
- Data validation functions
- Formatters and utilities

### ⚠️ Needs Adaptation (50-80%)
- `services/dataService.ts` - Replace Dexie with WatermelonDB
- `services/deviceUtils.ts` - Use Expo Device APIs
- `services/audioService.ts` - Use expo-av
- All UI components (rewrite with React Native components)

### ❌ Must Rewrite (0-50%)
- All CSS files
- Vite configuration
- PWA-specific code (`pwaLifecycleService.ts`)
- HTML-based layouts

---

## Development Workflow

### 1. Testing During Development
```bash
# Install Expo Go on your phone/tablet
# Start development server
npx expo start

# Scan QR code with Expo Go to test instantly
# Changes hot-reload automatically
```

### 2. Building for Production
```bash
# Build for Android
eas build --platform android

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Or build locally
npx expo run:android
npx expo run:ios
```

### 3. OTA Updates (Similar to PWA)
```bash
# Publish updates without app store review
eas update --branch production
```

---

## Migration Timeline Estimate

Based on your app's complexity:

| Phase | Tasks | Estimated Time |
|-------|-------|---------------|
| **Phase 1** | Project setup, Supabase config, copy types | 1-2 days |
| **Phase 2** | WatermelonDB setup, migrate offline storage | 3-5 days |
| **Phase 3** | Rebuild 5 main screens (auth, dashboard, new entry, daily list, incidents) | 1-2 weeks |
| **Phase 4** | Hardware features (QR, PDF, audio) | 3-5 days |
| **Phase 5** | Styling, theme, polish | 3-5 days |
| **Phase 6** | Testing, bug fixes | 1 week |

**Total: 4-6 weeks** for a single developer with React Native experience.

---

## Critical Considerations

### Offline-First Behavior
Your web app uses Dexie extensively. Ensure WatermelonDB replicates this:
- ✅ Sync queue for pending changes
- ✅ Conflict resolution
- ✅ Background sync when online

### Device Registration
Keep the same device identification system but use:
```typescript
import * as Device from 'expo-device';
import * as Application from 'expo-application';

const deviceId = Application.androidId || (await Device.getDeviceIdAsync());
```

### Photo Uploads
Replace web file uploads with:
```typescript
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const result = await ImagePicker.launchCameraAsync();
if (result.assets[0]) {
  const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  // Upload to Supabase
}
```

### Admin Features
Admin screens (`pages/admin/*`) can follow the same pattern:
- Use Expo Router: `app/admin/devices.tsx`, `app/admin/incidents.tsx`, etc.
- Keep all admin logic from current services

---

## Recommended First Steps

1. **✅ Create a new Expo project** (don't modify your existing web app)
2. **✅ Set up Supabase client** and verify authentication works
3. **✅ Copy `types.ts`** and verify it compiles
4. **✅ Build the Login screen** to validate the flow
5. **✅ Set up WatermelonDB** with one table (e.g., Visits)
6. **✅ Convert one simple screen** (e.g., Dashboard) to prove the concept
7. **📝 Iterate** and expand to other screens

---

## Alternative: Hybrid Approach

If full migration is too time-consuming, consider:

### Option A: Keep PWA + Add Native Features
- Wrap your existing web app in a WebView using **Capacitor.js**
- Add native modules only where needed (camera, push notifications)
- Fastest path but limited native feel

### Option B: Shared Codebase
- Use **Tamagui** or **React Native Web** to share components between web and mobile
- More complex setup but enables code sharing

---

## Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [WatermelonDB](https://watermelondb.dev/docs)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)

### Migration Guides
- [React Navigation - Migrating from React Router](https://reactnavigation.org/docs/migration-from-react-router/)
- [Supabase React Native Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/react-native)

---

## Questions to Consider

Before starting the migration:

1. **Do you need iOS + Android or just one platform?**
2. **Is offline-first critical?** (impacts database choice)
3. **Do you have existing users?** (impacts migration strategy)
4. **Timeline constraints?** (might affect hybrid vs. native choice)
5. **Do you want to maintain both web and mobile?** (affects architecture)

Let me know if you'd like me to elaborate on any specific section!
