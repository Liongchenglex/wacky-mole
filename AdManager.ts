import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Test Ad Unit IDs (use these during development)
const TEST_INTERSTITIAL_AD_ID = TestIds.INTERSTITIAL;
const TEST_REWARDED_AD_ID = TestIds.REWARDED;

// TODO: Replace with your actual Ad Unit IDs before production
// Get these from https://apps.admob.com
const INTERSTITIAL_AD_ID = __DEV__
  ? TEST_INTERSTITIAL_AD_ID
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Replace with your real ID

const REWARDED_AD_ID = __DEV__
  ? TEST_REWARDED_AD_ID
  : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Replace with your real ID

const GAME_OVER_COUNT_KEY = 'wacky_mole_game_over_count';
const INTERSTITIAL_FREQUENCY = 3; // Show ad every 3rd game over
const MIN_TIME_BETWEEN_ADS = 90000; // 90 seconds minimum between ads

let lastInterstitialTime = 0;
let interstitialAd: InterstitialAd | null = null;
let rewardedAd: RewardedAd | null = null;
let isInterstitialLoaded = false;
let isRewardedLoaded = false;

export class AdManager {
  static async initialize(): Promise<void> {
    try {
      // Initialize Google Mobile Ads SDK
      await mobileAds().initialize();

      // Create ad instances
      interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_ID);
      rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_ID);

      // Set up interstitial listeners
      if (interstitialAd) {
        interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
          isInterstitialLoaded = true;
        });
        interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
          isInterstitialLoaded = false;
          // Preload next ad
          this.loadInterstitial();
        });
      }

      // Set up rewarded listeners
      if (rewardedAd) {
        rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
          isRewardedLoaded = true;
        });
        rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
          // Reward will be handled in showRewardedForContinue
        });
      }

      // Preload first interstitial
      await this.loadInterstitial();
    } catch (error) {
      console.warn('Ad initialization failed:', error);
    }
  }

  /**
   * Load interstitial ad
   */
  static async loadInterstitial(): Promise<void> {
    try {
      if (interstitialAd && !isInterstitialLoaded) {
        await interstitialAd.load();
      }
    } catch (error) {
      console.warn('Failed to load interstitial:', error);
      isInterstitialLoaded = false;
    }
  }

  /**
   * Load rewarded video ad
   */
  static async loadRewarded(): Promise<void> {
    try {
      if (!rewardedAd) {
        rewardedAd = RewardedAd.createForAdRequest(REWARDED_AD_ID);
        rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
          isRewardedLoaded = true;
        });
      }
      if (rewardedAd && !isRewardedLoaded) {
        await rewardedAd.load();
      }
    } catch (error) {
      console.warn('Failed to load rewarded ad:', error);
      isRewardedLoaded = false;
    }
  }

  /**
   * Check if we should show interstitial ad after game over
   */
  static async shouldShowInterstitial(): Promise<boolean> {
    try {
      // Check minimum time between ads
      const now = Date.now();
      if (now - lastInterstitialTime < MIN_TIME_BETWEEN_ADS) {
        return false;
      }

      // Get game over count
      const countStr = await AsyncStorage.getItem(GAME_OVER_COUNT_KEY);
      const count = countStr ? parseInt(countStr, 10) : 0;
      const newCount = count + 1;

      // Save incremented count
      await AsyncStorage.setItem(GAME_OVER_COUNT_KEY, String(newCount));

      // Show ad every 3rd game over
      return newCount % INTERSTITIAL_FREQUENCY === 0;
    } catch (error) {
      console.warn('Error checking interstitial frequency:', error);
      return false;
    }
  }

  /**
   * Show interstitial ad after game over
   * Returns true if ad was shown
   */
  static async showInterstitialAfterGameOver(): Promise<boolean> {
    try {
      const shouldShow = await this.shouldShowInterstitial();

      if (!shouldShow || !isInterstitialLoaded || !interstitialAd) {
        return false;
      }

      await interstitialAd.show();
      lastInterstitialTime = Date.now();

      return true;
    } catch (error) {
      console.warn('Failed to show interstitial:', error);
      isInterstitialLoaded = false;
      // Try to load next ad anyway
      this.loadInterstitial();
      return false;
    }
  }

  /**
   * Show rewarded video for continue feature
   * Returns Promise that resolves to true if user watched the ad completely
   */
  static async showRewardedForContinue(): Promise<boolean> {
    try {
      // Load ad if not loaded
      if (!isRewardedLoaded) {
        await this.loadRewarded();
      }

      if (!isRewardedLoaded || !rewardedAd) {
        throw new Error('Rewarded ad not available');
      }

      // Create a new rewarded ad instance for this show
      const showAd = RewardedAd.createForAdRequest(REWARDED_AD_ID);
      await showAd.load();

      return new Promise((resolve) => {
        let didEarnReward = false;

        const rewardListener = showAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          () => {
            didEarnReward = true;
          }
        );

        const closeListener = showAd.addAdEventListener(
          AdEventType.CLOSED,
          () => {
            rewardListener();
            closeListener();
            isRewardedLoaded = false;
            // Preload next rewarded ad
            this.loadRewarded();
            resolve(didEarnReward);
          }
        );

        // Show the ad
        showAd.show().catch((error) => {
          console.warn('Failed to show rewarded ad:', error);
          rewardListener();
          closeListener();
          isRewardedLoaded = false;
          resolve(false);
        });
      });
    } catch (error) {
      console.warn('Rewarded ad error:', error);
      return false;
    }
  }

  /**
   * Check if rewarded ad is ready to show
   */
  static isRewardedAdReady(): boolean {
    return isRewardedLoaded;
  }

  /**
   * Preload rewarded ad for continue feature
   */
  static async preloadRewardedAd(): Promise<void> {
    if (!isRewardedLoaded) {
      await this.loadRewarded();
    }
  }

  /**
   * Reset game over counter (useful for testing)
   */
  static async resetGameOverCount(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GAME_OVER_COUNT_KEY);
    } catch (error) {
      console.warn('Failed to reset game over count:', error);
    }
  }
}
