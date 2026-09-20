# VOLYA: Gram Defense v0.8

This branch rebuilds the unstable parts of the prototype around a more standard tower-defense architecture.

## v0.8 fixes

- hero sprite sheet corrected to **96×120 frames**, so hero artwork renders in the deck and on the battlefield
- enemy movement changed to **normalized path progress** through a dedicated `PathRoute` core
- waves moved to a dedicated `WaveManager`
- **15 second countdown** before Wave 1 and between later waves
- **START WAVE** still sends the wave immediately
- if START WAVE is not pressed, the wave **auto-starts when the countdown reaches 0**
- **×1 / ×2** speed button added to the top HUD
- ×2 affects movement, spawning, attacks, cooldowns, status effects and game tweens
- GRAM remains the defended Core, with VOLYA permanently guarding it
- BTC / ETH / SOL / BNB / XRP / DOGE / USDT / ADA / AVAX / TRX remain the enemy roster
- towers, hero deployment, Tower Mods and Tactical Powers remain active

## Architecture

The implementation is original VOLYA code, but the restructuring was informed by:

- **SerhiiChoGames/tower-defense** (MIT): Phaser scene/model separation and tower-defense entity organization.
- **boxops/tower_defense_js** (Apache-2.0): wave countdown / early-send concepts, spawn scheduling, normalized route progress and projectile/status separation.

See `THIRD_PARTY_NOTICES.md`.

## Branch

`volya-game-v08`
