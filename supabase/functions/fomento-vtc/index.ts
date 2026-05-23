import forge from "npm:node-forge@1.3.1";
import { SignedXml } from "npm:xml-crypto@2.1.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Consolidated Date Helpers for Fomento VTC (Madrid Timezone)
const MADRID_OFFSET = "+02:00";

/**
 * Formats a Date object to xs:dateTime with Madrid offset.
 * Used for 'header fecha'.
 */
function getMadridIso(date: Date, subtractMinutes = 0): string {
    const d = new Date(date.getTime() - (subtractMinutes * 60000));
    // Madrid is UTC+2 in summer (CEST). 
    const shifted = new Date(d.getTime() + (2 * 60 * 60 * 1000));
    const iso = shifted.toISOString().split('.')[0];
    return `${iso}${MADRID_OFFSET}`;
}

/**
 * Parses payload date/time strings into Ministry formats.
 * mode 'date': YYYY-MM-DD
 * mode 'dateTime': YYYY-MM-DDTHH:MM:SS+02:00
 */
function formatFomentoPayload(dateStr: string, timeStr = "00:00:00", mode: 'date' | 'dateTime' = 'date'): string {
    if (!dateStr) return '';
    
    // 1. Extract only the date part (strip time/timezone if present in dateStr)
    // Supports: "2026-05-15", "2026-05-15 12:00:00", "2026-05-15T12:00:00Z"
    const justDate = dateStr.split(/[ T]/)[0];
    
    let year, month, day;
    const parts = justDate.split(/[-/]/);
    if (parts.length !== 3) return dateStr; // Fallback to raw if unrecognizable
    
    if (parts[0].length === 4) {
        [year, month, day] = parts;
    } else {
        [day, month, year] = parts;
    }
    
    const y = year;
    const m = month.padStart(2, '0');
    const d = day.padStart(2, '0');
    
    // Mode 'date' is used for fcontrato and ffin
    if (mode === 'date') return `${y}-${m}-${d}`;
    
    // 2. Determine time part
    let hh = "00", mm = "00", ss = "00";
    
    // If timeStr is provided and looks like a time
    if (timeStr && timeStr.includes(':')) {
        const tParts = timeStr.split(':');
        hh = tParts[0].padStart(2, '0');
        mm = (tParts[1] || '00').padStart(2, '0');
        ss = (tParts[2] || '00').padStart(2, '0');
    } else if (dateStr.includes('T') || dateStr.includes(' ')) {
        // Fallback: try to extract time from dateStr if timeStr was empty/default
        const timePart = dateStr.split(/[ T]/)[1]?.split(/[+Z]/)[0];
        if (timePart && timePart.includes(':')) {
            const tParts = timePart.split(':');
            hh = tParts[0].padStart(2, '0');
            mm = (tParts[1] || '00').padStart(2, '0');
            ss = (tParts[2] || '00').padStart(2, '0');
        }
    }
    
    // Use 'T' separator and explicit Madrid offset (Crucial for RVTC)
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}${MADRID_OFFSET}`;
}


function extractPemFromP12(p12Base64: string, password: string) {
    const p12Binary = atob(p12Base64);
    const p12Der = forge.util.createBuffer(p12Binary, 'raw').getBytes();
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    let privateKeyPem = '';
    let certificatePem = '';

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (keyBag && keyBag[0]) {
        privateKeyPem = forge.pki.privateKeyToPem(keyBag[0].key);
    }

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = certBags[forge.pki.oids.certBag];
    if (certBag && certBag[0]) {
        certificatePem = forge.pki.certificateToPem(certBag[0].cert);
    }

    return { privateKeyPem, certificatePem };
}

function createSignedSoap(action: 'alta' | 'anulacion', payload: any, privateKeyPem: string, certificatePem: string, isTest: boolean) {
    const certBase64 = certificatePem.replace(/-----(BEGIN|END) CERTIFICATE-----|\n/g, '');
    const wsuNs = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
    const vtcUri = "http://mfom.com/vtc";
    
    let dataXml = '';
    let uniqueIdComunica = '';

    if (action === 'alta') {
        if (isTest) {
            console.log(`[FOMENTO-VTC] Integración de pruebas activa. Forzando ficticios: niftitular="99999999R", nif="B26816025"`);
            payload.niftitular = "99999999R";
            payload.nif = "B26816025";
        }

        const isoCommTime = getMadridIso(new Date());
        const cleanDate = (iso: string) => iso.split(/[+-]/)[0]; 

        const isoFcontrato = (() => {
            if (!payload.fcontrato) return isoCommTime.split(/[+-]/)[0];
            const d = new Date(payload.fcontrato);
            const now = new Date();
            if (now.getTime() - d.getTime() > 30 * 24 * 60 * 60 * 1000) {
                return isoCommTime.split(/[+-]/)[0];
            }
            return d.toISOString().split('.')[0];
        })();
            
        const isoFprevistainicio = payload.fecinicio && payload.horinicio 
            ? `${payload.fecinicio}T${payload.horinicio}:00`
            : isoCommTime.split('T')[0];
        
        const companyNif = 'B26816025'; 
        const clientNif = payload.nif || payload.niftitular || 'B26816025';
        
        const isoFfin = payload.fecfin || payload.fecinicio || isoCommTime.split('T')[0];

        // ✅ FIX: Use shorter ID (max 10 digits) to avoid potential 32-bit integer overflow issues in Ministry portal
        uniqueIdComunica = payload.idcomunica || `${Math.floor(Math.random() * 1000000000)}`;

        console.log(`[FOMENTO-VTC] Alta: fecha="${isoCommTime}" | fprevistainicio="${isoFprevistainicio}" | fcontrato="${isoFcontrato}" | idcomunica="${uniqueIdComunica}"`);

        const nifAttr = (payload.nif && payload.nif !== payload.niftitular) ? `nif="${payload.nif}" ` : '';
        const nomAttr = payload.nom ? `nom="${payload.nom}" ` : '';
        
        dataXml = `
            <vtc:qaltavtc xmlns:vtc="${vtcUri}">
                <header version="1.0" versionsender="1.0" fecha="${isoCommTime}" idcomunica="${uniqueIdComunica}"/>
                <body>
                    <vtcservicio niftitular="${payload.niftitular}" ${nifAttr}${nomAttr}matricula="${payload.matricula}" fcontrato="${isoFcontrato}" cgprovcontrato="${payload.cgprovcontrato}" cgmunicontrato="${payload.cgmunicontrato}" cgprovinicio="${payload.cgprovinicio}" cgmuniinicio="${payload.cgmuniinicio}" direccioninicio="${(payload.direccioninicio || 'Direccion Origen').substring(0, 100)}" fprevistainicio="${isoFprevistainicio}" cgprovfin="${payload.cgprovfin}" cgmunifin="${payload.cgmunifin}" direccionfin="${(payload.direccionfin || 'Direccion Destino').substring(0, 100)}" ffin="${isoFfin}" veraz="S"/>
                </body>
            </vtc:qaltavtc>
        `.trim();

    } else if (action === 'anulacion') {
        const isoCommTime = getMadridIso(new Date(), 10);
        
        dataXml = `
            <vtc:qanulacionvtc xmlns:vtc="${vtcUri}">
                <header version="1.0" versionsender="1.0" fecha="${isoCommTime}"/>
                <body>
                    <vtcservicio idservicio="${payload.idservicio}"/>
                </body>
            </vtc:qanulacionvtc>
        `.trim();
    } else if (action === 'inicio') {
        const isoCommTime = getMadridIso(new Date());
        
        dataXml = `
            <vtc:qiniciovtc xmlns:vtc="${vtcUri}">
                <header version="1.0" versionsender="1.0" fecha="${isoCommTime}"/>
                <body>
                    <vtcservicio idservicio="${payload.idservicio}"/>
                </body>
            </vtc:qiniciovtc>
        `.trim();
    } else if (action === 'modificacion') {
        const isoCommTime = getMadridIso(new Date());
        
        dataXml = `
            <vtc:qmodificavtc xmlns:vtc="${vtcUri}">
                <header version="1.0" versionsender="1.0" fecha="${isoCommTime}"/>
                <body>
                    <vtcservicio idservicio="${payload.idservicio}" cgprovfin="${payload.cgprovfin}" cgmunifin="${payload.cgmunifin}" direccionfin="${(payload.direccionfin || '').substring(0, 100)}" matricula="${payload.matricula}"/>
                </body>
            </vtc:qmodificavtc>
        `.trim();
    } else if (action === 'consulta') {
        const isoCommTime = getMadridIso(new Date());
        
        dataXml = `
            <vtc:qconsultavtc xmlns:vtc="${vtcUri}">
                <header version="1.0" versionsender="1.0" fecha="${isoCommTime}"/>
                <body>
                    <vtcconsulta idservicio="${payload.idservicio}"/>
                </body>
            </vtc:qconsultavtc>
        `.trim();
    }



    const fullSoap = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsu="${wsuNs}"><soapenv:Header><wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="${wsuNs}"><wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" wsu:Id="X509Token" xmlns:wsu="${wsuNs}">${certBase64}</wsse:BinarySecurityToken></wsse:Security></soapenv:Header><soapenv:Body wsu:Id="TheBody" xmlns:wsu="${wsuNs}">${dataXml}</soapenv:Body></soapenv:Envelope>`;

    const sig = new SignedXml();
    sig.signatureAlgorithm = "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256";
    sig.addReference(
        "//*[@*[local-name()='Id' and .='TheBody']]", 
        ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/2001/10/xml-exc-c14n#"],
        "http://www.w3.org/2001/04/xmlenc#sha256"
    );
    sig.signingKey = privateKeyPem;
    sig.keyInfoProvider = {
        getKeyInfo: () => `<wsse:SecurityTokenReference xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd"><wsse:Reference URI="#X509Token" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/></wsse:SecurityTokenReference>`
    };
    sig.computeSignature(fullSoap, {
        location: { reference: "//*[local-name(.)='Security']", action: "append" }
    });

    const signedXml = sig.getSignedXml();
    console.log(`[FOMENTO-VTC] FULL SIGNED XML: ${signedXml}`);
    
    return {
        signedXml,
        idcomunica: (action === 'alta' ? (uniqueIdComunica || '') : payload.idcomunica)
    };
}



