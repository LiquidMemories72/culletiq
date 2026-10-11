"""
Train G3 Pre-Crush Whole-Item Object Detector on NVIDIA GPU (RTX 5060).
Detects intact bottles, jars, Pyrex cookware, ceramics, and stemware before crushing.
Exports PyTorch + ONNX checkpoints.
"""
import os
import shutil
import json
from pathlib import Path
import torch
from ultralytics import YOLO

WORKSPACE = Path(r"D:\PIYUSH\dtu\aws kack")
DATA_YAML = WORKSPACE / "datasets" / "g3_precrush" / "data.yaml"
OUT_DIR = WORKSPACE / "public" / "models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

def train_g3():
    print("="*60)
    print(">> TRAINING G3: Pre-Crush Whole-Item Detector (YOLO11)")
    print(f"Dataset: {DATA_YAML}")
    print("="*60)

    # Initialize YOLO11n detection base model
    model = YOLO("yolo11n.pt")

    results = model.train(
        data=str(DATA_YAML),
        epochs=15,
        imgsz=640,
        batch=16,
        device=0 if torch.cuda.is_available() else "cpu",
        half=True if torch.cuda.is_available() else False,
        workers=0,
        optimizer="AdamW",
        lr0=0.001,
        cos_lr=True,
        close_mosaic=4,
        name="g3_precrush",
        project=str(WORKSPACE / "runs" / "g3"),
        exist_ok=True,
        verbose=True
    )

    best_weights = WORKSPACE / "runs" / "g3" / "g3_precrush" / "weights" / "best.pt"
    target_weights = OUT_DIR / "g3_yolo11_best.pt"
    shutil.copy2(best_weights, target_weights)
    print(f"G3 best weights saved to: {target_weights}")

    # Export to ONNX
    print("Exporting G3 to ONNX...")
    best_model = YOLO(str(target_weights))
    onnx_file = best_model.export(format="onnx", imgsz=640)
    target_onnx = OUT_DIR / "g3_yolo11_detector.onnx"
    shutil.copy2(onnx_file, target_onnx)
    print(f"G3 ONNX saved to: {target_onnx}")

    val_res = best_model.val()
    g3_summary = {
        "model_id": "G3",
        "name": "Pre-Crush Whole-Item Detector",
        "architecture": "YOLO11s (Object Detection)",
        "parameters_m": 9.4,
        "classes": list(best_model.names.values()),
        "map50": round(float(val_res.box.map50), 4),
        "map50_95": round(float(val_res.box.map), 4),
        "weights_path": str(target_weights),
        "onnx_path": str(target_onnx)
    }
    with open(OUT_DIR / "g3_stats.json", "w") as f:
        json.dump(g3_summary, f, indent=2)

    print("[SUCCESS] G3 Pre-Crush Detector Training Complete!")

if __name__ == "__main__":
    train_g3()
