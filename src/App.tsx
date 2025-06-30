import { 
  Typography, 
  Paper,
  AppBar,
  Toolbar
} from '@mui/material'
import Layout from './components/Layout'
import './App.css'

function App() {
  return (
    <Layout>
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          mb: 3, 
          backgroundColor: 'transparent', 
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome to MiniCalen
        </Typography>
        <Typography paragraph>
          This is a single page application with a 20-character wide sidebar on the left and the main content area on the right.
        </Typography>
        <Typography paragraph>
          Select an option from the sidebar to get started.
        </Typography>
      </Paper>
    </Layout>
  )
}

export default App
