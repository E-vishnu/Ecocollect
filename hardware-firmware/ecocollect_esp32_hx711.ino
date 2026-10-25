/**
 * EcoCollect IoT Smart Weight Scale Firmware
 * Platform: ESP32 Dev Module + HX711 24-bit ADC Load Cell Amplifier
 * 
 * Hardware Connections:
 *   HX711 DT (Data)  -> ESP32 GPIO 21
 *   HX711 SCK (Clock) -> ESP32 GPIO 22
 *   HX711 VCC        -> 3.3V / 5V
 *   HX711 GND        -> GND
 *   Tare Button      -> ESP32 GPIO 19 (Active LOW with internal pull-up)
 *   Status LED (Blue)-> ESP32 GPIO 2 (Blinks on telemetry transmit)
 * 
 * Functions:
 *   - Connects to 2.4GHz Wi-Fi
 *   - Measures weight continuously with moving average digital filtering
 *   - Supports hardware push-button tare
 *   - Posts JSON telemetry payload to EcoCollect REST backend via HTTP POST
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "HX711.h"

// --- Wi-Fi Configuration ---
const char* WIFI_SSID = "EcoCollect_Depot_WiFi";
const char* WIFI_PASSWORD = "MunicipalWasteNetwork2026";

// --- EcoCollect REST Backend API Endpoint ---
const char* BACKEND_ENDPOINT = "http://192.168.1.100:5000/api/iot/weight-reading";
const char* DEVICE_API_KEY   = ""; // Set if IOT_DEVICE_KEY authentication is enabled on server

// --- Hardware Pin Definitions ---
const int LOADCELL_DOUT_PIN = 21;
const int LOADCELL_SCK_PIN  = 22;
const int TARE_BUTTON_PIN   = 19;
const int STATUS_LED_PIN    = 2;
const char* SCALE_ID        = "ESP32-HX711-UNIT-01";

// --- HX711 Calibration Factor ---
// Adjust according to your specific load cell rating (e.g. 50kg / 100kg bar cell)
float CALIBRATION_FACTOR = 2280.0f; 

HX711 scale;

unsigned long lastTransmitTime = 0;
const unsigned long TRANSMIT_INTERVAL_MS = 5000; // Transmit every 5 seconds if weight changed

void connectToWiFi() {
  Serial.print("[WiFi] Connecting to: ");
  Serial.println(WIFI_SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] RSSI Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[WiFi] Failed to connect. Running in offline measurement mode.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("==================================================");
  Serial.println("   EcoCollect ESP32 HX711 IoT Load Cell Scale    ");
  Serial.println("   Municipal Waste Stream Telemetry Unit v2.4    ");
  Serial.println("==================================================");

  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(TARE_BUTTON_PIN, INPUT_PULLUP);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize HX711 Amplifier
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  
  Serial.println("[HX711] Initializing scale...");
  if (scale.is_ready()) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare(); // Zero the scale on startup
    Serial.println("[HX711] Scale zeroed (Tare complete). Ready for measurements.");
  } else {
    Serial.println("[HX711] ERROR: HX711 not detected. Check wiring (DOUT/SCK).");
  }

  // Connect Wi-Fi
  connectToWiFi();
}

void transmitWeightTelemetry(float weightKg, long rawAdc) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Wi-Fi not connected. Skipping telemetry upload.");
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  if (strlen(DEVICE_API_KEY) > 0) {
    http.addHeader("X-Device-Key", DEVICE_API_KEY);
  }

  // Create JSON Payload
  StaticJsonDocument<256> doc;
  doc["scaleId"] = SCALE_ID;
  doc["weightKg"] = serialized(String(weightKg, 2));
  doc["rawADC"] = rawAdc;
  doc["batteryVoltage"] = 3.82; // Simulated analog battery monitor
  doc["wifiRssi"] = WiFi.RSSI();

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.print("[HTTP] Transmitting payload to ");
  Serial.println(BACKEND_ENDPOINT);
  Serial.print("[Payload] ");
  Serial.println(requestBody);

  // Visual LED Flash
  digitalWrite(STATUS_LED_PIN, LOW);
  int httpResponseCode = http.POST(requestBody);
  digitalWrite(STATUS_LED_PIN, HIGH);

  if (httpResponseCode > 0) {
    Serial.print("[HTTP] Success response code: ");
    Serial.println(httpResponseCode);
    String response = http.getString();
    Serial.print("[HTTP] Server Response: ");
    Serial.println(response);
  } else {
    Serial.print("[HTTP] POST failed. Error: ");
    Serial.println(http.errorToString(httpResponseCode).c_str());
  }

  http.end();
}

void loop() {
  // Check for hardware Tare push-button press (Active LOW)
  if (digitalRead(TARE_BUTTON_PIN) == LOW) {
    Serial.println("[TARE] Tare button pressed! Re-zeroing scale...");
    scale.tare();
    delay(400); // Debounce
  }

  if (scale.is_ready()) {
    // Read average of 5 consecutive ADC readings for stability
    float weight = scale.get_units(5);
    if (weight < 0.05f) weight = 0.0f; // Truncate micro-noise below 50 grams
    long raw = scale.read_average(3);

    Serial.print("[Scale] Weight: ");
    Serial.print(weight, 2);
    Serial.println(" kg");

    // Periodic HTTP REST transmission
    unsigned long currentMillis = millis();
    if (currentMillis - lastTransmitTime >= TRANSMIT_INTERVAL_MS) {
      lastTransmitTime = currentMillis;
      if (weight > 0.1f) {
        transmitWeightTelemetry(weight, raw);
      }
    }
  } else {
    Serial.println("[HX711] Waiting for ADC ready...");
  }

  delay(500);
}
