#!/usr/bin/env python3
"""Local static server for the game runtime files.

Binds on loopback only. Box Chrome bypasses the egress proxy for
127.0.0.1/localhost; it is not a public tunnel or listing.
Private docs, tests, raw art, and secret/dot files are not served.
"""
from __future__ import annotations

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.abspath(os.environ.get("GAME_ROOT") or "/workspace/digimon-bullet-heaven")
HOST = os.environ.get("GAME_HOST") or "127.0.0.1"
PORT = int(os.environ.get("GAME_PORT") or "8770")

BLOCKED_NAMES = {".git", ".env", ".ssh", ".htaccess", ".DS_Store", "README.md", "ROADMAP.md"}
BLOCKED_PREFIXES = (
    "docs/",
    "scripts/",
    "screenshots/",
    "raw/",
    "assets/sprites/frames-up-all/",
    "assets/sprites/frames-story/",
    "assets/sprites/raw/",
    "assets/sprites/SOURCES.md",
    "assets/sprites/SOURCES-up-all.md",
)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        ua = "-"
        try:
            ua = self.headers.get("User-Agent", "-")
        except Exception:
            pass
        sys.stderr.write("[http] %s - %s ua=%s\n" % (self.address_string(), fmt % args, ua))
        sys.stderr.flush()

    def _blocked(self):
        raw = self.path.split("?", 1)[0]
        rel = raw.lstrip("/")
        if not rel:
            return False
        parts = [p for p in rel.split("/") if p]
        for p in parts:
            if p == ".." or p in BLOCKED_NAMES or p.startswith("."):
                return True
        for prefix in BLOCKED_PREFIXES:
            if rel == prefix.rstrip("/") or rel.startswith(prefix):
                return True
        return False

    def list_directory(self, path):
        self.send_error(403, "Directory listing disabled")
        return None

    def do_GET(self):
        if self._blocked():
            self.send_error(404, "Not found")
            return
        return super().do_GET()

    def do_HEAD(self):
        if self._blocked():
            self.send_error(404, "Not found")
            return
        return super().do_HEAD()


def main():
    if not os.path.isdir(ROOT):
        raise SystemExit("Game root missing: %s" % ROOT)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print("[http] serving %s on http://%s:%s (runtime files only, listing disabled)" % (ROOT, HOST, PORT), flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
