#!/usr/bin/env python3
"""Generate a small, original, muted cinematic background video for the DTS festival overlay."""
from pathlib import Path
import subprocess
import tempfile
import math
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "dts-festival-backdrop.mp4"
W, H, FPS, SECONDS = 640, 360, 15, 3
FRAMES = FPS * SECONDS

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    random.seed(42)
    lights = [(random.randrange(W), random.randrange(H), random.randrange(2, 8),
               random.random() * math.tau, random.uniform(.6, 2.0)) for _ in range(30)]
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    small_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    font = ImageFont.truetype(font_path, 22)
    small = ImageFont.truetype(small_path, 12)

    with tempfile.TemporaryDirectory(prefix="dts-festival-") as tmp:
        tmp = Path(tmp)
        for frame in range(FRAMES):
            t = frame / FRAMES
            y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
            x = np.linspace(0, 1, W, dtype=np.float32)[None, :, None]
            base = np.zeros((H, W, 3), dtype=np.float32)
            base[:, :, 0] = 5 + 13 * (1 - np.abs(x[:, :, 0] - .5) * 1.8) + 4 * np.sin(x[:, :, 0] * 8 + t * 6)
            base[:, :, 1] = 10 + 13 * (1 - y[:, :, 0]) + 3 * np.cos(y[:, :, 0] * 7 - t * 5)
            base[:, :, 2] = 28 + 37 * (1 - np.abs(x[:, :, 0] - .5)) + 10 * np.sin(t * math.tau)
            arr = np.uint8(np.clip(base, 0, 255))
            im = Image.fromarray(arr, "RGB")
            draw = ImageDraw.Draw(im, "RGBA")
            for bx, by, radius, phase, speed in lights:
                xx = (bx + math.sin(t * math.tau * speed + phase) * 18) % W
                yy = (by + math.cos(t * math.tau * speed + phase) * 10) % H
                pulse = .35 + .65 * (.5 + .5 * math.sin(t * math.tau * speed + phase))
                r = max(1, int(radius * pulse))
                draw.ellipse((xx-r, yy-r, xx+r, yy+r),
                             fill=(255, int(155 + 70*pulse), int(55 + 150*pulse), int(60 + 80*pulse)))
                if r > 4:
                    draw.ellipse((xx-2*r, yy-2*r, xx+2*r, yy+2*r),
                                 outline=(255, 200, 100, 30), width=1)
            draw.ellipse((100, 245, 540, 415), fill=(255, 145, 45, 18))
            title = "DYNAMIC TECHNOLOGY SOLUTIONS"
            tw = draw.textbbox((0, 0), title, font=font)[2]
            draw.text(((W-tw)//2, 145), title, font=font,
                      fill=(255, 246, 224, 240), stroke_width=1, stroke_fill=(15, 20, 40, 180))
            subtitle = "SECURITY  •  NETWORKING  •  IT SOLUTIONS"
            sw = draw.textbbox((0, 0), subtitle, font=small)[2]
            draw.text(((W-sw)//2, 180), subtitle, font=small, fill=(181, 224, 255, 230))
            sx = int((t * 1.4 % 1) * W)
            draw.line((sx, 65, sx + 65, 65), fill=(255, 205, 115, 100), width=2)
            im.save(tmp / f"frame{frame:03d}.jpg", quality=82, optimize=True)

        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", str(FPS), "-i", str(tmp / "frame%03d.jpg"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "slow",
            "-crf", "31", "-movflags", "+faststart", "-an", str(OUT)
        ], check=True)
    print(f"Generated {OUT} ({OUT.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
