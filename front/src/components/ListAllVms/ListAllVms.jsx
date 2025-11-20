// File: ListAllVms.jsx
import React, { useState, useEffect } from "react";
import {
  listAllVms,
  startVm,
  stopVm,
  shutdownVm,
  deleteVm,
  openConsole,
  migrateVm,
} from "../../services/api";

import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../../utils/session";
import CreateVmCard from "../CreateVmCard/CreateVmCard";
import MigrateVmCard from "../MigrateVmCard/MigrateVmCard";

const ListAllVms = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateVmCard, setShowCreateVmCard] = useState(false);

  // migration
  const [showMigrateCard, setShowMigrateCard] = useState(false);
  const [vmToMigrate, setVmToMigrate] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null); // 'running' | 'success' | 'error'
  const [migrationMessage, setMigrationMessage] = useState("");
  const [migrationSubmitting, setMigrationSubmitting] = useState(false);

  const navigate = useNavigate();
  const colors = { blue: "#003366", red: "#dc2626", greenDark: "#0b7a3b" };

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
        const wsPort = result.websocketPort || result.port;
        if (!wsPort) {
          alert("Console error: websocket port missing!");
          return;
        }

        const host = window.location.hostname;
        const url = `https://${host}:${wsPort}/vnc.html?host=${host}&port=${wsPort}&path=websockify&autoconnect=1`;
        // const url = `https://${host}:${wsPort}/vnc.html?host=${host}&port=${wsPort}&path=websockify&autoconnect=1`;


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
  // 🔥 MIGRATION HANDLERS
  // ============================================================
  const openMigrateModal = (vmName) => {
    setVmToMigrate(vmName);
    setShowMigrateCard(true);
    // reset messages à chaque ouverture
    setMigrationStatus(null);
    setMigrationMessage("");
  };

  const closeMigrateModal = () => {
    setVmToMigrate(null);
    setShowMigrateCard(false);
    setMigrationSubmitting(false);
  };

  const handleConfirmMigrate = async (destUri) => {
    try {
      setMigrationSubmitting(true);
      setMigrationStatus("running");
      setMigrationMessage(
        `Migrating "${vmToMigrate}" to ${destUri} ...`
      );

      const connection = getSession();
      const result = await migrateVm(connection, vmToMigrate, destUri);
      console.log("Migration result:", result);

      if (result.status === "ok") {
        setMigrationStatus("success");
        setMigrationMessage(
          `Migration of "${vmToMigrate}" to ${destUri} successful.`
        );

        // reload la liste des VMs pour voir le résultat
        await fetchVms();

        // fermer la carte de migration
        closeMigrateModal();
      } else {
        setMigrationStatus("error");
        setMigrationMessage(
          `Migration error: ${result.message || "unknown error"}`
        );
      }
    } catch (err) {
      console.error("Migration error:", err);
      setMigrationStatus("error");
      setMigrationMessage("Failed to migrate VM.");
    } finally {
      setMigrationSubmitting(false);
    }
  };

  // ============================================================
  // 🔹 UI
  // ============================================================
  return (
    <div className="container py-5 position-relative" style={{ minHeight: "80vh" }}>
      {/* Create VM Modal */}
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

      {/* Migrate VM Modal */}
      {showMigrateCard && vmToMigrate && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
        >
          <div className="position-relative w-75">
            <MigrateVmCard
              vmName={vmToMigrate}
              onConfirm={handleConfirmMigrate}
              onCancel={closeMigrateModal}
              isSubmitting={migrationSubmitting}
            />
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
              {/* Banner d’erreur globale */}
              {error && (
                <div className="alert alert-danger m-3">
                  {error}
                </div>
              )}

              {/* Bannières de migration */}
              {migrationStatus === "running" && (
                <div className="alert alert-info m-3">
                  {migrationMessage || "Migration in progress..."}
                </div>
              )}
              {migrationStatus === "success" && (
                <div className="alert alert-success m-3">
                  {migrationMessage || "Migration successful."}
                </div>
              )}
              {migrationStatus === "error" && (
                <div className="alert alert-danger m-3">
                  {migrationMessage || "Migration failed."}
                </div>
              )}

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
                            className={`badge ${
                              vm.active ? "bg-success" : "bg-secondary"
                            }`}
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

                          {/* Bouton migrate vert foncé + petit effet "bounce" */}
                          <button
                            className="btn btn-sm me-2 text-white"
                            style={{
                              backgroundColor: colors.greenDark,
                              borderColor: colors.greenDark,
                              transition: "transform 0.1s ease",
                            }}
                            onMouseDown={(e) =>
                              (e.currentTarget.style.transform = "scale(0.95)")
                            }
                            onMouseUp={(e) =>
                              (e.currentTarget.style.transform = "scale(1)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.transform = "scale(1)")
                            }
                            onClick={() => openMigrateModal(vm.name)}
                          >
                            Migrate
                          </button>

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
