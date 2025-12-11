# PWA Setup Guide - Elite CondoGuard

## ✅ What's Been Configured

Your Elite CondoGuard app is now a full Progressive Web App (PWA) with:

### 1. **Offline-First Architecture**
- Service Worker with Workbox for intelligent caching
- IndexedDB (Dexie) for local data storage
- Automatic background sync when connection returns

### 2. **Caching Strategies**
- **App Shell**: Cached on install (HTML, CSS, JS)
- **CDN Resources**: CacheFirst strategy (Tailwind, fonts, AI Studio CDN)
- **Supabase API**: NetworkFirst with 10s timeout (5min cache)
- **Images**: CacheFirst (7 days cache)

### 3. **Installation Support**
- Web App Manifest configured
- iOS/Android install prompts
- Standalone mode (runs like native app)
- Custom app icon and splash screen

---

## 🚀 How to Install on Tablet

### **Android Tablets (Chrome/Edge)**

1. **Build and serve the app**:
   ```bash
   npm run build
   npm run preview
   ```

2. **Access from tablet**:
   - Open Chrome/Edge on your tablet
   - Navigate to: `https://YOUR_LOCAL_IP:3000`
   - Accept the SSL warning (self-signed cert)

3. **Install the PWA**:
   - Tap the menu (⋮) → "Install app" or "Add to Home Screen"
   - Or look for the install banner at the bottom
   - Confirm installation

4. **Launch**:
   - Find "CondoGuard" icon on your home screen
   - Tap to open in standalone mode

### **iOS/iPadOS (Safari)**

1. **Access the app**:
   - Open Safari on iPad
   - Navigate to: `https://YOUR_LOCAL_IP:3000`

2. **Add to Home Screen**:
   - Tap the Share button (□↑)
   - Scroll down and tap "Add to Home Screen"
   - Edit name if needed → "Add"

3. **Launch**:
   - Find "CondoGuard" icon on home screen
   - Tap to open in fullscreen mode

---

## 🌐 Deployment Options

### Option 1: Local Network (Development)
```bash
npm run build
npm run preview  # Serves on https://0.0.0.0:4173
```
- Tablets must be on same WiFi
- Access via: `https://YOUR_IP:4173`

### Option 2: Netlify/Vercel (Production)
```bash
# Build
npm run build

# Deploy dist folder to:
- Netlify: netlify deploy --prod
- Vercel: vercel --prod
```

### Option 3: Self-Hosted (Production)
```bash
# Build
npm run build

# Serve with nginx/caddy
# Point to: dist/
# Enable HTTPS (required for PWA)
```

---

## 🔍 Testing PWA Features

### 1. **Check Service Worker Registration**
Open DevTools (F12) → Application → Service Workers
- Should show "Activated and running"

### 2. **Test Offline Mode**
- DevTools → Network → Toggle "Offline"
- App should still load and show cached data
- New entries saved with `PENDING_SYNC` status

### 3. **Verify Manifest**
DevTools → Application → Manifest
- Check all fields are correct
- Icons should be visible

### 4. **Lighthouse Audit**
DevTools → Lighthouse → PWA
- Should score 90+ on PWA criteria

---

## 📱 Tablet-Specific Optimizations

### Already Configured:
✅ Viewport fit for notched devices
✅ Prevents accidental zoom/pull-to-refresh
✅ Kiosk mode styles (no text selection on UI)
✅ HTTPS support for camera access
✅ Standalone display mode

### Recommended Settings on Tablet:
1. **Disable screen auto-lock** (Settings → Display)
2. **Enable "Stay awake while charging"**
3. **Set default orientation** to Portrait
4. **Disable browser suggestions/autocomplete**

---

## 🔧 Advanced Configuration

### Update Service Worker Cache Duration

Edit [vite.config.ts:60-87](vite.config.ts#L60-L87):

```typescript
expiration: {
  maxEntries: 100,
  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
}
```

### Add Custom Shortcut (Home Screen)

Edit [public/manifest.json](public/manifest.json):

```json
"shortcuts": [
  {
    "name": "Emergency Report",
    "url": "/incidents?emergency=true",
    "icons": [{ "src": "/icon.svg", "sizes": "192x192" }]
  }
]
```

---

## 🐛 Troubleshooting

### "Install" button doesn't appear
- ✅ Must be served over HTTPS
- ✅ Manifest must be valid JSON
- ✅ Service worker must register successfully
- ✅ User must interact with page first

### App doesn't work offline
- Check Service Worker is active (DevTools)
- Verify Workbox caching patterns
- Check IndexedDB has data (Application → IndexedDB)

### Icons not showing
- Icons must be in `/public/icons/` folder
- Generate PNGs from SVG: use `npm run generate-icons` (not implemented yet)
- Or create manually: 192x192, 512x512 PNG files

### Can't access from tablet
- Both devices on same WiFi?
- Firewall blocking port 3000/4173?
- Try: `npm run dev -- --host`

---

## 📦 Production Checklist

Before deploying to production:

- [ ] Replace self-signed SSL with valid certificate
- [ ] Update Supabase env vars in hosting platform
- [ ] Test on actual tablets (Android + iOS)
- [ ] Verify offline sync works correctly
- [ ] Run Lighthouse audit (PWA score 90+)
- [ ] Test install flow on both platforms
- [ ] Configure caching TTLs for production
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Create app store icons (512x512, 192x192)
- [ ] Test background sync after network restore

---

## 🎨 Customizing the PWA

### Change App Colors
Edit [public/manifest.json](public/manifest.json):
```json
"theme_color": "#0f172a",
"background_color": "#0f172a"
```

### Change App Icon
Replace [public/icon.svg](public/icon.svg) with your own logo.

### Change App Name
Edit [public/manifest.json](public/manifest.json):
```json
"name": "Your Condo Name Guard",
"short_name": "YourGuard"
```

---

## 📚 Resources

- [PWA Builder](https://www.pwabuilder.com/) - Validate your PWA
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify Service Worker status in DevTools
3. Test in incognito/private mode
4. Clear cache and reinstall PWA

---

**Created by**: Chong Technologies
**Version**: 1.0.0
**Last Updated**: 2025-12-03
