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

  // Cas le plus simple dans ton projet :
  // - backend et libvirt sur la même machine -> qemu:///system
  // On ignore host/user/port pour l'instant
  if (protocol === 'qemu') {
    return `${protocol}:///${path}`;
  }

  // Si plus tard tu passes en qemu+ssh :
  // qemu+ssh://user@host:port/path
  const userPart = user ? `${user}@` : '';
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${userPart}${host}${portPart}/${path}`;
}

/**
 * Connexion à l'hyperviseur
 */
export async function connectHypervisor(payload) {
  const res = await axios.post(`${API_BASE}/connect`, payload);
  return res.data;
}

/**
 * Liste toutes les VMs
 * payload = objet de session (ce que tu stockes avec setSession)
 */
export async function listAllVms(payload) {
  const res = await axios.post(`${API_BASE}/listallvms`, payload);
  return res.data;
}

/**
 * Création d'une VM
 * payload = { vmName, cpu, memory, iso, disk_size, network, ... }
 */
export async function createVm(payload) {
  const res = await axios.post(`${API_BASE}/createvm`, payload);
  return res.data;
}

/**
 * Démarrer une VM
 * session = objet retourné par connectHypervisor (via getSession())
 * vmName  = nom de la VM à démarrer
 */
export async function startVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/startvm`, payload);
  return res.data;
}

/**
 * Arrêter (stop) une VM (arrêt “brutal” type poweroff)
 */
export async function stopVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/stopvm`, payload);
  return res.data;
}

/**
 * Shutdown propre de la VM (équivalent ACPI / arrêt propre de l’OS)
 */
export async function shutdownVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/shutdownvm`, payload);
  return res.data;
}

/**
 * Delete complet de la VM (stop + undefine + delete disk)
 */
export async function deleteVm(session, vmName) {
  const uri = buildLibvirtUri(session);
  const payload = { uri, vmName };
  const res = await axios.post(`${API_BASE}/deletevm`, payload);
  return res.data;
}
