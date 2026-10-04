# Hardware Architecture & Wiring Documentation

## 1. Components Bill of Materials (BOM)

| Component | Model / Spec | Operating Voltage | Interface | Purpose |
|---|---|---|---|---|
| **Microcontroller** | ESP32-WROOM-32 DevKit | 3.3V / 5V (USB) | Wi-Fi 802.11 b/g/n, I2C, UART | Master controller, sensor sampling, HTTP transmission |
| **IMU Sensor** | MPU6050 6-Axis | 3.3V - 5V | I2C (Address: 0x68) | 3-axis accelerometer + 3-axis gyroscope |
| **GPS Receiver** | u-blox NEO-6M | 3.3V - 5V | UART (9600 Baud) | Real-time vehicle coordinates & speed |
| **Auditory Alert** | 5V Active Buzzer | 3.3V - 5V | Digital Output (GPIO) | Audio feedback for dangerous events |
| **Visual Alert** | 5mm Red LED + 330Ω Resistor | 3.3V | Digital Output (GPIO) | In-cabin visual warning indicator |

---

## 2. Pinout & Interconnection Matrix

### MPU6050 → ESP32
| MPU6050 Pin | ESP32 GPIO Pin | Function | Notes |
|---|---|---|---|
| **VCC** | 3.3V (or 5V for module with onboard regulator) | Power | Connect to ESP32 3.3V rail |
| **GND** | GND | Ground | Common ground |
| **SCL** | GPIO 22 | I2C Clock | Hardware I2C default SCL |
| **SDA** | GPIO 21 | I2C Data | Hardware I2C default SDA |
| **AD0** | GND | I2C Address select | Pull low for 0x68 address |

### NEO-6M GPS → ESP32
| NEO-6M Pin | ESP32 GPIO Pin | Function | Notes |
|---|---|---|---|
| **VCC** | 5V / 3.3V | Power | Connect to ESP32 power rail |
| **GND** | GND | Ground | Common ground |
| **TX** | GPIO 16 (RX2) | UART Data Out | GPS TX connects to ESP32 RX2 |
| **RX** | GPIO 17 (TX2) | UART Data In | ESP32 TX2 connects to GPS RX |

### Alert Actuators → ESP32
| Component Pin | ESP32 GPIO Pin | Description |
|---|---|---|
| **Buzzer (+)** | GPIO 25 | Active Buzzer positive lead |
| **Buzzer (-)** | GND | Active Buzzer ground lead |
| **LED Anode (+)** | GPIO 26 | Connect through 330Ω current-limiting resistor |
| **LED Cathode (-)** | GND | LED negative lead |

---

## 3. Wiring Diagram

```
                ┌──────────────────────────────────────┐
                │         ESP32-WROOM-32               │
                │                                      │
                │  3V3 ──────────┬─────────────────┐   │
                │  GND ───────┐  │                 │   │
                │             │  │                 │   │
                │  GPIO 21 ───┼──┼─── SDA (MPU)    │   │
                │  GPIO 22 ───┼──┼─── SCL (MPU)    │   │
                │             │  │                 │   │
                │  GPIO 16 ───┼──┼────────────┐    │   │
                │  GPIO 17 ───┼──┼─────────┐  │    │   │
                │             │  │         │  │    │   │
                │  GPIO 25 ───┼──┼── Buzzer(+)│    │   │
                │  GPIO 26 ───┼──┼── LED(+)   │    │   │
                └─────────────┼──┼─────────┼──┼────┘
                              │  │         │  │
                 ┌────────────┘  └──────┐  │  │
                 │                      │  │  │
        ┌────────▼─────────┐   ┌────────▼──┴──▼──────┐
        │     MPU6050      │   │    NEO-6M GPS       │
        │  VCC   GND   AD0 │   │   VCC   GND   RX  TX│
        │  SDA   SCL       │   │                     │
        └──────────────────┘   └─────────────────────┘
```

---

## 4. Software Simulator vs Physical Hardware

* **Hardware Mode:** The ESP32 collects real physical acceleration, gyroscope, and GPS readings, formats a JSON payload, and executes an HTTP POST to `http://<SERVER_IP>:8000/api/sensor-data`.
* **Development/Demo Simulator Mode:** When hardware is not connected, the included Python IoT simulator (`iot_simulator/sensor_simulator.py`) generates physically correlated vehicle dynamics along Chennai roadways and transmits the exact same payload format to the backend.
