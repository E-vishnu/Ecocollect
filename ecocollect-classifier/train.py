"""
EcoCollect MobileNetV2 Fine-Tuning Pipeline
Trains a CNN classifier on 4 waste classes:
[biodegradable, dry_recyclable, plastic, e_waste]

Usage:
  python train.py --data_dir ./data --epochs 10 --batch_size 32 --lr 0.0001
"""

import os
import argparse
import time
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim import lr_scheduler
from torchvision import datasets, models, transforms
from torch.utils.data import DataLoader

def parse_args():
    parser = argparse.ArgumentParser(description="Fine-tune MobileNetV2 for EcoCollect Waste Classification")
    parser.add_argument("--data_dir", type=str, default="./data", help="Root directory with train/ and val/ folders")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=32, help="Batch size for training")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate for Adam optimizer")
    parser.add_argument("--output_model", type=str, default="ecocollect_mobilenet_v2.pth", help="Path to save weights")
    return parser.parse_args()

def build_data_transforms():
    return {
        "train": transforms.Compose([
            transforms.RandomResizedCrop(224),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ]),
        "val": transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    }

def train_model(model, criterion, optimizer, scheduler, dataloaders, dataset_sizes, device, num_epochs=10):
    since = time.time()
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    for epoch in range(num_epochs):
        print(f"Epoch {epoch + 1}/{num_epochs}")
        print("-" * 20)

        for phase in ["train", "val"]:
            if phase == "train":
                model.train()
            else:
                model.eval()

            running_loss = 0.0
            running_corrects = 0

            # Iterate over data batches
            for inputs, labels in dataloaders[phase]:
                inputs = inputs.to(device)
                labels = labels.to(device)

                optimizer.zero_grad()

                # Forward pass
                with torch.set_grad_enabled(phase == "train"):
                    outputs = model(inputs)
                    _, preds = torch.max(outputs, 1)
                    loss = criterion(outputs, labels)

                    # Backward pass & optimize in training phase
                    if phase == "train":
                        loss.backward()
                        optimizer.step()

                running_loss += loss.item() * inputs.size(0)
                running_corrects += torch.sum(preds == labels.data)

            if phase == "train":
                scheduler.step()

            epoch_loss = running_loss / dataset_sizes[phase]
            epoch_acc = running_corrects.double() / dataset_sizes[phase]

            print(f"{phase.capitalize()} Loss: {epoch_loss:.4f} Acc: {epoch_acc:.4f}")

            # Deep copy best model
            if phase == "val" and epoch_acc > best_acc:
                best_acc = epoch_acc
                best_model_wts = copy.deepcopy(model.state_dict())

        print()

    time_elapsed = time.time() - since
    print(f"Training complete in {time_elapsed // 60:.0f}m {time_elapsed % 60:.0f}s")
    print(f"Best Val Accuracy: {best_acc:.4f}")

    model.load_state_dict(best_model_wts)
    return model

def main():
    args = parse_args()
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using compute device: {device}")

    # Check if dataset directory exists, otherwise create dummy layout sample
    if not os.path.exists(os.path.join(args.data_dir, "train")):
        print(f"Dataset path '{args.data_dir}' not detected.")
        print("To train, create folders: data/train/[biodegradable, dry_recyclable, plastic, e_waste]")
        print("Sample training pipeline script initialized.")
        return

    data_transforms = build_data_transforms()
    image_datasets = {
        x: datasets.ImageFolder(os.path.join(args.data_dir, x), data_transforms[x])
        for x in ["train", "val"]
    }
    dataloaders = {
        x: DataLoader(image_datasets[x], batch_size=args.batch_size, shuffle=True, num_workers=2)
        for x in ["train", "val"]
    }
    dataset_sizes = {x: len(image_datasets[x]) for x in ["train", "val"]}
    class_names = image_datasets["train"].classes
    print(f"Detected {len(class_names)} classes: {class_names}")

    # 1. Load Pretrained MobileNetV2
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)

    # 2. Freeze initial feature extraction layers for transfer learning
    for param in model.features.parameters():
        param.requires_grad = False

    # 3. Modify final classification head
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, len(class_names))
    )
    model = model.to(device)

    # 4. Loss Function and Optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.classifier.parameters(), lr=args.lr)
    exp_lr_scheduler = lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    # 5. Execute Training
    model = train_model(
        model, criterion, optimizer, exp_lr_scheduler,
        dataloaders, dataset_sizes, device, num_epochs=args.epochs
    )

    # 6. Save Fine-Tuned Weights
    torch.save(model.state_dict(), args.output_model)
    print(f"Saved fine-tuned model checkpoint to: {args.output_model}")

if __name__ == "__main__":
    main()
