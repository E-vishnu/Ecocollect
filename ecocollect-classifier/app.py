"""
EcoCollect MobileNetV2 Waste Classifier Microservice
FastAPI endpoint serving fine-tuned MobileNetV2 on 4 waste classes:
1. biodegradable (organic kitchen food scraps, yard waste)
2. dry_recyclable (paper, cardboard, metal cans, glass)
3. plastic (PET bottles, HDPE jugs, plastic bags)
4. e_waste (circuit boards, cables, lithium batteries, dead electronics)
"""

import io
import os
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict

app = FastAPI(
    title="EcoCollect AI Waste Classifier",
    description="Deep Learning MobileNetV2 model inference for doorstep waste stream validation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLASSES = ["biodegradable", "dry_recyclable", "plastic", "e_waste"]

# 1. Image preprocessing transformation matching MobileNetV2 input expectations
inference_transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# 2. Model Loader with fallback to pretrained backbone with custom 4-class classification head
def load_model():
    model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    # Replace the final classification linear layer for 4 waste categories
    in_features = model.classifier[1].in_features
    model.classifier[1] = nn.Sequential(
        nn.Dropout(p=0.2),
        nn.Linear(in_features, len(CLASSES))
    )
    
    # Load fine-tuned weights if available on disk
    weights_path = os.getenv("MODEL_WEIGHTS_PATH", "ecocollect_mobilenet_v2.pth")
    if os.path.exists(weights_path):
        state_dict = torch.load(weights_path, map_location=torch.device("cpu"))
        model.load_state_dict(state_dict)
        print(f" Loaded fine-tuned model weights from {weights_path}")
    else:
        print(" Using initialized MobileNetV2 model (Run train.py to produce custom weights).")
        
    model.eval()
    return model

model = load_model()

class ClassificationResponse(BaseModel):
    predicted_class: str
    confidence: float
    probabilities: Dict[str, float]
    mismatch_flag: bool = False
    status: str = "success"

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "EcoCollect MobileNetV2 Classifier",
        "classes": CLASSES
    }

@app.post("/classify", response_model=ClassificationResponse)
async def classify_waste_image(
    file: UploadFile = File(...),
    declared_category: str = None
):
    """
    Accepts doorstep waste photo upload, preprocesses RGB tensor,
    and calculates softmax class probabilities across 4 categories.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be a valid image format.")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        # Preprocess and expand batch dimension [1, 3, 224, 224]
        tensor = inference_transform(image).unsqueeze(0)

        with torch.no_grad():
            outputs = model(tensor)
            probabilities_tensor = torch.nn.functional.softmax(outputs[0], dim=0)
            
            top_prob, top_idx = torch.max(probabilities_tensor, dim=0)
            predicted_class = CLASSES[top_idx.item()]
            confidence = float(top_prob.item())

            probs_dict = {
                cls_name: float(probabilities_tensor[i].item())
                for i, cls_name in enumerate(CLASSES)
            }

        # Check for category discrepancy
        mismatch = False
        if declared_category and declared_category in CLASSES:
            mismatch = (predicted_class != declared_category)

        return ClassificationResponse(
            predicted_class=predicted_class,
            confidence=round(confidence, 4),
            probabilities={k: round(v, 4) for k, v in probs_dict.items()},
            mismatch_flag=mismatch,
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
