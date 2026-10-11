"""
Synthetic Cullet & Defect Generator for Glass Recycling.
Generates realistic cullet fragments (flint, amber, green, other_colour, csp, other_contaminant)
with realistic conchoidal facets, translucency, specular highlights, and YOLO-seg annotations.
"""
import os
import random
import math
from pathlib import Path
import numpy as np
import cv2

# Class definitions from the Technical Build Guide:
# 0: flint (clear/white soda-lime)
# 1: amber (brown soda-lime)
# 2: green (green soda-lime)
# 3: other_colour (blue, red, violet)
# 4: csp (ceramic, stone, porcelain)
# 5: other_contaminant (metal, paper, plastic, flat glass)
CLASSES = {
    0: "flint",
    1: "amber",
    2: "green",
    3: "other_colour",
    4: "csp",
    5: "other_contaminant"
}

# Color palettes in BGR
COLOR_PALETTES = {
    0: {"base": (210, 215, 210), "var": (25, 25, 25), "translucent": True, "glare": 0.4},    # Flint
    1: {"base": (35, 95, 175),   "var": (20, 30, 35), "translucent": True, "glare": 0.3},    # Amber
    2: {"base": (50, 140, 50),   "var": (25, 40, 25), "translucent": True, "glare": 0.35},   # Green
    3: {"base": (170, 70, 70),   "var": (30, 25, 30), "translucent": True, "glare": 0.3},    # Other (Blue/Cobalt)
    4: {"base": (180, 180, 185), "var": (30, 30, 30), "translucent": False, "glare": 0.05},  # CSP (Matte stone/ceramic)
    5: {"base": (150, 150, 160), "var": (40, 40, 40), "translucent": False, "glare": 0.7},   # Metal/foil
}

def generate_polygon(center_x, center_y, radius, num_vertices=12, irregularity=0.4, spikeyness=0.3):
    """Generate irregular polygon simulating broken glass fragments."""
    angles = []
    angle_step = 2 * math.pi / num_vertices
    for i in range(num_vertices):
        angle = i * angle_step + random.uniform(-irregularity * angle_step, irregularity * angle_step)
        angles.append(angle)
    angles.sort()

    points = []
    for angle in angles:
        r = radius * (1 + random.uniform(-spikeyness, spikeyness))
        r = max(radius * 0.4, r)
        x = int(center_x + r * math.cos(angle))
        y = int(center_y + r * math.sin(angle))
        points.append([x, y])
    return np.array(points, dtype=np.int32)

