import { useState } from 'react'
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Paper,
  AppBar,
  Toolbar,
  Card,
  CardContent
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <Container maxWidth="sm">
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            MiniCalen
          </Typography>
        </Toolbar>
      </AppBar>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          React + TypeScript + MUI
        </Typography>
        
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Card sx={{ minWidth: 275, mb: 2 }}>
            <CardContent>
              <Typography variant="h5" component="div">
                Count: {count}
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => setCount((count) => count + 1)}
                sx={{ mt: 2 }}
              >
                Increment
              </Button>
            </CardContent>
          </Card>
          
          <Typography variant="body1" sx={{ mt: 2 }}>
            Edit <code>src/App.tsx</code> and save to test HMR
          </Typography>
        </Box>
      </Paper>
      
      <Typography variant="body2" color="text.secondary" align="center">
        Click on the React logo to learn more
      </Typography>
    </Container>
  )
}

export default App
