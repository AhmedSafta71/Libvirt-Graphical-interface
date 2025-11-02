import React from "react";
import "./Header.css"; 

export default function Header() {
  return (
    <header className="header">
      <h1 className="header-title">Libvirt Dashboard</h1>
      <nav className="header-nav">
        <a href="#">Accueil</a>
        <a href="#">Machines</a>
        <a href="#">À propos</a>
      </nav>
    </header>
  );
}