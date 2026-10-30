#!/usr/bin/env python3
"""Generate a small, original, seamless DTS data-flow background video."""
from pathlib import Path
import math
import subprocess
import tempfile

from PIL import Image, ImageDraw, ImageFilter

W, H = 960, 540
FPS, SECONDS = 24, 8
FRAMES = FPS * SECONDS
OUT = Path("assets")
OUT.mkdir(parents=True, exist_ok=True)
VIDEO = OUT / "dts-about-data-flow.mp4"
POSTER = OUT / "dts-about-data-poster.jpg"


def curve_points(t, phase, lane):
    pts = []
    for i in range(121):
        u = i / 120
        x = int(-80 + u * (W + 160))
        y = int(H * (0.25 + lane * 0.14) + 42 * math.sin(u * math.pi * 2 + phase + lane) + 18 * math.sin(u * math.pi * 4 - phase * 0.6))
        pts.append((x, y))
    return pts


def make_frame(frame):
    phase = 2 * math.pi * frame / FRAMES
    base = Image.new("RGB", (W, H))
    draw_bg = ImageDraw.Draw(base)
    for y in range(H):
        k = y / H
        draw_bg.line((0, y, W, y), fill=(5 + int(2*k), 12 + int(10*k), 29 + int(20*k)))
    radial = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(radial)
    rd.ellipse((W*0.18, H*0.05, W*0.88, H*0.95), fill=(0, 92, 155, 48))
    radial = radial.filter(ImageFilter.GaussianBlur(100))
    base = Image.alpha_composite(base.convert("RGBA"), radial)

    grid = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grid)
    for x in range(0, W, 48):
        gd.line((x, 0, x, H), fill=(42, 105, 150, 18), width=1)
    for y in range(0, H, 48):
        gd.line((0, y, W, y), fill=(42, 105, 150, 18), width=1)
    base = Image.alpha_composite(base.convert("RGBA"), grid)

    glow_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer)
    trails = []
    for lane in range(5):
        pts = curve_points(0, phase, lane - 2)
        trails.append(pts)
        gd.line(pts, fill=(0, 160, 255, 100), width=10)
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(15))
    base = Image.alpha_composite(base, glow_layer)

    sharp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sharp)
    for lane, pts in enumerate(trails):
        color = (36, 190, 255, 175) if lane % 2 else (65, 125, 255, 180)
        sd.line(pts, fill=color, width=2)
        # Three packets move along each line; phase wraps seamlessly.
        for offset in (0.0, 0.34, 0.68):
            u = (frame / FRAMES + offset + lane * 0.11) % 1.0
            idx = min(120, int(u * 120))
            x, y = pts[idx]
            r = 3 + (lane % 2)
            sd.ellipse((x-r, y-r, x+r, y+r), fill=(160, 235, 255, 245))
            sd.ellipse((x-r-5, y-r-5, x+r+5, y+r+5), outline=(30, 175, 255, 125), width=2)

    # Central network hub and four connected endpoints.
    cx, cy = 500, 275
    for x, y in ((160, 145), (800, 145), (170, 420), (805, 410)):
        sd.line((cx, cy, x, y), fill=(24, 150, 225, 65), width=2)
        sd.ellipse((x-5, y-5, x+5, y+5), fill=(75, 215, 255, 210), outline=(180, 245, 255, 220), width=2)
    pulse = 1 + int(5 * (0.5 + 0.5 * math.sin(phase)))
    sd.ellipse((cx-26-pulse, cy-26-pulse, cx+26+pulse, cy+26+pulse), outline=(30, 185, 255, 115), width=2)
    sd.ellipse((cx-13, cy-13, cx+13, cy+13), fill=(105, 225, 255, 245), outline=(225, 250, 255, 255), width=3)
    base = Image.alpha_composite(base, sharp)
    return base.convert("RGB")


with tempfile.TemporaryDirectory() as tmp:
    tmp_path = Path(tmp)
    for i in range(FRAMES):
        frame = make_frame(i)
        if i == 0:
            frame.save(POSTER, "JPEG", quality=78, optimize=True, progressive=True)
        frame.save(tmp_path / f"frame-{i:04d}.jpg", "JPEG", quality=82, optimize=True)
    cmd = [
        "ffmpeg", "-y", "-framerate", str(FPS), "-i", str(tmp_path / "frame-%04d.jpg"),
        "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "32",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(VIDEO)
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)

size = VIDEO.stat().st_size
print(f"Created {VIDEO} ({size:,} bytes) and {POSTER}")
if size > 1_500_000:
    raise SystemExit(f"Video exceeds 1.5 MB budget: {size:,} bytes")
