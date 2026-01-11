import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSounds } from './useSounds';
import AdManager from './AdManager';

const GRID_COLUMNS = 4;
const HOLE_SPACING = 14;
const HOLES = Array.from({ length: 16 }, (_, index) => index);
const SAFE_PHASE_RATIO = 0.6; // 60% of the beat until orange/safe
const BEAT_SCHEDULE = [
  { minScore: 0, maxScore: 14, beatMs: 1100 },
  { minScore: 15, maxScore: 24, beatMs: 1000 },
  { minScore: 25, maxScore: 49, beatMs: 900 },
  { minScore: 50, maxScore: 149, beatMs: 800 },
  { minScore: 150, maxScore: Infinity, beatMs: 700 },
];
const STARTING_LIVES = 5;
const DOUBLE_MOLE_SCORE_LOW = 10;
const DOUBLE_MOLE_CHANCE_LOW = 0.6;
const DOUBLE_MOLE_SCORE_HIGH = 25;
const DOUBLE_MOLE_CHANCE_HIGH = 0.8;
const TRIPLE_MOLE_SCORE = 150;
const TRIPLE_MOLE_CHANCE = 0.5;
const DECOY_SCORE = 15;
const DECOY_CHANCE_BASE = 0.35;
const DECOY_CHANCE_HIGH_SCORE = 200;
const DECOY_CHANCE_HIGH = 0.45;
const SPECIAL_SCORE = 50;
const SPECIAL_HEAL_CHANCE = 0.1;
const SPECIAL_HEAL_SCORE_REDUCED = 400;
const SPECIAL_HEAL_CHANCE_REDUCED = 0.03;
const SPECIAL_HARM_CHANCE = 0.3;
const BEST_SCORE_KEY = 'wacky_mole_best_score';
const COMBO_MAX_HITS = 10;
const COMBO_TIER_1 = 5; // 2x multiplier at 5 hits
const COMBO_TIER_2 = 10; // 3x multiplier at 10 hits
// Ad configuration
const GAMES_BETWEEN_INTERSTITIAL_ADS = 3; // Show interstitial ad every 3 games
const MAX_CONTINUES_PER_SESSION = 3; // Limit rewarded ad continues

type ActiveMole = {
  id: number;
  type: 'normal' | 'decoy' | 'heal' | 'harm';
  isSafe: boolean;
  spawnedAt: number;
};

