const deviceConfig = require('./deviceConfig');

function calculateEnergy(deviceData) {

  const result = {};
  let totalEnergy = 0;

  for (let id = 0; id <= 12; id++) {

    const config = deviceConfig[id];
    const raw = deviceData[id] || { status: "OFF", time: 0 };

    const timeMs = raw.time;
    const hours = timeMs / (1000 * 60 * 60);
    const energy = config.power * hours;

    totalEnergy += energy;

    result[id] = {
      name: config.name,
      status: raw.status,
      time_ms: timeMs,
      energy_wh: Number(energy.toFixed(4)),
      priority: config.priority
    };
  }

  return {
    devices: result,
    total_energy_wh: Number(totalEnergy.toFixed(4))
  };
}

module.exports = calculateEnergy;