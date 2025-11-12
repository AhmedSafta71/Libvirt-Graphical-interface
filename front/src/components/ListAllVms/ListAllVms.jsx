// File: ListAllVms.jsx
import React, { useState, useEffect } from "react";
import { listAllVms } from "../../services/api"; // fonction axios vers /listallvms
import { useNavigate } from "react-router-dom";
import { getSession, clearSession } from "../../utils/session"; // gestion session frontend

const ListAllVms = () => {
  const [vms, setVms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const colors = {
    blue: "#003366",
    red: "#dc2626",
  };

  useEffect(() => {
    const connection = getSession();

    if (!connection) {
      // session expirée ou inexistante
      clearSession();
      navigate("/"); // redirection vers page de connexion
      return;
    }

    const fetchVms = async () => {
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

    fetchVms();
  }, [navigate]);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-md-12">
          <div className="card shadow-sm border-0">
            <div
              className="card-header text-center py-3"
              style={{ backgroundColor: colors.blue, color: "#fff" }}
            >
              <h4 className="mb-0">All Virtual Machines</h4>
            </div>

            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-4">Loading VMs...</div>
              ) : error ? (
                <div className="alert alert-danger m-3" role="alert">
                  {error}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="text-center">#</th>
                        <th>VM Name</th>
                        <th>Status</th>
                        <th>IP Address</th>
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
                            <td>{vm.ip || "N/A"}</td>
                            <td className="text-center">
                              <button className="btn btn-outline-primary btn-sm me-2">
                                Edit
                              </button>
                              <button className="btn btn-outline-danger btn-sm">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            <div className="text-muted">No VMs found.</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-footer bg-white text-center py-3">
              <button
                className="btn btn-primary"
                style={{ backgroundColor: colors.blue, borderColor: colors.blue }}
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
