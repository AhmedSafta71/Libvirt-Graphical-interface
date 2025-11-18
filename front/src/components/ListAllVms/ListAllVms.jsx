// File: ListAllVms.jsx
import React, { useState, useEffect } from "react";
import {
  listAllVms,
  startVm,
  stopVm,
  shutdownVm,
  deleteVm,          // ⬅️ import deleteVm
} from "../../services/api";
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../../utils/session";
import CreateVmCard from "../CreateVmCard/CreateVmCard";

const ListAllVms = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateVmCard, setShowCreateVmCard] = useState(false);

  const navigate = useNavigate();

  const colors = {
    blue: "#003366",
    red: "#dc2626",
  };

  // 🔹 Fonction réutilisable pour charger les VMs
  const fetchVms = async () => {
    const connection = getSession();
    if (!connection) {
      clearSession();
      navigate("/");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await listAllVms(connection);
      if (data && Array.isArray(data.vms)) {
        setVms(data.vms);
      } else {
        setError("Invalid response from backend");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch VMs. Check backend or connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // 🔹 Handlers pour Start / Stop / Shutdown / Delete
  const handleStart = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      if (!connection) {
        clearSession();
        navigate("/");
        return;
      }
      await startVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      console.error(err);
      setError(`Failed to start VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      if (!connection) {
        clearSession();
        navigate("/");
        return;
      }
      await stopVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      console.error(err);
      setError(`Failed to stop VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleShutdown = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      if (!connection) {
        clearSession();
        navigate("/");
        return;
      }
      await shutdownVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      console.error(err);
      setError(`Failed to shutdown VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vmName) => {
    const confirm = window.confirm(
      `Are you sure you want to permanently delete VM "${vmName}" ?`
    );
    if (!confirm) return;

    try {
      setLoading(true);
      const connection = getSession();
      if (!connection) {
        clearSession();
        navigate("/");
        return;
      }
      await deleteVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      console.error(err);
      setError(`Failed to delete VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🔹 Conteneur plus grand pour occuper (presque) toute la hauteur de l'écran
    <div
      className="container py-5 position-relative"
      style={{ minHeight: "80vh" }}
    >
      {/* Overlay de création VM */}
      {showCreateVmCard && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="position-relative w-75">
            <CreateVmCard />
            <button
              className="btn btn-danger position-absolute top-0 end-0 m-2"
              onClick={() => setShowCreateVmCard(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Liste des VMs */}
      <div className="row justify-content-center h-100">
        <div className="col-lg-10 col-md-12 h-100">
          {/* 🔹 Card en flex column pour coller le footer en bas */}
          <div
            className="card shadow-sm border-0 d-flex flex-column h-100"
            style={{ minHeight: "60vh" }}
          >
            <div
              className="card-header text-center py-3"
              style={{ backgroundColor: colors.blue, color: "#fff" }}
            >
              <h4 className="mb-0">Virtual Machines</h4>
            </div>
            <div className="card-body p-0 flex-grow-1 d-flex flex-column">
              {loading ? (
                <div className="text-center py-4">Loading VMs...</div>
              ) : error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : (
                <div className="table-responsive flex-grow-1">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">#</th>
                        <th>VM Name</th>
                        <th>Status</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vms.length > 0 ? (
                        vms.map((vm, index) => (
                          <tr key={index}>
                            <td className="text-center">{index + 1}</td>
                            <td>{vm.name}</td>
                            <td>
                              <span
                                className={`badge ${
                                  vm.active ? "bg-success" : "bg-secondary"
                                }`}
                              >
                                {vm.active ? "Running" : "Stopped"}
                              </span>
                            </td>
                            <td className="text-center">
                              {/* ⬇️ Logique des boutons selon état */}
                              {vm.active ? (
                                <>
                                  <button
                                    className="btn btn-outline-warning btn-sm me-2"
                                    onClick={() => handleStop(vm.name)}
                                  >
                                    Stop
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm me-2"
                                    onClick={() => handleShutdown(vm.name)}
                                  >
                                    Shutdown
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(vm.name)}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-outline-success btn-sm me-2"
                                    onClick={() => handleStart(vm.name)}
                                  >
                                    Start
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => handleDelete(vm.name)}
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          {/* ⬇️ colSpan ajusté (4 colonnes maintenant) */}
                          <td colSpan="4" className="text-center py-4">
                            <div className="text-muted">No VMs found.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 🔹 Footer poussé en bas par flex + mt-auto */}
            <div className="card-footer bg-white text-center py-3 mt-auto">
              <button
                className="btn btn-primary"
                style={{
                  backgroundColor: colors.blue,
                  borderColor: colors.blue,
                }}
                onClick={() => setShowCreateVmCard(true)}
              >
                Add New VM
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListAllVms;
