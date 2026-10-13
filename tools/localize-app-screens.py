#!/usr/bin/env python3
import json, re, statistics, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "site/assets/screens/ko"
TARGET = ROOT / "site/assets/screens"
OCR_TOOL = ROOT / "tools/ocr-screen.swift"
SCREENS = ["feed", "explore", "resorts", "profile", "reels", "dive-log", "license"]
LANGS = {"ko": "ko", "en": "en", "ja": "ja", "zh": "zh-CN"}
FONTS = {
    "ko": "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "en": "/System/Library/Fonts/SFNS.ttf",
    "ja": "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "zh": "/System/Library/Fonts/Hiragino Sans GB.ttc",
}
CURATED = {
    "테스트": "오늘도 안전하게 즐긴 다이빙",
    "구림": "맑고 잔잔한 바다",
    "목욕탕 다이빙": "제주 문섬 다이빙",
    "목욕탕": "제주 문섬",
}

def curate(text):
    value = text
    for source, replacement in CURATED.items(): value = value.replace(source, replacement)
    return value

def translate(texts, target):
    if target == "ko": return texts
    result = []
    separator = "\n[[DG_SCREEN_SPLIT]]\n"
    for start in range(0, len(texts), 18):
        batch = texts[start:start + 18]
        query = urllib.parse.urlencode({"client":"gtx", "sl":"ko", "tl":target, "dt":"t", "q":separator.join(batch)})
        with urllib.request.urlopen("https://translate.googleapis.com/translate_a/single?" + query, timeout=30) as response:
            payload = json.load(response)
        combined = "".join(part[0] for part in payload[0])
        parts = re.split(r"\s*\[\[DG_SCREEN_SPLIT\]\]\s*", combined)
        if len(parts) != len(batch): raise RuntimeError(f"translation split mismatch {len(batch)} -> {len(parts)}")
        result.extend(" ".join(part.split()) for part in parts)
        time.sleep(.15)
    return result

def ocr(path):
    cache = path.with_suffix(".ocr.json")
    if not cache.exists():
        output = subprocess.check_output(["swift", str(OCR_TOOL), str(path)], text=True)
        cache.write_text(output)
    return json.loads(cache.read_text())

def background_and_color(image, box):
    x0,y0,x1,y1 = box
    pad = max(5, int((y1-y0)*.3))
    pixels = []
    for x in range(max(0,x0-pad), min(image.width,x1+pad)):
        for y in list(range(max(0,y0-pad), max(0,y0))) + list(range(min(image.height,y1), min(image.height,y1+pad))):
            pixels.append(image.getpixel((x,y))[:3])
    for y in range(max(0,y0-pad), min(image.height,y1+pad)):
        for x in list(range(max(0,x0-pad), max(0,x0))) + list(range(min(image.width,x1), min(image.width,x1+pad))):
            pixels.append(image.getpixel((x,y))[:3])
    if not pixels: pixels=[(255,255,255)]
    bg = tuple(int(statistics.median(channel)) for channel in zip(*pixels))
    lum = sum(bg)/3
    fg = (245,248,252) if lum < 115 else (23,42,62)
    return bg, fg

def fit_font(draw, text, width, height, font_path):
    size = max(12, int(height * 1.15))
    while size > 10:
        font = ImageFont.truetype(font_path, size=size)
        if draw.textbbox((0,0), text, font=font)[2] <= width * .96: return font
        size -= 1
    return ImageFont.truetype(font_path, size=10)

for screen in SCREENS:
    source_path = SOURCE / f"{screen}.png"
    observations = ocr(source_path)
    korean = []
    for item in observations:
        value = curate(item["text"])
        if re.search(r"[가-힣]", value): korean.append(value)
    unique = list(dict.fromkeys(korean))
    localized = {lang: dict(zip(unique, translate(unique, target))) for lang,target in LANGS.items()}
    for lang in LANGS:
        image = Image.open(source_path).convert("RGB")
        draw = ImageDraw.Draw(image)
        for item in observations:
            source_text = curate(item["text"])
            if not re.search(r"[가-힣]", source_text): continue
            if lang == "ko" and source_text == item["text"]: continue
            replacement = localized[lang].get(source_text, source_text)
            x0 = max(0, int(item["x"] * image.width) - 14)
            y0 = max(0, int((1 - item["y"] - item["h"]) * image.height) - 8)
            x1 = min(image.width, int((item["x"] + item["w"]) * image.width) + 18)
            y1 = min(image.height, int((1 - item["y"]) * image.height) + 8)
            if lang != "ko": x1 = min(image.width, x1 + max(24, int((x1-x0) * .85)))
            bg, fg = background_and_color(image, (x0,y0,x1,y1))
            draw.rounded_rectangle((x0,y0,x1,y1), radius=max(2,(y1-y0)//8), fill=bg)
            font = fit_font(draw, replacement, x1-x0, y1-y0, FONTS[lang])
            text_box = draw.textbbox((0,0), replacement, font=font)
            draw.text((x0+4, y0 + max(0, ((y1-y0) - (text_box[3]-text_box[1]))//2 - text_box[1])), replacement, font=font, fill=fg)
        out_dir = TARGET / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        image.save(out_dir / f"{screen}.png", optimize=True)
    print(f"localized {screen}")
