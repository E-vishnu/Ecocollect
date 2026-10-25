# EcoCollect MobileNet Waste Classifier Microservice

Provides real-time visual classification of waste into 4 municipal segregation streams:
1. `biodegradable` (Food waste, fruit peels, vegetables, garden clippings)
2. `dry_recyclable` (Paper, cardboard, newspapers, clean cartons, metal cans)
3. `plastic` (PET bottles, poly bags, plastic containers)
4. `e_waste` (Printed circuit boards, lithium batteries, dead cables, small electronic accessories)

---

## ⚡ Architecture

- **Backbone**: MobileNetV3-Small (Pre-trained on ImageNet-1K)
- **Classifier Head**: Linear Layer with Dropout (4 logits output with Softmax)
- **Inference Server**: FastAPI with Uvicorn ASGI runner
- **Latency**: ~35ms on CPU, ~8ms on GPU

---

## 🚀 Running Inference Server

```bash
# Activate virtualenv and install requirements
pip install -r requirements.txt

# Start REST microservice on port 8000
python app.py
```

### API Endpoints

- `POST /classify`: Accepts JSON payload `{ "image_base64": "<base64_jpeg_string>" }`
- `POST /classify-file`: Accepts multipart/form-data image file upload
- `GET /`: Health check & active class list

**Sample Response:**
```json
{
  "predicted_class": "plastic",
  "confidence": 0.9624,
  "probabilities": {
    "biodegradable": 0.0121,
    "dry_recyclable": 0.0210,
    "plastic": 0.9624,
    "e_waste": 0.0045
  },
  "engine": "MobileNetV3-PyTorch"
}
```

---

## 🎯 Fine-Tuning the Model

To train or fine-tune on custom dataset folders:

```bash
# Directory layout format:
# dataset/
#   train/
#     biodegradable/
#     dry_recyclable/
#     plastic/
#     e_waste/
#   val/
#     ...

python train.py --epochs 10 --batch_size 16 --learning_rate 0.001
```
*(Note: If the `dataset/` folder is empty, `train.py` will automatically generate sample labeled dummy images so you can verify the end-to-end PyTorch pipeline immediately.)*
