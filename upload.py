"""
Upload one rendered episode to YouTube as a scheduled Short.

    python upload.py --episode 01 --file ep01.mp4            # real upload
    python upload.py --episode 01 --file ep01.mp4 --dry-run  # just print the plan

Needs env vars (GitHub secrets): YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
(get the refresh token once with: python auth_setup.py)

Title / description / tags come from episodes/epXX.json -> "youtube".
The video is uploaded as private with publishAt = the next free slot (IST), so YouTube
publishes it automatically. Uploaded episodes are recorded in state/uploads.json, so an
episode is never uploaded twice (pass --force to re-upload).
"""
import argparse, datetime as dt, json, os, sys
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.abspath(__file__))
IST = ZoneInfo("Asia/Kolkata")
SLOTS = os.environ.get("PUBLISH_SLOTS", "19:00").split(",")   # story episodes: one evening slot
GAP_DAYS = int(os.environ.get("PUBLISH_GAP_DAYS", "1") or 1)                  # days between episodes (2 = every other day)
STATE = os.path.join(ROOT, "state", "uploads.json")


def load_state():
    try:
        with open(STATE) as f:
            return json.load(f)
    except Exception:
        return {"episodes": {}, "last_publish_at": None}


def save_state(s):
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w") as f:
        json.dump(s, f, indent=1, ensure_ascii=False)


def next_slot(after=None):
    """Next slot at least 20 min from now (YouTube needs publishAt in the future) and after `after`."""
    now = dt.datetime.now(IST) + dt.timedelta(minutes=20)
    if after is not None:
        earliest = after + dt.timedelta(days=GAP_DAYS) - dt.timedelta(hours=2)   # keep the gap between episodes
        if earliest >= now:
            now = earliest
    d = now.date()
    while True:
        for s in SLOTS:
            hh, mm = map(int, s.strip().split(":"))
            t = dt.datetime(d.year, d.month, d.day, hh, mm, tzinfo=IST)
            if t > now:
                return t
        d += dt.timedelta(days=1)


def youtube_client():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    creds = Credentials(
        token=None,
        refresh_token=os.environ["YT_REFRESH_TOKEN"],
        client_id=os.environ["YT_CLIENT_ID"],
        client_secret=os.environ["YT_CLIENT_SECRET"],
        token_uri="https://oauth2.googleapis.com/token",
        scopes=["https://www.googleapis.com/auth/youtube.upload"],
    )
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def upload(yt, path, meta, publish_at):
    from googleapiclient.http import MediaFileUpload
    body = {
        "snippet": {
            "title": meta["title"][:100],
            "description": meta["description"],
            "tags": meta.get("tags", []),
            "categoryId": meta.get("categoryId", "1"),   # 1 = Film & Animation
            "defaultLanguage": "en",
        },
        "status": {
            "privacyStatus": "private",                   # required for scheduled publishing
            "publishAt": publish_at.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "selfDeclaredMadeForKids": False,
            "containsSyntheticMedia": False,              # stylised CG animation, nothing realistic
        },
    }
    media = MediaFileUpload(path, mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
    req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    resp = None
    while resp is None:
        _status, resp = req.next_chunk()
    return resp["id"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--episode", required=True, help="e.g. 01")
    ap.add_argument("--file", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    with open(os.path.join(ROOT, "episodes", f"ep{a.episode}.json")) as f:
        meta = json.load(f)["youtube"]
    state = load_state()
    done = state["episodes"].get(a.episode)
    if done and not a.force:
        print(f"Episode {a.episode} already uploaded: https://youtube.com/shorts/{done['youtube_id']} (use --force to re-upload)")
        return

    last = state.get("last_publish_at")
    when = next_slot(dt.datetime.fromisoformat(last) if last else None)
    print(f"{when:%Y-%m-%d %H:%M IST}  ep{a.episode}  |  {meta['title']}")
    if a.dry_run:
        return
    try:
        vid = upload(youtube_client(), a.file, meta, when)
    except Exception as e:
        print(f"upload failed: {e}", file=sys.stderr)
        sys.exit(1)
    state["episodes"][a.episode] = {"youtube_id": vid, "publish_at": when.isoformat()}
    state["last_publish_at"] = when.isoformat()
    save_state(state)
    print(f"   -> https://youtube.com/shorts/{vid}  (goes public {when:%d %b %H:%M} IST)")


if __name__ == "__main__":
    main()
