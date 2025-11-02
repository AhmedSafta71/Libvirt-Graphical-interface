import { useState } from 'react'
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";


function App() {
  const [count, setCount] = useState(0)

  return (
    <>
        <Header/>
        <h1>My project</h1>

        <Footer/>
</>
  )
}

export default App
