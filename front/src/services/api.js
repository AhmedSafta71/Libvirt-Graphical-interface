// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://100.82.183.59:8080';



export async function connectHypervisor(payload) {
  const res = await axios.post(`${API_BASE}/connect`, payload);
  return res.data;
}

export async function listAllVms(payload) {
  const res = await axios.post(`${API_BASE}/listallvms`, payload);
  return res.data;
}

export async function createVm(payload) {
  const res = await axios.post(`${API_BASE}/createvm`, payload);
  return res.data;
}
