const deviceConfig = require('./deviceConfig'); 
 
 let lastActionTime = 0; 
 const COOLDOWN_MS = 10000; // 10 sec cooldown 
 
 /**
  * Direct Power Control logic.
  * Reduces load based on remaining budget / remaining hours.
  * 
  * @param {object} deviceData - Live status from Arduino
  * @param {number} energySoFarKwh - Consumption today so far
  * @param {number} dailyBudgetKwh - Dynamic budget for today
  * @param {function} turnOffDevice - Callback to trigger OFF
  * @returns {array} notifications
  */
 function performPowerControl(deviceData, energySoFarKwh, dailyBudgetKwh, turnOffDevice) { 
 
   const now = Date.now(); 
   if (now - lastActionTime < COOLDOWN_MS) return []; 
 
   const notifications = []; 
 
   const currentHour = new Date().getHours(); 
   const currentMinute = new Date().getMinutes(); 
   const elapsedHours = currentHour + currentMinute / 60; 
   const remainingHours = Math.max(0.1, 24 - elapsedHours); 
 
   const remainingBudget = dailyBudgetKwh - energySoFarKwh; 
 
   if (remainingBudget <= 0) { 
     notifications.push("CRITICAL: Daily budget exhausted."); 
   } 
 
   const allowedPowerKw = remainingBudget / remainingHours; 
 
   // Build active devices 
   let activeDevices = Object.entries(deviceData) 
     .filter(([id, data]) => data.status === "ON") 
     .map(([id]) => ({ 
       id, 
       name: deviceConfig[id]?.name || `Device ${id}`, 
       priority: deviceConfig[id]?.priority ?? 5, 
       powerKw: (deviceConfig[id]?.power ?? 100) / 1000 
     })) 
     .sort((a, b) => { 
       // Priority DESC (lower importance first)
       if (b.priority !== a.priority) return b.priority - a.priority; 
       // Power DESC (bigger loads first)
       return b.powerKw - a.powerKw; 
     }); 
 
   let currentPowerKw = activeDevices.reduce((sum, d) => sum + d.powerKw, 0); 
 
   if (currentPowerKw <= allowedPowerKw) { 
     return []; 
   } 
 
   // Shed loads sequentially until stable
   for (const device of activeDevices) { 
 
     if (device.priority === 1) { 
       notifications.push("CRITICAL: High priority load exceeds allowed power. Manual action required."); 
       // We stop auto-shedding once we hit Priority 1
       break; 
     } 
 
     turnOffDevice(device.id); 
     currentPowerKw -= device.powerKw; 
 
     notifications.push( 
       `AUTO SHUTDOWN: ${device.name} (Priority ${device.priority}) to maintain budget stability.` 
     ); 
 
     lastActionTime = now; 
 
     // Re-check if we are now below the allowed power
     if (currentPowerKw <= allowedPowerKw) break; 
   } 
 
   return notifications; 
 } 
 
 module.exports = { 
   performPowerControl 
 };
