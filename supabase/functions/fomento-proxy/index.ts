/**
 * fomento-proxy: Direct SOAP proxy to the Ministry of Transport (RVTC).
 * This replaces the Google Cloud Relay for SOAPAction header control.
 * Called by fomento-vtc when FOMENTO_USE_INTERNAL_PROXY=true is set.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { endpoint, signedXml, soapAction, secret, action } = body;

    // WSDL discovery (no secret needed - just reads WSDL)
    if (action === 'wsdl') {
      const wsdlUrl = endpoint || 'https://presede.mitma.gob.es/MFOM.Services.VTC.Server/VTCPort?wsdl';
      const wsdlRes = await fetch(wsdlUrl, { signal: AbortSignal.timeout(20000) });
      const wsdlText = await wsdlRes.text();
      const soapActions = [...wsdlText.matchAll(/soapAction="([^"]+)"/g)].map(m => m[1]);
      const operations = [...wsdlText.matchAll(/operation name="([^"]+)"/g)].map(m => m[1]);
      return new Response(JSON.stringify({
        soapActions,
        operations,
        wsdlSnippet: wsdlText.substring(0, 5000),
        status: wsdlRes.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Validate internal secret
    const expectedSecret = Deno.env.get('FOMENTO_RELAY_SECRET');
    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!endpoint || !signedXml || !soapAction) {
      return new Response(JSON.stringify({ error: 'Missing required fields: endpoint, signedXml, soapAction' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[PROXY] Sending to Ministry: ${endpoint}`);
    console.log(`[PROXY] SOAPAction: ${soapAction}`);

    // Direct call to Ministry with correct SOAPAction header
    const ministryResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`,
      },
      body: signedXml,
    });

    const rawResponse = await ministryResponse.text();
    console.log(`[PROXY] Ministry status: ${ministryResponse.status}`);
    console.log(`[PROXY] Ministry response (first 500 chars): ${rawResponse.substring(0, 500)}`);

    return new Response(JSON.stringify({
      success: ministryResponse.ok,
      status: ministryResponse.status,
      rawResponse: rawResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[PROXY] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
