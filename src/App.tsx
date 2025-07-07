import Layout from './components/Layout'
import { CategoryProvider } from './components/CategoryContext'
import { SessionProvider } from './components/SessionContext'
import './App.css'

// Add debugging helper to track React renders
console.log('App is initializing');

function App() {
  return (
    <CategoryProvider>
      <SessionProvider>
        <Layout/>
      </SessionProvider>
    </CategoryProvider>
  )
}

export default App
