import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Register from './pages/Register'
import MyEvents from './pages/MyEvents'
import Scanner from './pages/Scanner'

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register/:eventId" element={<Register />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <div><strong>Campus<span>Connect</span></strong><p>Discover. Connect. Participate.</p></div>
          <p>Built for campus life at The National Institute of Engineering, Mysuru.</p>
        </div>
      </footer>
    </div>
  )
}
export default App
