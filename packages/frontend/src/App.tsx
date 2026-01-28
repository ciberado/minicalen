import Layout from './components/Layout'
import { CategoryProvider } from './components/CategoryContext'
import { SessionProvider } from './components/SessionContext'
import { WebSocketProvider } from './components/WebSocketContext'
import { AuthProvider } from './components/AuthContext'
import { AuthDialog } from './components/AuthDialog'
import logger from './logger'
import './App.css'

// Add debugging helper to track React renders
logger.debug('App is initializing');

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <CategoryProvider>
          <SessionProvider>
            <Layout/>
            <AuthDialog />
          </SessionProvider>
        </CategoryProvider>
      </WebSocketProvider>
    </AuthProvider>
  )
}

export default App
