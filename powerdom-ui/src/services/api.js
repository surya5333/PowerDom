import axios from 'axios';

const API_URL = 'http://localhost:5000';

export const getStatus = async () => {
  try {
    const response = await axios.get(`${API_URL}/status`);
    return response.data;
  } catch (error) {
    console.error('Error fetching status:', error);
    return null;
  }
};

export const turnOn = async (id) => {
  try {
    await axios.post(`${API_URL}/on/${id}`);
    return true;
  } catch (error) {
    console.error('Error turning on device:', error);
    return false;
  }
};

export const turnOff = async (id) => {
  try {
    await axios.post(`${API_URL}/off/${id}`);
    return true;
  } catch (error) {
    console.error('Error turning off device:', error);
    return false;
  }
};

export const resetDevices = async () => {
  try {
    await axios.post(`${API_URL}/reset`);
    return true;
  } catch (error) {
    console.error('Error resetting devices:', error);
    return false;
  }
};

export const setMonthlyLimit = async (limit) => {
  try {
    await axios.post(`${API_URL}/settings/monthly-limit`, { limit });
    return true;
  } catch (error) {
    console.error('Error setting monthly limit:', error);
    return false;
  }
};

export const getHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
};

// --- Analytics APIs ---

export const getPowerHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/power-history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching power history:', error);
    return [];
  }
};

export const getPeakPower = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/peak-power`);
    return response.data;
  } catch (error) {
    console.error('Error fetching peak power:', error);
    return { peakPower: 0, timestamp: Date.now() };
  }
};

export const getDailyEnergyCurve = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/daily-energy`);
    return response.data;
  } catch (error) {
    console.error('Error fetching daily energy curve:', error);
    return [];
  }
};

export const getIdlePower = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/idle-power`);
    return response.data;
  } catch (error) {
    console.error('Error fetching idle power:', error);
    return { idlePower: 0 };
  }
};

export const getAnalyticsEvents = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/events`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics events:', error);
    return [];
  }
};

export const getAnalyticsHistory = async () => {
  try {
    const response = await axios.get(`${API_URL}/analytics/history`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analytics history:', error);
    return [];
  }
};
