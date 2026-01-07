# Phase 1 Monetization Setup Guide

This guide explains the Phase 1 monetization implementation and how to configure it for production.

## What's Implemented

### 1. Interstitial Ads (After Game Over)
- Shows full-screen ads every 3rd game over
- 90-second minimum wait between ads (prevents ad fatigue)
- 1.5-second delay after game over (lets player see final score)
- Automatically preloads next ad in background

### 2. Rewarded Video Ads (Continue Feature)
- Player can watch 30-second ad to continue with +2 lives
- Completely optional - player can skip
- Only shows immediately after game over
- If player skips or watches ad, normal restart button appears

## Features
- ✅ Minimal friction - ads don't interrupt active gameplay
- ✅ Frequency capping prevents spam
- ✅ Test ads work out of the box for development
- ✅ Clear value exchange for rewarded videos
- ✅ Graceful fallbacks if ads fail to load

## Package Used
We're using `react-native-google-mobile-ads` - the official Google Mobile Ads SDK for React Native.

## Setup for Production

### Step 1: Create Google AdMob Account
1. Go to https://admob.google.com
2. Sign in with Google account
3. Click "Get Started" and follow setup

### Step 2: Create App in AdMob
1. Click "Apps" in left sidebar
2. Click "Add App"
3. Select your platform (iOS/Android)
4. Enter app name: "Wacky Mole"
5. Click "Add"
6. Note down your **App ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX)

### Step 3: Create Ad Units
You need to create 2 ad units:

#### Interstitial Ad Unit
1. In your app dashboard, click "Ad units" tab
2. Click "Add ad unit"
3. Select "Interstitial"
4. Name it: "Game Over Interstitial"
5. Click "Create ad unit"
6. Copy the **Ad unit ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX)

#### Rewarded Ad Unit
1. Click "Add ad unit" again
2. Select "Rewarded"
3. Name it: "Continue Game Reward"
4. Click "Create ad unit"
5. Copy the **Ad unit ID**

### Step 4: Update app.json
Add your App ID to `app.json`:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMobileAdsAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
      }
    },
    "ios": {
      "config": {
        "googleMobileAdsAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
      }
    }
  }
}
```

### Step 5: Update AdManager.ts
Replace the placeholder ad unit IDs in `AdManager.ts`:

```typescript
// Line 13-14
const INTERSTITIAL_AD_ID = __DEV__
  ? TEST_INTERSTITIAL_AD_ID
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your interstitial ID

const REWARDED_AD_ID = __DEV__
  ? TEST_REWARDED_AD_ID
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your rewarded ID
```

### Step 6: Rebuild App
Since we added a native module, you need to rebuild:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

### Step 7: Test with Real Ads
1. Install on a real device
2. Play 3 games to trigger interstitial ad
3. Verify ads show correctly
4. Test continue feature

⚠️ **Important**: Real ads may take 24-48 hours to start showing after creating ad units.

## Testing During Development

The app uses test ad unit IDs automatically in development mode (`__DEV__`):
- Test ads show immediately
- No revenue generated (that's expected)
- Test ads labeled as "Test Ad"

To test on device during development:
```bash
npx expo start
# Scan QR code with Expo Go app
```

## Frequency Settings (Optional Tuning)

You can adjust these values in `AdManager.ts`:

```typescript
const INTERSTITIAL_FREQUENCY = 3; // Show every Nth game over (default: 3)
const MIN_TIME_BETWEEN_ADS = 90000; // Minimum ms between ads (default: 90s)
```

### Recommended Settings by User Feedback:
- **Aggressive**: Every 2nd game, 60s minimum
- **Balanced**: Every 3rd game, 90s minimum ⭐ (current)
- **Gentle**: Every 4th game, 120s minimum

## Revenue Optimization Tips

1. **Monitor metrics in AdMob dashboard:**
   - Impressions (how many ads shown)
   - eCPM (earnings per 1000 impressions)
   - Fill rate (how often ads load successfully)

2. **Test different frequencies:**
   - Start gentle, increase gradually
   - Watch for drop in retention/session length

3. **Rewarded videos typically earn 2-3x more than interstitials**
   - Encourage their use with good UX
   - Consider adding more reward options in Phase 2

4. **Geographic targeting:**
   - US/UK/Canada have highest CPMs ($10-20)
   - Other regions typically $2-8

## Troubleshooting

### "Ads not showing in production"
- Wait 24-48 hours after creating ad units
- Check app ID is correct in app.json
- Verify ad unit IDs in AdManager.ts
- Check AdMob account is fully approved

### "Test ads not showing in development"
- Make sure you're in development mode (`__DEV__` is true)
- Check console for error messages
- Try: `npm install` to ensure packages installed

### "User sees same ad repeatedly"
- Normal for test ads
- Real ads have variety automatically

### "Continue button doesn't work"
- Rewarded ad might not be loaded yet
- Check console logs for errors
- User must watch full ad (can't skip early)

## Phase 2 Preview

Future monetization features to consider:
- IAP: Remove ads permanently ($2.99)
- IAP: Cosmetic themes/skins ($0.99)
- Rewarded power-ups (2x score multiplier)
- Daily reward system with ads

## Need Help?

- AdMob Help Center: https://support.google.com/admob
- Expo AdMob Docs: https://docs.expo.dev/versions/latest/sdk/admob/
- Test your setup with AdMob Test Suite (search "AdMob test suite" in app stores)

---

**Created**: Phase 1 Monetization Implementation
**Test Ad IDs**: Automatically used in development
**Production**: Requires AdMob account setup