def draw_fragment(img, mask_img, class_id, center_x, center_y, size):
    """Draw a realistic glass or contaminant fragment onto the image and mask."""
    num_pts = random.randint(7, 16)
    pts = generate_polygon(center_x, center_y, size, num_vertices=num_pts, irregularity=0.35, spikeyness=0.4)
    
    # Clip points to image boundary
    h, w = img.shape[:2]
    pts[:, 0] = np.clip(pts[:, 0], 2, w - 3)
    pts[:, 1] = np.clip(pts[:, 1], 2, h - 3)

    palette = COLOR_PALETTES[class_id]
    base_bgr = palette["base"]
    var_bgr = palette["var"]
    
    # Sample color with variance
    b = np.clip(base_bgr[0] + random.randint(-var_bgr[0], var_bgr[0]), 0, 255)
    g = np.clip(base_bgr[1] + random.randint(-var_bgr[1], var_bgr[1]), 0, 255)
    r = np.clip(base_bgr[2] + random.randint(-var_bgr[2], var_bgr[2]), 0, 255)
    color = (int(b), int(g), int(r))

    # Create temporary fragment layer
    frag_layer = np.zeros_like(img)
    frag_mask = np.zeros((h, w), dtype=np.uint8)
    cv2.fillPoly(frag_mask, [pts], 255)
    cv2.fillPoly(frag_layer, [pts], color)

    if palette["translucent"]:
        # Vitrified glass: add subtle gradient / facet internal lines
        for _ in range(random.randint(2, 5)):
            p1 = (random.randint(min(pts[:, 0]), max(pts[:, 0])), random.randint(min(pts[:, 1]), max(pts[:, 1])))
            p2 = (random.randint(min(pts[:, 0]), max(pts[:, 0])), random.randint(min(pts[:, 1]), max(pts[:, 1])))
            facet_color = (min(255, int(b * 1.25)), min(255, int(g * 1.25)), min(255, int(r * 1.25)))
            cv2.line(frag_layer, p1, p2, facet_color, thickness=random.randint(1, 2))
        
        # Specular glint
        if random.random() < palette["glare"]:
            glint_center = (int(center_x + size * random.uniform(-0.3, 0.3)), int(center_y + size * random.uniform(-0.3, 0.3)))
            cv2.circle(frag_layer, glint_center, random.randint(2, max(3, int(size * 0.15))), (255, 255, 255), -1)

        # Blend with background for glass translucency (alpha ~ 0.85)
        alpha = random.uniform(0.78, 0.92)
        indices = frag_mask > 0
        img[indices] = cv2.addWeighted(frag_layer, alpha, img, 1 - alpha, 0)[indices]
    else:
        # Opaque (CSP ceramic or metal): granular texture or sharp reflection
        if class_id == 4: # CSP
            noise = np.random.normal(0, 18, (h, w, 3)).astype(np.int16)
            frag_layer = np.clip(frag_layer.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        elif class_id == 5: # Metal
            # Strong specular ridge
            cv2.line(frag_layer, (pts[0][0], pts[0][1]), (pts[len(pts)//2][0], pts[len(pts)//2][1]), (250, 250, 255), thickness=random.randint(2, 4))
        
        indices = frag_mask > 0
        img[indices] = frag_layer[indices]

    # Draw dark fracture boundary edge (characteristic conchoidal line)
    edge_color = (int(max(0, b - 60)), int(max(0, g - 60)), int(max(0, r - 60)))
    cv2.polylines(img, [pts], isClosed=True, color=edge_color, thickness=random.randint(1, 2))
    
    # Update mask
    mask_img[indices] = class_id + 1  # 1-indexed

    # Return normalized polygon points for YOLO-seg
    norm_pts = []
    for pt in pts:
        norm_pts.append(pt[0] / w)
        norm_pts.append(pt[1] / h)
    return norm_pts

def generate_single_frame(img_size=640, num_fragments=18, class_weights=None):
    """Generate a single industrial cullet frame with bounding boxes & polygons."""
    w, h = img_size, img_size
    
    # Industrial chute background: dark steel / conveyer belt with subtle texture
    bg_base = random.randint(32, 55)
    img = np.full((h, w, 3), bg_base, dtype=np.uint8)
    noise = np.random.normal(0, 6, (h, w, 3)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    mask_img = np.zeros((h, w), dtype=np.uint8)
    annotations = []

    # Default weights: predominantly flint, amber, green with some CSP and contaminants
    if class_weights is None:
        class_weights = [0.35, 0.28, 0.22, 0.05, 0.06, 0.04]
    
    classes_list = list(CLASSES.keys())

    # Generate fragments with realistic overlapping and distribution
    for _ in range(num_fragments):
        cid = random.choices(classes_list, weights=class_weights)[0]
        size = random.randint(int(img_size * 0.04), int(img_size * 0.12))
        cx = random.randint(int(size * 1.2), w - int(size * 1.2))
        cy = random.randint(int(size * 1.2), h - int(size * 1.2))
        
        norm_poly = draw_fragment(img, mask_img, cid, cx, cy, size)
        
        # Verify valid polygon
        if len(norm_poly) >= 6:
            annotations.append((cid, norm_poly))

    return img, annotations

def generate_dataset(output_dir, num_train=180, num_val=40, img_size=640, class_weights=None):
    """Generate complete YOLO segmentation dataset structure."""
    out_path = Path(output_dir)
    images_train = out_path / "images" / "train"
    images_val = out_path / "images" / "val"
    labels_train = out_path / "labels" / "train"
    labels_val = out_path / "labels" / "val"

    for p in [images_train, images_val, labels_train, labels_val]:
        p.mkdir(parents=True, exist_ok=True)

    print(f"Generating {num_train} training frames and {num_val} validation frames...")

    # Training frames
    for i in range(num_train):
        num_frags = random.randint(12, 24)
        img, annotations = generate_single_frame(img_size, num_frags, class_weights)
        
        img_name = f"cullet_train_{i:04d}.jpg"
        cv2.imwrite(str(images_train / img_name), img)
        
        lbl_name = f"cullet_train_{i:04d}.txt"
        with open(labels_train / lbl_name, "w") as f:
            for cid, poly in annotations:
                poly_str = " ".join([f"{x:.6f}" for x in poly])
                f.write(f"{cid} {poly_str}\n")

    # Validation frames
    for i in range(num_val):
        num_frags = random.randint(12, 24)
        img, annotations = generate_single_frame(img_size, num_frags, class_weights)
        
        img_name = f"cullet_val_{i:04d}.jpg"
        cv2.imwrite(str(images_val / img_name), img)
        
        lbl_name = f"cullet_val_{i:04d}.txt"
        with open(labels_val / lbl_name, "w") as f:
            for cid, poly in annotations:
                poly_str = " ".join([f"{x:.6f}" for x in poly])
                f.write(f"{cid} {poly_str}\n")

    # Write data.yaml file
    yaml_content = f"""path: {out_path.resolve().as_posix()}
train: images/train
val: images/val
names:
  0: flint
  1: amber
  2: green
  3: other_colour
  4: csp
  5: other_contaminant
"""
    yaml_file = out_path / "data.yaml"
    with open(yaml_file, "w") as f:
        f.write(yaml_content)

    print(f"Dataset generation complete at {out_path}!")
    return str(yaml_file)

if __name__ == "__main__":
    generate_dataset("datasets/synthetic_cullet", num_train=120, num_val=30)
