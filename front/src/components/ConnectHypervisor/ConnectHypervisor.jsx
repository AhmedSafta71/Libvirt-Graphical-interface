import React, { useState } from 'react';
import { connectHypervisor } from '../../services/api';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ConnectHypervisor() {
  const [protocol, setProtocol] = useState('qemu+ssh');
  const [user, setUser] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [path, setPath] = useState('system');
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResp(null);
    setError(null);
    try {
      const payload = {
        protocol,
        user: user || undefined,
        host: host || undefined,
        port: port ? parseInt(port, 10) : undefined,
        path
      };
      const data = await connectHypervisor(payload);
      setResp(data);
    } catch (err) {
      // try to extract error message
      setError(err.response?.data || err.message || 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card m-3 p-3 shadow-sm" style={{ maxWidth: 720 }}>
      <h5 className="card-title">Connect to Hypervisor</h5>
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="form-label">Transport / Protocol</label>
          <select className="form-select" value={protocol} onChange={(e) => setProtocol(e.target.value)}>
            <option value="qemu+ssh">qemu+ssh (SSH)</option>
            <option value="qemu">qemu (local tcp)</option>
            <option value="local">local (qemu:///system)</option>
          </select>
          <div className="form-text">Choose qemu+ssh to connect over SSH to a remote host on the same network.</div>
        </div>

        <div className="row">
          <div className="col-md-4 mb-2">
            <label className="form-label">User</label>
            <input className="form-control" value={user} onChange={(e) => setUser(e.target.value)} placeholder="user (ssh)" />
          </div>
          <div className="col-md-5 mb-2">
            <label className="form-label">Host</label>
            <input className="form-control" value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.20 or hostname" />
          </div>
          <div className="col-md-3 mb-2">
            <label className="form-label">Port</label>
            <input className="form-control" value={port} onChange={(e) => setPort(e.target.value)} placeholder="22" />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Path</label>
          <select className="form-select" value={path} onChange={(e) => setPath(e.target.value)}>
            <option value="system">system</option>
            <option value="session">session</option>
          </select>
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Connecting…' : 'Connect'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => { setUser(''); setHost(''); setPort(''); setResp(null); setError(null); }}>
            Reset
          </button>
        </div>
      </form>

      <div className="mt-3">
        {resp && (
          <div className="alert alert-success" role="alert">
            Connected: <strong>{resp.uri}</strong> — {resp.message}
          </div>
        )}
        {error && (
          <div className="alert alert-danger" role="alert">
            Error: {typeof error === 'string' ? error : JSON.stringify(error)}
          </div>
        )} 
      </div>
    </div>
  );
}
