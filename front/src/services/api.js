// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://localhost:8080';

export const getVMs = async () => {
  const response = await axios.get(`${API_BASE}/vms`);
  return response.data;
};

export const startVM = async (vmName) => {
  return await axios.post(`${API_BASE}/vms/${vmName}/start`);
};

export const stopVM = async (vmName) => {
  return await axios.post(`${API_BASE}/vms/${vmName}/stop`);
};

export const connectHypervisor = async (host, user) => {
  return await axios.post(`${API_BASE}/connect`, { host, user });
};