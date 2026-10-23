# Starglyph · SIGNAL LOST

ASCII-rendered sci-fi story Shorts. A 3D scene (three.js) is rendered headless, every frame is turned into
coloured text glyphs, captions are typed on screen and the soundtrack is generated in code. No paid APIs.

## Automatic: 2 Shorts a day (12:30 and 17:30 IST)
`.github/workflows/auto-episode.yml` runs every 4 hours, picks the next committed episode that is not in
`state/uploads.json` yet (`scripts/next_episode.py`), renders it on GitHub and schedules the upload
in the next free `PUBLISH_SLOTS` time (default `12:30,17:30` IST; set `PUBLISH_GAP_DAYS` to space them out). All 20 Season 1 episodes are in the repo.

## Run an episode by hand
GitHub → Actions → **Render episode** → Run workflow → episode `01`.
The video is kept as a run artifact (14 days) and, if "upload" is ticked, uploaded to YouTube as a
scheduled Short (next free `PUBLISH_SLOTS` time, default 12:30 / 17:30 IST). Uploaded episodes are tracked in
`state/uploads.json`, so the same episode is never uploaded twice.

Secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (get the token once with `python auth_setup.py`).
Optional repo variables: `PUBLISH_SLOTS` (default `12:30,17:30`), `PUBLISH_GAP_DAYS` (default `0`).

## Local
    npm ci
    EP=02 AUDIO_META_OUT=audio_meta.json node render.mjs video ep_noaudio.mp4   # set CHROME_PATH if needed
    python audio.py episodes/ep02.json ep.wav audio_meta.json
    EP=01 node render.mjs stills out 5 20 34        # quick preview frames

## Layout
- `engine/ascii.js`: glyph renderer (colour pass + glyph-set ID pass → ASCII shader)
- `engine/character.js`: Commander Dev Rao (rig + natural gait)
- `engine/fx.js`: reactive grass, particle bursts
- `episode.js`: Episode 1 · `episode02.js` … `episode20.js`: Episodes 2–20 (`index.html?ep=03` picks the scene file)
- `engine/kit.js`: shared stage / HUD / camera / post-fx helpers for Ep 4+ · `engine/props.js`: Vaelor temple, keys, gates · `engine/hive.js`: Hollow hive, Mira · `engine/space.js`: planets, Earth, the Moon, capsule + cockpit, ships · `engine/ocean.js`, `engine/glass.js`: ocean and glass worlds
- `engine/sky.js`: night sky (seamless nebula dome, ringed gas giant, rock spires, red armada) · `engine/hollow.js`: the Hollow (scout + instanced army)
- `episodes/epXX.json`: captions, event times, sound cues, YouTube metadata · `episodes/ep02_script.md`, `ep03_script.md`: scripts
- `engine/creatures.js`: skitterling, bellflower pod, lumen-moths, driftback, crystals
- `audio.py` (Ep 1) + `audio_v2.py` (Ep 2+, cue-based; footsteps/chimes/puffs come from `audio_meta.json` written by the renderer)
- `upload.py`: YouTube upload · `STORY.md`: story bible
