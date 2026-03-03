const db = require('./db');

/**
 * Calculates the dynamic daily budget based on remaining monthly energy.
 * @param {number} currentDayWh - Energy consumed today in Wh.
 */
async function getDynamicDailyBudget(currentDayWh = 0) {
  return new Promise((resolve, reject) => {
    const today = new Date();
    const currentMonth = today.toISOString().substring(0, 7); // YYYY-MM
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const elapsedDays = today.getDate() - 1; // Days fully completed so far
    const remainingDays = daysInMonth - elapsedDays; // Includes today

    // Get Monthly Limit from settings
    db.get("SELECT value FROM settings WHERE key = 'monthly_limit_kwh'", (err, setting) => {
      if (err) return reject(err);
      
      const monthlyLimitKwh = setting ? parseFloat(setting.value) : 100;

      // Get Total Consumed so far this month (from previous days)
      db.get("SELECT SUM(total_kwh) as consumed FROM daily_energy WHERE date LIKE ? AND date < ?", 
        [`${currentMonth}%`, today.toISOString().substring(0, 10)], 
        (err, row) => {
          if (err) return reject(err);
          
          const consumedPreviousDays = row ? (row.consumed || 0) : 0;
          const currentDayKwh = currentDayWh / 1000;
          
          const remainingBudgetForMonth = monthlyLimitKwh - consumedPreviousDays;
          
          // Today's budget is the dynamic allocation for the remaining days
          const dailyBudget = remainingBudgetForMonth / remainingDays;
          
          // Remaining budget specifically for TODAY
          const remainingTodayBudgetKwh = dailyBudget - currentDayKwh;
          
          const totalConsumedMonthKwh = consumedPreviousDays + currentDayKwh;
          const totalRemainingMonthBudgetKwh = monthlyLimitKwh - totalConsumedMonthKwh;

          resolve({
            dailyBudgetKwh: Math.max(0, dailyBudget),
            remainingTodayBudgetKwh: Math.max(0, remainingTodayBudgetKwh),
            monthlyLimitKwh,
            consumedMonthKwh: totalConsumedMonthKwh,
            remainingMonthBudgetKwh: Math.max(0, totalRemainingMonthBudgetKwh),
            remainingDays
          });
        }
      );
    });
  });
}

/**
 * Linear projection to predict end-of-day consumption.
 * Reactive formula: Today's Consumption + (Current Power Draw * Remaining Hours)
 */
function getProjectedConsumption(currentTotalWh, currentPowerDrawWatts = 0) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const elapsedMs = now.getTime() - startOfDay;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = Math.max(0, 24 - elapsedHours);

  // Current consumption in kWh
  const currentKwh = currentTotalWh / 1000;
  
  // Future consumption (kWh) = Current Power Draw (kW) * Remaining Hours
  const futureKwh = (currentPowerDrawWatts / 1000) * remainingHours;

  const projectedEndDayKwh = currentKwh + futureKwh;

  return projectedEndDayKwh;
}

module.exports = {
  getDynamicDailyBudget,
  getProjectedConsumption
};
