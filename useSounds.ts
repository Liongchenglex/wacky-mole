import { Audio } from 'expo-av';
import { useEffect, useRef } from 'react';

// You can use free sounds from:
// - https://freesound.org/
// - https://mixkit.co/free-sound-effects/
// - Generate simple beeps with: https://www.bfxr.net/

// Import sound files
const hitSound = require('./assets/sounds/hit.wav');
const lifeLostSound = require('./assets/sounds/life-lost.wav');
const lifeGainedSound = require('./assets/sounds/life-gained.wav');

export const useSounds = () => {
  const sounds = useRef<{
    hit: Audio.Sound | null;
    lifeLost: Audio.Sound | null;
    lifeGained: Audio.Sound | null;
  }>({
    hit: null,
    lifeLost: null,
    lifeGained: null,
  });

  useEffect(() => {
    // Load sounds on mount
    const loadSounds = async () => {
      try {
        // Configure audio mode for simultaneous playback
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Load hit sound (will be pitch-shifted based on combo)
        const { sound: hit } = await Audio.Sound.createAsync(hitSound);
        sounds.current.hit = hit;

        // Load life lost sound
        const { sound: lifeLost } = await Audio.Sound.createAsync(lifeLostSound);
        sounds.current.lifeLost = lifeLost;

        // Load life gained sound
        const { sound: lifeGained } = await Audio.Sound.createAsync(lifeGainedSound);
        sounds.current.lifeGained = lifeGained;
      } catch (error) {
        console.warn('Error loading sounds:', error);
      }
    };

    loadSounds();

    // Cleanup on unmount
    return () => {
      sounds.current.hit?.unloadAsync();
      sounds.current.lifeLost?.unloadAsync();
      sounds.current.lifeGained?.unloadAsync();
    };
  }, []);

  const playHit = async (comboHits: number) => {
    try {
      if (!sounds.current.hit) {
        // Fallback: Play system sound or generate tone
        // For now, we'll use a simple beep pattern
        return;
      }

      // Calculate pitch based on combo (starting low, going high)
      // 0 hits = 0.8x (lower), 5 hits = 1.15x, 10 hits = 1.5x (higher)
      const pitchRate = 0.8 + (comboHits / 10) * 0.7;

      await sounds.current.hit.setPositionAsync(0);
      await sounds.current.hit.setRateAsync(pitchRate, true);
      await sounds.current.hit.playAsync();
    } catch (error) {
      console.warn('Error playing hit sound:', error);
    }
  };

  const playLifeLost = async () => {
    try {
      if (!sounds.current.lifeLost) return;

      await sounds.current.lifeLost.setPositionAsync(0);
      await sounds.current.lifeLost.playAsync();
    } catch (error) {
      console.warn('Error playing life lost sound:', error);
    }
  };

  const playLifeGained = async () => {
    try {
      if (!sounds.current.lifeGained) return;

      await sounds.current.lifeGained.setPositionAsync(0);
      await sounds.current.lifeGained.playAsync();
    } catch (error) {
      console.warn('Error playing life gained sound:', error);
    }
  };

  return {
    playHit,
    playLifeLost,
    playLifeGained,
  };
};
