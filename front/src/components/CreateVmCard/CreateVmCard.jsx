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
  const isoList = [
    "ubuntu-11.04-server-amd64.iso",
    "debian-13.1.0-amd64-netinst.iso",
  ];

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
      network, // nouveau champ pour le backend
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
    // wrapper pour centrer la carte et limiter la largeur
    <div className="d-flex justify-content-center">
      <div
        className="card shadow-sm border-0"
        style={{
          maxWidth: "480px",   // largeur max de la carte
          width: "100%",       // prend toute la largeur disponible jusqu'à 480px
          fontSize: "0.9rem",  // texte un peu plus petit
        }}
      >
        <div
          className="card-header text-center py-2"
          style={{ backgroundColor: colors.blue, color: "#fff" }}
        >
          <h5 className="mb-0">Create New VM</h5>
        </div>

        <div className="card-body p-3">
          <form onSubmit={handleSubmit}>
            {/* VM Name */}
            <div className="mb-2">
              <label className="form-label fw-semibold">VM Name</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={vmName}
                onChange={(e) => setVmName(e.target.value)}
                placeholder="Enter VM name"
              />
            </div>

            {/* CPU & Memory sur la même ligne pour gagner de la place */}
            <div className="row">
              <div className="col-6 mb-2">
                <label className="form-label fw-semibold">CPU Cores</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={cpu}
                  min={1}
                  max={32}
                  onChange={(e) => setCpu(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="col-6 mb-2">
                <label className="form-label fw-semibold">Memory (MB)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={memory}
                  min={256}
                  max={4096}
                  onChange={(e) =>
                    setMemory(parseInt(e.target.value, 10) || 256)
                  }
                />
                <small className="text-muted">256 - 4096</small>
              </div>
            </div>

            {/* Disk Size & Network sur la même ligne */}
            <div className="row">
              <div className="col-6 mb-2">
                <label className="form-label fw-semibold">Disk (MB)</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={diskSize}
                  min={1024}
                  max={102400}
                  onChange={(e) =>
                    setDiskSize(parseInt(e.target.value, 10) || 1024)
                  }
                />
                <small className="text-muted">1024 - 102400</small>
              </div>
              <div className="col-6 mb-2">
                <label className="form-label fw-semibold">Network</label>
                <select
                  className="form-select form-select-sm"
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                >
                  <option value="default">default</option>
                </select>
              </div>
            </div>

            {/* ISO */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Select ISO</label>
              <select
                className="form-select form-select-sm"
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
                className="btn btn-primary btn-sm flex-grow-1"
                style={{
                  backgroundColor: colors.blue,
                  borderColor: colors.blue,
                }}
                disabled={loading}
              >
                {loading ? "Creating..." : "Create VM"}
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
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
              className={`alert mt-3 mb-0 ${
                message.type === "success" ? "alert-success" : "alert-danger"
              }`}
              role="alert"
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateVmCard;
