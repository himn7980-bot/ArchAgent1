# VOLYA: Gram Defense — v0.6

A mobile-first tower-defense prototype built with **Phaser 3**.

## Core fantasy

You are defending the **GRAM Core**. Enemy waves are stylized versions of well-known crypto coins, while the VOLYA roster and defensive towers protect GRAM.

### Enemy coin roles

- **Bitcoin (BTC)** — heavy tank, high HP and armor
- **Ethereum (ETH)** — shielded enemy
- **Solana (SOL)** — fast runner / dash unit
- **BNB** — bruiser
- **XRP** — swarm unit
- **Dogecoin (DOGE)** — chaos unit
- **USDT** — healer/support
- **Cardano (ADA)** — caster
- **Avalanche (AVAX)** — impact unit
- **TRON (TRX)** — fast raider

GRAM is **not** an enemy. It is the Core you are protecting.

## Current gameplay

- 8 tower types: Ranger, Arcane, Bombard, Guardian, Frost, Tesla, Venom, Beacon
- 12 deployable heroes:
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
- Hero slots expand during progression
- 6 tower mod cards
- Tower upgrades up to Level 4
- Second mod slot unlocks at Level 3
- Tactical powers: Bombard, Laser, Gravity, Reinforce, Overdrive
- Five enemy waves
- Build phase before each wave
- Collapsible deck for a larger battlefield on mobile

## Run locally

Because the project loads JavaScript modules, serve it over HTTP instead of opening `index.html` directly.

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

For phone testing, serve it on the same Wi-Fi network and open the computer's local IP on the phone.

## Branch

Current rebuild branch:

```
volya-game-v06
```

## Next art pass

The current GitHub version is structured so the next iteration can replace the vector/token placeholders with:
- the final 3D hero sprites,
- animated tower art,
- more detailed coin-enemy characters,
- custom VFX and sound,
- map artwork,
- GRAM branding art.

> Prototype note: coin names and symbols are used as recognizable references for testing. Before a commercial release, brand/trademark usage should be reviewed and, where useful, converted into original stylized designs.
