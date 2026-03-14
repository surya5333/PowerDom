const express = require('express');
const cors = require('cors');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const calculateEnergy = require('./calculation');
const db = require('./db');
const { getDynamicDailyBudget, getProjectedConsumption } = require('./budget');
const { performPowerControl } = require('./automation');
const cron = require('node-cron');

const app = express();
app.use(cors());
app.use(express.json());

const ARDUINO_PATH = 'COM3'; // ⚠ change if needed
let arduino = null;
let parser = null;
let hardwareConnected = false;
let deviceData = {};
let realPower = 0;
let realCurrent = 0;
let realEnergyWh = 0;
let estimatedEnergyWh = 0; // New: Software-calculated cumulative energy
let lastEnergyCalcTime = Date.now();
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
      } else if (parts.length === 2 && parts[0] === "CURRENT") {
        realCurrent = Math.abs(Number(parts[1]));
      } else if (parts.length === 2 && parts[0] === "POWER") {
        const p = Math.abs(Number(parts[1]));
        realPower = p;
        
        // Integration Logic
        const now = Date.now();
        const elapsedMs = now - lastEnergyCalcTime;
        if (elapsedMs > 0) {
          const hours = elapsedMs / (1000 * 60 * 60);
          
          // 1. Real Energy (from Sensor)
          realEnergyWh += p * hours;
          
          // 2. Estimated Energy (from Device Model)
          const finalData = calculateEnergy(deviceData);
          estimatedEnergyWh += (finalData.current_power_draw_watts || 0) * hours;
          
          lastEnergyCalcTime = now;
        }
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

// ROLLOVERS (Midnight)
cron.schedule('0 0 * * *', async () => {
  console.log("Starting midnight rollover...");
  const today = new Date().toISOString().substring(0, 10);
  const status = calculateEnergy(deviceData);
  const totalKwh = status.total_energy_wh / 1000;

  // Save daily total
  db.run("INSERT OR REPLACE INTO daily_energy (date, total_kwh) VALUES (?, ?)", [today, totalKwh], (err) => {
    if (err) console.error("Error saving daily history:", err.message);
    else console.log(`Daily history saved for ${today}: ${totalKwh.toFixed(4)} kWh`);
  });
  
  // Reset daily counters on Arduino
  if (hardwareConnected) arduino.write("RESET\n");
  deviceData = {};
});

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

// Set Monthly Limit
app.post('/settings/monthly-limit', (req, res) => {
  const { limit } = req.body;
  db.run("UPDATE settings SET value = ? WHERE key = 'monthly_limit_kwh'", [limit], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Monthly limit updated" });
  });
});

// Get History for Graphs
app.get('/history', (req, res) => {
  console.log("Fetching daily energy history...");
  db.all("SELECT * FROM daily_energy ORDER BY date DESC LIMIT 30", (err, rows) => {
    if (err) {
      console.error("Database error fetching history:", err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`Returning ${rows.length} records.`);
    res.json(rows);
  });
});

// ----------------------------- 
// LIVE POWER STREAM (SSE) 
// ----------------------------- 
app.get('/live', (req, res) => { 
  console.log("New SSE client connected to /live");
  res.setHeader('Content-Type', 'text/event-stream'); 
  res.setHeader('Cache-Control', 'no-cache'); 
  res.setHeader('Connection', 'keep-alive'); 
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for SSE

  const sendUpdate = async () => { 
    try {
      let payload; 

      if (!hardwareConnected) { 
        const budgetInfo = await getDynamicDailyBudget(0); 
        payload = { 
          connected: false, 
          estimatedPower: 0, 
          realPower: 0, 
          normalizedPower: 0,
          realCurrent: 0, 
          energyWh: 0, 
          realEnergyWh: 0,
          ...budgetInfo 
        }; 
      } else { 
        const finalData = calculateEnergy(deviceData); 
        const budgetInfo = await getDynamicDailyBudget(finalData.total_energy_wh); 

      let estimatedPower = finalData.current_power_draw_watts || 0;
      let normalizedPower = realPower;

      if (realPower > 0.05 && estimatedPower > 0) {
        const scaleFactor = estimatedPower / realPower;
        normalizedPower = realPower * scaleFactor;
      }

      // Proportional Power Distribution
      let distributedPower = {};
      const sensorScaleFactor = estimatedPower > 0 ? realPower / estimatedPower : 0;

      for (const id in finalData.devices) {
        if (finalData.devices[id].status === "ON") {
          distributedPower[id] = (deviceConfig[id]?.power || 0) * sensorScaleFactor;
        }
      }

      payload = { 
        connected: true, 
        estimatedPower, 
        realPower, 
        normalizedPower,
        distributedPower,
        realCurrent, 
        energyWh: finalData.total_energy_wh, 
        realEnergyWh,
        estimatedEnergyWh, // Cumulative software energy
        dailyBudgetKwh: budgetInfo.dailyBudgetKwh 
      }; 
      } 

      res.write(`data: ${JSON.stringify(payload)}\n\n`); 
    } catch (err) {
      console.error("Error in SSE sendUpdate:", err.message);
    }
  }; 

  const interval = setInterval(sendUpdate, 1000); 

  req.on('close', () => { 
    console.log("SSE client disconnected from /live");
    clearInterval(interval); 
  }); 
}); 

app.get('/status', async (req, res) => {
  if (!hardwareConnected) {
    const budgetInfo = await getDynamicDailyBudget(0);
    return res.json({ 
      connected: false, 
      devices: {}, 
      total_energy_wh: 0,
      ...budgetInfo,
      projectedKwh: 0,
      powerSavingLevel: 'SAFE',
      notifications: []
    });
  }

  // Request fresh status from Arduino
  arduino.write("STATUS\n");

  setTimeout(async () => {
    const finalData = calculateEnergy(deviceData);
    const budgetInfo = await getDynamicDailyBudget(finalData.total_energy_wh);
    const energySoFarKwh = finalData.total_energy_wh / 1000;
    
    // Direct Power Control Automation
    const notifications = performPowerControl(
      finalData.devices,
      energySoFarKwh,
      budgetInfo.dailyBudgetKwh,
      (id) => arduino.write(`OFF ${id}\n`)
    );

    // Calculate allowedPowerKw for frontend display if needed
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const remainingHours = Math.max(0.1, 24 - (currentHour + currentMinute / 60));
    const allowedPowerKw = Math.max(0, (budgetInfo.dailyBudgetKwh - energySoFarKwh) / remainingHours);

    let estimatedPower = finalData.current_power_draw_watts || 0;
    let normalizedPower = realPower;

    if (realPower > 0.05 && estimatedPower > 0) {
      const scaleFactor = estimatedPower / realPower;
      normalizedPower = realPower * scaleFactor;
    }

    // Proportional Power Distribution
    let distributedPower = {};
    const sensorScaleFactor = estimatedPower > 0 ? realPower / estimatedPower : 0;

    for (const id in finalData.devices) {
      if (finalData.devices[id].status === "ON") {
        distributedPower[id] = (deviceConfig[id]?.power || 0) * sensorScaleFactor;
      }
    }

    res.json({
      connected: true,
      ...finalData,
      ...budgetInfo,
      allowedPowerKw,
      estimatedPower,
      realPower,
      normalizedPower,
      distributedPower,
      realCurrent,
      realEnergyWh,
      estimatedEnergyWh,
      notifications
    });
  }, 400);
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
