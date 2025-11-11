import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import ConnectHypervisor from './components/ConnectHypervisor/ConnectHypervisor';
import ListAllVms from './components/ListAllVms/ListAllVms';
function App() {
  return (
    <Router>
      <Header />
      <div className="container my-4">
        <Routes>
          <Route path="/" element={<ConnectHypervisor />} />
          <Route path="/listallvms" element={<ListAllVms />} />
          {/* Add more routes as needed */}
        </Routes>
      </div>
      <Footer />
    </Router>
  );
}

export default App;
