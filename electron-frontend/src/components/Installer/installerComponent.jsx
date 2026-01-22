import React, { useState, useEffect } from 'react';

function Installer() {
    const [step, setStep] = useState(1);
    const [dockerInstalled, setDockerInstalled] = useState(false);
    const [dockerComposeInstalled, setDockerComposeInstalled] = useState(false);
    const [installPath, setInstallPath] = useState('');
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkRequirements();
        const handleStatusUpdate = (event, message) => {
            setLogs(prev => [...prev.slice(-20), message]); // Mostramos un poco más de historial
        };
        window.electronAPI.onUpdateStatus(handleStatusUpdate);
    }, []);

    const checkRequirements = async () => {
        const dockerOk = await window.electronAPI.checkDocker();
        const composeOk = await window.electronAPI.checkDockerCompose();
        setDockerInstalled(dockerOk);
        setDockerComposeInstalled(composeOk);
        if (dockerOk && composeOk) setStep(2);
    };

    const handleStartServices = async () => {
        setLoading(true);
        setError(null);
        setLogs(["Iniciando descarga..."]);
        try {
            const result = await window.electronAPI.startServices(installPath);
            if (result.success) setStep(3);
        } catch (err) {
            setError("Instalación interrumpida o fallida.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (window.confirm("¿Deseas cancelar la instalación actual?")) {
            await window.electronAPI.cancelServices();
            setLoading(false);
            setError("Instalación cancelada por el usuario.");
        }
    };

    const handleSelectPath = async () => {
        const path = await window.electronAPI.selectInstallPath();
        if (path) setInstallPath(path);
    };

    return (
        <div className="installer-container p-6 max-w-2xl mx-auto bg-slate-900 text-white rounded-xl shadow-2xl">
            <h1 className="text-2xl font-bold mb-6 border-b border-slate-700 pb-2">Asistente de Instalación</h1>

            {step === 1 && (
                <div className="space-y-4 text-center">
                    <h2 className="text-xl">Verificando requisitos...</h2>
                    <button onClick={checkRequirements} className="bg-blue-600 px-4 py-2 rounded">Reintentar</button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6">
                    <h2 className="text-xl text-blue-400 font-semibold">Configuración de Descarga</h2>
                    <div className="bg-slate-800 p-4 rounded-lg space-y-3">
                        <label className="text-xs text-slate-400 block uppercase tracking-wider">Ruta de Instalación</label>
                        <div className="flex gap-2">
                            <input type="text" value={installPath} readOnly className="bg-slate-900 flex-1 p-2 rounded border border-slate-700 text-xs text-slate-300" />
                            <button onClick={handleSelectPath} className="bg-slate-700 px-4 py-1 rounded text-sm hover:bg-slate-600">Cambiar</button>
                        </div>
                    </div>

                    {loading && (
                        <div className="bg-black p-3 rounded font-mono text-[10px] text-green-500 h-40 overflow-y-auto border border-slate-700 shadow-inner">
                            {logs.map((log, i) => <div key={i} className="mb-1">{log}</div>)}
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">{error}</p>}

                    <div className="flex flex-row gap-4 pt-4">
                        <button 
                            onClick={handleStartServices} 
                            disabled={!installPath || loading}
                            className={`flex-[2] py-3 rounded-lg font-bold transition-all ${loading ? 'bg-slate-800 text-slate-500' : 'bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/20'}`}
                        >
                            {loading ? 'Procesando...' : 'Iniciar Instalación'}
                        </button>

                        {loading && (
                            <button onClick={handleCancel} className="alt flex-1 py-3 bg-red-600/20 border border-red-600/50 text-red-500 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all">
                                Cancelar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="text-center py-10 space-y-6">
                    <div className="text-7xl">🎉</div>
                    <h2 className="text-3xl font-bold text-green-400">¡Instalación Exitosa!</h2>
                    <p className="text-slate-400">Todos los servicios están en línea.</p>
                    <button className="bg-blue-600 w-full py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition-colors shadow-xl shadow-blue-900/20">
                        Lanzar Aplicación
                    </button>
                </div>
            )}
        </div>
    );
}

export default Installer;