# PWA Update Debugging Guide

## ✅ Implemented Fixes

### 1. Auth State Persistence (App.tsx)
- **Login**: Auth data saved to `localStorage` (~300 bytes)
- **Logout**: Auth data cleared
- **App Load**: Auth restored from `localStorage`
- **Result**: User stays logged in across PWA updates

### 2. Enhanced Logging (PWAUpdateNotification.tsx)
All PWA events now log with `[PWA Update]` prefix:
- ✅ Service Worker registered
- 🔄 Update checker initialized
- 🔍 Checking for updates (every 60 seconds)
- 🎉 NEW VERSION AVAILABLE
- ⚡ Update prompt shown
- 🔄 User clicked update
- ⏭️ User dismissed update

---

## 🔍 How to Debug Update Issues

### Step 1: Open Browser DevTools Console
Look for these log messages after deploying a new version:

```
[PWA Update] ✅ Service Worker registered
[PWA Update] 🔄 Update checker initialized (checking every 60s)
[PWA Update] 🔍 Checking for updates...
[PWA Update] ✓ Update check completed
```

If you see **NEW VERSION AVAILABLE**, the prompt should appear.

### Step 2: Check Service Worker Status
1. Open DevTools → **Application** tab
2. Go to **Service Workers** section
3. Check the status:
   - **Activated**: Current version running
   - **Waiting**: New version waiting to activate
   - **Installing**: New version being installed

### Step 3: Force Update Check
In DevTools → Application → Service Workers:
- Click **"Update"** button
- Or click **"Unregister"** and refresh the page

### Step 4: Check Network Tab
- Filter by "sw.js" or "service-worker"
- Verify new SW file is being fetched (not cached)
- Look for 200 response (not 304 Not Modified)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Update prompt never shows"
**Possible Causes:**
- Browser is caching the old Service Worker file
- `skipWaiting: true` is activating before prompt shows
- Service Worker not detecting changes

**Solutions:**
1. **Hard Refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear Service Workers**:
   - DevTools → Application → Service Workers → Unregister
   - Refresh page
3. **Check Build Hash**: Ensure `sw.js` has different content hash after build
4. **Test in Incognito**: New session without cached SW

### Issue 2: "User gets logged out after update"
**Status:** ✅ **FIXED** (auth now persists in localStorage)

**Verify Fix:**
1. Login to app
2. Open DevTools → Application → Local Storage
3. Check for `auth_user` key with user data
4. Deploy new version
5. After update, check console for: `[App] ✅ Auth state restored from localStorage`

### Issue 3: "Update happens automatically without prompt"
**Cause:** `skipWaiting: true` in vite.config.ts forces immediate activation

**Current Config (vite.config.ts:96):**
```typescript
skipWaiting: true,  // ← Forces immediate activation
registerType: 'prompt',  // ← Should show prompt first
```

**These are conflicting!** Consider changing to:
```typescript
skipWaiting: false,  // Wait for user approval
clientsClaim: true
```

Then update manually in PWAUpdateNotification.tsx:
```typescript
const handleUpdate = () => {
  updateServiceWorker(true);  // This will trigger skipWaiting
};
```

---

## 📊 Testing Update Flow

### Test Scenario 1: Deploy New Version
1. Make a visible change (e.g., change text in Dashboard)
2. Build: `npm run build`
3. Deploy to production
4. Open app in browser
5. **Within 60 seconds**, you should see:
   ```
   [PWA Update] 🔍 Checking for updates...
   [PWA Update] 🎉 NEW VERSION AVAILABLE! Showing update prompt...
   [PWA Update] showReload state changed: true
   ```
6. Blue notification should appear at top
7. Click **"Atualizar Agora"**
8. App reloads with new version
9. Check console for: `[App] ✅ Auth state restored from localStorage`
10. User should still be logged in

### Test Scenario 2: Dismiss Update
1. When update prompt shows, click **"Mais Tarde"**
2. Console logs: `[PWA Update] ⏭️ User dismissed update notification`
3. Prompt disappears
4. Next update check (60s later) will show prompt again

### Test Scenario 3: Offline Update
1. Disconnect from internet
2. Service Worker continues working (offline mode)
3. Reconnect to internet
4. Update check resumes
5. If new version available, prompt shows

---

## 🔧 Configuration Summary

### Current Settings (vite.config.ts)
```typescript
VitePWA({
  registerType: 'prompt',        // Show prompt before updating
  injectRegister: 'auto',        // Auto-inject SW registration
  workbox: {
    skipWaiting: true,           // ⚠️ Immediately activate new SW
    clientsClaim: true,          // Take control of all tabs
    cleanupOutdatedCaches: true  // Remove old caches
  }
})
```

### Update Check Frequency
- **Current**: Every 60 seconds (PWAUpdateNotification.tsx:25)
- **Recommended for Production**: Every 5 minutes (300,000 ms)
- Change on line 25: `60 * 1000` → `5 * 60 * 1000`

---

## 📝 Production Checklist

Before deploying to production tablets:

- [ ] Change update check interval to 5 minutes
- [ ] Test update flow in development
- [ ] Test update flow in production (staging environment)
- [ ] Verify auth persistence works
- [ ] Test offline → online transition
- [ ] Test dismissing update notification
- [ ] Verify no automatic logout occurs
- [ ] Check localStorage size (should be minimal)
- [ ] Test on actual tablet devices
- [ ] Monitor console logs for errors

---

## 🚀 Recommended Next Steps

1. **Test the current implementation** with these new logs
2. **Deploy a minor change** and observe the console
3. **Share console logs** if update prompt still doesn't show
4. **Consider changing `skipWaiting: false`** if you want more control
5. **Increase update check interval** to 5 minutes for production

---

## 📞 Need Help?

If issues persist, provide:
1. Full console logs (with `[PWA Update]` messages)
2. Service Worker status from DevTools
3. Network tab showing sw.js requests
4. Browser/device information
