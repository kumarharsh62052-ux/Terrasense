const $ = (id) => document.getElementById(id);
let eventCount = 0;
let lastSignature = "";
let buzzerState = false;
let connected = false;

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}

async function loadPorts() {
  try {
    const response = await fetch("/api/ports");
    const ports = await response.json();
    const select = $("portSelect");
    const previous = select.value;
    select.innerHTML = "";
    if (!ports.length) {
      select.innerHTML = '<option value="">No serial ports found</option>';
      return;
    }
    ports.forEach(p => {
      const option = document.createElement("option");
      option.value = p.device;
      option.textContent = `${p.device} — ${p.description}`;
      select.appendChild(option);
    });
    if (ports.some(p => p.device === previous)) select.value = previous;
  } catch (e) {
    $("portSelect").innerHTML = '<option value="">Backend unavailable</option>';
  }
}

async function connectDevice() {
  const port = $("portSelect").value;
  if (!port) return toast("Select an Arduino COM port first.");
  $("connectBtn").disabled = true;
  $("connectBtn").textContent = "Connecting…";
  try {
    const r = await fetch("/api/connect", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({port, baud:9600})
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Connection failed");
    toast(data.message);
    $("connectionText").textContent = data.message;
  } catch (e) {
    toast(e.message);
  } finally {
    $("connectBtn").disabled = false;
    $("connectBtn").textContent = "Connect device";
    refreshState();
  }
}

async function sendCommand(payload) {
  try {
    const r = await fetch("/api/command", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Command failed");
    toast("Command sent to Arduino Uno.");
    return true;
  } catch (e) {
    toast(e.message);
    return false;
  }
}

function addActivity(title, detail) {
  eventCount++;
  $("readingCount").textContent = `${eventCount} EVENTS`;
  const list = $("activityList");
  if (list.querySelector(".empty-state")) list.innerHTML = "";
  const item = document.createElement("div");
  item.className = "activity-item";
  const dot = document.createElement("span");
  dot.className = "activity-dot";
  const text = document.createElement("div");
  const b = document.createElement("b");
  b.textContent = title;
  const small = document.createElement("small");
  small.textContent = detail;
  text.append(b, small);
  item.append(dot, text);
  list.prepend(item);
  while (list.children.length > 12) list.lastChild.remove();
}

function setSensor(valueId, statusId, badgeId, active, activeText, inactiveText) {
  $(valueId).textContent = active ? activeText : inactiveText;
  $(statusId).textContent = active ? "Signal detected" : "No signal";
  const badge = $(badgeId);
  badge.textContent = active ? "Active" : "Clear";
  badge.classList.toggle("active", active);
}

async function refreshState() {
  try {
    const r = await fetch("/api/state", {cache:"no-store"});
    const s = await r.json();
    connected = s.connected;
    $("linkValue").textContent = connected ? "Online" : "Offline";
    $("portLabel").textContent = s.port || "No serial port";
    $("connectionText").textContent = connected
      ? `Connected on ${s.port || "serial port"} · USB serial active`
      : (s.error ? `Connection issue: ${s.error}` : "Not connected · Select your board port to begin");
    $("connectBtn").textContent = connected ? "Reconnect device" : "Connect device";

    if (s.ir_detected !== null && s.ir_detected !== undefined) {
      setSensor("irValue","irStatus","irBadge",s.ir_detected,"Detected","Clear");
    }
    if (s.proximity_active !== null && s.proximity_active !== undefined) {
      setSensor("proxValue","proxStatus","proxBadge",s.proximity_active,"Triggered","Inactive");
    }
    if (s.rain_raw !== null && s.rain_raw !== undefined) {
      $("rainValue").textContent = s.rain_percent;
      $("rainMeter").style.width = `${s.rain_percent}%`;
      $("rainRaw").textContent = `Raw value: ${s.rain_raw}`;
      $("rainBadge").textContent = s.rain_percent > 50 ? "Wet signal" : "Low signal";
      $("rainBadge").classList.toggle("active", s.rain_percent > 50);
    }
    if (s.servo_angle !== undefined) {
      $("servoSlider").value = s.servo_angle;
      $("servoAngle").textContent = `${s.servo_angle}°`;
    }
    if (s.buzzer_on !== undefined) {
      buzzerState = s.buzzer_on;
      $("buzzerText").textContent = buzzerState ? "Buzzer on" : "Buzzer off";
      $("buzzerBtn").textContent = buzzerState ? "Turn buzzer off" : "Turn buzzer on";
      $("buzzerVisual").classList.toggle("on", buzzerState);
    }
    if (s.last_seen) $("lastUpdated").textContent = `Last reading · ${s.last_seen}`;

    const signature = `${s.ir_detected}-${s.proximity_active}-${s.rain_raw}`;
    if (signature !== lastSignature && s.rain_raw !== null) {
      addActivity("Sensor telemetry received",
        `IR: ${s.ir_detected ? "detected" : "clear"} · Proximity: ${s.proximity_active ? "active" : "inactive"} · Rain raw: ${s.rain_raw}`);
      lastSignature = signature;
    }
  } catch (e) {
    $("connectionText").textContent = "Cannot reach local Flask server. Start python app.py.";
  }
}

$("connectBtn").addEventListener("click", connectDevice);
$("refreshBtn").addEventListener("click", () => { loadPorts(); refreshState(); toast("Dashboard refreshed."); });
$("servoSlider").addEventListener("input", e => $("servoAngle").textContent = `${e.target.value}°`);
$("servoBtn").addEventListener("click", () => sendCommand({servo:Number($("servoSlider").value)}));
$("buzzerBtn").addEventListener("click", async () => {
  const next = !buzzerState;
  if (await sendCommand({buzzer:next})) {
    buzzerState = next;
    $("buzzerText").textContent = next ? "Buzzer on" : "Buzzer off";
    $("buzzerBtn").textContent = next ? "Turn buzzer off" : "Turn buzzer on";
    $("buzzerVisual").classList.toggle("on", next);
  }
});
async function stepper(direction) {
  const steps = Number($("stepCount").value);
  if (!Number.isInteger(steps) || steps < 1 || steps > 2000) return toast("Enter a whole number from 1 to 2000.");
  if (await sendCommand({stepper_steps:steps,direction})) {
    $("stepperDirection").textContent = direction > 0 ? "Forward command sent" : "Reverse command sent";
  }
}
$("stepForward").addEventListener("click", () => stepper(1));
$("stepReverse").addEventListener("click", () => stepper(-1));

loadPorts();
refreshState();
setInterval(refreshState, 800);
setInterval(loadPorts, 10000);
