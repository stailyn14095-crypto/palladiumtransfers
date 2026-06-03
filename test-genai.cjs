const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const fs = require('fs');

// Read env from .env
const envFile = fs.readFileSync('.env.local', 'utf8');
let apiKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_GEMINI_API_KEY=')) {
    apiKey = line.split('=')[1].trim();
  }
});

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  tools: [{
    functionDeclarations: [
      {
        name: 'crear_reserva',
        description: 'Crea una reserva nueva',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                client_name: { type: SchemaType.STRING, description: 'Nombre completo del cliente' },
                phone: { type: SchemaType.STRING, description: 'Teléfono de contacto' },
                email: { type: SchemaType.STRING, description: 'Correo electrónico del cliente' },
                origin: { type: SchemaType.STRING, description: 'Origen' },
                destination: { type: SchemaType.STRING, description: 'Destino' },
                pickup_date: { type: SchemaType.STRING, description: 'Fecha de recogida en formato YYYY-MM-DD' },
                pickup_time: { type: SchemaType.STRING, description: 'Hora de recogida en formato HH:MM' },
                pax: { type: SchemaType.NUMBER, description: 'Número de pasajeros' },
                flight_number: { type: SchemaType.STRING, description: 'Número de vuelo (opcional)' }
            },
            required: ['client_name', 'email', 'origin', 'destination', 'pickup_date', 'pickup_time']
        }
      }
    ]
  }]
});

async function run() {
  try {
    const chat = model.startChat({});
    let res = await chat.sendMessage('crea una reserva para mi. Me llamo Rafael Naveo, de Benidorm a aeropuerto ALC, somos 2, 27/05/2026 a las 07:00, correo palladiumtransfers@gmail.com tel +34665350418');
    console.log(JSON.stringify(res.response.functionCalls, null, 2));
    
    // Simulate function response
    const call = res.response.functionCalls[0];
    if (call) {
      console.log('Sending function response...');
      res = await chat.sendMessage([{
        functionResponse: {
          name: call.name,
          response: { result: 'He abierto el formulario', booking_details: { a: 1 } }
        }
      }]);
      console.log('Final text:', res.response.text());
    }
  } catch(e) { console.error('ERROR:', e.message); }
}
run();
