import fs from 'fs';
import path from 'path';

// Usage: node encode-cert.mjs <path_to_p12_file>

const p12FilePath = process.argv[2];

if (!p12FilePath) {
    console.error('❌ Error: Por favor, proporciona la ruta a tu archivo .p12 o .pfx');
    console.log('Uso: node encode-cert.mjs mi_certificado.p12');
    process.exit(1);
}

try {
    const fullPath = path.resolve(p12FilePath);

    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Error: No se encontró el archivo en la ruta: ${fullPath}`);
        process.exit(1);
    }

    const p12Buffer = fs.readFileSync(fullPath);
    const base64Cert = p12Buffer.toString('base64');

    console.log('\n✅ Certificado leído correctamente.\n');
    console.log('──────────────────────────────────────────────────');
    console.log('🔑 Copia el siguiente texto Base64 (es largo) y pégalo como secreto en Supabase:');
    console.log('Nombre de Variable (Secret Name): FOMENTO_CERT_BASE64');
    console.log('──────────────────────────────────────────────────\n');

    console.log(base64Cert);

    console.log('\n──────────────────────────────────────────────────');
    console.log('⚠️  RECUERDA: También debes configurar el secreto FOMENTO_CERT_PASSWORD con la contraseña de este certificado.');
    console.log('Comando de Supabase CLI para configurarlos:');
    console.log('supabase secrets set FOMENTO_CERT_BASE64="tu_base_64_copiado" FOMENTO_CERT_PASSWORD="tu_contraseña"');
    console.log('O hazlo desde el Panel web de Supabase (Edge Functions -> Secrets).');

} catch (error) {
    console.error('❌ Error general al procesar el archivo:', error.message);
}
