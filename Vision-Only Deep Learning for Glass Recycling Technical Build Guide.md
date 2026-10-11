re# Vision-Only Deep Learning for Glass Recycling: Technical Build Guide

*Glass-only extract of 'ML for Waste Recycling', with a pretrained-model and dataset survey, exact model specifications and a complete workflow. Prepared 10 Oct 2026.*

## 1. Short answers

- **Can you pick up a pretrained model?** Not for the whole glass task. No public model does cullet colour sorting, ceramic/stone/porcelain (CSP) rejection and Pyrex/crystal/ceramic recognition together. You can and should start from general pretrained weights (COCO-pretrained YOLO segmentation, ImageNet-pretrained EfficientNet and MobileNetV4) and fine-tune them. One public glass-colour model exists, but only for whole household items: a ViT-base fine-tuned on the 12-class Kaggle garbage set (about 93% overall accuracy).
- **Is there public training data?** Partly. Whole-item glass images (brown, green and white glass; bottles, jars, broken glass) are public. Crushed-cullet colour classes, CSP versus glass, borosilicate versus soda-lime and lead crystal are not, so you must collect those. Section 4 shows a cheap way to do it.
- **Is vision-only enough?** For colour sorting, opaque CSP and whole-item form factors: yes. For transparent glass-ceramic, borosilicate fragments and lead-crystal fragments: not reliably. Patent literature on glass-ceramic detection notes that white light passes through all transparent glass including glass-ceramic, and that the difference shows up in the ultraviolet. This guide therefore handles those materials with whole-item checks before crushing and an 'uncertain, so reject' policy.

## 2. What the glass section asks the system to do

| # | Task | Where | Input | Vision-only feasibility | Model |
| --- | --- | --- | --- | --- | --- |
| 1 | Separate flint, amber and green cullet | Free-fall chute | Line-scan RGB | High | G1 + G2 |
| 2 | Reject opaque CSP | Free-fall chute | Back-lit + front-lit RGB | Medium to high (opaque only) | G1 + G2 |
| 3 | Reject Pyrex, crystal, ceramic, flat glass before crushing | Upstream conveyor | Area-scan RGB | Medium (shape, logos, embossing) | G3 |
| 4 | Tell citizens what is accepted and how to prepare it | Phone browser | Phone camera | Medium | G4 |

Why four models: the chute sees thousands of tiny, nearly identical fragments per second (a segmentation and colour problem), the upstream conveyor sees whole objects (a detection problem), and the phone has a tight size and latency budget (a small classifier). One network cannot serve all three well.

## 3. Pretrained models you can pick up

| Model | Pretrained on | Use it for | Verdict |
| --- | --- | --- | --- |
| Ultralytics YOLO11-seg (or the newer YOLO26-seg) | COCO-seg, 80 classes | Initial weights for G1 | Fine-tune. It knows edges and blobs, not cullet colours. |
| Ultralytics YOLO11 detection | COCO, 80 classes | Initial weights for G3 | Fine-tune. |
| EfficientNet-B0 (timm or torchvision) | ImageNet-1k | G2 crop classifier | Fine-tune. |
| MobileNetV4-Conv-Small (timm) | ImageNet-1k | G4 phone classifier | Fine-tune. |
| dima806/garbage\_types\_image\_detection (Hugging Face, Apache-2.0) | Kaggle 12-class garbage set, from ViT-base-patch16-224-in21k | Baseline or teacher for brown, green and white glass | Household items only; 86M parameters, too heavy for a phone. |
| Roboflow Universe cullet\_v2, cullet\_white, semantic\_try (CC BY 4.0) | Single class 'cullet' | Warm-start for fragment segmentation, pseudo-labelling | No colour or CSP labels. |

Explanation: transfer learning matters here because your own labelled data will be small. Pretrained weights already encode edges, textures and shapes, so only the last stages must learn glass-specific cues. Training from scratch would need roughly ten times more data.

## 4. Training data

### 4.1 Public sources