async function sendToFomento(signedXml: string, action: string, isTest: boolean) {
    const endpoint = !isTest
        ? 'https://sede.transportes.gob.es/MFOM.Services.VTC.Server/VTCPort'
        : 'https://presede.mitma.gob.es/MFOM.Services.VTC.Server/VTCPort';

    const relayUrl = Deno.env.get('FOMENTO_RELAY_URL');
    const relaySecret = Deno.env.get('FOMENTO_RELAY_SECRET');

    const soapAction = action === 'alta' 
        ? 'http://www.fomento.org/VTCService/AltaDeServicio' 
        : action === 'inicio'
        ? 'http://www.fomento.org/VTCService/InicioDeServicio'
        : action === 'modificacion'
        ? 'http://www.fomento.org/VTCService/ModificacionDeServicio'
        : action === 'consulta'
        ? ''  // Test: empty SOAPAction for consulta - Ministry may not require it for this operation
        : 'http://www.fomento.org/VTCService/AnulacionDeServicio';

    const internalProxyUrl = Deno.env.get('FOMENTO_INTERNAL_PROXY_URL');

    // PRIORITY 1: Use our own Supabase proxy (correct SOAPAction support)
    if (internalProxyUrl && relaySecret) {
        console.log(`[INTERNAL PROXY] Calling ${action} → ${endpoint}`);
        console.log(`[INTERNAL PROXY] SOAPAction: ${soapAction}`);
        try {
            const response = await fetch(internalProxyUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: relaySecret,
                    endpoint: endpoint,
                    signedXml: signedXml,
                    soapAction: soapAction
                })
            });
            const text = await response.text();
            try {
                const proxyData = JSON.parse(text);
                
                if (response.status === 408 || proxyData.error === 'TIMEOUT from Ministry') {
                    return { success: false, resultado: "TIMEOUT", error: "El Ministerio no responde (Timeout). El entorno de pruebas puede estar caído.", body: "", rawResponse: "" };
                }

                const rawXml = proxyData.rawResponse || "";
                
                const isFault = /<[^>]*Fault[^>]*>/i.test(rawXml);
                if (isFault) {
                    const faultMatch = rawXml.match(/<faultstring[^>]*>(.*?)<\/faultstring>/i) || 
                                       rawXml.match(/<[^>]*faultstring[^>]*>(.*?)<\/[^>]*faultstring>/i);
                    const detailMatch = rawXml.match(/<detail[^>]*>(.*?)<\/detail>/i);
                    const errorMsg = faultMatch ? faultMatch[1] : (detailMatch ? detailMatch[1] : "Error SOAP (Cuerpo no parseable)");
                    return { success: false, resultado: "ERROR", error: `Ministerio: ${errorMsg}`, body: rawXml, rawResponse: rawXml };
                }

                // Parse resultado: try attribute first (alta/inicio), then element (consulta/anulacion)
                const resultadoAttrMatch = rawXml.match(/resultado="([^"]+)"/i);
                const resultadoElemMatch = rawXml.match(/<resultado[^>]*>([^<]+)<\/resultado>/i);
                const resultado = resultadoAttrMatch ? resultadoAttrMatch[1] : (resultadoElemMatch ? resultadoElemMatch[1].trim() : null);

                // Parse other fields - try attribute then element format
                const iderrorMatch = rawXml.match(/iderror="([^"]+)"/i) || rawXml.match(/<iderror[^>]*>([^<]+)<\/iderror>/i);
                const idservicioMatch = rawXml.match(/idservicio="([^"]+)"/i) || rawXml.match(/<idservicio[^>]*>([^<]+)<\/idservicio>/i);
                const idcomunicaMatch = rawXml.match(/idcomunica="([^"]+)"/i) || rawXml.match(/<idcomunica[^>]*>([^<]+)<\/idcomunica>/i);
                
                // Log raw response for debugging
                console.log(`[PROXY] resultado: "${resultado}", raw snippet: ${rawXml.substring(0, 300)}`);

                const RVTC_ERRORS: Record<string, string> = {
                    '00': 'OK - Servicio registrado correctamente',
                    '0':  'OK - Servicio registrado correctamente',
                    '51': 'El NIF que comunica no puede crear servicios para ese intermediario y matrícula',
                    '52': 'EL NIF comunicado no puede gestionar servicios para esa matrícula',
                    '53': 'El NIF del intermediario no es correcto',
                    '54': 'El NIF del titular no es correcto',
                    '55': 'La fecha de contrato debe ser anterior a la fecha prevista de inicio',
                    '56': 'La fecha y hora prevista de inicio debe ser posterior a la fecha y hora actual',
                    '57': 'La fecha fin del servicio debe ser igual o posterior a la fecha de inicio',
                    '58': 'La provincia del contrato no es correcta',
                    '59': 'La provincia de origen no es correcta',
                    '60': 'La provincia de destino no es correcta',
                    '61': 'La provincia del lugar más lejano no es correcta',
                    '62': 'El municipio del contrato no es correcto',
                    '63': 'El municipio inicio no es correcto',
                    '64': 'El municipio fin no es correcto',
                    '65': 'El municipio del lugar más lejano no es correcto',
                    '66': 'Los lugares de inicio y fin son iguales. Debe comunicar el punto más lejano',
                    '69': 'Error en el SW al crear el servicio',
                    '79': 'El formato de la matrícula no es correcto',
                    '83': 'El titular no dispone de la autorización de esa matrícula',
                    '84': 'El NIF comunicado no puede gestionar servicios',
                    '85': 'Error al crear el servicio',
                };

                const isSuccess = resultado === '00' || resultado === '0';
                // For consulta: if resultado is null but no fault, treat as success and return raw XML
                const consultaNoResult = action === 'consulta' && resultado === null && !rawXml.includes('Fault');
                const errorMsg = (isSuccess || consultaNoResult) ? null : (RVTC_ERRORS[resultado ?? ''] || `Error Ministerio código: ${resultado} (iderror: ${iderrorMatch ? iderrorMatch[1] : 'N/A'})`);

                return {
                    success: isSuccess || consultaNoResult,
                    resultado: resultado,
                    error: errorMsg,
                    idservicio: idservicioMatch ? idservicioMatch[1] : null,
                    idcomunica: idcomunicaMatch ? idcomunicaMatch[1] : null,
                    body: (isSuccess || consultaNoResult) ? rawXml : errorMsg,
                    rawResponse: rawXml
                };
            } catch (e) {
                console.error("[INTERNAL PROXY JSON ERROR]", text);
                return { success: false, error: "Proxy JSON Error: " + e.message, body: text };
            }
        } catch (err) {
            return { success: false, error: "Proxy Connection Error: " + err.message, body: err.message };
        }
    }

    if (relayUrl && relaySecret) {
        console.log(`Using Google Relay [${action}] to:`, endpoint);
        try {
            const response = await fetch(relayUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: relaySecret,
                    endpoint: endpoint,
                    soapBody: signedXml,
                    signedXml: signedXml,
                    soapAction: soapAction
                })
            });
            const text = await response.text();
            try {
                const relayData = JSON.parse(text);
                const rawXml = relayData.rawResponse || "";
                
                const isFault = /<[^>]*Fault[^>]*>/i.test(rawXml);
                
                if (isFault) {
                    const faultMatch = rawXml.match(/<faultstring[^>]*>(.*?)<\/faultstring>/i) || 
                                       rawXml.match(/<[^>]*faultstring[^>]*>(.*?)<\/[^>]*faultstring>/i);
                    
                    const detailMatch = rawXml.match(/<detail[^>]*>(.*?)<\/detail>/i);
                    const errorMsg = faultMatch ? faultMatch[1] : (detailMatch ? detailMatch[1] : "Error SOAP del Ministerio");
                    
                    const finalMsg = `Ministerio: ${errorMsg}`;
                    return { 
                        success: false,
                        resultado: "ERROR",
                        error: finalMsg,
                        body: finalMsg,
                        rawResponse: rawXml 
                    };
                }

                if (rawXml.includes('<resultado>')) {
                    const resMatch = rawXml.match(/<resultado>(.*?)<\/resultado>/i);
                    const resCode = resMatch ? resMatch[1] : "??";
                    if (resCode !== "00" && resCode !== "0") {
                        const msg = `Ministerio respondió con código de error: ${resCode}`;
                        return { 
                            success: false,
                            resultado: resCode,
                            error: msg,
                            body: msg,
                            rawResponse: rawXml 
                        };
                    }
                }

                return { 
                    success: relayData.success !== false, 
                    body: relayData.body || "Operación completada",
                    error: relayData.error || null,
                    ...relayData 
                };
            } catch (e) {
                console.error("[RELAY JSON ERROR]", text);
                return { success: false, error: "Relay JSON Error: " + e.message, body: text };
            }
        } catch (err) {
            return { success: false, error: "Relay Connection Error: " + err.message, body: err.message };
        }
    }
    return { success: false, error: "Faltan variables de entorno RELAY", body: "Configuración incompleta" };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const certBase64 = Deno.env.get('FOMENTO_CERT_BASE64');
        const certPassword = Deno.env.get('FOMENTO_CERT_PASSWORD');
        const relayUrl = Deno.env.get('FOMENTO_RELAY_URL');
        const relaySecret = Deno.env.get('FOMENTO_RELAY_SECRET');

        if (!certBase64 || !certPassword) {
            throw new Error("Missing FOMENTO_CERT_BASE64 or FOMENTO_CERT_PASSWORD secrets.");
        }

        const bodyText = await req.text();
        let action, payload;
        try {
            const body = JSON.parse(bodyText);
            action = body.action;
            payload = body.payload;
        } catch (e) {
            throw new Error("Invalid JSON in request body");
        }

        // WSDL discovery - no cert needed
        if (action === 'wsdl') {
            const wsdlUrl = 'https://presede.mitma.gob.es/MFOM.Services.VTC.Server/VTCPort?wsdl';
            try {
                const wsdlRes = await fetch(wsdlUrl, { signal: AbortSignal.timeout(10000) });
                const wsdlText = await wsdlRes.text();
                const soapActions = [...wsdlText.matchAll(/soapAction="([^"]+)"/g)].map(m => m[1]);
                return new Response(JSON.stringify({ wsdlSnippet: wsdlText.substring(0, 4000), soapActions, status: wsdlRes.status }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: `WSDL fetch failed: ${e.message}` }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
                });
            }
        }

        const { privateKeyPem, certificatePem } = extractPemFromP12(certBase64, certPassword);

        if (action === 'wsdl') {
            const wsdlUrl = 'https://presede.mitma.gob.es/MFOM.Services.VTC.Server/VTCPort?wsdl';
            const wsdlRes = await fetch(wsdlUrl);
            const wsdlText = await wsdlRes.text();
            const soapActions = [...wsdlText.matchAll(/soapAction="([^"]+)"/g)].map(m => m[1]);
            return new Response(JSON.stringify({ wsdlSnippet: wsdlText.substring(0, 3000), soapActions }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
            });
        }

        if (action === 'alta' || action === 'anulacion' || action === 'inicio' || action === 'modificacion' || action === 'consulta') {
            const isTest = (Deno.env.get('FOMENTO_ENV') !== 'production') || (payload && payload.is_test === true);
            const { signedXml, idcomunica } = createSignedSoap(action as any, payload, privateKeyPem, certificatePem, isTest);


            const fomentoRes = await sendToFomento(signedXml, action, isTest);

            return new Response(JSON.stringify({
                success: fomentoRes.success === true,
                resultado: fomentoRes.resultado,
                error: fomentoRes.error,
                body: fomentoRes.body,
                idservicio: fomentoRes.idservicio,
                idcomunica: fomentoRes.idcomunica || idcomunica,
                signedXml: signedXml, 
                rawResponse: fomentoRes.rawResponse || fomentoRes.body,
                diagnostics: {
                    hasRelayUrl: !!relayUrl,
                    hasRelaySecret: !!relaySecret,
                    fomentoEnv: Deno.env.get('FOMENTO_ENV') || 'not set',
                    isTest: isTest
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        } else {
            throw new Error(`Unsupported action: ${action}`);
        }

    } catch (error) {
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            diagnostics: {
                hasRelayUrl: !!Deno.env.get('FOMENTO_RELAY_URL'),
                hasRelaySecret: !!Deno.env.get('FOMENTO_RELAY_SECRET')
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }
});
