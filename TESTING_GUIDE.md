# 🧪 Ad Testing Guide - Wacky Mole

This guide will walk you through testing the ad implementation step-by-step, even if you're completely new to this!

---

## 📋 What You'll Test

1. **Interstitial Ads** - Full-screen ads that show automatically every 2 games
2. **Rewarded Ads** - Voluntary ads that give +1 life when watched

---

## 🚀 Step 1: Start the Development Server

1. Open Terminal
2. Navigate to your project folder:
   ```bash
   cd /Users/liongchenglex/Desktop/AI_Projects/wacky_mole
   ```

3. Start the Expo server:
   ```bash
   npx expo start
   ```

4. **IMPORTANT**: You'll see a warning about native code changes. Press `s` to switch to **development build mode** (required for ads to work)

5. You should see a QR code in the terminal

---

## 📱 Step 2: Install on Your Phone

### Option A: Using Development Build (Recommended for Testing Ads)

**You MUST use a development build because ads don't work in Expo Go!**

1. Build a development version:
   ```bash
   eas build --profile development --platform ios
   ```

2. Wait for the build to finish (~10-15 minutes)

3. When complete, you'll get a download URL

4. Open the URL on your iPhone and install the app

### Option B: Quick Test (If you already have a dev build)

If you already have a development build installed from before:
1. Just scan the QR code with your iPhone camera
2. Open in the development app

---

## 🎮 Step 3: Test Interstitial Ads

### Test Scenario: Ads Show Every 2 Games

**Game 1:**
1. Start the game
2. Play until you lose all lives
3. Game Over screen appears
4. ❌ **No ad should show** (first game)
5. Click "Restart"

**Game 2:**
1. Play until you lose all lives
2. Game Over screen appears
3. ✅ **Interstitial ad should show!** (after 2 games)
4. You'll see a test ad with a close button
5. Close the ad after 5 seconds
6. Click "Restart"

**Game 3:**
1. Play until you lose all lives
2. Game Over screen appears
3. ❌ **No ad should show** (counter resets)
4. Click "Restart"

**Game 4:**
1. Play until you lose all lives
2. ✅ **Interstitial ad should show again!** (every 2 games)

### ✅ Expected Behavior

- Ads appear **after every 2nd game**
- Ad shows **before** the Game Over modal
- You can close the ad after 5 seconds
- Game continues normally after closing ad

### ❌ What to Check If It's Not Working

1. **Check Terminal Logs:**
   - Look for `[AdManager]` messages
   - Should see "Interstitial ad loaded"
   - Should see "Showing interstitial ad"

2. **Common Issues:**
   - Using Expo Go instead of development build
   - Ad didn't load in time (check internet connection)
   - AdMob SDK not initialized

---

## 🎁 Step 4: Test Rewarded Ads

### Test Scenario: Watch Ad to Continue

1. Play a game and lose all lives

2. **Game Over screen shows TWO options:**
   - 📺 "Watch Ad - Continue (+1 Life)" (green button)
   - "Restart" (dark blue button)

3. Click the **green "Watch Ad"** button

4. ✅ **Rewarded ad video plays**