| Dataset | Size and classes | Useful for |
| --- | --- | --- |
| Kaggle Garbage Classification (mostafaabla), 12 classes | 15,150 images; brown-glass, green-glass, white-glass among 12 classes | G4 colour classes; pretraining |
| Garbage Classification 12 classes ENHANCED (huberthamelin) | 15,870 images; duplicates removed, labels corrected | Same, but cleaner. Prefer this one. |
| TrashNet | 2,527 images, 6 classes; 501 glass | Simple glass versus not-glass |
| TACO | 1,500 images, 60 categories; includes glass bottle, broken glass, glass jar; COCO-format masks | G3 and G4, outdoor litter scenes |
| Recyclable and Household Waste Classification (Kaggle, alistairking) | Includes glass\_beverage\_bottles and glass\_food\_jars | G4 container glass |
| Roboflow Universe: krkcam/cullet\_v2, cullet\_white, semantic\_try | Single class cullet, CC BY 4.0 | G1 warm-start |
| Roboflow Universe: groundedsam/stoneplus | Classes glass, metal, stone | Weak CSP signal, check licence |
| Drink-waste set listed in the detectwaste review | About 10k images; glass bottles, cans, PET, HDPE | G4 container glass |

Licence note: check each licence before commercial use. Roboflow versions of TACO and the cullet sets are CC BY 4.0. The Kaggle sets have their own terms.

### 4.2 What does not exist publicly

Cullet fragments labelled flint, amber and green under calibrated line-scan; labelled CSP in real cullet; Pyrex versus ordinary clear glassware; lead-crystal stemware; any back-lit plus front-lit paired imagery. You must make these.

### 4.3 Building your own dataset cheaply

1. **Source materials.** Ask a bottle plant, cullet yard or glass recycling facility for pure colour fractions (flint, amber, green), CSP samples (plates, mugs, tiles, stone, porcelain) and mixed cullet. Buy Pyrex or borosilicate dishes, crystal stemware, drinking glasses, mirrors and window offcuts second-hand.
2. **Capture pure single-class batches.** Run one material at a time through your rig. The class label is known from the batch, so no hand labelling of class is needed.
3. **Auto-segment.** Back-lit images give clean silhouettes: threshold, then connected components, then fix merged pieces with SAM-assisted correction in CVAT or Label Studio.
4. **Compose realistic frames.** Paste segmented fragments onto real belt or chute backgrounds at random positions, with overlap, dust and labels. This gives dense multi-class training frames with exact masks for free.
5. **Hand-label real mixed frames.** Label a held-out set of real mixed-stream frames only for validation and test. This is your honest measure of how it works in practice.

### 4.4 Size targets

| Model | Minimum useful | Comfortable |
| --- | --- | --- |
| G1 segmenter | 1,500 frames, 5k instances per class | 4,000 frames, 20k instances per class (CSP at least 8k) |
| G2 crop classifier | 3k crops per class | 10k per class |
| G3 detector | 1,000 images per class | 1,500+ images per class, 10k instances per class (Ultralytics guidance) |
| G4 phone classifier | 800 images per class | 2,000+ per class, mixed lighting and backgrounds |

## 5. Model specifications

### 5.0 Example optical geometry (assumed, change to match your rig)

| Quantity | Value | How it is derived |
| --- | --- | --- |
| Chute width | 1,200 mm | Assumption |
| Line-scan sensor | 4,096 pixels | Same as the original document |
| Pixel size on target | 0.293 mm | 1,200 / 4,096 |
| Fragment size range | 10 mm to 63.5 mm | Mixed cullet is commonly defined as pieces under about 2.5 inches |
| Fragment size in pixels | 34 px to 217 px | 10 / 0.293 and 63.5 / 0.293 |
| Line rate at 3.0 m/s | 10.2 kHz | Speed divided by pixel size (square pixels) |
| Line rate at 4.0 m/s | 13.7 kHz | Same formula |
| Max exposure per line at 3.0 m/s | about 97 microseconds | 1 / line rate |
| Back-lit and front-lit capture | Alternate lines | Odd lines front-lit, even lines back-lit; two registered images at half along-track resolution |

Explanation: matching pixel size across and along the belt keeps fragments undistorted. Alternating illumination is what lets you tell opaque CSP (no light passes, diffuse surface) from dark glass (light passes, sharp glints).

### 5.1 G1: cullet fragment segmenter

