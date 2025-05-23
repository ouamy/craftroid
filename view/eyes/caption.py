import sys
import logging
import warnings
from lavis.models import load_model_and_preprocess
from PIL import Image
import torch
import os

warnings.filterwarnings("ignore", category=UserWarning)
logging.getLogger().setLevel(logging.CRITICAL)

device = torch.device("cpu")

model, vis_processors, _ = load_model_and_preprocess(
    name="blip_caption", model_type="base_coco", is_eval=True, device=device
)

def caption_image(image_path):
    raw_image = Image.open(image_path).convert("RGB")
    image = vis_processors["eval"](raw_image).unsqueeze(0).to(device)
    return model.generate({"image": image})[0]

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: caption.py <image_path>", file=sys.stderr)
        sys.exit(1)

    image_path = sys.argv[1]
    result = caption_image(image_path)
    print(result)
