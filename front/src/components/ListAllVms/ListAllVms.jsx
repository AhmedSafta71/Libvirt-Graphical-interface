// File: ListAllVms.jsx
import React, { useState, useEffect } from "react";

const ListAllVms = () => {
  const [vms, setVms] = useState([]);

  // Example: Fetch VMs from API
  useEffect(() => {
    const fetchVms = async () => {
      const data = [
        { name: "VM1", status: "Running", ip: "192.168.1.101" },
        { name: "VM2", status: "Stopped", ip: "192.168.1.102" },
        { name: "VM3", status: "Running", ip: "192.168.1.103" },
      ];
      setVms(data);
    };
    fetchVms();
  }, []);

  // Couleurs minimales
  const colors = {
    blue: "#003366",
    red: "#dc2626"
  };

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
                                vm.status === "Running" ? "bg-success" : "bg-secondary"
                              }`}
                            >
                              {vm.status}
                            </span>
                          </td>
                          <td>{vm.ip}</td>
                          <td className="text-center">
                            <button
                              className="btn btn-outline-primary btn-sm me-2"
                            >
                              Edit
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-sm"
                            >
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