| Item | Specification |
| --- | --- |
| Task | Instance segmentation |
| Base model | YOLO11s-seg (about 10.1M parameters, about 35.5 GFLOPs at 640; check the Ultralytics table), COCO-pretrained |
| Input | 1280 x 1280 x 3, back-lit RGB tile, scaled 0 to 1 |
| Tiling | 4,096-px line cut into tiles of 1,280 px with stride 1,024 (overlap 256 px, larger than the biggest fragment of 217 px). Four tiles across: x = 0, 1024, 2048, 2816 |
| Classes (6) | 0 flint, 1 amber, 2 green, 3 other\_colour, 4 csp, 5 other\_contaminant (metal, paper, plastic) |
| Detection grids | 160x160, 80x80 and 40x40 at strides 8, 16, 32: 33,600 candidate cells per tile |
| Mask head | 32 prototype masks at stride 4 (320 x 320 at this input size) |
| Output per fragment | Box, class scores, 32 mask coefficients, assembled into a binary mask |
| Loss | Box (CIoU plus DFL), class (BCE), mask (BCE on prototype-combined masks) |
| Role | Find every fragment, give a first class guess, give an exact mask for ejection and for G2 |

Explanation: stride 8 is the smallest grid, so a 34 px fragment spans about four cells, which is enough. Running at 1280 rather than 640 keeps small fragments from shrinking below 17 px.

### 5.2 G2: crop classifier (colour and CSP verifier)

| Item | Specification |
| --- | --- |
| Task | 6-class classification of one masked fragment |
| Backbone | EfficientNet-B0, ImageNet-pretrained (about 4.0M parameters after replacing the head, about 0.13 GMACs at 128 px) |
| Input | 6 x 128 x 128: back-lit RGB plus front-lit RGB, cropped on the G1 mask bounding box, background set to neutral grey, fragment centred and padded (never stretched) |
| First layer | Stem convolution widened from 3 to 6 input channels (timm in\_chans=6 handles the weight adaptation) |
| Head | Global average pool, 1,280 features, dropout 0.2, Linear 1,280 to 6 |
| Extra features (optional) | Median, 10th and 90th percentile of L\*, a\*, b\* inside the eroded mask; transmission ratio; edge sharpness; fed to a LightGBM model and averaged with the CNN |
| Output | Class probabilities, temperature-calibrated |

Explanation: G1 sees the fragment in context at moderate resolution. G2 sees it at close range with both lighting views, which is where amber versus green and CSP versus dark glass get decided. Eroding the mask by about 2 pixels removes the edge ring where refraction distorts colour.

```python
import cv2, numpy as np

def lab_features(bgr, mask):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    core = cv2.erode(mask.astype(np.uint8), k, iterations=2).astype(bool)
    if core.sum() < 20:
        core = mask.astype(bool)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[..., 0] *= 100 / 255      # OpenCV 8-bit L is 0..255
    lab[..., 1:] -= 128           # a and b are offset by 128
    px = lab[core]
    feats = []
    for c in range(3):
        feats += list(np.percentile(px[:, c], [10, 50, 90]))
    return np.array(feats, dtype=np.float32)
```

### 5.3 G3: pre-crush whole-item detector (area-scan)

| Item | Specification |
| --- | --- |
| Task | Object detection |
| Base model | YOLO11s detection (about 9.4M parameters, about 21.5 GFLOPs at 640), COCO-pretrained |
| Camera | 5 MP global-shutter area-scan (2448 x 2048), strobed, 1,200 mm field of view, about 0.49 mm per pixel |
| Blur check | Strobe 100 microseconds at 2.5 m/s moves the item 0.25 mm, about half a pixel |
| Input | 960 x 960 letterboxed (about 1.25 mm per pixel; a 150 mm item is 120 px) |
| Classes (9) | container\_clear, container\_amber, container\_green, borosilicate\_cookware, ceramic\_tableware, lead\_crystal\_stemware, drinking\_glass, flat\_glass\_mirror, other\_non\_glass |
| Detection grids | 120x120, 60x60, 30x30 (18,900 cells) |
| Decision rule | Reject if any non-container class has probability above a low threshold (start at 0.35), because letting Pyrex through costs far more than losing one bottle |

Explanation: borosilicate and ordinary clear glass look nearly the same, so the model relies on form (casserole handles, measuring cups, ribbed baking dishes), embossed logos and measurement marks. Expect lower recall here than for colour sorting and plan a manual pick station for uncertain items.

### 5.4 G4: phone classifier