export default function App() {
  const { width } = useWindowDimensions();
  const gridWidth = Math.min(width - 32, 420);
  const holeSize = (gridWidth - HOLE_SPACING * (GRID_COLUMNS - 1)) / GRID_COLUMNS;
  const [activeMoles, setActiveMoles] = useState<ActiveMole[]>([]);
  const [consumedHoles, setConsumedHoles] = useState<Set<number>>(new Set());
  const [lastActiveHoles, setLastActiveHoles] = useState<number[]>([]);
  const [lastDespawnAt, setLastDespawnAt] = useState<number | null>(null);
  const [pressedHoles, setPressedHoles] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [comboHits, setComboHits] = useState(0); // successful hits (0-10)
  const [gamesPlayed, setGamesPlayed] = useState(0); // Track games for interstitial ads
  const [continuesUsed, setContinuesUsed] = useState(0); // Track rewarded ad continues
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safeFlipRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(score);
  const { playHit, playLifeLost, playLifeGained } = useSounds();

  const beatForScore = (value: number) => {
    const entry = BEAT_SCHEDULE.find(
      (step) => value >= step.minScore && value <= step.maxScore
    );
    return entry?.beatMs ?? BEAT_SCHEDULE[BEAT_SCHEDULE.length - 1].beatMs;
  };

  const getComboMultiplier = (hits: number) => {
    if (hits >= COMBO_TIER_2) return 3;
    if (hits >= COMBO_TIER_1) return 2;
    return 1;
  };

  // Initialize AdMob on app start
  useEffect(() => {
    AdManager.initialize();
    AdManager.loadRewardedAd(); // Preload rewarded ad
  }, []);

  useEffect(() => {
    const loadBest = async () => {
      try {
        const stored = await AsyncStorage.getItem(BEST_SCORE_KEY);
        if (stored) {
          const parsed = Number(stored);
          if (!Number.isNaN(parsed)) {
            setBestScore(parsed);
          }
        }
      } catch {
        // ignore load failure; non-fatal
      }
    };
    loadBest();
  }, []);

  const clearCycleTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (safeFlipRef.current) {
      clearTimeout(safeFlipRef.current);
      safeFlipRef.current = null;
    }
  };

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
      AsyncStorage.setItem(BEST_SCORE_KEY, String(score)).catch(() => {
        // ignore persist error
      });
    }
  }, [score, bestScore]);

  const handleHoleTap = useCallback(
    (id: number) => {
      if (gameOver) {
        return;
      }
      const now = Date.now();
      const activeMole = activeMoles.find((mole) => mole.id === id);

      if (activeMoles.length > 0) {
        if (activeMole && !consumedHoles.has(id)) {
          // Hitting gray decoy = mistake
          if (activeMole.type === 'decoy' && !activeMole.isSafe) {
            setLives((prev) => Math.max(0, prev - 1));
            playLifeLost();
            // Reduce combo by 1 hit
            setComboHits((prev) => Math.max(0, prev - 1));
            return;
          }

          // Successful hit
          if (activeMole.type === 'harm') {
            setLives((prev) => Math.max(0, prev - 1));
            playLifeLost();
            // Harm mole hit = successful hit for combo
            setComboHits((prev) => {
              const newHits = Math.min(COMBO_MAX_HITS, prev + 1);
              playHit(newHits);
              return newHits;
            });
          } else if (activeMole.type === 'heal') {
            setLives((prev) => Math.min(STARTING_LIVES, prev + 1));
            playLifeGained();
            // Heal mole hit = successful hit for combo
            setComboHits((prev) => {
              const newHits = Math.min(COMBO_MAX_HITS, prev + 1);
              playHit(newHits);
              return newHits;
            });
          } else {
            // Normal mole - apply multiplier based on current combo
            const multiplier = getComboMultiplier(comboHits);
            setScore((prev) => prev + multiplier);
            // Normal mole hit = successful hit for combo
            setComboHits((prev) => {
              const newHits = Math.min(COMBO_MAX_HITS, prev + 1);
              playHit(newHits);
              return newHits;
            });
          }

          setConsumedHoles((prev) => {
            const next = new Set(prev);
            next.add(id);
            return next;
          });
          setActiveMoles((prev) => {
            const next = prev.filter((mole) => mole.id !== id);
            if (next.length === 0) {
              setLastDespawnAt(now);
            }
            return next;
          });
          return;
        }

        // Wrong hole = mistake
        if (!activeMole) {
          setLives((prev) => Math.max(0, prev - 1));
          playLifeLost();
          // Reduce combo by 1 hit
          setComboHits((prev) => Math.max(0, prev - 1));
        }
        return;
      }

      // Empty tap = mistake
      if (lastDespawnAt !== null || lastActiveHoles.length > 0) {
        setLives((prev) => Math.max(0, prev - 1));
        playLifeLost();
        // Reduce combo by 1 hit
        setComboHits((prev) => Math.max(0, prev - 1));
      }
    },
    [activeMoles, consumedHoles, gameOver, lastActiveHoles, lastDespawnAt, comboHits]
  );

  useEffect(() => {
    clearCycleTimers();
    setActiveMoles([]);
    if (gameOver || !hasStarted) {
      return;
    }

    let isCancelled = false;

    const pickHoles = () => {
      let doubleChance = 0;
      if (scoreRef.current >= DOUBLE_MOLE_SCORE_LOW) {
        if (scoreRef.current >= DOUBLE_MOLE_SCORE_HIGH) {
          doubleChance = DOUBLE_MOLE_CHANCE_HIGH;
        } else {
          const range = DOUBLE_MOLE_SCORE_HIGH - DOUBLE_MOLE_SCORE_LOW;
          const progress = (scoreRef.current - DOUBLE_MOLE_SCORE_LOW) / range;
          doubleChance =
            DOUBLE_MOLE_CHANCE_LOW +
            progress * (DOUBLE_MOLE_CHANCE_HIGH - DOUBLE_MOLE_CHANCE_LOW);
        }
      }

      const tripleChance = scoreRef.current >= TRIPLE_MOLE_SCORE ? TRIPLE_MOLE_CHANCE : 0;
      const roll = Math.random();
      const shouldUseThree = roll < tripleChance;
      const shouldUseTwo = !shouldUseThree && Math.random() < Math.min(doubleChance, DOUBLE_MOLE_CHANCE_HIGH);

      const targetCount = shouldUseThree ? 3 : shouldUseTwo ? 2 : 1;
      const available = [...HOLES];
      const picks: number[] = [];

      while (picks.length < targetCount && available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        const [hole] = available.splice(idx, 1);
        picks.push(hole);
      }

      return picks;
    };

    const runCycle = () => {
      if (isCancelled) {
        return;
      }

      const nextHoles = pickHoles();
      const beatMs = beatForScore(scoreRef.current);
      const safePhaseMs = beatMs * SAFE_PHASE_RATIO;
      const now = Date.now();

      let specialType: ActiveMole['type'] | null = null;
      if (scoreRef.current >= SPECIAL_SCORE) {
        const specialRoll = Math.random();
        const healChance = scoreRef.current >= SPECIAL_HEAL_SCORE_REDUCED
          ? SPECIAL_HEAL_CHANCE_REDUCED
          : SPECIAL_HEAL_CHANCE;
        if (specialRoll < healChance) {
          specialType = 'heal';
        } else if (specialRoll < healChance + SPECIAL_HARM_CHANCE) {
          specialType = 'harm';
        }
      }
      const specialIndex =
        specialType !== null && nextHoles.length > 0
          ? Math.floor(Math.random() * nextHoles.length)
          : -1;

      const decoyEligibleIndices =
        specialIndex === -1
          ? nextHoles.map((_, idx) => idx)
          : nextHoles.map((_, idx) => idx).filter((idx) => idx !== specialIndex);
      const decoyChance = scoreRef.current >= DECOY_CHANCE_HIGH_SCORE
        ? DECOY_CHANCE_HIGH
        : DECOY_CHANCE_BASE;
      const shouldSpawnDecoy =
        scoreRef.current >= DECOY_SCORE &&
        Math.random() < decoyChance &&
        decoyEligibleIndices.length > 0;
      const decoyIndex =
        shouldSpawnDecoy && decoyEligibleIndices.length > 0
          ? decoyEligibleIndices[Math.floor(Math.random() * decoyEligibleIndices.length)]
          : -1;

      const nextMoles: ActiveMole[] = nextHoles.map((holeId, index) => {
        if (index === specialIndex && specialType) {
          return { id: holeId, type: specialType, isSafe: true, spawnedAt: now };
        }
        if (index === decoyIndex) {
          return { id: holeId, type: 'decoy', isSafe: false, spawnedAt: now };
        }
        return { id: holeId, type: 'normal', isSafe: true, spawnedAt: now };
      });
      setActiveMoles(nextMoles);
      setConsumedHoles(new Set());
      setLastActiveHoles(nextHoles);
      if (safeFlipRef.current) {
        clearTimeout(safeFlipRef.current);
      }
      if (shouldSpawnDecoy) {
        safeFlipRef.current = setTimeout(() => {
          setActiveMoles((prev) =>
            prev.map((mole) => (mole.type === 'decoy' ? { ...mole, isSafe: true } : mole))
          );
        }, safePhaseMs);
      }

      timeoutRef.current = setTimeout(() => {
        if (isCancelled) {
          return;
        }
        // Check for missed moles (not including harm moles)
        setActiveMoles((prev) => {
          setConsumedHoles((consumed) => {
            const missedNonHarmMoles = prev.filter(
              (mole) => !consumed.has(mole.id) && mole.type !== 'harm'
            );
            if (missedNonHarmMoles.length > 0) {
              // Reduce combo by 1 hit per missed mole
              const missCount = missedNonHarmMoles.length;
              setComboHits((prev) => Math.max(0, prev - missCount));
            }
            return consumed;
          });
          return [];
        });
        setLastDespawnAt(Date.now());
        setPressedHoles(new Set());
        runCycle();
      }, beatMs);
    };

    runCycle();

    return () => {
      isCancelled = true;
      clearCycleTimers();
    };
  }, [gameOver, hasStarted]);

  useEffect(() => {
    if (lives <= 0 && !gameOver) {
      setGameOver(true);
      setActiveMoles([]);
      setPressedHoles(new Set());
      clearCycleTimers();

      // Increment games played counter
      const newGamesPlayed = gamesPlayed + 1;
      setGamesPlayed(newGamesPlayed);

      // Show interstitial ad every N games
      if (newGamesPlayed % GAMES_BETWEEN_INTERSTITIAL_ADS === 0) {
        // Small delay so game over state is visible first
        setTimeout(() => {
          AdManager.showInterstitialAd();
        }, 500);
      }
    }
  }, [lives, gameOver, gamesPlayed]);

  const startGame = useCallback(() => {
    clearCycleTimers();
    setScore(0);
    setLives(STARTING_LIVES);
    setGameOver(false);
    setActiveMoles([]);
    setLastActiveHoles([]);
    setLastDespawnAt(null);
    setConsumedHoles(new Set());
    setPressedHoles(new Set());
    setComboHits(0);
    setContinuesUsed(0); // Reset continues for new game
    setHasStarted(true);
    // Play sound to test audio is working
    playLifeGained();
  }, [playLifeGained]);

  const handleWatchAdToContinue = useCallback(async () => {
    const rewarded = await AdManager.showRewardedAd();
    if (rewarded) {
      // User watched the full ad, grant +1 life
      setLives(1);
      setGameOver(false);
      setContinuesUsed((prev) => prev + 1);
      playLifeGained();
      // Game continues from current score
    }
  }, [playLifeGained]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.screen}>
          <Text style={styles.title}>Wacky Mole</Text>
          <Text style={styles.subtitle}>4×4 grid, thumb-ready. Tap any hole.</Text>

          {!hasStarted ? (
            <View style={styles.welcomeCard}>
              <Text style={styles.welcomeHeading}>Ready to whack?</Text>
              <Text style={styles.welcomeText}>
                Precision over spam. Wait out grey decoys, tap orange moles, climb the score.
              </Text>
              <View style={styles.welcomeStats}>
                <View style={styles.hudCard}>
                  <Text style={styles.hudLabel}>Best</Text>
                  <Text style={styles.hudValue}>{bestScore}</Text>
                </View>
                <View style={styles.hudCard}>
                  <Text style={styles.hudLabel}>Lives</Text>
                  <Text style={styles.hudValue}>{STARTING_LIVES}</Text>
                </View>
              </View>
              <GestureDetector gesture={Gesture.Tap().onEnd(startGame)}>
                <View style={styles.startButton}>
                  <Text style={styles.startLabel}>Start</Text>
                </View>
              </GestureDetector>
            </View>
          ) : (
            <>
              <View style={styles.hud}>
                <View style={styles.hudCard}>
                  <Text style={styles.hudLabel}>Score</Text>
                  <Text style={styles.hudValue}>{score}</Text>
                </View>
                <View style={styles.hudCard}>
                  <Text style={styles.hudLabel}>Lives</Text>
                  <Text style={styles.hudValue}>{lives}</Text>
                </View>
                <View style={styles.hudCard}>
                  <Text style={styles.hudLabel}>Best</Text>
                  <Text style={styles.hudValue}>{bestScore}</Text>
                </View>
              </View>

              <View style={[styles.grid, { width: gridWidth }]}>
                {HOLES.map((id) => {
                  const activeMole = activeMoles.find((mole) => mole.id === id);
                  const isActive = Boolean(activeMole);
                  const type = activeMole?.type ?? 'normal';
                  const isDecoy = type === 'decoy';
                  const isSafe = activeMole?.isSafe ?? false;
                  const isPressed = pressedHoles.has(id);

                  const tapGesture = Gesture.Tap()
                    .enabled(!gameOver)
                    .maxDuration(300)
                    .onStart(() => {
                      setPressedHoles((prev) => {
                        const next = new Set(prev);
                        next.add(id);
                        return next;
                      });
                    })
                    .onEnd((_, success) => {
                      if (success) {
                        handleHoleTap(id);
                      }
                    })
                    .onFinalize(() => {
                      setPressedHoles((prev) => {
                        const next = new Set(prev);
                        next.delete(id);
                        return next;
                      });
                    });

                  return (
                    <GestureDetector key={id} gesture={tapGesture}>
                      <View
                        style={[
                          styles.hole,
                          {
                            width: holeSize,
                            height: holeSize,
                            marginRight: (id + 1) % GRID_COLUMNS === 0 ? 0 : HOLE_SPACING,
                            marginBottom: HOLE_SPACING,
                          },
                          isPressed && styles.holePressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.holeFace,
                            isActive && type === 'normal' && styles.holeActive,
                            isActive &&
                              type === 'decoy' &&
                              (isSafe ? styles.holeDecoySafe : styles.holeDecoyWaiting),
                            isActive && type === 'heal' && styles.holeHeal,
                            isActive && type === 'harm' && styles.holeHarm,
                            isPressed && styles.holeFacePressed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.holeLabel,
                              isActive && type === 'normal' && styles.holeLabelActive,
                              isActive &&
                                type === 'decoy' &&
                                (isSafe ? styles.holeLabelDecoyReady : styles.holeLabelDecoyWait),
                              isActive && type === 'heal' && styles.holeLabelHeal,
                              isActive && type === 'harm' && styles.holeLabelHarm,
                            ]}
                          >
                            {type === 'heal' ? '+1' : type === 'harm' ? '-1' : id + 1}
                          </Text>
                        </View>
                      </View>
                    </GestureDetector>
                  );
                })}
              </View>

              {/* Combo Bar */}
              <View style={styles.comboContainer}>
                <View style={styles.comboBarSingle}>
                  <View
                    style={[
                      styles.comboFillSingle,
                      { width: `${(comboHits / COMBO_MAX_HITS) * 100}%` },
                      comboHits >= COMBO_TIER_2 && styles.comboFill3x,
                      comboHits >= COMBO_TIER_1 && comboHits < COMBO_TIER_2 && styles.comboFill2x,
                    ]}
                  />
                  <View style={styles.comboLabels}>
                    <Text style={styles.comboLabel}>{comboHits}/{COMBO_MAX_HITS}</Text>
                    <Text style={styles.comboMultiplier}>{getComboMultiplier(comboHits)}x</Text>
                  </View>
                </View>
                <Text style={styles.comboHint}>
                  {comboHits < COMBO_TIER_1
                    ? `${COMBO_TIER_1 - comboHits} more for 2x`
                    : comboHits < COMBO_TIER_2
                    ? `${COMBO_TIER_2 - comboHits} more for 3x`
                    : 'Max combo!'}
                </Text>
              </View>

              {activeMoles.some((mole) => mole.type === 'decoy') && (
                <View style={styles.decoyBanner}>
                  <Text style={styles.decoyBannerText}>Decoy active: wait until orange, then hit.</Text>
                </View>
              )}
              {activeMoles.some((mole) => mole.type === 'heal') && (
                <View style={[styles.decoyBanner, styles.healBanner]}>
                  <Text style={styles.healBannerText}>Green +1 life mole: safe to tap.</Text>
                </View>
              )}
              {activeMoles.some((mole) => mole.type === 'harm') && (
                <View style={[styles.decoyBanner, styles.harmBanner]}>
                  <Text style={styles.harmBannerText}>Red -1 life mole: avoid unless intentional.</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Game Over Modal */}
        <Modal
          visible={gameOver}
          transparent={true}
          animationType="fade"
          onRequestClose={startGame}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.gameOverModal}>
              <Text style={styles.gameOverTitle}>Out of lives</Text>
              <Text style={styles.gameOverText}>
                Misses and empty taps cost lives. Precision wins.
              </Text>
              <View style={styles.hudRow}>
                <Text style={styles.gameOverStat}>Score: {score}</Text>
                <Text style={styles.gameOverStat}>Best: {bestScore}</Text>
              </View>

              {/* Show rewarded ad option if continues are available */}
              {continuesUsed < MAX_CONTINUES_PER_SESSION && (
                <>
                  <GestureDetector gesture={Gesture.Tap().onEnd(handleWatchAdToContinue)}>
                    <View style={styles.continueButton}>
                      <Text style={styles.continueLabel}>📺 Watch Ad - Continue (+1 Life)</Text>
                      <Text style={styles.continueHint}>
                        {MAX_CONTINUES_PER_SESSION - continuesUsed} continues left
                      </Text>
                    </View>
                  </GestureDetector>

                  <Text style={styles.orText}>or</Text>
                </>
              )}

              <GestureDetector gesture={Gesture.Tap().onEnd(startGame)}>
                <View style={styles.restartButton}>
                  <Text style={styles.restartLabel}>Restart</Text>
                </View>
              </GestureDetector>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b2c4d',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 20,
    fontSize: 15,
    color: '#4a638f',
  },
  welcomeCard: {
    width: '90%',
    maxWidth: 440,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8e4f7',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    alignItems: 'center',
    gap: 12,
  },
  welcomeHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1b2c4d',
  },
  welcomeText: {
    fontSize: 14,
    color: '#4a638f',
    textAlign: 'center',
    lineHeight: 20,
  },
  welcomeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  startButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: '#1b2c4d',
    borderRadius: 12,
  },
  startLabel: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  hud: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 12,
  },
  hudCard: {
    minWidth: 120,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8e4f7',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  hudLabel: {
    color: '#5a6f94',
    fontSize: 13,
    marginBottom: 2,
  },
  hudValue: {
    color: '#1b2c4d',
    fontSize: 22,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
  },
  hole: {
    backgroundColor: '#e7f1ff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#cddfff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  holePressed: {
    backgroundColor: '#d3e7ff',
    borderColor: '#a8c7ff',
    transform: [{ scale: 0.97 }],
  },
  holeFace: {
    width: '88%',
    height: '88%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  holeActive: {
    backgroundColor: '#ffe9c7',
    borderWidth: 2,
    borderColor: '#ffb347',
    shadowColor: '#ffb347',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  holeDecoyWaiting: {
    backgroundColor: '#dfe3eb',
    borderWidth: 2,
    borderColor: '#9ba5b7',
    shadowColor: '#9ba5b7',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  holeDecoySafe: {
    backgroundColor: '#ffe1cc',
    borderWidth: 2,
    borderColor: '#ff9f4c',
    shadowColor: '#ff9f4c',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  holeHeal: {
    backgroundColor: '#dff7e3',
    borderWidth: 2,
    borderColor: '#6bd48f',
    shadowColor: '#6bd48f',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  holeHarm: {
    backgroundColor: '#ffe4e4',
    borderWidth: 2,
    borderColor: '#ff7676',
    shadowColor: '#ff7676',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  holeFacePressed: {
    backgroundColor: '#eef4ff',
    shadowOpacity: 0,
  },
  holeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4a638f',
  },
  holeLabelActive: {
    color: '#c05f00',
  },
  holeLabelDecoyWait: {
    color: '#3d4655',
  },
  holeLabelDecoyReady: {
    color: '#c05f00',
  },
  holeLabelHeal: {
    color: '#1f7a3f',
    fontWeight: '800',
  },
  holeLabelHarm: {
    color: '#a31212',
    fontWeight: '800',
  },
  decoyBanner: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff2d9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffd9a0',
  },
  decoyBannerText: {
    color: '#8a5500',
    fontWeight: '600',
  },
  healBanner: {
    backgroundColor: '#e8f9ef',
    borderColor: '#b6f0c9',
  },
  healBannerText: {
    color: '#1f7a3f',
    fontWeight: '700',
  },
  harmBanner: {
    backgroundColor: '#ffe8e8',
    borderColor: '#ffc4c4',
  },
  harmBannerText: {
    color: '#a31212',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverModal: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffd4d4',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    alignItems: 'center',
    width: '85%',
    maxWidth: 380,
  },
  gameOverTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#b3261e',
    marginBottom: 6,
  },
  gameOverText: {
    fontSize: 14,
    color: '#6b3333',
    textAlign: 'center',
    marginBottom: 12,
  },
  hudRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  gameOverStat: {
    color: '#5a6f94',
    fontWeight: '700',
  },
  continueButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  continueLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  continueHint: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },
  orText: {
    color: '#5a6f94',
    fontSize: 14,
    marginVertical: 8,
  },
  restartButton: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    backgroundColor: '#1b2c4d',
    borderRadius: 10,
  },
  restartLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  comboContainer: {
    marginTop: 16,
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
    gap: 8,
  },
  comboBarSingle: {
    width: '100%',
    height: 40,
    backgroundColor: '#e7f1ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cddfff',
    overflow: 'hidden',
    position: 'relative',
  },
  comboFillSingle: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#d8e4f7',
    transition: 'width 0.2s ease',
  },
  comboFill2x: {
    backgroundColor: '#6ba3ff',
  },
  comboFill3x: {
    backgroundColor: '#4c8aff',
  },
  comboLabels: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 1,
  },
  comboLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1b2c4d',
  },
  comboMultiplier: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1b2c4d',
  },
  comboHint: {
    fontSize: 12,
    color: '#5a6f94',
    fontWeight: '600',
  },
});
