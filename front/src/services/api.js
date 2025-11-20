// src/services/api.js
import axios from 'axios';

const API_BASE = 'http://192.168.160.136:8080';

/**
 * Helper : construit l'URI libvirt à partir de la session
 * session = { protocol, user, host, port, path, ... }
 */
function buildLibvirtUri(session) {
  if (!session) return null;

  const {
    protocol = 'qemu', // par défaut qemu
    user,
    host,
    port,
    path = 'system',
  } = session;

  // Cas simple : qemu:///system
  if (protocol === 'qemu') {
    return `${protocol}:///${path}`;
  }

  // Support futur : qemu+ssh://user@host:port/path
  const userPart = user ? `${user}@` : '';
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${userPart}${host}${portPart}/${path}`;
}


// function buildLibvirtUri(session) {
//   // Cas simple : aucune session → fallback local qemu
//   if (!session) {
//     return "qemu:///system";
//   }

//   const {
//     protocol,
//     user,
//     host,
//     port,
//     path = "system",
//   } = session;

//   // Si pas de protocole ou protocole qemu → local qemu
//   if (!protocol || protocol === "qemu") {
//     return `qemu:///${path}`;
//   }

//   // Si host est undefined / null / chaîne "undefined" → fallback qemu:///system
//   if (!host || host === "undefined") {
//     return "qemu:///system";
//   }

//   // Cas avancé : qemu+ssh, etc.
//   const userPart = user ? `${user}@` : "";
//   const portPart = port ? `:${port}` : "";
//   return `${protocol}://${userPart}${host}${portPart}/${path}`;
// }

/**
 * Connexion à l'hyperviseur
 */
export async function connectHypervisor(payload) {
  const res = await axios.post(`${API_BASE}/connect`, payload);
  return res.data;
}

/**
 * Liste toutes les VMs
 */ export async function listAllVms(payload) {
  const res = await axios.post(`${API_BASE}/listallvms`, payload);
  return res.data;
}

/**
 * Création d'une VM
 */
export async function createVm(payload) {
  const res = await axios.post(`${API_BASE}/createvm`, payload);
  return res.data;
}

/**
 * Start VM
 */
export async function startVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/startvm`, payload);
  return res.data;
}

/**
 * Stop VM
 */
export async function stopVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/stopvm`, payload);
  return res.data;
}

/**
 * Shutdown VM (clean ACPI)
 */
export async function shutdownVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/shutdownvm`, payload);
  return res.data;
}

/**
 * Delete VM (undefine + delete disk)
 */
export async function deleteVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/deletevm`, payload);
  return res.data;
}


export async function openConsole(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };

  const res = await axios.post(`${API_BASE}/consolevm`, payload);
  return res.data;
}

export async function migrateVm(session, vmName, destUri) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName, destUri };
  const res = await axios.post(`${API_BASE}/migratevm`, payload);
  return res.data;
}