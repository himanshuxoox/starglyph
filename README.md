# Starglyph · SIGNAL LOST

ASCII-rendered sci-fi story Shorts. A 3D scene (three.js) is rendered headless, every frame is turned into
coloured text glyphs, captions are typed on screen and the soundtrack is generated in code. No paid APIs.

## Run an episode
GitHub → Actions → **Render episode** → Run workflow → episode `01`.
The video is kept as a run artifact (14 days) and, if "upload" is ticked, uploaded to YouTube as a
scheduled Short (next `PUBLISH_SLOTS` time, default 19:00 IST). Uploaded episodes are tracked in
`state/uploads.json`, so the same episode is never uploaded twice.

Secrets: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (get the token once with `python auth_setup.py`).
Optional repo variable: `PUBLISH_SLOTS` (e.g. `19:00` or `12:00,19:00`).

## Local
    npm ci
    python audio.py episodes/ep01.json ep.wav
    EP=01 node render.mjs video ep_noaudio.mp4      # set CHROME_PATH if Chromium isn't auto-found
    EP=01 node render.mjs stills out 5 20 34        # quick preview frames

## Layout
- `engine/ascii.js`: glyph renderer (colour pass + glyph-set ID pass → ASCII shader)
- `engine/character.js`: Commander Dev Rao (rig + natural gait)
- `engine/fx.js`: reactive grass, particle bursts
- `episode.js`: Episode 1 scenes + timeline · `episodes/epXX.json`: captions, event times, YouTube metadata
- `audio.py`: procedural soundtrack · `upload.py`: YouTube upload · `STORY.md`: story bible
