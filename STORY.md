# SIGNAL LOST: an ASCII space saga

**Channel:** Starglyph (renamed from Stickstorm) · **Format:** 9:16 Shorts, 40–55 s, ASCII-rendered 3D world, typed captions, no voiceover (optional free Edge-TTS later)

## Core
- **Hero:** Commander **Dev Rao**, astronaut. Sent alone to the Moon to find a signal that started 3 days ago.
- **Look (original design, `engine/character.js`):** a human astronaut in a light armoured EVA suit. Soft white fabric suit, armour on the chest, shoulders, forearms and shins, orange arm bands, and a clear bubble visor that shows his face. Compact life-support pack, carbine slung on his back, helmet lamp. Natural gait: arm swing, hip sway, torso twist, idle breathing.
- **World reacts to him:** footprints and low-gravity dust on every step, ship bands lighting up as he passes, rocks levitating when the ship wakes, grass parting around his legs, spores fleeing, glow-plants lighting up near him, and a suit pulse that flattens the grass.
- **Emotional anchor:** a 6-second voice note from his daughter, *Anaya* ("Papa, come home"). He replays it when things go wrong. It's a recurring beat across episodes.
- **The ship:** a Vaelor mothership that crashed on the Moon 4 million years ago. The signal was its distress beacon.
- **ECHO:** a shard of the ship's AI that jumps into Dev's suit when he touches the panel. It speaks in broken glyphs at first and learns English episode by episode. It works as his companion and gives the captions a second voice.
- **The Vaelor:** the vanished builders of **the Coil**, a ring-world on the far side of the universe. Its gates link to other planets.
- **The Hollow:** skeletal machine swarms that wiped out the Vaelor. They still guard the Coil, and the beacon Dev answered just told them where Earth is.
- **Goal:** collect the **4 gate keys** to open a path back to Earth before the Hollow get there.

## Season 1
| # | Title | Big visual moment | Cliffhanger |
|---|-------|-------------------|-------------|
| 1 | The Signal | Moon landing → crashed mothership lights up → teleport | Wakes up under a giant ring in the sky |
| 2 | The Coil | Exploring the ring-world: singing crystals, breathing bellflower pods, skitterlings, lumen-moths, a mirror lake, sky leviathans (driftbacks). Dev befriends a skitterling, Pixel. | Everything flees; his HUD speaks: "Y O U . A R E . F A R ." |
| 3 | The Hollow | Night. A cloaked Hollow scout de-cloaks 2 m from Dev, chases him round the lake, and ~120 skeletal machines claw up out of the grass. Dev fires a gun for the first time. ECHO takes over the suit ("LET ME."), boost-jumps over the army and slams down a shockwave. On a hilltop: "I AM ECHO. I WAS THE SHIP." | The scout's broken skull beams a red signal; hundreds of red ships appear among the stars: "IT CALLED THE OTHERS." |
| 4 | The Map | Vaelor temple, hologram galaxy, Earth at the edge | 4 keys needed, and one is already gone |
| 5 | World of Glass | Crystal planet, glass storm | A key is inside a living crystal |
| 6 | The Drowned Moon | Ocean world, moonlight reflections | Something huge under the water |
| 7 | The Last Vaelor | A dying Vaelor knight | "You answered the beacon. Now they know where Earth is." |
| 8 | Titan | Boss fight with a giant Hollow titan | Dev's suit is breached, oxygen at 4% |
| 9 | ECHO's Secret | ECHO glitches and shows its memories | ECHO *wanted* to be found |
| 10 | Home? | Gate to the Solar System opens | Earth is there… but the Moon is gone |

## Episode template (for the pipeline)
Each episode is `episodes/epXX.json` (captions + event times) plus a scene file. The renderer and the audio are generated from the same JSON, so the captions, sound and visuals stay in sync.

Rules per Short:
- **First 2 seconds = hook.** The strongest image goes up front, and the first caption is a mystery.
- One "wow" visual per episode (dragon-fight energy, like the reference).
- Caption lines ≤ 32 characters, 2 lines max, typed at 30 chars/s.
- Always end on a question, plus "PART N+1 — follow".
