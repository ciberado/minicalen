import Layout from './components/Layout'
import { CategoryProvider } from './components/CategoryContext'
import { SessionProvider } from './components/SessionContext'
import { WebSocketProvider } from './components/WebSocketContext'
import './App.css'

// Add debugging helper to track React renders
console.log('App is initializing');

function App() {
  return (
    <WebSocketProvider>
      <CategoryProvider>
        <SessionProvider>
          <Layout/>
        </SessionProvider>
      </CategoryProvider>
    </WebSocketProvider>
  )
}

export default App
