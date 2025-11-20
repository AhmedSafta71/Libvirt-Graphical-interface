// File: src/components/MigrateVmCard/MigrateVmCard.jsx
import React, { useState } from "react";

const MigrateVmCard = ({ vmName, onConfirm, onCancel }) => {
  const [destUri, setDestUri] = useState("");

  // Couleurs de ton projet
  const colors = {
    blue: "#003366",
    green: "#28a745"
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destUri.trim()) {
      alert("Please enter a destination URI (e.g. qemu+ssh://user@172.19.5.99/system)");
      return;
    }
    onConfirm(destUri.trim());
  };

  return (
    <div className="card shadow-lg border-0" style={{ borderRadius: "12px" }}>
      
      {/* Header colorisé avec ton bleu foncé */}
      <div
        className="card-header text-white"
        style={{
          backgroundColor: colors.blue,
          borderTopLeftRadius: "12px",
          borderTopRightRadius: "12px",
        }}
      >
        <h5 className="mb-0">Migrate VM: {vmName}</h5>
      </div>

      <div className="card-body">
        <p className="mb-3">
          Specify the destination hypervisor URI.<br />
          Example: <code>qemu+ssh://user@192.168.160.130/system</code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Destination URI</label>
            <input
              type="text"
              className="form-control"
              value={destUri}
              onChange={(e) => setDestUri(e.target.value)}
              placeholder="qemu+ssh://user@172.19.5.99/system"
            />
          </div>

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
            >
              Cancel
            </button>

            {/* Bouton Migrate en vert (comme ton thème projet) */}
            <button
              type="submit"
              className="btn text-white"
              style={{ backgroundColor: colors.green, borderColor: colors.green }}
            >
              Migrate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MigrateVmCard;
