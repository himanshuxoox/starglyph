"""Pick the next episode to render + upload (used by .github/workflows/auto-episode.yml).

An episode is "ready" when both episodes/epNN.json and its scene file (episode.js for 01,
episodeNN.js otherwise) are committed. Prints nothing (and sets no output) when:
  - every ready episode is already uploaded, or
  - an upload is already scheduled more than BUFFER_DAYS in the future (no need to render yet).
"""
import datetime as dt, glob, json, os, re
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IST = ZoneInfo("Asia/Kolkata")
BUFFER_DAYS = float(os.environ.get("BUFFER_DAYS", "1.5"))

try:
    state = json.load(open(os.path.join(ROOT, "state", "uploads.json")))
except Exception:
    state = {"episodes": {}, "last_publish_at": None}

ready = []
for f in glob.glob(os.path.join(ROOT, "episodes", "ep*.json")):
    m = re.fullmatch(r"ep(\d\d)\.json", os.path.basename(f))
    if not m: continue
    ep = m.group(1)
    scene = "episode.js" if ep == "01" else f"episode{ep}.js"
    if os.path.exists(os.path.join(ROOT, scene)) and ep not in state["episodes"]:
        ready.append(ep)
ready.sort()

reason, pick = "", ""
last = state.get("last_publish_at")
if not ready:
    reason = "no new episode ready (all committed episodes are uploaded)"
elif last and dt.datetime.fromisoformat(last) - dt.datetime.now(IST) > dt.timedelta(days=BUFFER_DAYS):
    reason = f"next upload already scheduled for {last}; waiting"
else:
    pick = ready[0]
    reason = f"rendering ep{pick} (queue: {', '.join(ready)})"

print(reason)
out = os.environ.get("GITHUB_OUTPUT")
if out:
    with open(out, "a") as fh:
        fh.write(f"episode={pick}\n")
