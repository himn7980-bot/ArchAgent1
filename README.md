# VOLYA: Gram Defense — v0.7 Art & Gameplay Pass

Mobile-first tower defense built with **Phaser 3**.

## Core idea

You defend the **GRAM Core** with VOLYA, deployable heroes, defensive towers, tower mod cards, and tactical powers.

The enemy waves are stylized, animated crypto-creatures inspired by recognizable coin identities. GRAM itself is never an enemy.

## Current enemy roster

- Bitcoin — heavy tank with armor
- Ethereum — shield unit
- Solana — dash runner
- BNB — bruiser
- XRP — swarm runner
- Dogecoin — chaos splitter; on death it can split into XRP runners
- USDT — healer/support
- Cardano — caster-style unit
- Avalanche — impact unit
- TRON — fast raider

Coin enemies now use recognizable **vector logo-style marks** plus legs, arms, health bars, role labels, shield/heal/armor effects, and movement animation.

## Current hero roster

- PENGU
- UTYA
- TEDDY
- YODA
- Egor
- telegram.dog
- virus
- Baby Shark
- yaya
- Gramcat
- Memegram
- NOCTIS VEYL

**VOLYA** is permanently positioned beside the GRAM Core as the main guardian.

The hero art from the supplied character set is packed into:

`assets/heroes/hero-sheet.webp`

and is used in the battlefield and hero deck.

## Gameplay implemented

- large mobile-first battlefield
- 5 waves with build phase between waves
- hero deployment directly on the battlefield
- hero movement, target acquisition, ranged/melee attacks, attack squash animation
- hero slots expand from 3 to 5 through wave progression
- 8 towers:
  - Ranger
  - Arcane
  - Bombard
  - Guardian
  - Frost
  - Tesla
  - Venom
  - Beacon
- different animated tower silhouettes per tower type
- Beacon aura buff to nearby towers
- tower upgrades to Level 4 with visible geometry changes
- second mod slot at Level 3
- tower mods:
  - Rapid Core
  - Crit Scope
  - Venom Tip
  - Cryo Core
  - Blast Shell
  - Chain Coil
- Tactical Powers:
  - Bombard
  - Laser
  - Gravity
  - Reinforce
  - Overdrive
- armor, shield, poison, slow, crit, splash, chain lightning, healing, dash and splitting enemy behaviors
- collapsible bottom deck to maximize battlefield size

## Local run

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

## Railway-ready

A `railway.toml` and npm start command are included, so this branch can be deployed directly as a static game service.

## Current branch

```
volya-game-v06
```

The branch name remains v06 so the existing review link is preserved; the current code on that branch is the **v0.7 art/gameplay pass**.

## Commercial art note

The crypto enemy designs are stylized game characters. Before final commercial release, exact brand/logo usage should receive a final trademark/brand-guideline review.
