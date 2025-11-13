import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo-virt-banner.png";
import { getSession, clearSession } from "../../utils/session"; // gestion session front

export default function Header() {
  const [connected, setConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getSession();
    setConnected(!!session); // true si connecté
  }, []);

  const handleConnectClick = () => {
    if (connected) {
      // Déconnexion
      clearSession();
      setConnected(false);
      navigate("/connect"); // redirection vers page de connexion
    } else {
      // Redirection vers page de connexion
      navigate("/connect");
    }
  };

  return (
    <header className="py-4" style={{ backgroundColor: "#085c47ff" }}>
      <div className="container">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <img
              src={logo}
              alt="Libvirt Logo"
              className="me-3"
              style={{ height: "70px" }}
            />
            <h1 className="h4 mb-0 text-white">Libvirt Dashboard</h1>
          </div>
          <nav className="d-flex gap-4">
            {connected && (
              <a
                href="#"
                className="text-white text-decoration-none fw-semibold"
                onClick={() => navigate("/listallvms")}
              >
                Machines
              </a>
            )}
            <button
              className="btn btn-outline-light fw-semibold"
              onClick={handleConnectClick}
            >
              {connected ? "Logout" : "Connect"}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
