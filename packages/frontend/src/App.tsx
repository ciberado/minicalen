import Layout from './components/Layout'
import { CategoryProvider } from './components/CategoryContext'
import { SessionProvider } from './components/SessionContext'
import { WebSocketProvider } from './components/WebSocketContext'
import logger from './logger'
import './App.css'

// Add debugging helper to track React renders
logger.debug('App is initializing');

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
