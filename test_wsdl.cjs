const https = require('https');

https.get('https://sede.transportes.gob.es/MFOM.Services.VTC.Server/VTCPort?wsdl', res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
        const regex = /soapAction="([^"]+)"/g;
        let match;
        const actions = [];
        while ((match = regex.exec(d)) !== null) {
            actions.push(match[1]);
        }
        console.log('Found Actions:', actions);
    });
}).on('error', console.error);
