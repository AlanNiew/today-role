"""生成小程序头像（纸色底 + 鼠尾草绿印章 + 宋体「今」+ 金色内圈）。

用法：python docs/release/make-avatar.py
输出：docs/release/assets/avatar-512.png / avatar-144.png（另存 avatar-1024.png 作母版）
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PAPER = (245, 240, 230)
SAGE = (47, 93, 69)
CREAM = (251, 246, 233)
GOLD = (199, 154, 84)

SERIF_FONT = r"C:\Windows\Fonts\STSONG.TTF"

OUT_DIR = Path(__file__).resolve().parent / "assets"
SIZE = 1024


def build_master() -> Image.Image:
    image = Image.new("RGB", (SIZE, SIZE), PAPER)
    draw = ImageDraw.Draw(image)
    center = SIZE // 2

    radius = int(SIZE * 0.375)
    draw.ellipse(
        [center - radius, center - radius, center + radius, center + radius],
        fill=SAGE,
    )

    ring = int(SIZE * 0.335)
    draw.ellipse(
        [center - ring, center - ring, center + ring, center + ring],
        outline=GOLD,
        width=max(2, SIZE // 160),
    )

    font = ImageFont.truetype(SERIF_FONT, int(SIZE * 0.46))
    text = "今"
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    x = center - (right - left) / 2 - left
    y = center - (bottom - top) / 2 - top
    draw.text((x, y), text, font=font, fill=CREAM)
    return image


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    master = build_master()
    master.save(OUT_DIR / "avatar-1024.png", optimize=True)
    for size in (512, 144):
        master.resize((size, size), Image.LANCZOS).save(
            OUT_DIR / f"avatar-{size}.png", optimize=True
        )
    for path in sorted(OUT_DIR.glob("avatar-*.png")):
        print(f"{path}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
