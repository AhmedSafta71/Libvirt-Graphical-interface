import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo-virt-banner.png";
import { getSession, clearSession } from "../../utils/session";

export default function Header() {
  const navigate = useNavigate();

  // 👉 On lit la session à chaque rendu
  const session = getSession();
  const connected = !!session;

  const handleConnectClick = () => {
    if (connected) {
      // Déconnexion
      clearSession();
      // après clearSession, au prochain rendu connected sera false
      navigate("/connect");
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
              <button
                type="button"
                className="btn btn-link text-white text-decoration-none fw-semibold p-0"
                onClick={() => navigate("/listallvms")}
              >
                Machines
              </button>
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
