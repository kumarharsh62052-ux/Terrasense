#include <Servo.h>

// ===== PIN MAP: confirm these match your physical wiring =====
const byte IR_PIN = 2;          // IR obstacle sensor OUT
const byte PROX_PIN = 3;        // proximity switch output (5V-safe only)
const byte STEP_PIN = 4;        // A4988/DRV8825 STEP
const byte DIR_PIN = 5;         // A4988/DRV8825 DIR
const byte ENABLE_PIN = 6;      // A4988/DRV8825 ENABLE (active LOW)
const byte SERVO_PIN = 9;       // Servo signal
const byte BUZZER_PIN = 8;      // active buzzer +

// Rain sensor analog output AO -> A0
const byte RAIN_PIN = A0;

const bool IR_ACTIVE_LOW = true;       // change if your IR module behaves oppositely
const bool PROX_ACTIVE_LOW = true;     // common for NPN/open-collector modules
const bool RAIN_WET_IS_LOW = true;     // many rain modules read lower when wet

Servo gateServo;
int servoAngle = 90;
bool buzzerOn = false;
unsigned long lastSend = 0;

String inputLine = "";

void sendTelemetry() {
  int irValue = digitalRead(IR_PIN);
  int proxValue = digitalRead(PROX_PIN);
  int rainRaw = analogRead(RAIN_PIN);

  bool irDetected = IR_ACTIVE_LOW ? (irValue == LOW) : (irValue == HIGH);
  bool proxActive = PROX_ACTIVE_LOW ? (proxValue == LOW) : (proxValue == HIGH);

  int rainPercent;
  if (RAIN_WET_IS_LOW) {
    rainPercent = map(rainRaw, 1023, 250, 0, 100);
  } else {
    rainPercent = map(rainRaw, 0, 800, 0, 100);
  }
  rainPercent = constrain(rainPercent, 0, 100);

  Serial.print("{\"ir_detected\":");
  Serial.print(irDetected ? "true" : "false");
  Serial.print(",\"proximity_active\":");
  Serial.print(proxActive ? "true" : "false");
  Serial.print(",\"rain_raw\":");
  Serial.print(rainRaw);
  Serial.print(",\"rain_percent\":");
  Serial.print(rainPercent);
  Serial.print(",\"servo_angle\":");
  Serial.print(servoAngle);
  Serial.print(",\"buzzer_on\":");
  Serial.print(buzzerOn ? "true" : "false");
  Serial.println(",\"stepper_busy\":false}");
}

int getIntValue(const String &line, const char *key, int fallback) {
  String needle = String("\"") + key + "\":";
  int pos = line.indexOf(needle);
  if (pos < 0) return fallback;
  pos += needle.length();
  return line.substring(pos).toInt();
}

bool hasKey(const String &line, const char *key) {
  String needle = String("\"") + key + "\":";
  return line.indexOf(needle) >= 0;
}

void executeCommand(String line) {
  if (hasKey(line, "servo")) {
    servoAngle = constrain(getIntValue(line, "servo", servoAngle), 0, 180);
    gateServo.write(servoAngle);
  }

  if (hasKey(line, "buzzer")) {
    buzzerOn = getIntValue(line, "buzzer", 0) == 1;
    digitalWrite(BUZZER_PIN, buzzerOn ? HIGH : LOW);
  }

  if (hasKey(line, "stepper_steps")) {
    int steps = constrain(getIntValue(line, "stepper_steps", 0), 0, 2000);
    int direction = getIntValue(line, "direction", 1);
    digitalWrite(ENABLE_PIN, LOW);
    digitalWrite(DIR_PIN, direction ? HIGH : LOW);

    // Simple bounded STEP/DIR pulse train. Adjust pulse timing for your driver/motor.
    for (int i = 0; i < steps; i++) {
      digitalWrite(STEP_PIN, HIGH);
      delayMicroseconds(700);
      digitalWrite(STEP_PIN, LOW);
      delayMicroseconds(700);
    }
    digitalWrite(ENABLE_PIN, HIGH); // disable driver when finished
  }
}

void setup() {
  pinMode(IR_PIN, INPUT_PULLUP);
  pinMode(PROX_PIN, INPUT_PULLUP);
  pinMode(STEP_PIN, OUTPUT);
  pinMode(DIR_PIN, OUTPUT);
  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  digitalWrite(ENABLE_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);

  gateServo.attach(SERVO_PIN);
  gateServo.write(servoAngle);

  Serial.begin(9600);
  delay(500);
}

void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n') {
      inputLine.trim();
      if (inputLine.length() > 0) executeCommand(inputLine);
      inputLine = "";
    } else if (c != '\r') {
      if (inputLine.length() < 120) inputLine += c;
    }
  }

  if (millis() - lastSend >= 500) {
    lastSend = millis();
    sendTelemetry();
  }
}
