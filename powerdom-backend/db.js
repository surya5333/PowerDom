const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'powerdom.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    // Helper to add user_id column if missing
    const ensureUserIdColumn = (tableName) => {
      db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (!err && rows) {
          const hasUserId = rows.some(row => row.name === 'user_id');
          if (!hasUserId) {
            console.log(`Adding user_id column to ${tableName}`);
            db.run(`ALTER TABLE ${tableName} ADD COLUMN user_id INTEGER REFERENCES users(id)`);
          }
        }
      });
    };

    // 0. Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT DEFAULT 'user'
    )`);

    // 1. Raw Telemetry Table
    db.run(`CREATE TABLE IF NOT EXISTS telemetry_power (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      power_w REAL,
      current_a REAL,
      voltage_v REAL,
      energy_wh REAL,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => { if (!err) ensureUserIdColumn('telemetry_power'); });

    // 2. Device State Timeline
    db.run(`CREATE TABLE IF NOT EXISTS device_state_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      device_id INTEGER,
      device_name TEXT,
      status TEXT,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => { if (!err) ensureUserIdColumn('device_state_log'); });

    // 3. Device Energy Usage
    db.run(`CREATE TABLE IF NOT EXISTS device_energy_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      device_id INTEGER,
      device_name TEXT,
      energy_wh REAL,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => { if (!err) ensureUserIdColumn('device_energy_log'); });

    // 4. Power Event Detection
    db.run(`CREATE TABLE IF NOT EXISTS power_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER,
      event_type TEXT,
      delta_power REAL,
      detected_device TEXT,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => { if (!err) ensureUserIdColumn('power_events'); });

    // 5. Daily Energy Summary
    db.run(`CREATE TABLE IF NOT EXISTS daily_energy_summary (
      date TEXT PRIMARY KEY,
      total_energy_kwh REAL,
      estimated_energy_kwh REAL,
      daily_budget_kwh REAL,
      peak_power_w REAL
    )`);

    // 6. Monthly Energy Summary
    db.run(`CREATE TABLE IF NOT EXISTS monthly_energy_summary (
      month TEXT PRIMARY KEY,
      total_energy_kwh REAL,
      monthly_limit_kwh REAL,
      difference_kwh REAL
    )`);

    // 7. System Settings
    db.run(`CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Legacy Table for daily energy tracking (Keep for compatibility)
    db.run(`CREATE TABLE IF NOT EXISTS daily_energy (
      date TEXT PRIMARY KEY,
      total_kwh REAL,
      projected_kwh REAL,
      daily_budget_kwh REAL
    )`);

    // Legacy Table for system settings
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Initialize default monthly limit if not set in new table
    db.get("SELECT value FROM system_settings WHERE key = 'monthly_limit_kwh'", (err, row) => {
      if (!row) {
        db.run("INSERT INTO system_settings (key, value) VALUES ('monthly_limit_kwh', '100')");
      }
    });

    // Initialize default monthly limit if not set in legacy table
    db.get("SELECT value FROM settings WHERE key = 'monthly_limit_kwh'", (err, row) => {
      if (!row) {
        db.run("INSERT INTO settings (key, value) VALUES ('monthly_limit_kwh', '100')");
      }
    });

    // Seed Daily Energy Summary for reports if empty
    db.get("SELECT COUNT(*) as count FROM daily_energy_summary", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log("Seeding daily_energy_summary with demo data...");
        const today = new Date();
        for (let i = 0; i <= 10; i++) { // Changed from 1 to 0 to include today
          const d = new Date();
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const est = (Math.random() * 2 + 1).toFixed(3);
          const meas = (est * (0.9 + Math.random() * 0.2)).toFixed(3);
          const peak = (Math.random() * 500 + 1000).toFixed(1);
          db.run(`INSERT INTO daily_energy_summary 
                  (date, total_energy_kwh, estimated_energy_kwh, daily_budget_kwh, peak_power_w) 
                  VALUES (?, ?, ?, ?, ?)`, 
            [dateStr, meas, est, 3.0, peak]);
        }
      }
    });

    // Seed Device Energy Log for reports if empty
    db.get("SELECT COUNT(*) as count FROM device_energy_log", (err, row) => {
      if (!err && row && row.count === 0) {
        console.log("Seeding device_energy_log with demo data...");
        const devices = ["Fridge", "AC", "Fan", "Light", "Laptop"];
        const now = Date.now();
        devices.forEach(name => {
          const wh = (Math.random() * 500 + 100).toFixed(3);
          db.run(`INSERT INTO device_energy_log (timestamp, device_id, device_name, energy_wh, user_id) 
                  VALUES (?, ?, ?, ?, ?)`, [now, 0, name, wh, 1]);
        });
      }
    });

    // Initialize mock data for the graph if empty
    db.get("SELECT COUNT(*) as count FROM daily_energy", (err, row) => {
      if (err) {
        console.error("Error checking daily_energy count:", err.message);
        return;
      }
      
      if (!row || row.count === 0) {
        console.log("Seeding mock data for energy graph...");
        const today = new Date();
        const stmt = db.prepare("INSERT INTO daily_energy (date, total_kwh) VALUES (?, ?)");
        for (let i = 10; i > 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().substring(0, 10);
          const mockKwh = (Math.random() * 4 + 1).toFixed(2);
          stmt.run(dateStr, mockKwh);
        }
        stmt.finalize();
      } else {
        console.log(`Database already has ${row.count} records. Skipping seed.`);
      }
    });
  });
}

module.exports = db;
