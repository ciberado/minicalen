# Minicalen

A barebones React application built with TypeScript and Vite.

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   npm run server
   ```

3. In a separate terminal, start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run server` - Start the backend server for state storage
- `npm run build` - Build the project for production
- `npm run lint` - Run ESLint to check for code issues
- `npm run preview` - Preview the production build locally

## Tech Stack

- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **Express** - Backend server for state storage

## State Management

MiniCalen uses a server-side state storage system:

1. **Client-Side**: The application state is managed in React context providers
2. **Server-Side**: When saving, the state is sent to an Express server
3. **Persistence**: Sessions are stored in a JSON file on the server
4. **URL Sharing**: Each session has a unique ID in the URL hash for easy sharing
- **ESLint** - Code linting and formatting