| Item | Specification |
| --- | --- |
| Task | Single-image classification with an abstain option |
| Backbone | MobileNetV4-Conv-Small, ImageNet-pretrained (about 3.8M parameters including the ImageNet head) |
| Input | 224 x 224 x 3, centre crop inside an on-screen guide frame, ImageNet mean and standard deviation |
| Classes (8) | container\_clear, container\_amber, container\_green, borosilicate\_cookware, ceramic\_tableware, drinking\_glass\_or\_crystal, mirror\_or\_window, not\_glass |
| Head | Global pool, Linear 1,280 to 8 |
| Abstain rule | If the top probability is below 0.70, show 'not sure, take another photo or check local rules' |
| Export | ONNX, FP16 for WebGPU or INT8 for WebAssembly. Re-measure accuracy after quantisation. |

Explanation: the guide frame removes the need for a detector on the phone. The abstain rule matters for safety: a wrong 'accepted' on Pyrex contaminates a whole batch.

## 6. Complete workflow

1. **Fix the optics and calibrate.** Mount line-scan cameras with alternating back and front LED lighting. Every shift, capture a white reference and a dark frame, then apply flat-field correction (pixel value minus dark, divided by white minus dark). Convert calibrated linear RGB to CIE L*a*b\* using a D65 white point. Why: colour is the label, so uncorrected lamp ageing and dust will be read as colour change.
2. **Collect pure single-class batches.** Run each material alone at production speed (2.5 to 4.0 m/s). Include thin, thick, dirty, wet, labelled and curved pieces. Why: variation inside a class is what the model must learn to ignore.
3. **Segment and label automatically.** Threshold back-lit frames, split touching pieces, review with SAM assistance, then stamp each mask with the batch class.
4. **Compose dense frames.** Copy-paste masks onto real chute backgrounds with random overlap, dust and partial occlusion. Why: real chutes are crowded and pure-batch images are not.
5. **Split by session.** Put whole capture sessions in train, validation or test, never random frames. Why: neighbouring frames are almost identical, so random splits leak and inflate scores.
6. **Train G1** with the recipe in Section 7. Check per-class recall, not just overall mAP.
7. **Export crops and train G2.** Use G1 masks on training frames, crop with padding, add the 6-channel tensor, train the classifier and optional LightGBM. Why: a second look at close range fixes most amber-green and CSP-dark-glass confusions.
8. **Fuse decisions.** Use G2 when G1 confidence is under 0.60, or when G1 says CSP, amber or green with margin under 0.2. Reject (eject to the contaminant stream) on any CSP probability above a low threshold. Tune thresholds on a cost table, not on accuracy.
9. **Build and train G3 and G4** from the same item-level dataset: G3 uses boxes, G4 uses crops of the same items. Why: one labelling effort feeds two models.
10. **Export and deploy.** Convert G1 and G3 to TensorRT FP16 (batch of 4 tiles for G1), G4 to ONNX Runtime Web. Map each mask centroid to a valve index using the encoder and the transit-delay formula in Section 9.
11. **Monitor and retrain.** Log low-confidence fragments and operator re-labels, track the mean L*a*b\* of a flint reference tile to detect drift, and retrain monthly or when purity drifts.

## 7. Training recipes

**G1 dataset file (cullet.yaml)**

```yaml
path: datasets/cullet
train: images/train
val: images/val
test: images/test
names: {0: flint, 1: amber, 2: green, 3: other_colour, 4: csp, 5: other_contaminant}
```

**G1 training**

```python
from ultralytics import YOLO
model = YOLO('yolo11s-seg.pt')
model.train(data='cullet.yaml', imgsz=1280, epochs=150, batch=8, optimizer='AdamW',
            lr0=0.001, cos_lr=True, close_mosaic=15, patience=30,
            hsv_h=0.0, hsv_s=0.1, hsv_v=0.2, flipud=0.5, fliplr=0.5, degrees=0,
            scale=0.3, mosaic=0.8, copy_paste=0.3, mixup=0.0, overlap_mask=True, seed=0)
```

Explanation of the choices: hue shift is set to zero and saturation and brightness jitter are kept small because colour is the label; strong colour augmentation would turn amber into green. Vertical flips are safe because the camera looks straight down. Copy-paste helps with crowded scenes. Mosaic is switched off for the last 15 epochs so the model finishes on realistic frames. Use a smaller batch if memory is short, or batch=-1 for auto-sizing.

**G2 training**

