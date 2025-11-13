import React from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo-virt-banner.png"; // ton logo Libvirt

export default function LandingPage() {
  const navigate = useNavigate();

  const handleConnect = () => {
    navigate("/connect"); // redirige vers la page de connexion
  };

  return (
    <div
      className="d-flex flex-column justify-content-center align-items-center vh-100"
      style={{ backgroundColor: "#ffffff" }} // fond blanc
    >
      <div className="text-center">
        <img
          src={logo}
          alt="Libvirt Dashboard"
          style={{ height: "150px" }}
          className="mb-4"
        />
        <h1 className="h3 mb-3" style={{ color: "#003366" }}>
          Welcome to Libvirt Dashboard
        </h1>
        <p className="text-muted mb-4">
          Manage your virtual machines easily.
        </p>
        <button
          className="btn btn-primary btn-lg"
          style={{ backgroundColor: "#003366", borderColor: "#003366" }}
          onClick={handleConnect}
        >
          Connect
        </button>
      </div>
    </div>
  );
}
