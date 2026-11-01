# Arduino Uno Smart Waste / Automation Dashboard

> **Important:** Do not open `web/index.html` by double-clicking it for live Arduino operation. Start the Flask server with `python app.py`, then open `http://127.0.0.1:5000` in Chrome. The CSS and JavaScript paths are now relative, so the visual styling also loads if you preview the HTML directly, but USB/serial features require the Flask server.


A local USB-serial dashboard for an Arduino Uno. The Flask app serves the website, reads JSON telemetry from the Uno, and sends control commands back to the board.

## Important assumptions
This starter wiring/code assumes:
- Arduino Uno R3.
- IR module with a digital OUT pin.
- Proximity switch/module output is **5V-safe** (or correctly level-shifted).
- Rain sensor module has analog AO output.
- Servo signal is driven from D9; servo motor is powered from a separate regulated 5V supply.
- Stepper driver is a STEP/DIR type such as A4988 or DRV8825. The bare stepper motor must NOT be connected directly to Uno pins.

If your proximity switch is a 6–36V industrial PNP/NPN sensor, do not connect its output directly to the Uno. Use a suitable optocoupler/level shifter and verify its wiring first.

## Wiring

| Component | Arduino Uno |
|---|---|
| IR VCC / GND / OUT | 5V / GND / D2 |
| Proximity module signal | D3 (only if 5V-safe); module power per its datasheet |
| Rain sensor VCC / GND / AO | 5V / GND / A0 |
| Servo signal | D9 |
| Servo power | External regulated 5V supply; common GND with Uno |
| Active buzzer + / - | D8 / GND (small active buzzer only; use transistor driver if current exceeds pin rating) |
| Stepper driver STEP | D4 |
| Stepper driver DIR | D5 |
| Stepper driver ENABLE | D6 |
| Stepper driver logic GND / VDD | Uno GND / 5V (check driver board) |
| Stepper driver motor supply | Separate supply matching motor/driver |
| Stepper motor | Driver motor outputs A1/A2/B1/B2 |

### Stepper driver safety
- Identify your driver model before wiring. A4988 and DRV8825 pinouts and current limits differ.
- Set the driver current limit for your motor before operating.
- Connect motor supply capacitors if required by the driver documentation.
- Never plug/unplug the stepper motor while the driver is powered.
- The shaft adapter is mechanical and has no electrical/data connection.
- Breadboard is for low-current signal wiring only; do not route stepper motor supply/current through it.

## Install and run (Windows)

1. Install Python 3.10+ and Arduino IDE.
2. Open `arduino_uno.ino` in Arduino IDE.
3. Select **Tools → Board → Arduino Uno** and the correct COM port, then upload.
4. Close Arduino IDE Serial Monitor. Only one program can own the COM port at a time.
5. In a terminal in this folder:
   ```bash
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```
6. Open `http://127.0.0.1:5000`.
7. Choose the Arduino COM port in the dashboard and click Connect.

## How data and commands work
The Uno sends one JSON line every 500 ms:
`{"ir_detected":false,"proximity_active":false,"rain_raw":700,"rain_percent":42,...}`

The web controls send JSON commands via Flask:
- Servo angle: 0–180 degrees.
- Buzzer: on/off.
- Stepper: bounded move up to 2000 steps per click.

This is a local development setup. Keep the computer and Flask app running while connected. It is not an internet-hosted remote monitoring system.

## Calibration / logic
Rain sensor raw-to-percent mapping depends on the exact sensor board and water conditions. Calibrate `RAIN_WET_IS_LOW` and the mapping in the sketch using dry and wet readings.
IR/proximity active polarity also depends on module type; change `IR_ACTIVE_LOW` / `PROX_ACTIVE_LOW` if needed.
Stepper "steps" are driver pulses, not degrees; actual movement depends on motor step angle and microstep settings.
