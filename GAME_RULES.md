# Wacky Mole - Game Rules & Mechanics

## Overview
Wacky Mole is a whack-a-mole style game played on a 4×4 grid (16 holes total). Players must tap moles that appear in holes while avoiding mistakes that cost lives.

## Starting Conditions
- **Starting Lives**: 5
- **Starting Score**: 0
- **Grid Layout**: 4×4 (16 holes)

---

## Mole Types

There are **4 types of moles** in the game:

### 1. Normal Mole (Yellow/Orange)
- **Appearance**: Yellow/orange glow
- **Effect**: +1 point when tapped
- **Unlock**: Available from the start (score 0+)
- **Behavior**: Always safe to tap

### 2. Decoy Mole (Gray → Orange)
- **Appearance**:
  - Initially gray (dangerous phase)
  - Turns orange after 60% of the beat duration (safe phase)
- **Effect**:
  - Tapping during gray phase: -1 life
  - Tapping during orange phase: No penalty (safe)
- **Unlock**: Score 15+
- **Spawn Chance**:
  - 35% at score 15-199
  - 45% at score 200+
- **Special Mechanic**: Changes from dangerous to safe at 60% of the beat timer

### 3. Heal Mole (Green, shows "+1")
- **Appearance**: Green glow with "+1" label
- **Effect**: +1 life when tapped (capped at 5 lives max)
- **Unlock**: Score 50+
- **Spawn Chance**:
  - 10% at score 50-399
  - 3% at score 400+ (significantly reduced for late game difficulty)
- **Behavior**: Always safe to tap

### 4. Harm Mole (Red, shows "-1")
- **Appearance**: Red glow with "-1" label
- **Effect**: -1 life when tapped
- **Unlock**: Score 50+
- **Spawn Chance**: 30% when unlocked
- **Behavior**: Intentionally dangerous - avoid or tap strategically

---

## Special Mole Rules

### Mole Priority System
When spawning multiple moles:
1. **Special moles** (Heal/Harm) are assigned first to random positions
2. **Decoy moles** can only spawn in positions NOT occupied by special moles
3. **Normal moles** fill remaining positions

### Spawn Frequency
- **At score 50+**: Special moles (Heal or Harm) have a combined 40% chance to appear
  - 10% chance for Heal mole
  - 30% chance for Harm mole
  - 60% chance for no special mole

---

## Multiple Moles System

### Single Mole Stage
- **Score Range**: 0-9
- **Moles per Round**: Always 1
- **Frequency**: 100%

### Double Mole Stage
- **Unlock Score**: 10
- **Full Power Score**: 25
- **Progression**:
  - Score 10-24: Chance increases from 60% → 80%
  - Score 25+: Stable at 80% chance
- **Moles per Round**: 2

### Triple Mole Stage
- **Unlock Score**: 150
- **Spawn Chance**: 50% (takes priority over double moles)
- **Moles per Round**: 3

### Selection Priority
1. Check if triple moles should spawn (score 150+, 50% chance)
2. If not triple, check if double moles should spawn (score-based chance)
3. Otherwise, spawn single mole

---

## Game Speed Progression

The game speeds up as your score increases. "Beat" refers to the time each mole stays visible.

| Score Range | Beat Duration (ms) | Beat Duration (seconds) | Speed Description |
|-------------|-------------------|------------------------|-------------------|
| 0-14        | 1100 ms           | 1.1 seconds           | Beginner          |
| 15-24       | 1000 ms           | 1.0 seconds           | Warming Up        |
| 25-49       | 900 ms            | 0.9 seconds           | Getting Faster    |
| 50-149      | 800 ms            | 0.8 seconds           | Fast              |
| 150+        | 700 ms            | 0.7 seconds           | Maximum Speed     |

### Safe Phase Timing (for Decoy Moles)
- Decoy moles turn from gray (dangerous) to orange (safe) at **60% of the beat duration**
- Examples:
  - At 1100ms beat: Safe after 660ms
  - At 700ms beat: Safe after 420ms

---

## Penalties & Life Loss

You lose 1 life when:
1. **Missing an active mole**: Tapping the wrong hole while moles are active
2. **Letting moles despawn**: Not tapping all active moles before they disappear
3. **Tapping empty holes**: Tapping when no moles are active or after moles just despawned
4. **Hitting gray decoy**: Tapping a decoy mole before it turns orange
5. **Hitting harm mole**: Tapping a red "-1" mole

---

## Progression Summary

### Early Game (Score 0-14)
- **Speed**: 1.1 seconds per beat
- **Moles**: Always 1
- **Types**: Normal only
- **Strategy**: Learn the basic rhythm

### Mid Game (Score 15-49)
- **Speed**: 1.0s → 0.9s → 0.8s (progressive)
- **Moles**: 1-2 (increasing chance of doubles)
- **Types**: Normal + Decoy (35% chance)
- **Strategy**: Watch for gray moles, wait for orange

### Late Game (Score 50-149)
- **Speed**: 0.8s → 0.7s
- **Moles**: 2 (80% of the time)
- **Types**: Normal + Decoy + Heal (10%) + Harm (30%)
- **Strategy**: Prioritize heal moles, avoid harm moles, manage decoy timing

### Expert Game (Score 150+)
- **Speed**: 0.7 seconds per beat (maximum)
- **Moles**: 3 (50% chance) or 2 (otherwise)
- **Types**: All four types active
- **Strategy**: Quick decision-making, multi-tap coordination, strategic life management

---

## Key Milestones

| Score | Unlock/Change |
|-------|--------------|
| 10    | Double moles start appearing (60% chance) |
| 15    | Decoy moles unlock (35% chance) |
| 15    | Speed increases to 1.0 seconds |
| 25    | Speed increases to 0.9 seconds |
| 25    | Double moles reach 80% frequency |
| 50    | Speed increases to 0.8 seconds |
| 50    | Special moles unlock (Heal 10%, Harm 30%) |
| 150   | Triple moles unlock (50% chance) |
| 150   | Speed reaches maximum (0.7 seconds) |
| 200   | Decoy moles increase to 45% spawn rate |
| 400   | Heal moles become rare (3% spawn rate) |

---

## Pro Tips

1. **Decoy Management**: The visual change from gray to orange is your cue - wait for it!
2. **Life Recovery**: Heal moles are rare (10%) - prioritize them when they appear
3. **Harm Avoidance**: With a 30% spawn rate at high scores, harm moles are common - plan your taps carefully
4. **Multi-Mole Strategy**: At high scores, you may need to tap 2-3 holes quickly - prepare your fingers
5. **Speed Adaptation**: The jump to 0.7s beats at score 60 is significant - practice rhythm
