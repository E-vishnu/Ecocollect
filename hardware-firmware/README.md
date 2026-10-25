# EcoCollect ESP32 + HX711 Load Cell Hardware Firmware

This directory contains the production-ready C++ firmware for an ESP32 microcontroller interfaced with an HX711 24-bit ADC amplifier and 4-wire strain gauge load cell (support for 20kg, 50kg, or 100kg scales).

---

## 🔌 Hardware Wiring & Pinout

| ESP32 Pin | HX711 Pin | Description |
|---|---|---|
| **GPIO 21** | **DT (DOUT)** | Serial Data Output from HX711 |
| **GPIO 22** | **SCK (CLK)** | Serial Clock Input to HX711 |
| **3V3 or 5V** | **VCC** | Power Supply (3.3V recommended for logic level) |
| **GND** | **GND** | Ground |
| **GPIO 19** | **Button 1** | Pushbutton to GND for manual zeroing/Tare |
| **GPIO 2** | **LED** | Onboard LED indicator (Blinks on telemetry transmission) |

### Load Cell (Wheatstone Bridge) to HX711:
- **Red wire**: `E+` (Excitation Positive)
- **Black wire**: `E-` (Excitation Negative)
- **White wire**: `A-` (Signal Negative)
- **Green wire**: `A+` (Signal Positive)

---

## 📡 REST Telemetry API Specification

The ESP32 communicates with the EcoCollect backend via HTTP POST.

### Endpoint:
`POST /api/iot/weight-reading` (or legacy alias `POST /api/iot/weight`)

### Headers:
```http
Content-Type: application/json
X-Device-Key: <OPTIONAL_DEVICE_API_KEY>
```

### JSON Request Payload:
```json
{
  "scaleId": "ESP32-HX711-UNIT-01",
  "weightKg": 4.85,
  "rawADC": 11048,
  "batteryVoltage": 3.82,
  "wifiRssi": -65,
  "activePickupCode": "ECO-123456",
  "packetId": "pkt_1729780000_001"
}
```

#### Field Definitions:
- `scaleId` *(String, Required)*: Registered scale identifier (e.g., `ESP32-HX711-UNIT-01`).
- `weightKg` *(Float, Required)*: Calibrated net weight in kg (`0.00` to `500.00`).
- `rawADC` *(Integer, Optional)*: Raw 24-bit digitized ADC value from the HX711 chip.
- `batteryVoltage` *(Float, Optional)*: LiPo battery voltage in Volts (e.g., `3.82`).
- `wifiRssi` *(Integer, Optional)*: Wi-Fi signal strength in dBm (e.g., `-65`).
- `activePickupCode` *(String, Optional)*: Code of active pickup currently being weighed (e.g., `ECO-123456`).
- `packetId` *(String, Optional)*: Unique frame ID for replay and duplicate prevention.

### Server Response Format:
```json
{
  "success": true,
  "message": "ESP32 HX711 telemetry recorded successfully.",
  "scaleId": "ESP32-HX711-UNIT-01",
  "receivedWeightKg": 4.85,
  "source": "hardware_esp32",
  "isSimulated": false,
  "timestamp": "2026-10-24T16:20:00.000Z",
  "data": {
    "logId": "6537...",
    "scaleId": "ESP32-HX711-UNIT-01",
    "weightKg": 4.85,
    "rawADC": 11048,
    "batteryVoltage": 3.82,
    "wifiRssi": -65,
    "linkedPickupId": "6537...",
    "linkedPickupCode": "ECO-123456"
  }
}
```

---

## 🛠️ Arduino IDE Setup & Flashing

1. **Install ESP32 Board Core**:
   - In Arduino IDE Preferences -> Additional Board Manager URLs, add:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Install **esp32** from Tools -> Board -> Boards Manager.

2. **Install Required Libraries**:
   - `HX711` by *Bogdan Necula* (Version 0.7.5 or later)
   - `ArduinoJson` by *Benoit Blanchon* (Version 6.x or 7.x)

3. **Configure Network & Endpoint**:
   - Open `ecocollect_esp32_hx711.ino`.
   - Update `WIFI_SSID` and `WIFI_PASSWORD`.
   - Update `BACKEND_ENDPOINT` with your computer's LAN IP or Cloud Run host:
     `http://192.168.1.100:5000/api/iot/weight-reading`

4. **Calibration**:
   - Upload sketch with known calibration factor.
   - Place a known 1.00 kg weight on the scale plate.
   - If reading is too high/low, adjust `CALIBRATION_FACTOR` in line 42.

5. **Upload**:
   - Connect ESP32 via USB cable.
   - Select Board: **ESP32 Dev Module**.
   - Select the correct COM/Serial port and click **Upload**.