```python
import timm, torch
m = timm.create_model('efficientnet_b0', pretrained=True, num_classes=6,
                      in_chans=6, drop_rate=0.2)
opt = torch.optim.AdamW(m.parameters(), lr=3e-4, weight_decay=1e-2)
# 30 epochs, batch 128, cosine schedule, label smoothing 0.1, mixed precision
# augment: flips, rot90, blur, noise, dust overlay, brightness +-10% (no hue change)
```

**G3 training**

```python
model = YOLO('yolo11s.pt')
model.train(data='items.yaml', imgsz=960, epochs=120, batch=16, cos_lr=True,
            close_mosaic=10, hsv_h=0.015, mosaic=1.0, fliplr=0.5, scale=0.5)
```

Here hue jitter is allowed because the class depends on shape and markings, not colour. Colour classes in G3 are checked by G1 and G2 after crushing.

**G4 training**

Fine-tune mobilenetv4\_conv\_small (timm) at 224 x 224, AdamW with lr 1e-3 on the new head and 2e-4 on the backbone, 25 epochs, batch 64, label smoothing 0.1, strong lighting and background augmentation (phones vary), then fit a temperature on the validation set so that the 0.70 abstain threshold is meaningful.

## 8. Evaluation and acceptance

- **Mask mAP50-95 and per-class recall at fixed precision.** Overall mAP hides the hard classes (CSP, amber versus green).
- **Mass-weighted purity and recovery.** Weight each fragment by area times a thickness estimate, not by count. A few large wrong pieces matter more than many small ones. The original document gives a flint-stream limit of 0.5% amber or green; use that as the colour acceptance target.
- **Confusion matrix focus.** Amber versus dark green, CSP versus dark thick glass, clear glass versus Pyrex.
- **Stress sets.** Dust-coated lens, wet fragments, paper-labelled pieces, high belt speed, lamp ageing.
- **Calibration (ECE) and latency (p99).** Confidence must mean something because the thresholds depend on it.
- **Always test on held-out sessions from a different day or batch.**

## 9. Deployment and ejection timing

Worked example with the geometry above:

- Camera 1.2 m upstream of the ejection lip, belt speed 3.0 m/s: transit time = 1.2 / 3.0 = 0.40 s. At 4.0 m/s it is 0.30 s.
- Budget at 3.0 m/s: tile fill up to about 0.125 s (1,280 lines), G1 batch of four tiles about 0.06 s target, mask post-processing about 0.01 s, PLC and valve scheduling about 0.02 s. This leaves roughly 0.18 s margin. Measure real latency on your hardware instead of relying on figures quoted elsewhere.
- Valve index = floor(x in mm / valve pitch in mm). Fire the valve under the mask centroid plus one neighbour on each side for wide pieces, with pulses of 2 to 5 ms at 0.6 to 0.8 MPa, as in the original document.
- Free-fall cullet accelerates, so use the measured discharge speed and fall height in the delay calculation, not the belt speed alone.

## 10. Points in the original document to double-check

- ZeroWaste-f contains cardboard, soft plastic, rigid plastic and metal, with no glass class, so its mAP values are not a glass benchmark.
- The MobileNetV4-Small top-1 figure of 78.2% looks too high; as far as I recall the Conv-Small variant reports about 73.8% on ImageNet. Verify on the timm model card.
- Latency and mAP figures in the architecture table have no cited benchmark and depend on hardware, so treat them as placeholders and measure your own.
- Borosilicate and lead-crystal detection from fragments in visible light is much weaker than the section implies; the whole-item stage is essential.

## 11. Sources

- Roboflow Universe cullet datasets: universe.roboflow.com/krkcam/cullet\_v2, /cullet\_white, /semantic\_try; stone and glass: universe.roboflow.com/groundedsam/stoneplus
- Kaggle Garbage Classification (mostafaabla/garbage-classification) and the enhanced version (huberthamelin)
- Hugging Face: dima806/garbage\_types\_image\_detection
- TACO: arxiv.org/abs/2003.06975 and github.com/pedropro/TACO
- Waste dataset review: github.com/AMRakibulHasan/waste-datasets-review
- Ultralytics models: pypi.org/project/ultralytics and huggingface.co/Ultralytics/YOLO26 and /YOLO11
- Glass-ceramic detection patents (visible versus UV behaviour): US 12,007,337 and US 12,254,614 (Saint-Gobain Isover)
- Glass colour sorting background: Bonifazi et al., hyperspectral colour classification of glass fragments (Sapienza IRIS); MSS Optical Glass ColorSort product notes on CSP and colour sorting
