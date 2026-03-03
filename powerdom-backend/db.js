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
    // Table for daily energy tracking
    db.run(`CREATE TABLE IF NOT EXISTS daily_energy (
      date TEXT PRIMARY KEY,
      total_kwh REAL,
      projected_kwh REAL,
      daily_budget_kwh REAL
    )`);

    // Table for device usage history
    db.run(`CREATE TABLE IF NOT EXISTS device_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      device_id TEXT,
      energy_wh REAL,
      status TEXT
    )`);

    // Table for monthly summaries
    db.run(`CREATE TABLE IF NOT EXISTS monthly_summary (
      month TEXT PRIMARY KEY,
      total_kwh REAL,
      monthly_limit_kwh REAL,
      over_under_value REAL
    )`);

    // Table for system settings (like monthly limit)
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`);

    // Initialize default monthly limit if not set
    db.get("SELECT value FROM settings WHERE key = 'monthly_limit_kwh'", (err, row) => {
      if (!row) {
        db.run("INSERT INTO settings (key, value) VALUES ('monthly_limit_kwh', '100')");
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
