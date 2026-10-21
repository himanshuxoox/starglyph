# SIGNAL LOST: an ASCII space saga

**Channel:** Starglyph (renamed from Stickstorm) · **Format:** 9:16 Shorts, ~100 s (Ep 4+), ASCII-rendered 3D world, typed captions, no voiceover (optional free Edge-TTS later)

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

## Season 1 (20 episodes, one every 2 days)
| # | Title | Big visual moment | Cliffhanger |
|---|-------|-------------------|-------------|
| 1 | The Signal | Moon landing → crashed Vaelor mothership lights up → teleport | Wakes up under a giant ring in the sky |
| 2 | The Coil | Ring-world: singing crystals, bellflower pods, skitterlings, lumen-moths, mirror lake, driftbacks. Dev befriends Pixel | HUD speaks: "Y O U . A R E . F A R ." |
| 3 | The Hollow | Cloaked scout, chase round the lake, ~120 Hollow claw out of the grass, ECHO's shockwave | "IT CALLED THE OTHERS." |
| 4 | The Map | Lake drains, Vaelor temple, hologram universe, Earth at the edge | 4 keys needed, one already gone + a human boot print |
| 5 | World of Glass | Crystal planet, glass storm | The first key is inside a crystal giant |
| 6 | The Drowned Moon | Drowned Vaelor city, kelp forest | Its guardian wakes |
| 7 | The Leviathan | Leviathan carries Dev up into the moonlight, second key | The Hollow arrive |
| 8 | The Last Vaelor | Dead battlefield, a dying Vaelor knight | The truth about the voice in his suit |
| 9 | Titan | Two-sun desert, gate 2 km away | Something under the sand |
| 10 | Anaya | 3% oxygen vs a 40 m titan, the voice note | ECHO goes silent |
| 11 | Without ECHO | Ice world, just Pixel; third key in a frozen waterfall | The Hollow are already there |
| 12 | The Hive | Bone corridors, captured creatures, Pixel in a cage | A hand pulls him into the dark |
| 13 | Mira | Mira Sen (Kestrel-4, lost 1996), 30 years of tally marks | She has the fourth key… and a red eye |
| 14 | ECHO's Secret | ECHO's memory: it was the first Hollow, it hid on our Moon | "I NEED YOUR WORLD, DEV." |
| 15 | The Choice | Hive escape, Kestrel launch, asteroid chase | Mira jets out to draw the Hollow away |
| 16 | Keys | Back on the Coil: 4 keys in the temple, 60-second siege, the Coil fights back, gate rises from the lake | "…AND THEN, MY NEW HOME." |
| 17 | Home? | Out past Jupiter, Anaya's voice note, Mars, Earth | The Moon is gone: a debris ring round a Hollow hive |
| 18 | The Fall of Luna | Sneaking across the hive core to the buried Vaelor ship | ECHO takes his hand by force: "NOW I HAVE A BODY." |
| 19 | Earthfall | Moon fragments burn into the night side; Dev plays ECHO the voice note | ECHO shields Earth, sends Dev home: "I WILL TAKE THEM WITH ME." |
| 20 | Signal Found | ECHO's last beacon pulls every Hollow through a gate; re-entry; Arabian Sea sunrise; "Papa?" | Visor: "D . E . V ." + "KESTREL-4 ▸ SIGNAL FOUND" (Season 2 hook) |

## Episode template (for the pipeline)
Each episode is `episodes/epXX.json` (captions + event times) plus a scene file. The renderer and the audio are generated from the same JSON, so the captions, sound and visuals stay in sync.

Rules per Short:
- **First 2 seconds = hook.** The strongest image goes up front, and the first caption is a mystery.
- One "wow" visual per episode (dragon-fight energy, like the reference).
- Caption lines ≤ 32 characters, 2 lines max, typed at 30 chars/s.
- Always end on a question, plus "PART N+1 — follow".
