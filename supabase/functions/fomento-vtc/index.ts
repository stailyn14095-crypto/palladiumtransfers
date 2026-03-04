import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { DOMParser, XMLSerializer } from "npm:@xmldom/xmldom@^0.8.10";
import { SignedXml } from "npm:xml-crypto@^6.0.0";
import forge from "npm:node-forge@^1.3.1";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class FomentoKeyInfoProvider {
    certPem: string;
    constructor(certPem: string) {
        this.certPem = certPem;
    }
    getKeyInfo(_key: any, _prefix: any) {
        return `<wsse:SecurityTokenReference wsu:Id="STR-1"><wsse:Reference URI="#X509-CERT-1" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3"/></wsse:SecurityTokenReference>`;
    }
    getKey(_keyInfo: any) {
        return this.certPem;
    }
}

function extractPemFromP12(p12Base64: string, password: string) {
    const p12Der = forge.util.decode64(p12Base64);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

    if (!certBags[forge.pki.oids.certBag] || !keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]) {
        throw new Error("P12 Configuration Error: Missing certBag or pkcs8ShroudedKeyBag");
    }

    const cert = forge.pki.certificateToPem(certBags[forge.pki.oids.certBag][0].cert);
    const key = forge.pki.privateKeyToPem(keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key);

    return { privateKeyPem: key, certificatePem: cert };
}

function createSignedAltaSoap(payload: any, privateKeyPem: string, certificatePem: string) {
    const certBase64 = certificatePem
        .replace("-----BEGIN CERTIFICATE-----", "")
        .replace("-----END CERTIFICATE-----", "")
        .replace(/\r/g, "")
        .replace(/\n/g, "");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:vtc="http://mfom.com/vtc">
  <soapenv:Header>
    <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
      <wsse:BinarySecurityToken EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary" ValueType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-x509-token-profile-1.0#X509v3" wsu:Id="X509-CERT-1">${certBase64}</wsse:BinarySecurityToken>
    </wsse:Security>
  </soapenv:Header>
  <soapenv:Body wsu:Id="BODY-1" xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
    <vtc:qaltavtc>
      <header fecha="${new Date().toISOString().substring(0, 19)}" version="1.0" versionsender="1.0" />
      <body>
        <vtcservicio cgmunicontrato="${payload.cgmunicontrato}" cgmunifin="${payload.cgmunifin}" cgmuniinicio="${payload.cgmuniinicio}" cgprovcontrato="${payload.cgprovcontrato}" cgprovfin="${payload.cgprovfin}" cgprovinicio="${payload.cgprovinicio}" direccionfin="${payload.direccionfin}" direccioninicio="${payload.direccioninicio}" fcontrato="${payload.fcontrato}" ffin="${payload.ffin}" fprevistainicio="${payload.fprevistainicio}" matricula="${payload.matricula}" nifarrendador="${payload.nifarrendador}" nifarrendatario="${payload.nifarrendatario}" niftitular="${payload.niftitular}" nombarrendador="${payload.nombarrendador}" nombarrendatario="${payload.nombarrendatario}" nombtitular="${payload.nombtitular}" />
      </body>
    </vtc:qaltavtc>
  </soapenv:Body>
</soapenv:Envelope>`;

    const sig = new SignedXml();
    // Standard WS-Security signature mappings
    sig.addReference("//*[local-name(.)='Body']", ["http://www.w3.org/2001/10/xml-exc-c14n#"], "http://www.w3.org/2000/09/xmldsig#sha1");
    sig.signingKey = privateKeyPem;
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    sig.keyInfoProvider = new FomentoKeyInfoProvider(certificatePem);

    // Inject the ds:Signature after the BinarySecurityToken inside wsse:Security
    sig.computeSignature(xml, {
        location: { reference: "//*[local-name(.)='BinarySecurityToken']", action: "after" }
    });

    return sig.getSignedXml();
}

async function sendToFomento(signedXml: string) {
    // Use the integration endpoint for now. Can be toggled to production via an ENV var later.
    const endpoint = Deno.env.get('FOMENTO_ENV') === 'production'
        ? 'https://sede.fomento.gob.es/MFOM.Services.VTC.Server/VTCPort'
        : 'https://presede.fomento.gob.es/MFOM.Services.VTC.Server/VTCPort';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            'SOAPAction': 'AltaDeServicio'
        },
        body: signedXml
    });

    const responseText = await response.text();
    return { status: response.status, body: responseText };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const certBase64 = Deno.env.get('FOMENTO_CERT_BASE64');
        const certPassword = Deno.env.get('FOMENTO_CERT_PASSWORD');

        if (!certBase64 || !certPassword) {
            throw new Error("Missing FOMENTO_CERT_BASE64 or FOMENTO_CERT_PASSWORD secrets.");
        }

        const { action, payload } = await req.json();

        if (action === 'alta') {
            const { privateKeyPem, certificatePem } = extractPemFromP12(certBase64, certPassword);
            const signedXml = createSignedAltaSoap(payload, privateKeyPem, certificatePem);

            const fomentoRes = await sendToFomento(signedXml);

            // Basic extraction of <resultado> from the SOAP response
            // A proper XML parser would be better, but regex is sufficient for this simple response
            const resultadoMatch = fomentoRes.body.match(/<resultado>(.*?)<\/resultado>/);
            const resultado = resultadoMatch ? resultadoMatch[1] : null;

            const idServicioMatch = fomentoRes.body.match(/<idservicio>(.*?)<\/idservicio>/);
            const idServicio = idServicioMatch ? idServicioMatch[1] : null;

            const idComunicaMatch = fomentoRes.body.match(/<idcomunica>(.*?)<\/idcomunica>/);
            const idComunica = idComunicaMatch ? idComunicaMatch[1] : null;

            return new Response(JSON.stringify({
                success: resultado === '00',
                resultado,
                idservicio: idServicio,
                idcomunica: idComunica,
                rawResponse: fomentoRes.body
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: fomentoRes.status === 200 ? 200 : 400,
            });

        } else {
            throw new Error(`Unsupported action: ${action}`);
        }

    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
