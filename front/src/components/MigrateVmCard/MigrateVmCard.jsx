// File: src/components/MigrateVmCard/MigrateVmCard.jsx
import React, { useState } from "react";

const MigrateVmCard = ({ vmName, onConfirm, onCancel, isSubmitting }) => {
  const [destUri, setDestUri] = useState("");

  // Couleurs de ton projet
  const colors = {
    blue: "#003366",
    greenDark: "#0b7a3b", // vert foncé style libvirt
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!destUri.trim()) {
      alert(
        "Please enter a destination URI (e.g. qemu+ssh://user@192.168.160.135/system)"
      );
      return;
    }
    onConfirm(destUri.trim());
  };

  const migrateButtonStyle = {
    backgroundColor: colors.greenDark,
    borderColor: colors.greenDark,
    transform: isSubmitting ? "scale(0.97)" : "scale(1)",
    boxShadow: isSubmitting
      ? "0 0 0 0 rgba(0,0,0,.15)"
      : "0 0.25rem 0.5rem rgba(0,0,0,.15)",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
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
          Specify the destination hypervisor URI.
          <br />
          Example: <code>qemu+ssh://user@192.168.160.135/system</code>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Destination URI</label>
            <input
              type="text"
              className="form-control"
              value={destUri}
              onChange={(e) => setDestUri(e.target.value)}
              placeholder="qemu+ssh://user@192.168.160.135/system"
              disabled={isSubmitting}
            />
          </div>

          <div className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            {/* Bouton Migrate vert foncé + effet "pressed" quand en cours */}
            <button
              type="submit"
              className="btn text-white"
              style={migrateButtonStyle}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Migrating..." : "Migrate"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MigrateVmCard;
