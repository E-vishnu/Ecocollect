# EcoCollect ESP32 + HX711 Load Cell Hardware Guide

## 1. Hardware Bill of Materials (BOM)
1. **ESP32 Dev Module** (ESP-WROOM-32 30-pin or 38-pin board)
2. **HX711 24-bit ADC Load Cell Amplifier Module**
3. **4-Wire Load Cell** (e.g. 50kg, 100kg, or 200kg Shear Beam / Platform Cell)
4. **Push Button** (for physical hardware Zero/Tare)
5. **3.7V 18650 Li-ion Battery + TP4056 USB Charger** (for portable field weighing on agent EV trike)
6. **Connecting Wires and Breadboard / Perfboard**

---

## 2. Pin Wiring Table

### HX711 Amplifier to ESP32:
| HX711 Pin | ESP32 GPIO | Description |
|-----------|------------|-------------|
| **VCC**   | `3.3V` / `5V` | Regulated DC Power |
| **GND**   | `GND`      | Ground |
| **DT** (Data) | `GPIO 21` | Serial Data Input |
| **SCK** (Clock) | `GPIO 22` | Clock Signal Output |

### Load Cell (Wheatstone Bridge) to HX711:
| Load Cell Wire Color | HX711 Terminal | Signal |
|----------------------|----------------|--------|
| **Red**              | `E+` (Excitation +) | Positive Power |
| **Black**            | `E-` (Excitation -) | Negative Power / Ground |
| **White**            | `A-` (Signal -)     | Negative Differential Signal |
| **Green**            | `A+` (Signal +)     | Positive Differential Signal |

### Hardware Tare Button & Status LED:
| Component | Pin / GPIO | Wiring Note |
|-----------|------------|-------------|
| **Tare Push-Button** | `GPIO 19` & `GND` | Configured with `INPUT_PULLUP` |
| **Built-in LED**     | `GPIO 2`          | Transmit confirmation blink |

---

## 3. Calibration Instructions
1. Flash `ecocollect_esp32_hx711.ino` with `CALIBRATION_FACTOR = 1.0`.
2. Open Serial Monitor at `115200 baud`.
3. Allow scale to tare at zero load.
4. Place a known calibration weight (e.g. standard 5.0 kg barbell plate).
5. Calculate your calibration factor:
   $$\text{CALIBRATION\_FACTOR} = \frac{\text{Raw Reading}}{\text{Known Weight in kg}}$$
6. Update `CALIBRATION_FACTOR` in line 42 of `ecocollect_esp32_hx711.ino` and re-flash.
