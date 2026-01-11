# 📱 AdMob Account Setup Guide

This guide will help you set up your Google AdMob account and configure your ad units for Wacky Mole.

---

## 🎯 What You Need to Do

1. Create a Google AdMob account
2. Add your app to AdMob
3. Create ad units (Interstitial & Rewarded)
4. Get your ad unit IDs
5. Update the code with real IDs

---

## Step 1: Create Google AdMob Account

### 1.1 Sign Up

1. Go to [admob.google.com](https://admob.google.com)
2. Click **"Get Started"** or **"Sign In"**
3. Use your Google account (or create one)
4. Accept the Terms of Service

### 1.2 Complete Your Profile

1. **Enter your name and address** (for payment purposes)
2. **Choose your currency** (this cannot be changed later!)
3. **Accept AdMob policies**
4. Click **"Continue to AdMob"**

---

## Step 2: Add Your App

### 2.1 Register Your App

1. In AdMob dashboard, click **"Apps"** in left sidebar
2. Click **"Add App"**

### 2.2 App Platform

1. Select **"iOS"** (we'll add Android later if needed)
2. Click **"Continue"**

### 2.3 Is Your App Published?

1. Select **"No"** (since you haven't submitted to App Store yet)
2. Click **"Continue"**

### 2.4 App Details

1. **App name**: Enter "Wacky Mole"
2. **Platform**: iOS (should be pre-selected)
3. Click **"Add App"**

### 2.5 Save Your App ID

You'll see a screen showing:
```
iOS App ID: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY
```

**SAVE THIS ID!** You'll need it for `app.json`

---

## Step 3: Create Ad Units

You need to create TWO ad units for Wacky Mole:
1. **Interstitial Ad** (shows every 2 games)
2. **Rewarded Ad** (watch to continue)

### 3.1 Create Interstitial Ad Unit

1. On your app's page, click **"Ad units"** tab
2. Click **"Add ad unit"**
3. Select **"Interstitial"**
4. Click **"Next"**

**Ad unit settings:**
- **Ad unit name**: `Wacky Mole - Interstitial`
- Leave other settings as default
- Click **"Create ad unit"**

**SAVE THE AD UNIT ID:**
```
Ad unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
```

This is your **Interstitial Ad Unit ID**. Write it down!

### 3.2 Create Rewarded Ad Unit

1. Click **"Add ad unit"** again
2. Select **"Rewarded"**
3. Click **"Next"**

**Ad unit settings:**
- **Ad unit name**: `Wacky Mole - Rewarded`
- **Reward amount**: `1` (represents +1 life)
- **Reward item**: `Life` or `Continue`
- Click **"Create ad unit"**

**SAVE THE AD UNIT ID:**
```
Ad unit ID: ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW
```

This is your **Rewarded Ad Unit ID**. Write it down!

---

## Step 4: Update Your Code

Now you need to replace the TEST ad IDs with your REAL ad IDs.

### 4.1 Update app.json

**Current (TEST):**
```json
"plugins": [
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-3940256099942544~3347511713",
      "iosAppId": "ca-app-pub-3940256099942544~1458002511"
    }
  ]
]
```

**Update to (PRODUCTION):**
```json
"plugins": [
  [
    "react-native-google-mobile-ads",
    {
      "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY", // Replace
      "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"      // Replace with YOUR iOS App ID
    }
  ]
]
```

### 4.2 Update AdManager.ts

Open `AdManager.ts` and find this section (around line 10):

**Current (TEST):**
```typescript
const AD_UNIT_IDS = {
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Replace
  rewarded: __DEV__
    ? TestIds.REWARDED
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Replace
};
```

**Update to (PRODUCTION):**
```typescript
const AD_UNIT_IDS = {
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ', // Your Interstitial Ad Unit ID
  rewarded: __DEV__
    ? TestIds.REWARDED
    : 'ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW', // Your Rewarded Ad Unit ID
};
```

**Important:** The `__DEV__` check keeps test ads in development mode, but uses real ads in production builds.

---

## Step 5: App Store Requirements

Before submitting to App Store, you MUST:

### 5.1 Add Privacy Policy

AdMob requires you to have a privacy policy that discloses:
- You use AdMob for ads
- Data collection practices
- User rights

**Where to add it:**
1. Create a simple privacy policy (use a generator if needed)
2. Host it online (GitHub Pages, your website, etc.)
3. Add the URL to App Store Connect

**Sample Privacy Policy Sections:**
```
We use Google AdMob to show advertisements in our app.
AdMob may collect and process personal data including:
- Device information
- Location data (if permitted)
- Ad interaction data

For more information, see Google's privacy policy:
https://policies.google.com/privacy
```

### 5.2 App Tracking Transparency (iOS 14.5+)

iOS requires asking permission to track users for ads.

**Add to app.json:**
```json
"ios": {
  "infoPlist": {
    "NSUserTrackingUsageDescription": "This app uses your data to provide personalized ads and improve your experience."
  }
}
```

The system will automatically show the tracking permission dialog on first launch.

---

## Step 6: Testing with Real Ads

### Before Production Testing:

**IMPORTANT:** Don't click your own ads! This can get your AdMob account banned!

### Safe Testing Methods:

**Option 1: Test Devices (Recommended)**

1. Get your device's advertising ID:
   ```typescript
   // Add this temporarily to App.tsx
   import { Platform } from 'react-native';
   import mobileAds from 'react-native-google-mobile-ads';

   useEffect(() => {
     mobileAds().requestConfiguration({
       testDeviceIdentifiers: ['YOUR_DEVICE_ID_HERE'],
     });
   }, []);
   ```

2. Run app on your device
3. Check console for: `"To get test ads on this device, set: [DEVICE_ID]"`
4. Copy that device ID
5. Add it to the `testDeviceIdentifiers` array

**Option 2: Keep Using Test Ads**

Leave `__DEV__` mode enabled and test ads will show (safe to click).

---

## Step 7: Monitor Your Earnings

### AdMob Dashboard

Once live:
1. Go to [admob.google.com](https://admob.google.com)
2. Click **"Overview"** to see earnings
3. View metrics:
   - **Impressions**: How many ads shown
   - **eCPM**: Earnings per 1000 impressions
   - **Revenue**: Total earnings

### Payment Setup

1. Click **"Payments"** in sidebar
2. Add your payment information
3. Set up bank account or other payment method
4. **Minimum payout**: $100 (for most regions)

---

## 📊 Expected Revenue (Rough Estimates)

### Interstitial Ads:
- **eCPM**: $1-5 per 1000 impressions
- **Example**: 1000 players × 2 games each = 1000 ad impressions = $1-5

### Rewarded Ads:
- **eCPM**: $10-20 per 1000 impressions (higher because voluntary!)
- **Example**: 1000 players × 30% watch ad × 1 time = 300 impressions = $3-6

### Notes:
- Revenue varies by country, season, ad inventory
- Games typically earn more during holidays
- US/Canada/Europe traffic earns more than other regions

---

## ✅ Final Checklist

Before submitting to App Store:

- [ ] AdMob account created
- [ ] App added to AdMob
- [ ] Interstitial ad unit created
- [ ] Rewarded ad unit created
- [ ] All ad unit IDs saved
- [ ] app.json updated with real App ID
- [ ] AdManager.ts updated with real ad unit IDs
- [ ] Privacy policy created and hosted
- [ ] App Tracking Transparency description added
- [ ] Tested ads on real device (using test mode)
- [ ] No errors in production build

---

## 🎯 Summary: What You Need

**From AdMob Dashboard:**

1. **iOS App ID** → Goes in `app.json`
   - Format: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY`

2. **Interstitial Ad Unit ID** → Goes in `AdManager.ts`
   - Format: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`

3. **Rewarded Ad Unit ID** → Goes in `AdManager.ts`
   - Format: `ca-app-pub-XXXXXXXXXXXXXXXX/WWWWWWWWWW`

**Update these 3 locations:**
1. `app.json` - iosAppId
2. `AdManager.ts` - interstitial ad unit ID
3. `AdManager.ts` - rewarded ad unit ID

---

## 🆘 Common Issues

### Issue: "Ad request failed"

**Solutions:**
- Check internet connection
- Verify ad unit IDs are correct
- Make sure AdMob account is approved (can take 24 hours)
- Check if app bundle ID matches AdMob settings

### Issue: No ads showing

**Solutions:**
- New ad units take ~1 hour to activate
- Check AdMob account status
- Verify payment info is added
- Make sure you're not in test mode with wrong IDs

### Issue: Account suspended

**Solutions:**
- Don't click your own ads
- Use test mode during development
- Follow AdMob policies strictly
- Appeal if you think it's a mistake

---

## 📱 Next Steps

1. Complete the AdMob setup above
2. Update the code with your real IDs
3. Follow TESTING_GUIDE.md to verify everything works
4. Submit to App Store!

Good luck with your monetization! 💰
