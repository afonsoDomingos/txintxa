const { exec } = require('child_process');

exec('netstat -ano | findstr :5000', (err, stdout, stderr) => {
    if (err) {
        console.log('Nada rodando na porta 5000.');
        return;
    }

    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && /^\d+$/.test(pid) && parseInt(pid) > 0) {
            console.log(`Matando processo PID: ${pid}`);
            exec(`taskkill /F /PID ${pid}`, (killErr, killOut) => {
                if (killErr) console.error(`Erro ao matar ${pid}: ${killErr.message}`);
                else console.log(`Processo ${pid} encerrado.`);
            });
        }
    });
});
