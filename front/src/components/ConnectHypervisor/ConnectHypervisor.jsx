// File: CreateVmCard.jsx
import React, { useState } from "react";

const CreateVmCard = () => {
  const colors = {
    blue: "#003366",
    red: "#dc2626",
  };

  const [vmName, setVmName] = useState("");
  const [cpu, setCpu] = useState(1);
  const [memory, setMemory] = useState(256); // valeur initiale min 256
  const [iso, setIso] = useState("");
  const [message, setMessage] = useState(null);

  const isoList = [
    "ubuntu-22.04.iso",
    "centos-8.iso",
    "debian-11.iso",
    "fedora-36.iso",
  ];

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!vmName || cpu < 1 || memory < 256 || memory > 4096 || !iso) {
      setMessage({
        type: "error",
        text: "Remplissez tous les champs correctement. Mémoire entre 256 et 4096 MB.",
      });
      return;
    }

    console.log({ vmName, cpu, memory, iso });
    setMessage({ type: "success", text: `VM "${vmName}" créée avec succès !` });

    setVmName("");
    setCpu(1);
    setMemory(256);
    setIso("");
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-6 col-md-8 col-sm-12">
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
                    onChange={(e) => setCpu(parseInt(e.target.value, 10))}
                  />
                </div>

                {/* Memory */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Memory (MB) [256 - 4096]
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={memory}
                    min={256}
                    max={4096}
                    onChange={(e) => setMemory(parseInt(e.target.value, 10))}
                  />
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
                  >
                    Create VM
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setVmName("");
                      setCpu(1);
                      setMemory(256);
                      setIso("");
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
        </div>
      </div>
    </div>
  );
};

export default CreateVmCard;
