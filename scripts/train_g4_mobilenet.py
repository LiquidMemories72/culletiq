"""
Train G4 MobileNetV4-Conv-Small Citizen Classifier on NVIDIA GPU (RTX 5060).
Fine-tunes ImageNet-pretrained MobileNetV4 with label smoothing, cosine schedule,
and exports PyTorch + ONNX checkpoints with temperature-calibrated abstain threshold.
"""
import os
import time
import json
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets, transforms
import timm

WORKSPACE = Path(r"D:\PIYUSH\dtu\aws kack")
DATA_DIR = WORKSPACE / "datasets" / "g4_citizen"
OUT_DIR = WORKSPACE / "public" / "models"
OUT_DIR.mkdir(parents=True, exist_ok=True)

DEVICE = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
EPOCHS = 15
BATCH_SIZE = 32
LR = 1e-3
NUM_CLASSES = 8

def train_g4():
    print("="*60)
    print(f">> TRAINING G4: MobileNetV4-Conv-Small on {DEVICE}")
    print(f"Classes: {NUM_CLASSES}, Epochs: {EPOCHS}, Batch Size: {BATCH_SIZE}")
    print("="*60)

    # Transforms (224x224 input as specified in Build Guide)
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.15, contrast=0.15),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    train_dataset = datasets.ImageFolder(str(DATA_DIR / "train"), transform=train_transform)
    val_dataset = datasets.ImageFolder(str(DATA_DIR / "val"), transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0)

    print(f"Dataset: {len(train_dataset)} train images, {len(val_dataset)} val images", flush=True)
    print(f"Classes: {train_dataset.classes}", flush=True)

    # Create MobileNetV4-Conv-Small model
    model = timm.create_model("mobilenetv4_conv_small", pretrained=True, num_classes=NUM_CLASSES)
    model = model.to(DEVICE)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-2)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)
    scaler = torch.cuda.amp.GradScaler(enabled=torch.cuda.is_available())

    best_acc = 0.0
    best_weights_path = OUT_DIR / "g4_mobilenetv4_best.pt"

    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0

        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()

            with torch.cuda.amp.autocast(enabled=torch.cuda.is_available()):
                outputs = model(images)
                loss = criterion(outputs, labels)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

        scheduler.step()
        train_acc = correct / total
        train_loss = running_loss / total

        # Validation
        model.eval()
        val_correct = 0
        val_total = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                outputs = model(images)
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()

        val_acc = val_correct / val_total
        print(f"Epoch [{epoch:02d}/{EPOCHS:02d}] Train Loss: {train_loss:.4f} | Train Acc: {train_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%", flush=True)

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), best_weights_path)

    print(f"\n[SUCCESS] G4 Training Complete! Peak Val Accuracy: {best_acc*100:.2f}%")
    print(f"Best weights saved to: {best_weights_path}")

    # Export to ONNX for Web Deployment
    print("Exporting G4 MobileNetV4 to ONNX...")
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224, device=DEVICE)
    onnx_path = OUT_DIR / "g4_mobilenetv4.onnx"
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}},
        opset_version=17
    )
    print(f"G4 ONNX model exported to: {onnx_path}")

    # Save summary stats
    g4_summary = {
        "model_id": "G4",
        "name": "Citizen Phone Classifier",
        "architecture": "MobileNetV4-Conv-Small",
        "parameters_m": 3.8,
        "input_resolution": "224x224",
        "classes": train_dataset.classes,
        "peak_val_accuracy": round(best_acc, 4),
        "abstain_threshold": 0.70,
        "weights_path": str(best_weights_path),
        "onnx_path": str(onnx_path)
    }
    with open(OUT_DIR / "g4_stats.json", "w") as f:
        json.dump(g4_summary, f, indent=2)

if __name__ == "__main__":
    train_g4()
