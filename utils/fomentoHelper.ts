export const buildFomentoPayload = (
    booking: any,
    shifts: any[],
    vehicles: any[],
    drivers: any[],
    municipalities: any[]
) => {
    // Utility to find the assigned vehicle
    const getAssignedVehicle = () => {
        // If explicitly assigned in booking
        if (booking.vehicle_id) {
            const v = vehicles?.find(v => v.id === booking.vehicle_id);
            if (v) return v;
        }

        // If driver assigned, check shift or default vehicle
        if (booking.driver_id) {
            const bDate = booking.pickup_date?.split('T')[0];
            const shift = shifts?.find(s => s.driver_id === booking.driver_id && s.date === bDate);
            if (shift && shift.vehicle_id) {
                const v = vehicles?.find(v => v.id === shift.vehicle_id);
                if (v) return v;
            }

            const driver = drivers?.find(d => d.id === booking.driver_id);
            if (driver && driver.default_vehicle_id) {
                const v = vehicles?.find(v => v.id === driver.default_vehicle_id);
                if (v) return v;
            }
        }
        return null;
    };

    const getCodes = (locName: string, muniName?: string, addressText?: string) => {
        const upper = (locName || '').toUpperCase();
        const upperMuni = (muniName || '').toUpperCase();
        const upperAddress = (addressText || '').toUpperCase();
        
        // 0. Priority for Hubs
        if (upper.includes('AEROPUERTO') || upper.includes('AIRPORT') || upperAddress.includes('AEROPUERTO') || upperAddress.includes('AIRPORT')) {
           return { prov: '03', muni: '065' }; // Elche
        }

        // 1. Try to find by the specific municipality field if it exists
        let match = (municipalities as any[])?.find(m => m.name.toUpperCase() === upperMuni);

        // 2. If no match, try to find by the location text
        if (!match && upper) {
           const matches = (municipalities as any[])?.filter(m => 
              upper.includes(m.name.toUpperCase()) || 
              m.name.toUpperCase().includes(upper)
           ) || [];
           if (matches.length > 0) {
              matches.sort((a, b) => {
                 const idxA = upper.indexOf(a.name.toUpperCase());
                 const idxB = upper.indexOf(b.name.toUpperCase());
                 const realA = idxA !== -1 ? idxA : 999;
                 const realB = idxB !== -1 ? idxB : 999;
                 return realA - realB;
              });
              match = matches[0];
           }
        }

        // 3. If still no match, try to find in the address text
        if (!match && upperAddress) {
           const matches = (municipalities as any[])?.filter(m => 
              upperAddress.includes(m.name.toUpperCase())
           ) || [];
           if (matches.length > 0) {
              matches.sort((a, b) => {
                 const idxA = upperAddress.indexOf(a.name.toUpperCase());
                 const idxB = upperAddress.indexOf(b.name.toUpperCase());
                 const realA = idxA !== -1 ? idxA : 999;
                 const realB = idxB !== -1 ? idxB : 999;
                 return realA - realB;
              });
              match = matches[0];
           }
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

    const assignedVehicle = getAssignedVehicle();
    const plate = assignedVehicle?.plate?.replace(/[-\s]/g, '-') || '2170-LVB';
    const cCodes = getCodes('ALICANTE', 'ALICANTE'); // Contrato
    const oCodes = getCodes(booking.origin, booking.origin_municipality, booking.origin_address); // Origen
    const dCodes = getCodes(booking.destination, booking.destination_municipality, booking.destination_address); // Destino

    const contractDate = new Date(booking.pickup_date);
    contractDate.setDate(contractDate.getDate() - 1); 
    const cDate = contractDate.toISOString().split('T')[0] + 'T10:00:00';

    return {
        fecinicio: booking.pickup_date.split('T')[0],
        horinicio: booking.pickup_time ? booking.pickup_time.substring(0, 5) : '00:00',
        fecfin: booking.pickup_date.split('T')[0],
        matricula: plate,
        niftitular: 'B26816025',
        nif: booking.client_id?.nif || 'B26816025',
        nom: 'PALLADIUM TRANSFERS SL', // Assuming Palladium is titular
        fcontrato: cDate,
        cgprovcontrato: cCodes.prov,
        cgmunicontrato: cCodes.muni,
        cgprovinicio: oCodes.prov,
        cgmuniinicio: oCodes.muni,
        direccioninicio: booking.origin.replace(/\t/g, ' '),
        fprevistainicio: `${booking.pickup_date.split('T')[0]}T${booking.pickup_time || '00:00'}:00`,
        cgprovfin: dCodes.prov,
        cgmunifin: dCodes.muni,
        direccionfin: booking.destination.replace(/\t/g, ' '),
        ffin: booking.pickup_date.split('T')[0],
        veraz: 'S'
    };
};
