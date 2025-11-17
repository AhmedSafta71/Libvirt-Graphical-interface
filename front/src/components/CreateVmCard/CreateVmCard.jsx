// File: CreateVmCard.jsx
import React, { useState } from "react";
import { createVm } from "../../services/api"; // adapte le chemin si besoin

const CreateVmCard = () => {
  const colors = {
    blue: "#003366",
    red: "#dc2626",
  };

  // Variables pour le formulaire
  const [vmName, setVmName] = useState("");
  const [cpu, setCpu] = useState(1);
  const [memory, setMemory] = useState(256); // min 256 MB
  const [iso, setIso] = useState("");
  const [diskSize, setDiskSize] = useState(8192); // 8 Go par défaut (en MB)
  const [network, setNetwork] = useState("default"); // pour l'instant un seul réseau
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Exemple d’ISOs disponibles
  const isoList = ["ubuntu-11.04-server-amd64.iso","debian-13.1.0-amd64-netinst.iso"];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation simple
    if (
      !vmName ||
      cpu < 1 ||
      memory < 256 ||
      memory > 4096 ||
      !iso ||
      diskSize < 1024 || // 1 Go minimum
      diskSize > 102400 // 100 Go max (adaptable)
    ) {
      setMessage({
        type: "error",
        text: "Veuillez remplir correctement tous les champs. Mémoire : 256-4096 MB, Disque : 1024-102400 MB",
      });
      return;
    }

    const payload = {
      vmName,
      cpu,
      memory,
      iso,
      disk_size: diskSize, // ⚠️ correspond à j_disk_size côté C
      network,             // nouveau champ pour le backend
      // éventuellement protocol/user/host/port/path plus tard
    };

    try {
      setLoading(true);
      setMessage(null);

      const res = await createVm(payload);

      if (res.success) {
        setMessage({
          type: "success",
          text: res.message || `VM "${vmName}" créée avec succès !`,
        });

        // Reset formulaire
        setVmName("");
        setCpu(1);
        setMemory(256);
        setIso("");
        setDiskSize(8192);
        setNetwork("default");
      } else {
        setMessage({
          type: "error",
          text: res.error || "Erreur lors de la création de la VM.",
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text: "Erreur de communication avec le serveur de virtualisation.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div
        className="card-header text-center py-3"
        style={{ backgroundColor: colors.blue, color: "#fff" }}
      >
        <h4 className="mb-0">Create New Virtual Machine</h4>
      </div>
      <div className="card-body p-4">
        <form onSubmit={handleSubmit}>
          {/* VM Name */}
          <div className="mb-3">
            <label className="form-label fw-semibold">VM Name</label>
            <input
              type="text"
              className="form-control"
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              placeholder="Enter VM name"
            />
          </div>

          {/* CPU */}
          <div className="mb-3">
            <label className="form-label fw-semibold">CPU Cores</label>
            <input
              type="number"
              className="form-control"
              value={cpu}
              min={1}
              max={32}
              onChange={(e) => setCpu(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          {/* Memory */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Memory (MB)</label>
            <input
              type="number"
              className="form-control"
              value={memory}
              min={256}
              max={4096}
              onChange={(e) => setMemory(parseInt(e.target.value, 10) || 256)}
            />
            <small className="text-muted">Min: 256 MB, Max: 4096 MB</small>
          </div>

          {/* Disk Size */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Disk Size (MB)</label>
            <input
              type="number"
              className="form-control"
              value={diskSize}
              min={1024}
              max={102400}
              onChange={(e) =>
                setDiskSize(parseInt(e.target.value, 10) || 1024)
              }
            />
            <small className="text-muted">
              Min: 1024 MB (1 Go), Max: 102400 MB (100 Go)
            </small>
          </div>

          {/* Network */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Network</label>
            <select
              className="form-select"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              {/* Pour l'instant un seul réseau, mais évolutif */}
              <option value="default">default</option>
            </select>
          </div>

          {/* ISO */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Select ISO</label>
            <select
              className="form-select"
              value={iso}
              onChange={(e) => setIso(e.target.value)}
            >
              <option value="">-- Select ISO --</option>
              {isoList.map((item, idx) => (
                <option key={idx} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="d-flex gap-2">
            <button
              type="submit"
              className="btn btn-primary flex-grow-1"
              style={{ backgroundColor: colors.blue, borderColor: colors.blue }}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create VM"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setVmName("");
                setCpu(1);
                setMemory(256);
                setIso("");
                setDiskSize(8192);
                setNetwork("default");
                setMessage(null);
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {/* Feedback Message */}
        {message && (
          <div
            className={`alert mt-4 ${
              message.type === "success" ? "alert-success" : "alert-danger"
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateVmCard;
