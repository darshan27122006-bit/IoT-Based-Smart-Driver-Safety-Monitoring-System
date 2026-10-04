/*
 * Smart Driver IoT - ESP32 Firmware
 * IoT-Based Smart Driver Safety and Driving Behavior Monitoring System
 * 
 * Target Board: ESP32-WROOM-32 DevKit
 * Modules:
 *   - MPU6050 6-DOF IMU (I2C: SDA=GPIO21, SCL=GPIO22)
 *   - NEO-6M GPS Module (UART2: RX=GPIO16, TX=GPIO17)
 *   - Alert Buzzer (GPIO25)
 *   - Alert LED (GPIO26)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "config.example.h"

// MPU6050 I2C Address and Registers
const int MPU_ADDR = 0x68;
const int PWR_MGMT_1 = 0x6B;
const int ACCEL_CONFIG = 0x1C;
const int GYRO_CONFIG = 0x1B;
const int ACCEL_XOUT_H = 0x3B;

// Hardware Serial for GPS Module
HardwareSerial gpsSerial(2);

// Timing
unsigned long lastTransmitTime = 0;

// Current Sensor Values
float accel_x = 0.0, accel_y = 0.0, accel_z = 9.8;
float gyro_x = 0.0, gyro_y = 0.0, gyro_z = 0.0;
float speed_kmh = 0.0;
double latitude = 13.0827; // Default Chennai coordinates
double longitude = 80.2707;
bool gps_fixed = false;

void initMPU6050() {
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(PWR_MGMT_1);
  Wire.write(0x00); // Wake up MPU-6050
  byte error = Wire.endTransmission();
  
  if (error == 0) {
    Serial.println("[IMU] MPU6050 initialized successfully.");
  } else {
    Serial.print("[IMU] ERROR: MPU6050 not found at 0x68. Error code: ");
    Serial.println(error);
  }
}

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(ACCEL_XOUT_H);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t raw_ax = Wire.read() << 8 | Wire.read();
    int16_t raw_ay = Wire.read() << 8 | Wire.read();
    int16_t raw_az = Wire.read() << 8 | Wire.read();
    int16_t raw_temp = Wire.read() << 8 | Wire.read();
    int16_t raw_gx = Wire.read() << 8 | Wire.read();
    int16_t raw_gy = Wire.read() << 8 | Wire.read();
    int16_t raw_gz = Wire.read() << 8 | Wire.read();

    // Scale Accelerometer (±2g range: 16384 LSB/g, 1g = 9.80665 m/s^2)
    accel_x = (raw_ax / 16384.0) * 9.80665;
    accel_y = (raw_ay / 16384.0) * 9.80665;
    accel_z = (raw_az / 16384.0) * 9.80665;

    // Scale Gyroscope (±250 deg/s range: 131 LSB/(deg/s), convert to rad/s)
    gyro_x = (raw_gx / 131.0) * (3.14159 / 180.0);
    gyro_y = (raw_gy / 131.0) * (3.14159 / 180.0);
    gyro_z = (raw_gz / 131.0) * (3.14159 / 180.0);
  }
}

void readGPS() {
  // Read available NMEA characters from GPS UART
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    // In a complete deployment, feed `c` into TinyGPSPlus: gps.encode(c);
    // If gps.location.isValid(): latitude = gps.location.lat(); longitude = gps.location.lng();
    // If gps.speed.isValid(): speed_kmh = gps.speed.kmph();
  }
}

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected!");
    Serial.print("[WiFi] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying in background...");
  }
}

void triggerAlert() {
  digitalWrite(ALERT_LED_PIN, HIGH);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
  delay(100);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(150);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(ALERT_LED_PIN, LOW);
}

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WiFi] Not connected. Attempting reconnection...");
    WiFi.reconnect();
    return;
  }

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON payload
  char payload[512];
  snprintf(payload, sizeof(payload),
    "{"
    "\"device_id\":\"%s\","
    "\"driver_id\":\"%s\","
    "\"trip_id\":\"%s\","
    "\"speed_kmh\":%.2f,"
    "\"acceleration_x\":%.2f,"
    "\"acceleration_y\":%.2f,"
    "\"acceleration_z\":%.2f,"
    "\"gyroscope_x\":%.2f,"
    "\"gyroscope_y\":%.2f,"
    "\"gyroscope_z\":%.2f,"
    "\"latitude\":%.6f,"
    "\"longitude\":%.6f"
    "}",
    DEVICE_ID, DRIVER_ID, TRIP_ID,
    speed_kmh, accel_x, accel_y, accel_z,
    gyro_x, gyro_y, gyro_z, latitude, longitude
  );

  int httpCode = http.POST(payload);

  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    Serial.print("[HTTP 200] Telemetry Sent: ");
    Serial.println(response);

    // If response contains an event, trigger buzzer warning
    if (response.indexOf("\"event\":null") == -1 && response.indexOf("\"event\":") != -1) {
      Serial.println("[ALERT] Driving event flagged by server! Triggering in-cabin warning.");
      triggerAlert();
    }
  } else {
    Serial.print("[HTTP] Error sending POST: ");
    Serial.println(httpCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("==================================================");
  Serial.println("       Smart Driver IoT - ESP32 Firmware          ");
  Serial.println("==================================================");

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(ALERT_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(ALERT_LED_PIN, LOW);

  // Initialize Sensors & Hardware
  initMPU6050();
  gpsSerial.begin(GPS_BAUD_RATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("[GPS] UART2 initialized at 9600 baud.");

  // Connect to Wi-Fi
  connectWiFi();
}

void loop() {
  readMPU6050();
  readGPS();

  unsigned long currentMillis = millis();
  if (currentMillis - lastTransmitTime >= TELEMETRY_INTERVAL_MS) {
    lastTransmitTime = currentMillis;
    sendTelemetry();
  }

  delay(20);
}
