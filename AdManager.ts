import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// Production ad unit IDs - AdMob verified
const AD_UNIT_IDS = {
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL // Test ID for development
    : 'ca-app-pub-9162409335136550/4973408819', // Production interstitial ID
  rewarded: __DEV__
    ? TestIds.REWARDED // Test ID for development
    : 'ca-app-pub-9162409335136550/3660327142', // Production rewarded ID
};

class AdManager {
  private interstitialAd: InterstitialAd | null = null;
  private rewardedAd: RewardedAd | null = null;
  private isInterstitialLoaded = false;
  private isRewardedLoaded = false;
  private isInitialized = false;

  /**
   * Initialize AdMob SDK
   * Call this once when the app starts
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[AdManager] Already initialized');
      return;
    }

    try {
      await mobileAds().initialize();
      console.log('[AdManager] AdMob initialized successfully');
      this.isInitialized = true;

      // Preload first interstitial ad
      this.loadInterstitialAd();
    } catch (error) {
      console.error('[AdManager] Failed to initialize AdMob:', error);
    }
  }

  /**
   * Load Interstitial Ad
   * This ad shows automatically after every 2 games
   */
  private loadInterstitialAd(): void {
    if (this.interstitialAd) {
      console.log('[AdManager] Interstitial already loaded');
      return;
    }

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        AD_UNIT_IDS.interstitial
      );

      // Listen for ad events
      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('[AdManager] Interstitial ad loaded');
        this.isInterstitialLoaded = true;
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdManager] Interstitial ad closed');
        this.isInterstitialLoaded = false;
        this.interstitialAd = null;
        // Preload next ad
        this.loadInterstitialAd();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AdManager] Interstitial ad error:', error);
        this.isInterstitialLoaded = false;
        this.interstitialAd = null;
      });

      // Start loading the ad
      this.interstitialAd.load();
    } catch (error) {
      console.error('[AdManager] Failed to create interstitial ad:', error);
    }
  }

  /**
   * Show Interstitial Ad
   * Call this after every 2 games
   */
  async showInterstitialAd(): Promise<void> {
    if (!this.isInterstitialLoaded || !this.interstitialAd) {
      console.log('[AdManager] Interstitial ad not ready yet');
      // Try to load for next time
      this.loadInterstitialAd();
      return;
    }

    try {
      console.log('[AdManager] Showing interstitial ad');
      await this.interstitialAd.show();
    } catch (error) {
      console.error('[AdManager] Failed to show interstitial ad:', error);
    }
  }

  /**
   * Load Rewarded Ad
   * This ad is shown when user wants to continue with +1 life
   */
  loadRewardedAd(): void {
    if (this.rewardedAd) {
      console.log('[AdManager] Rewarded ad already loaded');
      return;
    }

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(AD_UNIT_IDS.rewarded);

      // Listen for ad events
      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('[AdManager] Rewarded ad loaded');
        this.isRewardedLoaded = true;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        console.log('[AdManager] User earned reward:', reward);
      });

      this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('[AdManager] Rewarded ad closed');
        this.isRewardedLoaded = false;
        this.rewardedAd = null;
        // Preload next ad
        this.loadRewardedAd();
      });

      this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.error('[AdManager] Rewarded ad error:', error);
        this.isRewardedLoaded = false;
        this.rewardedAd = null;
      });

      // Start loading the ad
      this.rewardedAd.load();
    } catch (error) {
      console.error('[AdManager] Failed to create rewarded ad:', error);
    }
  }

  /**
   * Show Rewarded Ad
   * Returns true if user watched the full ad and earned the reward
   */
  async showRewardedAd(): Promise<boolean> {
    if (!this.isRewardedLoaded || !this.rewardedAd) {
      console.log('[AdManager] Rewarded ad not ready yet');
      return false;
    }

    return new Promise((resolve) => {
      let didEarnReward = false;

      // Listen for reward earned event
      const rewardListener = this.rewardedAd!.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          console.log('[AdManager] User watched full ad, granting reward');
          didEarnReward = true;
        }
      );

      // Listen for ad closed event
      const closeListener = this.rewardedAd!.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          console.log('[AdManager] Rewarded ad closed, reward earned:', didEarnReward);
          rewardListener();
          closeListener();
          resolve(didEarnReward);
        }
      );

      // Show the ad
      this.rewardedAd!.show().catch((error) => {
        console.error('[AdManager] Failed to show rewarded ad:', error);
        rewardListener();
        closeListener();
        resolve(false);
      });
    });
  }

  /**
   * Check if rewarded ad is ready to show
   */
  isRewardedAdReady(): boolean {
    return this.isRewardedLoaded;
  }
}

// Export singleton instance
export default new AdManager();
