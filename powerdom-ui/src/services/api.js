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
