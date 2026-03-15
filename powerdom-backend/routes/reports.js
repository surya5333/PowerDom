const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const db = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

/**
 * Helper to format date with timezone
 */
function formatDate(timestamp, timezone = 'UTC') {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(timestamp));
  } catch (e) {
    return new Date(timestamp).toISOString().split('T')[0];
  }
}

/**
 * Helper to apply common Excel styles (Modified for Streaming)
 */
function applyStreamStyles(worksheet, columns) {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };
}

// 1. Energy Summary Report
router.get('/energy-summary', auth, async (req, res) => {
  const { start_date, end_date, timezone = 'UTC' } = req.query;

  if (!start_date || !end_date) {
    return res.status(422).json({ error: 'start_date and end_date are mandatory' });
  }

  const start = new Date(start_date).getTime();
  const end = new Date(end_date).getTime();
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);

  if (diffDays > 366) {
    return res.status(422).json({ error: 'Date range exceeds 366 days' });
  }

  try {
    const query = `
      SELECT date, total_energy_kwh, estimated_energy_kwh, daily_budget_kwh, peak_power_w 
      FROM daily_energy_summary 
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `;

    db.all(query, [start_date, end_date], async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0) return res.status(204).end();

      const filename = `EnergySummary_${start_date}_${end_date}.xlsx`;
      
      const etag = crypto.createHash('md5').update(JSON.stringify(rows)).digest('hex');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet('Energy Summary');

      const columns = [
        { header: 'Date', key: 'date', width: 15, style: { alignment: { horizontal: 'left' } } },
        { header: 'Estimated Energy (kWh)', key: 'estimated', width: 25, style: { numFmt: '0.000', alignment: { horizontal: 'right' } } },
        { header: 'Measured Energy (kWh)', key: 'measured', width: 25, style: { numFmt: '0.000', alignment: { horizontal: 'right' } } },
        { header: 'Daily Budget (kWh)', key: 'budget', width: 20, style: { numFmt: '0.000', alignment: { horizontal: 'right' } } },
        { header: 'Peak Power (W)', key: 'peak', width: 15, style: { numFmt: '0.000', alignment: { horizontal: 'right' } } }
      ];
      worksheet.columns = columns;

      applyStreamStyles(worksheet, columns);

      let totalEst = 0, totalMeas = 0, totalBudget = 0;

      rows.forEach(row => {
        totalEst += row.estimated_energy_kwh || 0;
        totalMeas += row.total_energy_kwh || 0;
        totalBudget += row.daily_budget_kwh || 0;

        worksheet.addRow({
          date: row.date,
          estimated: Number(row.estimated_energy_kwh || 0),
          measured: Number(row.total_energy_kwh || 0),
          budget: Number(row.daily_budget_kwh || 0),
          peak: Number(row.peak_power_w || 0)
        }).commit();
      });

      // Total Row
      const totalRow = worksheet.addRow({
        date: 'TOTAL',
        estimated: totalEst,
        measured: totalMeas,
        budget: totalBudget,
        peak: ''
      });
      totalRow.commit();

      await workbook.commit();
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Device Usage Report
router.get('/device-usage', auth, async (req, res) => {
  const { start_date, end_date, timezone = 'UTC' } = req.query;

  if (!start_date || !end_date) {
    return res.status(422).json({ error: 'start_date and end_date are mandatory' });
  }

  const start = new Date(start_date).getTime();
  const end = new Date(end_date).getTime();
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);

  if (diffDays > 366) {
    return res.status(422).json({ error: 'Date range exceeds 366 days' });
  }

  try {
    const userId = req.user.id;
    const query = `
      SELECT device_name, SUM(energy_wh)/1000 as total_kwh 
      FROM device_energy_log 
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY device_name
      ORDER BY total_kwh DESC
    `;

    db.all(query, [start, end], async (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!rows || rows.length === 0) return res.status(204).end();

      const filename = `DeviceUsage_${start_date}_${end_date}.xlsx`;
      
      const etag = crypto.createHash('md5').update(JSON.stringify(rows)).digest('hex');
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      const worksheet = workbook.addWorksheet('Device Usage');

      const columns = [
        { header: 'Device Name', key: 'name', width: 25, style: { alignment: { horizontal: 'left' } } },
        { header: 'Total Energy (kWh)', key: 'energy', width: 25, style: { numFmt: '0.000', alignment: { horizontal: 'right' } } }
      ];
      worksheet.columns = columns;

      applyStreamStyles(worksheet, columns);

      let totalEnergy = 0;

      rows.forEach(row => {
        totalEnergy += row.total_kwh || 0;
        worksheet.addRow({
          name: row.device_name,
          energy: Number(row.total_kwh || 0)
        }).commit();
      });

      const totalRow = worksheet.addRow({
        name: 'TOTAL',
        energy: totalEnergy
      });
      totalRow.commit();

      await workbook.commit();
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
