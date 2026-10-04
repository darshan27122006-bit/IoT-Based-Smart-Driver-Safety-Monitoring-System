#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi Credentials
// Replace with your local Wi-Fi credentials
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server URL
// Note: When running FastAPI on your local laptop, use your laptop's local LAN IP address
// (e.g., http://192.168.1.100:8000/api/sensor-data), NOT localhost
const char* BACKEND_URL = "http://192.168.1.100:8000/api/sensor-data";

// Telemetry Identifiers
const char* DEVICE_ID = "ESP32-001";
const char* DRIVER_ID = "DRV001";
const char* TRIP_ID   = "TRIP001";

// Pinout Definitions (ESP32-WROOM-32)
#define I2C_SDA_PIN    21
#define I2C_SCL_PIN    22

#define GPS_RX_PIN     16   // ESP32 RX2 connects to GPS TX
#define GPS_TX_PIN     17   // ESP32 TX2 connects to GPS RX
#define GPS_BAUD_RATE  9600

#define BUZZER_PIN     25   // Active buzzer alert pin
#define ALERT_LED_PIN  26   // Visual alert LED pin

// Telemetry Transmit Interval (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 1000;

#endif // CONFIG_H
