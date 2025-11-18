// File: ListAllVms.jsx
import React, { useState, useEffect } from "react";
import {
  listAllVms,
  startVm,
  stopVm,
  shutdownVm,
  deleteVm,
  openConsole,
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
  const colors = { blue: "#003366", red: "#dc2626" };

  // ============================================================
  // 🔹 FETCH VMs
  // ============================================================
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
      if (data && Array.isArray(data.vms)) setVms(data.vms);
      else setError("Invalid response from backend");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch VMs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVms();
  }, [navigate]);

  // ============================================================
  // 🔥 OPEN CONSOLE HANDLER (noVNC)
  // ============================================================
  const handleOpenConsole = async (vmName) => {
    try {
      const connection = getSession();
      const result = await openConsole(connection, vmName);

      if (result.status === "ok") {
        // backend renvoie websocketPort et port
        const wsPort = result.websocketPort || result.port;
        if (!wsPort) {
          alert("Console error: websocket port missing!");
          return;
        }

        // utiliser le host actuel (pas de hardcoding)
        const host = window.location.hostname;

        // URL noVNC complète et correcte
        const url = `http://${host}:${wsPort}/vnc.html?host=${host}&port=${wsPort}&path=websockify&autoconnect=1`;

        console.log("Opening Console:", url);

        window.open(url, "_blank");
      } else {
        alert("Console error: " + result.message);
      }
    } catch (err) {
      console.error("Console error:", err);
      alert("Failed to open console.");
    }
  };

  // ============================================================
  // 🔹 VM ACTIONS
  // ============================================================
  const handleStart = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      await startVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      setError(`Failed to start VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      await stopVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      setError(`Failed to stop VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleShutdown = async (vmName) => {
    try {
      setLoading(true);
      const connection = getSession();
      await shutdownVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      setError(`Failed to shutdown VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vmName) => {
    if (!window.confirm(`Delete VM "${vmName}" ?`)) return;

    try {
      setLoading(true);
      const connection = getSession();
      await deleteVm(connection, vmName);
      await fetchVms();
    } catch (err) {
      setError(`Failed to delete VM "${vmName}".`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔹 UI
  // ============================================================
  return (
    <div className="container py-5 position-relative" style={{ minHeight: "80vh" }}>
      
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

      <div className="row justify-content-center h-100">
        <div className="col-lg-10 col-md-12 h-100">
          <div className="card shadow-sm border-0 d-flex flex-column h-100">
            
            <div
              className="card-header text-center py-3"
              style={{ backgroundColor: colors.blue, color: "#fff" }}
            >
              <h4 className="mb-0">Virtual Machines</h4>
            </div>

            <div className="card-body p-0 flex-grow-1 d-flex flex-column">
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
                    {vms.map((vm, index) => (
                      <tr key={index}>
                        <td className="text-center">{index + 1}</td>
                        <td>{vm.name}</td>

                        <td>
                          <span
                            className={`badge ${vm.active ? "bg-success" : "bg-secondary"}`}
                          >
                            {vm.active ? "Running" : "Stopped"}
                          </span>
                        </td>

                        <td className="text-center">

                          {vm.active && (
                            <button
                              className="btn btn-primary btn-sm me-2"
                              onClick={() => handleOpenConsole(vm.name)}
                            >
                              Open Console
                            </button>
                          )}

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
                    ))}
                  </tbody>

                </table>
              </div>
            </div>

            <div className="card-footer bg-white text-center py-3 mt-auto">
              <button
                className="btn btn-primary"
                style={{ backgroundColor: colors.blue, borderColor: colors.blue }}
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
