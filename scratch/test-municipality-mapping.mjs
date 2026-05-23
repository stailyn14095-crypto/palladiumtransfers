// Mock municipalities
const municipalities = [
  { cod_prov: '03', cod_mun: '031', name: 'Benidorm' },
  { cod_prov: '03', cod_mun: '014', name: 'Alacant/Alicante' },
  { cod_prov: '03', cod_mun: '065', name: 'Elche/Elx' },
  { cod_prov: '03', cod_mun: '018', name: 'Altea' }
];

// Exact function logic replicated from fomentoHelper.ts
const getCodes = (locName, muniName, addressText) => {
    const upper = (locName || '').toUpperCase();
    const upperMuni = (muniName || '').toUpperCase();
    const upperAddress = (addressText || '').toUpperCase();
    
    // 0. Priority for Hubs
    if (upper.includes('AEROPUERTO') || upper.includes('AIRPORT') || upperAddress.includes('AEROPUERTO') || upperAddress.includes('AIRPORT')) {
       return { prov: '03', muni: '065' }; // Elche
    }

    // 1. Try to find by the specific municipality field if it exists
    let match = municipalities.find(m => m.name.toUpperCase() === upperMuni);

    // 2. If no match, try to find by the location text
    if (!match && upper) {
       match = municipalities.find(m => 
          upper.includes(m.name.toUpperCase()) || 
          m.name.toUpperCase().includes(upper)
       );
    }

    // 3. If still no match, try to find in the address text
    if (!match && upperAddress) {
       match = municipalities.find(m => 
          upperAddress.includes(m.name.toUpperCase())
       );
    }

    if (match) {
       return { prov: match.cod_prov || '03', muni: match.cod_mun || '014' };
    }

    // Fallbacks for common cases if not found
    if (upper.includes('ELCHE') || upper.includes('ELX') || upperAddress.includes('ELCHE') || upperAddress.includes('ELX')) return { prov: '03', muni: '065' };
    if (upper.includes('CAMPELLO') || upperAddress.includes('CAMPELLO')) return { prov: '03', muni: '050' };
    if (upper.includes('BENIDORM') || upperAddress.includes('BENIDORM')) return { prov: '03', muni: '031' };
    if (upper.includes('ALTEA') || upperAddress.includes('ALTEA')) return { prov: '03', muni: '018' };
    if (upper.includes('ALICANTE') || upper.includes('ALC') || upperAddress.includes('ALICANTE') || upperAddress.includes('ALC')) return { prov: '03', muni: '014' };
    
    return { prov: '03', muni: '014' }; 
 };

const formatCode = (c) => String(c || '').padStart(3, '0').slice(-3);

const runTest = () => {
    console.log("=== RUNNING MUNICIPALITY MAPPING TESTS ===");

    // Test Case 1: Exact matches via municipality fields
    const booking1 = {
        origin: "Hotel Don Pancho",
        origin_address: "Avenida de los Hoteles, 1, Benidorm",
        origin_municipality: "Benidorm",
        destination: "Alicante Centro",
        destination_address: "Avenida Alfonso X El Sabio, 12, Alicante",
        destination_municipality: "Alacant/Alicante"
    };

    const o1 = getCodes(booking1.origin, booking1.origin_municipality, booking1.origin_address);
    const d1 = getCodes(booking1.destination, booking1.destination_municipality, booking1.destination_address);
    const oMuni1 = formatCode(o1.muni);
    const dMuni1 = formatCode(d1.muni);

    console.log("Test Case 1: Exact matches via municipality fields");
    console.log("Origin (cgmuniinicio):", oMuni1, "Expected: 031 (Benidorm)");
    console.log("Destination (cgmunifin):", dMuni1, "Expected: 014 (Alicante)");
    console.log("PASS:", oMuni1 === '031' && dMuni1 === '014' ? "YES" : "NO");
    console.log("-----------------------------------------");

    // Test Case 2: Null municipality fields, matching via address texts
    const booking2 = {
        origin: "Hotel Don Pancho",
        origin_address: "Avenida de los Hoteles, 1, Benidorm",
        origin_municipality: null,
        destination: "Hotel Melia Alicante",
        destination_address: "Plaza del Puerto, 3, Alicante",
        destination_municipality: null
    };

    const o2 = getCodes(booking2.origin, booking2.origin_municipality, booking2.origin_address);
    const d2 = getCodes(booking2.destination, booking2.destination_municipality, booking2.destination_address);
    const oMuni2 = formatCode(o2.muni);
    const dMuni2 = formatCode(d2.muni);

    console.log("Test Case 2: Null municipality fields, matching via address texts");
    console.log("Origin (cgmuniinicio):", oMuni2, "Expected: 031 (Benidorm)");
    console.log("Destination (cgmunifin):", dMuni2, "Expected: 014 (Alicante)");
    console.log("PASS:", oMuni2 === '031' && dMuni2 === '014' ? "YES" : "NO");
    console.log("-----------------------------------------");

    // Test Case 3: Airport priority mapping
    const booking3 = {
        origin: "Aeropuerto de Alicante",
        origin_address: "Terminal de Llegadas, ALC Airport",
        origin_municipality: null,
        destination: "Calle de Altea, Altea",
        destination_address: "Calle de Altea, Altea",
        destination_municipality: null
    };

    const o3 = getCodes(booking3.origin, booking3.origin_municipality, booking3.origin_address);
    const d3 = getCodes(booking3.destination, booking3.destination_municipality, booking3.destination_address);
    const oMuni3 = formatCode(o3.muni);
    const dMuni3 = formatCode(d3.muni);

    console.log("Test Case 3: Airport priority mapping");
    console.log("Origin (cgmuniinicio):", oMuni3, "Expected: 065 (Elche - Airport)");
    console.log("Destination (cgmunifin):", dMuni3, "Expected: 018 (Altea)");
    console.log("PASS:", oMuni3 === '065' && dMuni3 === '018' ? "YES" : "NO");
    console.log("-----------------------------------------");
};

runTest();
