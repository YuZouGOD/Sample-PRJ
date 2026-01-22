const net = require('net');

const services = [
    { name: 'MongoDB', port: 27017, host: 'localhost' },
    { name: 'Redis', port: 6379, host: 'localhost' },
    { name: 'MinIO API', port: 9000, host: 'localhost' },
    { name: 'MinIO Console', port: 9001, host: 'localhost' },
    { name: 'ChromaDB', port: 8000, host: 'localhost' }
];

async function checkService(service) {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            resolve({ ...service, status: 'running' });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({ ...service, status: 'timeout' });
        });

        socket.on('error', () => {
            resolve({ ...service, status: 'error' });
        });

        socket.connect(service.port, service.host);
    });
}

async function checkAllServices() {
    const results = [];

    for (const service of services) {
        const result = await checkService(service);
        results.push(result);
    }

    return results;
}

module.exports = { checkAllServices };