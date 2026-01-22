import React from 'react';
import Installer from './components/Installer/installerComponent';
import './App.css'; // Asegúrate de que Tailwind esté importado aquí o en index.js

function App() {
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans">
            <nav className="p-4 border-b border-gray-800 bg-gray-800/50">
                <h1 className="text-xl font-bold text-blue-400">System Deployer Pro</h1>
            </nav>

            <main className="container mx-auto py-10 px-4">
                <Installer />
            </main>

            <footer className="fixed bottom-0 w-full p-4 text-center text-gray-500 text-sm">
                Modo: Local / Intranet - Docker Engine v24.x
            </footer>
        </div>
    );
}

export default App;