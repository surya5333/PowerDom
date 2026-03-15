const express = require('express');
const cors = require('cors');
const XLSX = require('xlsx');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

const calculateEnergy = require('./calculation');
const db = require('./db');
const deviceConfig = require('./deviceConfig');
const { getDynamicDailyBudget, getProjectedConsumption } = require('./budget');
const { performPowerControl } = require('./automation');
const cron = require('node-cron');
const reportsRouter = require('./routes/reports');
const authRouter = require('./routes/auth');
const app = express();

app.use(cors());
app.use(express.json());

// Auth API
app.use('/api/auth', authRouter);

// Reports API
app.use('/api/reports', reportsRouter);

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
      
      // 1. Capture Real-time Sensor Power and Current
      if (parts[0] === "CURRENT") { 
        realCurrent = parseFloat(parts[1]); 
      } 

      if (parts[0] === "POWER") { 
        realPower = parseFloat(parts[1]); 
        
        // Integration Logic for energy totals
        const now = Date.now();
        const elapsedMs = now - lastEnergyCalcTime;
        if (elapsedMs > 0) {
          const hours = elapsedMs / (1000 * 60 * 60);
          
          // Real Energy (from Sensor)
          realEnergyWh += realPower * hours;
          
          // Estimated Energy (from Device Model)
          const currentEstimated = calculateEstimatedPower(deviceData);
          estimatedEnergyWh += currentEstimated * hours;
          
          lastEnergyCalcTime = now;
        }
      } 

      // 2. Update Device Status
      if (parts[0] === "DEVICE") { 
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

// ----------------------------- 
// ANALYTICS POWER CALCULATIONS
// ----------------------------- 
function calculateEstimatedPower(devices) { 
  let total = 0; 
  for (const id in devices) { 
    if (devices[id].status === "ON") { 
      const power = deviceConfig[id]?.power || 0; 
      total += power; 
    } 
  } 
  return total; // watts 
} 

function normalizeSensorPower(rawPower, estimatedPower) { 
  if (rawPower <= 0) return 0; 
  const scaleFactor = estimatedPower / rawPower; 
  return rawPower * scaleFactor; 
} 

// Initial connection attempt
connectArduino();

// ----------------------------- 
// ANALYTICS LOGGING & EVENT DETECTION
// ----------------------------- 
let previousPower = 0;
let previousDeviceData = {};
const LOG_INTERVAL = 1000; // 1 second

setInterval(() => {
  if (hardwareConnected) {
    const timestamp = Date.now();
    const currentPower = realPower;
    const currentCurr = realCurrent;
    const voltageV = 5.0; // Assume 5V for prototype

    // 1. Log to telemetry_power (Raw Sensor Data)
    db.run(`INSERT INTO telemetry_power (timestamp, power_w, current_a, voltage_v, energy_wh, user_id) 
            VALUES (?, ?, ?, ?, ?, ?)`, 
      [timestamp, currentPower, currentCurr, voltageV, realEnergyWh, 1], // Default to user 1
      (err) => {
        if (err) console.error("Error logging telemetry:", err.message);
      }
    );

    // 2. Log to sensor_log (Legacy Compatibility)
    db.run("INSERT INTO sensor_log (timestamp, power, current) VALUES (?, ?, ?)", 
      [timestamp, currentPower, currentCurr], 
      (err) => {
        if (err) console.error("Error logging sensor data:", err.message);
      }
    );

    // 3. Track Energy Per Device
    for (const id in deviceData) {
      if (deviceData[id].status === "ON") {
        const deviceName = deviceConfig[id]?.name || `Device ${id}`;
        const estimatedPower = deviceConfig[id]?.power || 0;
        const durationHours = LOG_INTERVAL / (1000 * 60 * 60);
        const deviceEnergyWh = estimatedPower * durationHours;

        db.run(`INSERT INTO device_energy_log (timestamp, device_id, device_name, energy_wh, user_id) 
                VALUES (?, ?, ?, ?, ?)`,
          [timestamp, id, deviceName, deviceEnergyWh, 1], // Default to user 1
          (err) => {
            if (err) console.error("Error logging device energy:", err.message);
          }
        );
      }
    }

    // 4. Event Detection (Spikes/Drops)
    const deltaPower = currentPower - previousPower;
    const threshold = 0.5; // 0.5W threshold

    if (Math.abs(deltaPower) > threshold) {
      const eventType = deltaPower > 0 ? "DEVICE_ON" : "DEVICE_OFF";
      
      let deviceName = null;
      for (const id in deviceData) {
        const currentStatus = deviceData[id].status;
        const previousStatus = previousDeviceData[id]?.status || "OFF";
        
        if (currentStatus !== previousStatus) {
          deviceName = deviceConfig[id]?.name;
          break; 
        }
      }

      if (!deviceName) {
        const absDelta = Math.abs(deltaPower);
        let bestMatch = null;
        let minDiff = Infinity;
        for (const id in deviceConfig) {
          const config = deviceConfig[id];
          const diff = Math.abs(config.power - absDelta);
          if (diff < minDiff && (diff < config.power * 0.3 || diff < 10)) {
            minDiff = diff;
            bestMatch = config.name;
          }
        }
        deviceName = bestMatch || "Unknown Load";
      }

      // Log to power_events
      db.run(`INSERT INTO power_events (timestamp, event_type, delta_power, detected_device, user_id) 
              VALUES (?, ?, ?, ?, ?)`,
        [timestamp, eventType, deltaPower, deviceName, 1], // Default to user 1
        (err) => {
          if (err) console.error("Error logging power event:", err.message);
        }
      );

      // Log to energy_events (Legacy)
      db.run("INSERT INTO energy_events (timestamp, event_type, delta_power, device_name) VALUES (?, ?, ?, ?)",
        [timestamp, eventType, deltaPower, deviceName],
        (err) => {
          if (err) console.error("Error logging energy event:", err.message);
        }
      );
    }

    // 5. Track State Changes
    for (const id in deviceData) {
      if (deviceData[id].status !== (previousDeviceData[id]?.status || "OFF")) {
        const deviceName = deviceConfig[id]?.name || `Device ${id}`;
        db.run(`INSERT INTO device_state_log (timestamp, device_id, device_name, status, user_id) 
                VALUES (?, ?, ?, ?, ?)`,
          [timestamp, id, deviceName, deviceData[id].status, 1], // Default to user 1
          (err) => {
            if (err) console.error("Error logging state change:", err.message);
          }
        );
      }
    }

    previousPower = currentPower;
    previousDeviceData = JSON.parse(JSON.stringify(deviceData));
  }
}, LOG_INTERVAL);

// ROLLOVERS (Midnight)
cron.schedule('0 0 * * *', async () => {
  console.log("Starting midnight rollover...");
  const today = new Date().toISOString().substring(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().substring(0, 10);

  const status = calculateEnergy(deviceData);
  const totalKwh = status.total_energy_wh / 1000;
  const estimatedKwh = estimatedEnergyWh / 1000;

  // Get Peak Power for the day
  db.get(`SELECT MAX(power_w) as peak FROM telemetry_power 
          WHERE date(timestamp/1000, 'unixepoch') = date('yesterday')`, (err, row) => {
    const peakPower = row ? row.peak : 0;

    // Save to daily_energy_summary
    db.run(`INSERT OR REPLACE INTO daily_energy_summary 
            (date, total_energy_kwh, estimated_energy_kwh, daily_budget_kwh, peak_power_w) 
            VALUES (?, ?, ?, ?, ?)`, 
      [yesterdayStr, totalKwh, estimatedKwh, 3.0, peakPower], // 3.0 is a placeholder budget
      (err) => {
        if (err) console.error("Error saving daily summary:", err.message);
      }
    );
  });

  // Legacy daily history
  db.run("INSERT OR REPLACE INTO daily_energy (date, total_kwh) VALUES (?, ?)", [yesterdayStr, totalKwh], (err) => {
    if (err) console.error("Error saving legacy daily history:", err.message);
  });
  
  if (hardwareConnected) arduino.write("RESET\n");
  deviceData = {};
  realEnergyWh = 0;
  estimatedEnergyWh = 0;
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

        const estimatedPower = calculateEstimatedPower(finalData.devices); 
        const normalizedPower = normalizeSensorPower(realPower, estimatedPower); 

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

    // Calculate Power Metrics
    const estimatedPower = calculateEstimatedPower(finalData.devices); 
    const normalizedPower = normalizeSensorPower(realPower, estimatedPower); 

    // Calculate allowedPowerKw for frontend display if needed
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    const remainingHours = Math.max(0.1, 24 - (currentHour + currentMinute / 60));
    const allowedPowerKw = Math.max(0, (budgetInfo.dailyBudgetKwh - energySoFarKwh) / remainingHours);

    // Proportional Power Distribution (optional, based on your previous code)
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

// ----------------------------- 
// ANALYTICS APIs (Isolated)
// ----------------------------- 

// 1. Live Analytics Stream
app.get('/analytics/live', (req, res) => { 
  res.setHeader('Content-Type', 'text/event-stream'); 
  res.setHeader('Cache-Control', 'no-cache'); 
  res.setHeader('Connection', 'keep-alive'); 
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendLiveUpdate = () => { 
    const payload = { 
      timestamp: Date.now(), 
      power: realPower, 
      current: realCurrent 
    }; 
    res.write(`data: ${JSON.stringify(payload)}\n\n`); 
  }; 

  const interval = setInterval(sendLiveUpdate, 1000); 
  req.on('close', () => clearInterval(interval)); 
}); 

// 2. Power History (Last 24 Hours)
app.get('/analytics/power-history', (req, res) => {
  const yesterday = Date.now() - (24 * 60 * 60 * 1000);
  db.all("SELECT timestamp, power FROM sensor_log WHERE timestamp > ? ORDER BY timestamp ASC", [yesterday], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 3. Peak Power Today
app.get('/analytics/peak-power', (req, res) => {
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  db.get("SELECT MAX(power) as peakPower, timestamp FROM sensor_log WHERE timestamp > ?", [startOfDay], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { peakPower: 0, timestamp: Date.now() });
  });
});

// 4. Daily Energy Curve (Hourly Accumulation)
app.get('/analytics/daily-energy', (req, res) => {
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  db.all("SELECT timestamp, power FROM sensor_log WHERE timestamp > ? ORDER BY timestamp ASC", [startOfDay], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Calculate cumulative energy
    let energyCurve = [];
    let cumulativeWh = 0;
    let lastTime = startOfDay;

    rows.forEach(row => {
      const durationHours = (row.timestamp - lastTime) / (1000 * 60 * 60);
      cumulativeWh += row.power * durationHours;
      energyCurve.push({
        time: new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        energy: Number(cumulativeWh.toFixed(4))
      });
      lastTime = row.timestamp;
    });

    // Sample down to hourly or every 30 mins to avoid massive payload if needed
    res.json(energyCurve.filter((_, i) => i % 60 === 0 || i === energyCurve.length - 1));
  });
});

// 5. Idle Consumption (Avg power when all devices are OFF)
app.get('/analytics/idle-power', (req, res) => {
  // We'll define 'idle' as periods where our device model says current_power_draw_watts is 0
  // but the sensor still reports some power.
  // For simplicity, we'll query for sensor readings in the last hour where we know devices were off.
  // In a real system, we'd join with device state logs. 
  // Here, we'll return a calculated average from the last 24h for periods < 0.05W (noise floor).
  db.get("SELECT AVG(power) as idlePower FROM sensor_log WHERE power < 0.1 AND power > 0", (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { idlePower: 0 });
  });
});

// 6. Energy Events (Spikes/Drops)
app.get('/analytics/events', (req, res) => {
  db.all("SELECT * FROM energy_events ORDER BY timestamp DESC LIMIT 50", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 7. Historical Comparison (Using existing daily_energy table)
app.get('/analytics/history', (req, res) => {
  db.all("SELECT * FROM daily_energy ORDER BY date DESC LIMIT 30", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.reverse());
  });
});

const auth = require('./middleware/auth');

// ... (existing code)

// 8. Excel Export (Comprehensive Multi-Sheet Report)
app.get('/export/excel', auth, async (req, res) => {
  try {
    console.log("Generating multi-sheet Excel report...");

    // 1. Fetch Daily Energy Summary
    const dailySummary = await new Promise((resolve, reject) => {
      db.all(`SELECT date, estimated_energy_kwh as 'Estimated(kWh)', total_energy_kwh as 'Measured(kWh)', 
              daily_budget_kwh as 'Budget(kWh)', peak_power_w as 'Peak(W)' 
              FROM daily_energy_summary ORDER BY date DESC`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // 2. Fetch Device Usage Report (Aggregated)
    const deviceUsage = await new Promise((resolve, reject) => {
      db.all(`SELECT device_name as Device, SUM(energy_wh)/1000 as 'Total_Energy(kWh)' 
              FROM device_energy_log GROUP BY device_name ORDER BY 'Total_Energy(kWh)' DESC`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // 3. Fetch Sensor Telemetry (Last 7 Days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const telemetry = await new Promise((resolve, reject) => {
      db.all(`SELECT datetime(timestamp/1000, 'unixepoch', 'localtime') as Time, power_w as 'Power(W)', 
              current_a as 'Current(A)', voltage_v as 'Voltage(V)', energy_wh as 'Energy(Wh)' 
              FROM telemetry_power WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 10000`, [sevenDaysAgo], (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // 4. Fetch Power Events
    const events = await new Promise((resolve, reject) => {
      db.all(`SELECT datetime(timestamp/1000, 'unixepoch', 'localtime') as Time, event_type as Event, 
              delta_power as 'Delta(W)', detected_device as Device 
              FROM power_events ORDER BY timestamp DESC LIMIT 1000`, (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add Sheets
    const ws1 = XLSX.utils.json_to_sheet(dailySummary);
    XLSX.utils.book_append_sheet(wb, ws1, "Daily Energy");

    const ws2 = XLSX.utils.json_to_sheet(deviceUsage);
    XLSX.utils.book_append_sheet(wb, ws2, "Device Usage");

    const ws3 = XLSX.utils.json_to_sheet(telemetry);
    XLSX.utils.book_append_sheet(wb, ws3, "Raw Telemetry");

    const ws4 = XLSX.utils.json_to_sheet(events);
    XLSX.utils.book_append_sheet(wb, ws4, "Power Events");

    // Write to buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=PowerDom_Energy_Report.xlsx');
    res.send(buffer);
    
    console.log("Excel report generated successfully.");
  } catch (err) {
    console.error("Export Error:", err.message);
    res.status(500).send("Export failed: " + err.message);
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
