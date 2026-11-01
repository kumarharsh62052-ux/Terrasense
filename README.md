# TerraSense – Smart Waste Management System

<p align="center">
  <strong>An IoT-Based Smart Waste Segregation and Monitoring System</strong>
</p>

TerraSense is an Arduino-based smart waste management prototype that combines sensors, motorised mechanisms and a web dashboard to demonstrate automated waste detection, segregation and real-time monitoring.

The project integrates embedded systems with web technologies to create a smarter approach to waste management.

## About the Project

TerraSense uses an Arduino Uno to collect sensor readings, process incoming waste-related signals and control connected hardware components.

A Python Flask backend communicates with the Arduino through USB serial communication. The web dashboard displays available sensor readings and device status while providing controls for supported hardware operations.

## Key Features

- **Smart Detection:** Uses IR, proximity and rain/moisture sensors.
- **Automated Mechanism:** Uses servo and stepper motor control.
- **Alert System:** Provides audible notifications through a buzzer.
- **Live Monitoring:** Displays device information on a web dashboard.
- **Serial Communication:** Exchanges JSON telemetry between Arduino and Flask.
- **Interactive Dashboard:** Provides controls for supported hardware operations.

## Technology Stack

| Technology | Purpose |
|---|---|
| Arduino Uno | Hardware control |
| Arduino C++ | Embedded programming |
| Python | Backend development |
| Flask | Web server and serial communication |
| HTML | Dashboard structure |
| CSS | Dashboard styling |
| JavaScript | Dashboard interactions |
| JSON | Data exchange |

## Hardware Components

- Arduino Uno
- IR sensor
- Proximity / metal detection sensor
- Rain / moisture sensor
- Servo motor
- Stepper motor and compatible driver
- Active buzzer
- Connecting wires and power supply

## Project Screenshots

### Hardware Setup

<!-- Add your actual hardware photograph here -->

### Web Dashboard

<!-- Add your actual dashboard screenshot here -->

## Project Architecture

```text
Sensors and Hardware
        |
        v
    Arduino Uno
        |
        | USB Serial (JSON)
        v
   Python Flask Backend
        |
        v
    Web Dashboard
        |
        | Control Commands
        v
    Arduino Uno
```

## Getting Started

### Prerequisites

- Python 3.10+
- Arduino IDE
- Git
- Arduino Uno and required hardware

### Clone the Repository

```bash
git clone https://github.com/kumarharsh62052-ux/Terrasense.git
cd Terrasense
```

### Install Dependencies

```bash
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Run the Application

Upload `arduino_uno.ino` to your Arduino Uno using Arduino IDE. Close the Serial Monitor, then run:

```bash
python app.py
```

Open the dashboard:

http://127.0.0.1:5000

For complete wiring instructions, configuration and setup details, see **[README_SETUP.md](README_SETUP.md)**.

## Future Scope

- Integration of camera-based waste classification.
- Cloud-based waste monitoring.
- Mobile notifications and remote access.
- Advanced waste analytics and reporting.
- Improved mechanical segregation.
- Expansion to multiple smart bins.

## Project Goal

TerraSense demonstrates how IoT, embedded systems and web development can be integrated to explore practical solutions for smarter waste management.

**Repository:** [TerraSense on GitHub](https://github.com/kumarharsh62052-ux/Terrasense)
