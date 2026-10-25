# EcoCollect: On-Demand IoT-Based Smart Waste Collection System

EcoCollect is a full-stack, on-demand municipal smart waste collection platform that pairs doorstep collections with ESP32 IoT load cell weight telemetry, on-device MobileNetV2 CNN waste classification, and a dynamic pricing & recyclable buyback formula.

---

## 📁 Repository Layout
```
├── ecocollect-backend/          # Node.js + Express + MongoDB REST API & IoT Gateway
│   ├── controllers/             # Auth, Pickups, ESP32 IoT scale, and Admin controllers
│   ├── middleware/              # JWT verification & Role-Based Access Control
│   ├── models/                  # Mongoose Schemas (User, Pickup, WeightLog)
│   ├── utils/pricingEngine.js   # Dynamic pricing & recyclable buyback formula
│   ├── seed.js                  # Database seed script with test accounts
│   ├── server.js                # Express entry point
│   └── package.json
│
├── ecocollect-resident-app/     # React Native (Expo) Resident Mobile App
│   ├── src/config/api.ts        # Backend LAN IP endpoint configuration
│   ├── src/screens/             # Auth (Signup/Login), Booking, Live GPS Tracking, Bill/Payout
│   ├── App.tsx                  # Expo app entry point & tab navigation
│   └── package.json
│
├── ecocollect-agent-app/        # React Native (Expo) Field Collection Agent App
│   ├── src/config/api.ts        # Backend LAN IP endpoint configuration
│   ├── src/screens/             # Agent Auth, Route Pickups, IoT Weight, Photo Capture, Confirm
│   ├── App.tsx                  # Expo app entry point & collection workflow
│   └── package.json
│
├── ecocollect-classifier/       # MobileNetV2 Waste Stream CNN Microservice (Python FastAPI)
│   ├── app.py                   # REST inference endpoint (/classify, /health)
│   ├── train.py                 # PyTorch transfer learning script on 4 waste classes
│   ├── requirements.txt         # Python dependencies (FastAPI, PyTorch, TorchVision, Pillow)
│   └── Dockerfile
│
├── hardware-firmware/           # ESP32 + HX711 IoT Load Cell Scale Firmware
│   ├── ecocollect_esp32_hx711.ino # Arduino C++ sketch (Wi-Fi + HX711 REST POST to /api/iot/weight-reading)
│   └── wiring_diagram.md        # Circuit schematic, pin mappings & digital tare setup
│
├── src/                         # Full-Stack Interactive Web Simulation & Admin Portal
│   ├── components/              # Admin Dashboard, Resident Portal, Agent Terminal, Dual Simulator
│   ├── context/                 # State management for IoT scale, radar tracking & pricing ledger
│   └── utils/                   # Pricing and calculation utilities
│
└── README.md                    # System documentation and local deployment guide
```

---

## 🔑 Demo Login Credentials
Run the seed script in `ecocollect-backend/` (`npm run seed`) to populate these test accounts:

| Role | Email | Password | Details |
|------|-------|----------|---------|
| **Municipal Admin** | `admin@ecocollect.in` | `password123` | Dr. Aruna Shenoy (Ward 82 Audit HQ) |
| **Field Agent** | `rahul.agent@ecocollect.in` | `password123` | Rahul Varma (EV Cargo Trike `KA-01-EQ-1002`) |
| **Field Agent** | `suresh.agent@ecocollect.in` | `password123` | Suresh Gowda (EV Cargo Van `KA-03-EV-4421`) |
| **Resident** | `priya@gmail.com` | `password123` | Priya Sharma (Bellandur Ward) |
| **Resident** | `ananya@gmail.com` | `password123` | Ananya Deshmukh (Whitefield Ward) |
| **Resident** | `vikram@gmail.com` | `password123` | Vikram Mehta (Koramangala Ward) |

*Any new user can also register directly via the Resident App signup screen.*

---

## 🧮 Dynamic Pricing & Buyback Engine

The EcoCollect pricing engine enforces municipal waste stream economics:

### 1. Base Processing Cost ($P$)
$$P = \sum (W_i \times R_i \times S_i) + F$$
- $W_i$: Net weight in kilograms recorded from the ESP32 HX711 load cell.
- $R_i$: Base municipal processing rate per kg (e.g. Biodegradable: ₹1.5/kg, Plastic: ₹3.5/kg, E-Waste: ₹8.0/kg).
- $S_i$: **Segregation Compliance Factor**:
  - $S_i = 0.80$ (20% discount rewarded for clean, pre-sorted streams).
  - $S_i = 1.50$ (50% penalty levy for contaminated or mixed waste).
- $F$: Fixed handling surcharge ($F = 0$ for routine household collections, $F > 0$ for bulk or off-schedule requests).

### 2. Resident Recyclable Buyback Value ($R_p$)
$$R_p = \sum (W_j \times V_j)$$
- $W_j$: Weight of recyclable material $j$.
- $V_j$: Market buyback resale rate (Plastics: ₹18/kg, Dry/Paper/Scrap: ₹12/kg, E-Waste: ₹45/kg).

### 3. Net Settlement
$$\text{Net} = R_p - P$$
- If $\text{Net} > 0$: **Instant UPI Cashback Payout** disbursed to resident.
- If $\text{Net} = 0$: **100% Free Routine Municipal Doorstep Collection**.
- If $\text{Net} < 0$: Nominal municipal processing fee payable by resident.

---

## 🚀 Quick Start Guide

### 1. Backend REST API (`ecocollect-backend`)
```bash
cd ecocollect-backend
npm install

# Configure .env (copy from .env.example)
cp .env.example .env

# Seed sample users and historical pickups
npm run seed

# Launch Express server on port 5000
npm run dev
```

### 2. AI Classifier Microservice (`ecocollect-classifier`)
```bash
cd ecocollect-classifier
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start FastAPI server on port 8000
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# (Optional) Fine-tune MobileNetV2 on 4 classes:
python train.py --data_dir ./data --epochs 10
```

### 3. Resident & Agent Mobile Apps (`Expo Go`)
```bash
# Resident App:
cd ecocollect-resident-app
npm install
# In src/config/api.ts, set BACKEND_BASE_URL to your machine's LAN IP (e.g., http://192.168.1.100:5000)
npx expo start

# Agent App:
cd ecocollect-agent-app
npm install
# In src/config/api.ts, set BACKEND_BASE_URL to your machine's LAN IP
npx expo start
```
Scan the QR code in your terminal using the **Expo Go** app on iOS or Android.

### 4. ESP32 HX711 Firmware (`hardware-firmware`)
1. Open `hardware-firmware/ecocollect_esp32_hx711.ino` in the Arduino IDE.
2. Install libraries: `HX711` by Bogdan Necula and `ArduinoJson` by Benoit Blanchon.
3. Set your Wi-Fi SSID, Password, and Backend IP in lines 25–29.
4. Connect ESP32 via USB and upload. Open Serial Monitor at `115200 baud`.

---

## 🧪 Interactive Web Prototype Sandbox
This web application hosts a unified live testing environment:
1. **Resident Portal**: Sign up, book doorstep pickups, track EV cargo trikes on the live radar map, view dynamic price calculations, and simulate Razorpay/UPI cashback settlements.
2. **Field Agent Terminal**: Inspect assigned routes, execute digital tare on the ESP32 load cell, capture waste photographs, trigger MobileNet CNN inferences, and submit verification logs.
3. **Admin Dashboard**: Audit CNN classification mismatches, override categorization, review municipal fleet battery telemetry, and manage users.
4. **Codebase & Architecture Explorer**: Inspect full source code and copy files directly.