5. **Watch the full ad** (don't close early!)

6. Ad finishes and closes automatically

7. ✅ **You get +1 life** and game continues!

8. Your score is preserved (doesn't reset to 0)

### Test Continue Limits

1. Use "Watch Ad" to continue **3 times in the same game**

2. On the 4th game over, the green button should **disappear**

3. You've used all 3 continues for this session

4. Click "Restart" to start a fresh game (continues reset to 0)

### ✅ Expected Behavior

- Green "Watch Ad" button appears on game over
- Button shows "3 continues left", then "2 continues left", etc.
- After using 3 continues, button disappears
- Continues reset to 0 when you click "Restart"
- You get exactly +1 life after watching
- Your score doesn't reset

### ❌ What to Check If It's Not Working

1. **Button Not Appearing:**
   - Check Terminal logs for "Rewarded ad loaded"
   - Make sure you haven't used 3 continues already

2. **Ad Not Playing:**
   - Check internet connection
   - Look for errors in Terminal

3. **Not Getting Life:**
   - Make sure you watched the **full ad**
   - Check Terminal for "User watched full ad, granting reward"

---

## 🔍 Step 5: Check the Console Logs

While testing, watch the Terminal for these messages:

### Successful Ad Flow:

```
[AdManager] AdMob initialized successfully
[AdManager] Interstitial ad loaded
[AdManager] Rewarded ad loaded
[AdManager] Showing interstitial ad
[AdManager] Interstitial ad closed
[AdManager] User watched full ad, granting reward
```

### Error Messages to Watch For:

```
[AdManager] Failed to initialize AdMob: [error details]
[AdManager] Interstitial ad not ready yet
[AdManager] Rewarded ad error: [error details]
```

---

## 📸 Step 6: Visual Checklist

### Interstitial Ad Test:
- [ ] Ad appears automatically after 2 games
- [ ] Ad has a close button (appears after 5 seconds)
- [ ] Closing ad returns to Game Over screen
- [ ] Pattern repeats every 2 games

### Rewarded Ad Test:
- [ ] Green "Watch Ad" button visible on game over
- [ ] Button shows remaining continues count
- [ ] Clicking button plays full-screen video ad
- [ ] Watching full ad grants +1 life
- [ ] Game continues with preserved score
- [ ] Button disappears after 3 uses
- [ ] Button reappears after clicking "Restart"

---

## 🐛 Troubleshooting

### Problem: No ads showing at all

**Solution:**
1. Make sure you're using a **development build**, not Expo Go
2. Check internet connection
3. Restart the app
4. Check Terminal for error messages

### Problem: Ads show but close immediately

**Solution:**
- This is normal for test ads
- Production ads will work properly
- Make sure you're using test ad IDs (currently configured)

### Problem: "Watch Ad" button not working

**Solution:**
1. Check console logs for ad loading errors
2. Make sure rewarded ad loaded (check Terminal)
3. Try tapping again (ad might still be loading)

### Problem: Getting life without watching ad

**Solution:**
- This shouldn't happen
- Check the code in `handleWatchAdToContinue`
- Verify ad event listeners are working

---

## ✅ Final Checklist

Before considering testing complete:

- [ ] Interstitial ads show every 2 games
- [ ] Can close interstitial ads after 5 seconds
- [ ] "Watch Ad" button appears on game over
- [ ] Watching ad grants exactly +1 life
- [ ] Can use "Watch Ad" 3 times per session
- [ ] Button disappears after 3 uses
- [ ] Continues reset when clicking "Restart"
- [ ] No crashes or errors in console
- [ ] All ads close properly
- [ ] Game continues normally after ads

---

## 🎉 Success Criteria

**Your ad implementation is working if:**

1. You see test ads appearing
2. Interstitial ads show every 2 games
3. Rewarded ads grant +1 life
4. No errors in the console
5. Game plays smoothly with ads

---

## 📝 Notes for Production

**Before submitting to App Store:**

1. Replace test ad unit IDs in `AdManager.ts` with your **real AdMob ad unit IDs**
2. Test with real ads (not test ads)
3. Verify ads work on physical device
4. Check that ads respect user's ad tracking preferences (iOS 14.5+)

**Current setup uses TEST ad unit IDs:**
- Interstitial: `ca-app-pub-3940256099942544~3347511713`
- Rewarded: `ca-app-pub-3940256099942544~1458002511`

These are Google's official test IDs and will show sample ads.

---

## 🆘 Need Help?

If you encounter issues:

1. Check the Terminal logs for `[AdManager]` messages
2. Make sure you're using a development build
3. Verify internet connection is working
4. Try restarting the app
5. Check the ADMOB_SETUP.md guide for account configuration

Happy testing! 🎮
