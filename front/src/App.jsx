import { useState } from 'react'
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import ConnectHypervisor from './components/ConnectHypervisor/ConnectHypervisor';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <Header/>
        <ConnectHypervisor/>
        <Footer/>
</>
  )
}

export default App
