# Faster generation: 10s video, 24fps (240 frames) to avoid timeout
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio

img_path = "/mnt/data/splash-icon.png"
base = Image.open(img_path).convert("RGB")

fps = 24
duration = 10
frames = fps * duration

width = 1080
height = 1920
base = base.resize((width, height))

np.random.seed(42)
bubble_count = 20
bubbles = []
for _ in range(bubble_count):
    bubbles.append({
        "x": np.random.uniform(0, width),
        "y": np.random.uniform(height, height*1.2),
        "r": np.random.uniform(4, 9),
        "speed": np.random.uniform(40, 100)
    })

output_path = "/mnt/data/divergram_video.mp4"
writer = imageio.get_writer(output_path, fps=fps)

for f in range(frames):
    t = f / fps

    zoom = 1 + 0.025 * (t/duration)
    zw = int(width/zoom)
    zh = int(height/zoom)
    crop = base.crop(((width-zw)//2,(height-zh)//2,(width+zw)//2,(height+zh)//2))
    frame = crop.resize((width,height))

    draw = ImageDraw.Draw(frame, "RGBA")

    for b in bubbles:
        b["y"] -= b["speed"]/fps
        if b["y"] < -10:
            b["y"] = height + np.random.uniform(0,150)
            b["x"] = np.random.uniform(0,width)

        draw.ellipse(
            (b["x"]-b["r"], b["y"]-b["r"], b["x"]+b["r"], b["y"]+b["r"]),
            outline=(255,255,255,120),
            width=2
        )

    if t > 2:
        alpha = int(min(255,(t-2)*120))
        overlay = Image.new("RGBA",(width,height),(0,0,0,0))
        d = ImageDraw.Draw(overlay)

        try:
            font = ImageFont.truetype("DejaVuSans.ttf",80)
        except:
            font = ImageFont.load_default()

        text = "Divergram"
        bbox = d.textbbox((0,0), text, font=font)
        tw = bbox[2]-bbox[0]

        d.text(((width-tw)//2, height//4), text, fill=(255,255,255,alpha), font=font)

        frame = Image.alpha_composite(frame.convert("RGBA"), overlay).convert("RGB")

    writer.append_data(np.array(frame))

writer.close()

output_path