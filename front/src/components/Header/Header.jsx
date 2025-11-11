import React from "react";
import logo from "../../assets/logo-virt-banner.png";


export default function Header() {
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
            <a href="#" className="text-white text-decoration-none fw-semibold">
              Accueil
            </a>
            <a href="#" className="text-white text-decoration-none fw-semibold">
              Machines
            </a>
            <a href="#" className="text-white text-decoration-none fw-semibold">
              À propos
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}