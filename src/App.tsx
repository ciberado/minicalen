import Layout from './components/Layout'
import { CategoryProvider } from './components/CategoryContext'
import './App.css'

// Add debugging helper to track React renders
console.log('App is initializing');

function App() {
  return (
    <CategoryProvider>
      <Layout/>
    </CategoryProvider>
  )
}

export default App
