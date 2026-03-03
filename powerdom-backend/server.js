const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const calculateEnergy = require('./calculation');

const app = express();
app.use(cors());
app.use(express.json());

const ARDUINO_PATH = 'COM3'; // ⚠ change if needed
let arduino = null;
let parser = null;
let hardwareConnected = false;
let deviceData = {};
let reconnectionInterval = null;

function connectArduino() {
  if (arduino && arduino.isOpen) {
    return;
  }

  console.log(`Attempting to connect to Arduino on ${ARDUINO_PATH}...`);
  
  arduino = new SerialPort({
    path: ARDUINO_PATH,
    baudRate: 9600,
    autoOpen: false
  });

  arduino.open((err) => {
    if (err) {
      console.log(`Connection failed: ${err.message}`);
      hardwareConnected = false;
      startReconnection();
      return;
    }
    
    console.log("Arduino connected successfully");
    hardwareConnected = true;
    stopReconnection();

    parser = arduino.pipe(new ReadlineParser({ delimiter: '\n' }));

    parser.on('data', (data) => {
      const line = data.trim();
      if (!line) return;

      console.log("From Arduino:", line);

      if (line === "RESET_DONE") {
        console.log("Timers reset on Arduino");
        deviceData = {};
        return;
      }

      const parts = line.split(" ");
      if (parts.length === 4 && parts[0] === "DEVICE") {
        const id = parts[1];
        const status = parts[2];
        const time = parts[3];

        deviceData[id] = {
          status: status,
          time: Number(time)
        };
      }
    });
  });

  arduino.on('close', () => {
    console.log("Arduino connection closed");
    hardwareConnected = false;
    startReconnection();
  });

  arduino.on('error', (err) => {
    console.log("Serial Error:", err.message);
    hardwareConnected = false;
    startReconnection();
  });
}

function startReconnection() {
  if (!reconnectionInterval) {
    reconnectionInterval = setInterval(connectArduino, 5000);
  }
}

function stopReconnection() {
  if (reconnectionInterval) {
    clearInterval(reconnectionInterval);
    reconnectionInterval = null;
  }
}

// Initial connection attempt
connectArduino();

// ROUTES
app.post('/on/:id', (req, res) => {
  if (!hardwareConnected) {
    return res.status(503).json({ error: "Hardware Disconnected" });
  }
  arduino.write(`ON ${req.params.id}\n`);
  res.json({ message: "ON command sent" });
});

app.post('/off/:id', (req, res) => {
  if (!hardwareConnected) {
    return res.status(503).json({ error: "Hardware Disconnected" });
  }
  arduino.write(`OFF ${req.params.id}\n`);
  res.json({ message: "OFF command sent" });
});

app.post('/reset', (req, res) => {
  if (!hardwareConnected) {
    return res.status(503).json({ error: "Hardware Disconnected" });
  }
  arduino.write("RESET\n");
  deviceData = {};
  res.json({ message: "RESET command sent" });
});

app.get('/status', (req, res) => {
  if (!hardwareConnected) {
    return res.json({
      connected: false,
      devices: {},
      total_energy_wh: 0
    });
  }

  // Request fresh status from Arduino
  arduino.write("STATUS\n");

  setTimeout(() => {
    const finalData = calculateEnergy(deviceData);
    res.json({
      connected: true,
      ...finalData
    });
  }, 400);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
