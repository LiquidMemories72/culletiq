"""
Export trained G4 MobileNetV4 to ONNX and save stats JSON.
"""
import json
from pathlib import Path
import torch
import timm

WORKSPACE = Path(r"D:\PIYUSH\dtu\aws kack")
WEIGHTS_PATH = WORKSPACE / "public" / "models" / "g4_mobilenetv4_best.pt"
ONNX_PATH = WORKSPACE / "public" / "models" / "g4_mobilenetv4.onnx"
STATS_PATH = WORKSPACE / "public" / "models" / "g4_stats.json"

CLASSES = [
    'borosilicate_cookware',
    'ceramic_tableware',
    'container_amber',
    'container_clear',
    'container_green',
    'drinking_glass_or_crystal',
    'mirror_or_window',
    'not_glass'
]

def export_g4():
    print(f">> Loading G4 weights from {WEIGHTS_PATH}")
    model = timm.create_model("mobilenetv4_conv_small", pretrained=False, num_classes=len(CLASSES))
    state_dict = torch.load(WEIGHTS_PATH, map_location="cpu")
    model.load_state_dict(state_dict)
    model.eval()

    print(">> Exporting to ONNX...")
    dummy_input = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy_input,
        str(ONNX_PATH),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=17
    )
    print(f"[SUCCESS] Exported G4 ONNX to {ONNX_PATH}")

    g4_summary = {
        "model_id": "G4",
        "name": "Citizen Phone Classifier",
        "architecture": "MobileNetV4-Conv-Small",
        "parameters_m": 3.8,
        "input_resolution": "224x224",
        "classes": CLASSES,
        "peak_val_accuracy": 0.8154,
        "abstain_threshold": 0.70,
        "weights_path": str(WEIGHTS_PATH),
        "onnx_path": str(ONNX_PATH)
    }
    with open(STATS_PATH, "w") as f:
        json.dump(g4_summary, f, indent=2)
    print(f"[SUCCESS] Saved G4 stats to {STATS_PATH}")

if __name__ == "__main__":
    export_g4()
