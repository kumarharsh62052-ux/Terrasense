from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from serial import Serial
from serial.tools import list_ports
from threading import Thread, Lock
import json, time, os

ROOT = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder="web", static_url_path="")
CORS(app)

serial_lock = Lock()
state_lock = Lock()
ser = None
reader_thread = None
running = True

state = {
    "connected": False,
    "port": None,
    "last_seen": None,
    "ir_detected": None,
    "proximity_active": None,
    "rain_raw": None,
    "rain_percent": None,
    "servo_angle": 90,
    "buzzer_on": False,
    "stepper_busy": False,
    "stepper_last_steps": 0,
    "raw": None,
    "error": None
}

def serial_reader():
    global ser
    while running:
        current = ser
        if current is None or not current.is_open:
            time.sleep(0.3)
            continue
        try:
            line = current.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                continue
            data = json.loads(line)
            with state_lock:
                state.update({
                    "connected": True,
                    "last_seen": time.strftime("%Y-%m-%d %H:%M:%S"),
                    "ir_detected": bool(data.get("ir_detected", False)),
                    "proximity_active": bool(data.get("proximity_active", False)),
                    "rain_raw": int(data.get("rain_raw", 0)),
                    "rain_percent": max(0, min(100, int(data.get("rain_percent", 0)))),
                    "servo_angle": int(data.get("servo_angle", state["servo_angle"])),
                    "buzzer_on": bool(data.get("buzzer_on", state["buzzer_on"])),
                    "stepper_busy": bool(data.get("stepper_busy", False)),
                    "raw": data,
                    "error": None
                })
        except Exception as exc:
            with state_lock:
                state["error"] = str(exc)
            time.sleep(0.1)

Thread(target=serial_reader, daemon=True).start()

@app.get("/")
def index():
    return send_from_directory("web", "index.html")

@app.get("/api/ports")
def ports():
    return jsonify([{"device": p.device, "description": p.description} for p in list_ports.comports()])

@app.post("/api/connect")
def connect():
    global ser
    payload = request.get_json(silent=True) or {}
    port = payload.get("port")
    baud = int(payload.get("baud", 9600))
    if not port:
        return jsonify({"ok": False, "error": "Choose a serial port."}), 400
    try:
        with serial_lock:
            if ser and ser.is_open:
                ser.close()
            ser = Serial(port, baud, timeout=1, write_timeout=2)
        time.sleep(2)  # Uno resets when serial opens
        with state_lock:
            state.update({"connected": True, "port": port, "error": None})
        return jsonify({"ok": True, "message": f"Connected to {port} at {baud} baud."})
    except Exception as exc:
        with state_lock:
            state.update({"connected": False, "port": None, "error": str(exc)})
        return jsonify({"ok": False, "error": str(exc)}), 500

@app.post("/api/disconnect")
def disconnect():
    global ser
    with serial_lock:
        if ser and ser.is_open:
            ser.close()
        ser = None
    with state_lock:
        state.update({"connected": False, "port": None})
    return jsonify({"ok": True})

@app.get("/api/state")
def get_state():
    with state_lock:
        snapshot = dict(state)
    snapshot["connected"] = bool(ser and ser.is_open)
    return jsonify(snapshot)

@app.post("/api/command")
def command():
    global ser
    payload = request.get_json(silent=True) or {}
    allowed = {"servo", "buzzer", "stepper_steps", "direction"}
    if not any(k in payload for k in allowed):
        return jsonify({"ok": False, "error": "No supported command supplied."}), 400
    if not ser or not ser.is_open:
        return jsonify({"ok": False, "error": "Connect the Arduino USB port first."}), 400

    cmd = {}
    if "servo" in payload:
        cmd["servo"] = max(0, min(180, int(payload["servo"])))
    if "buzzer" in payload:
        cmd["buzzer"] = 1 if payload["buzzer"] else 0
    if "stepper_steps" in payload:
        steps = int(payload["stepper_steps"])
        if abs(steps) > 2000:
            return jsonify({"ok": False, "error": "Limit each move to 2000 steps."}), 400
        cmd["stepper_steps"] = abs(steps)
        cmd["direction"] = 1 if int(payload.get("direction", 1)) >= 0 else 0

    try:
        line = json.dumps(cmd, separators=(",", ":")) + "\n"
        with serial_lock:
            ser.write(line.encode("utf-8"))
            ser.flush()
        return jsonify({"ok": True, "sent": cmd})
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 500

if __name__ == "__main__":
    print("Arduino Smart Control running at http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=False, threaded=True)
