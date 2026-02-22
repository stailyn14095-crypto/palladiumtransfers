import { Booking, Driver } from '../types';

/**
 * POLICY CONSTANTS
 */
const WAIT_TIMES = {
    AIRPORT: 50, // minutes
    STATION: 15, // minutes
    CITY: 0,     // minutes
};

const DEFAULT_TRAVEL_TIME = 60; // minutes
const SAFETY_BUFFER = 0;      // minutes
const BASE_LOCATION = 'Benidorm';

// Simple estimation map for common routes
const TRAVEL_TIME_MAP: Record<string, number> = {
    // Alicante Airport (ALC) - North
    'ALICANTE AEROPUERTO (ALC) - Benidorm': 40,
    'ALICANTE AEROPUERTO (ALC) - Albir': 45,
    'ALICANTE AEROPUERTO (ALC) - Altea': 50,
    'ALICANTE AEROPUERTO (ALC) - Calpe': 55,
    'ALICANTE AEROPUERTO (ALC) - Benissa': 65,
    'ALICANTE AEROPUERTO (ALC) - Moraira': 70,
    'ALICANTE AEROPUERTO (ALC) - Javea': 75,
    'ALICANTE AEROPUERTO (ALC) - Denia': 70,
    'ALICANTE AEROPUERTO (ALC) - Villajoyosa': 35,
    'ALICANTE AEROPUERTO (ALC) - El Campello': 20,

    // Alicante Airport (ALC) - South / Inland
    'ALICANTE AEROPUERTO (ALC) - Alicante': 15, // requested specifically
    'ALICANTE AEROPUERTO (ALC) - Alicante Centro': 15,
    'ALICANTE AEROPUERTO (ALC) - Elche': 20,
    'ALICANTE AEROPUERTO (ALC) - Santa Pola': 15,
    'ALICANTE AEROPUERTO (ALC) - Torrevieja': 45,
    'ALICANTE AEROPUERTO (ALC) - Murcia': 55,

    // Long Distance
    'ALICANTE AEROPUERTO (ALC) - Valencia': 115,
    'ALICANTE AEROPUERTO (ALC) - Gandía': 85,

    // Inter-City (North)
    'Benidorm - Altea': 20,
    'Benidorm - Calpe': 30,
    'Benidorm - Valencia': 90,
    'Benidorm - Alicante': 35,
    'Benidorm - ALICANTE AEROPUERTO (ALC)': 40, // redundant but safe
    'Calpe - ALICANTE AEROPUERTO (ALC)': 55,    // redundant but safe
    'Alicante Centro - ALICANTE AEROPUERTO (ALC)': 15, // redundant but safe
};

/**
 * Heuristic to determine wait time based on origin text
 */
function getWaitTime(location: string): number {
    const loc = location.toLowerCase();
    if (loc.includes('aeropuerto') || loc.includes('alc')) return WAIT_TIMES.AIRPORT;
    if (loc.includes('estación') || loc.includes('renfe') || loc.includes('ave')) return WAIT_TIMES.STATION;
    return WAIT_TIMES.CITY;
}

/**
 * Estimate travel time between origin and destination
 */
export function estimateTravelTime(origin: string, destination: string): number {
    const o = origin.trim().toLowerCase();
    const d = destination.trim().toLowerCase();

    // Check for Airport Same Location (ALC / Aeropuerto)
    const isAirport = (loc: string) => loc.includes('aeropuerto') || loc.includes('alc');
    if (isAirport(o) && isAirport(d)) return 0; // No travel time between terminals/parking

    // Check for same location (City stay)
    if (o === d) {
        return 15; // 15 mins for intra-city transit
    }

    const route = `${o} - ${d}`;
    const reverseRoute = `${d} - ${o}`;

    const key = Object.keys(TRAVEL_TIME_MAP).find(k => {
        const lowerK = k.toLowerCase();
        return lowerK === route || lowerK === reverseRoute;
    });

    if (key) return TRAVEL_TIME_MAP[key];

    return DEFAULT_TRAVEL_TIME;
}

/**
 * Safely parse date and time strings regardless of format
 */
function parseDateTime(date: any, time: string): Date {
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];
    return new Date(`${dateStr}T${time}`);
}

/**
 * Calculates when the driver will be free again after a booking
 * Returns a Date object
 */
export function calculateAvailableAt(booking: any): Date {
    const pickupDate = parseDateTime(booking.pickup_date, booking.pickup_time);
    const waitTime = getWaitTime(booking.origin);
    const travelTime = estimateTravelTime(booking.origin, booking.destination);

    // Total time = Pickup + Wait + Travel + Safety Buffer
    const totalMinutes = waitTime + travelTime + SAFETY_BUFFER;

    return new Date(pickupDate.getTime() + totalMinutes * 60000);
}

/**
 * Checks if a driver is available for a new booking given their existing schedule
 * AND vehicle compatibility (capacity and category)
 */
/**
 * Checks if a time is within a shift range (handles constraints)
 */
function isTimeWithinShift(timeStr: string, shiftHours: string): boolean {
    if (!shiftHours || !shiftHours.includes('-')) return true; // No hours defined = assume available if shift exists

    const [startStr, endStr] = shiftHours.split('-');
    const time = parseInt(timeStr.replace(':', ''));
    const start = parseInt(startStr.replace(':', ''));
    const end = parseInt(endStr.replace(':', ''));

    if (start < end) {
        // Normal shift (e.g. 08:00 - 16:00)
        return time >= start && time <= end;
    } else {
        // Overnight shift (e.g. 22:00 - 06:00)
        return time >= start || time <= end;
    }
}

const CITY_DELAY_TOLERANCE = 15; // minutes
const AIRPORT_DELAY_TOLERANCE = 30; // minutes

/**
 * Checks if a driver is available for a new booking given their existing schedule,
 * vehicle compatibility, AND SHIFT ASSIGNMENT.
 */
export function isDriverAvailable(driver: any, vehicle: any, newBooking: any, allBookings: any[], allShifts: any[] = []): boolean {
    // 0. Shift Check (New Strict Logic)
    // Find shift for this driver on this booking's date
    const bookingDateStr = typeof newBooking.pickup_date === 'string' ? newBooking.pickup_date.split('T')[0] : new Date(newBooking.pickup_date).toISOString().split('T')[0];
    const shift = allShifts.find(s => s.driver_id === driver.id && s.date === bookingDateStr);

    // Rule: If no shift is assigned, driver is NOT available.
    if (!shift) return false;

    // Rule: If shift type is explicitly 'Libre' or 'OFF', driver is NOT available.
    if (shift.type === 'Libre' || shift.type === 'OFF') return false;

    // Rule: Check time constraints if hours are defined
    if (shift.hours && !isTimeWithinShift(newBooking.pickup_time, shift.hours)) {
        return false;
    }

    // 1. Compatibility Check
    const reqPax = newBooking.pax_count || 1;
    const reqClass = newBooking.vehicle_class || 'Standard';

    if (vehicle && vehicle.capacity < reqPax) return false;
    if (reqClass !== 'Standard' && vehicle && vehicle.category !== reqClass) return false;

    // 2. Schedule Check
    const driverBookings = allBookings.filter(b =>
        b.driver_id === driver.id &&
        b.status !== 'Completed' &&
        b.status !== 'Cancelled' &&
        b.id !== newBooking.id && // Don't check against self if editing
        (typeof b.pickup_date === 'string' ? b.pickup_date.split('T')[0] : new Date(b.pickup_date).toISOString().split('T')[0]) ===
        bookingDateStr
    );

    const newStart = parseDateTime(newBooking.pickup_date, newBooking.pickup_time);
    const newEnd = calculateAvailableAt(newBooking);

    for (const b of driverBookings) {
        const bStart = parseDateTime(b.pickup_date, b.pickup_time);
        const bEnd = calculateAvailableAt(b);

        // We mathematically calculate the exact arrival time between services.
        // This unified approach naturally covers both direct timeslot overlaps AND repositioning delays.

        // a. If the new booking comes AFTER the existing booking `b`
        if (newStart.getTime() >= bStart.getTime()) {
            const repositionTime = estimateTravelTime(b.destination, newBooking.origin);
            const arrivalTime = bEnd.getTime() + repositionTime * 60000;
            const isAirportPickup = newBooking.origin.toLowerCase().includes('aeropuerto') || newBooking.origin.toLowerCase().includes('alc');
            const toleranceMinutes = isAirportPickup ? AIRPORT_DELAY_TOLERANCE : CITY_DELAY_TOLERANCE;

            if (arrivalTime > newStart.getTime() + (toleranceMinutes * 60000)) return false;
        }

        // b. If the new booking comes BEFORE the existing booking `b`
        if (bStart.getTime() >= newStart.getTime()) {
            const repositionTime = estimateTravelTime(newBooking.destination, b.origin);
            const arrivalTime = newEnd.getTime() + repositionTime * 60000;
            const isAirportPickup = b.origin.toLowerCase().includes('aeropuerto') || b.origin.toLowerCase().includes('alc');
            const toleranceMinutes = isAirportPickup ? AIRPORT_DELAY_TOLERANCE : CITY_DELAY_TOLERANCE;

            if (arrivalTime > bStart.getTime() + (toleranceMinutes * 60000)) return false;
        }
    }

    // 3. Base Repositioning Check (First service of the day)
    // If this is the earliest service, ensure we can get from the base to the origin on time
    const sortedAll = [...driverBookings, newBooking].sort((a, b) => {
        const tA = parseDateTime(a.pickup_date, a.pickup_time).getTime();
        const tB = parseDateTime(b.pickup_date, b.pickup_time).getTime();
        return tA - tB;
    });

    if (sortedAll[0].id === newBooking.id) {
        // This is the first service. Check against shift start.
        if (shift.hours && shift.hours.includes('-')) {
            const shiftStartStr = shift.hours.split('-')[0];
            const shiftStart = parseDateTime(newBooking.pickup_date, shiftStartStr);
            const timeFromBase = estimateTravelTime(BASE_LOCATION, newBooking.origin);
            const earliestPossiblePickup = new Date(shiftStart.getTime() + timeFromBase * 60000);

            if (newStart.getTime() < earliestPossiblePickup.getTime()) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Suggests the best available driver for a booking
 */
export function suggestDriver(booking: any, drivers: any[], allBookings: any[], allVehicles: any[], allShifts: any[] = []): any | null {
    // Priority: 
    // 1. Has valid Shift
    // 2. Working status
    // 3. Vehicle compatibility
    // 4. Availability gap & Load balancing

    const availableDrivers = drivers
        .filter(d => d.current_status === 'Working' || d.current_status === 'Paused') // Still check status, but shift is primary
        .filter(d => {
            const vehicle = allVehicles.find(v => v.plate === d.plate);
            return isDriverAvailable(d, vehicle, booking, allBookings, allShifts);
        });

    if (availableDrivers.length === 0) return null;

    // Sort by proximity and then load balancing
    return availableDrivers.sort((a, b) => {
        // A. PROXIMITY SCORE (Time to get to the new service)
        const getRepositionTime = (driver: any) => {
            const dBookings = allBookings.filter(bk =>
                bk.driver_id === driver.id &&
                bk.status !== 'Cancelled' &&
                bk.status !== 'Completed' &&
                (typeof bk.pickup_date === 'string' ? bk.pickup_date.split('T')[0] : new Date(bk.pickup_date).toISOString().split('T')[0]) ===
                (typeof booking.pickup_date === 'string' ? booking.pickup_date.split('T')[0] : new Date(booking.pickup_date).toISOString().split('T')[0])
            ).sort((m, n) => {
                return parseDateTime(m.pickup_date, m.pickup_time).getTime() - parseDateTime(n.pickup_date, n.pickup_time).getTime();
            });

            const targetStart = parseDateTime(booking.pickup_date, booking.pickup_time).getTime();

            // Find the service immediately before this one
            const prev = [...dBookings].reverse().find(bk => parseDateTime(bk.pickup_date, bk.pickup_time).getTime() < targetStart);

            if (prev) {
                return estimateTravelTime(prev.destination, booking.origin);
            } else {
                // First service of the day -> Distance from Base
                return estimateTravelTime(BASE_LOCATION, booking.origin);
            }
        };

        const timeA = getRepositionTime(a);
        const timeB = getRepositionTime(b);

        if (timeA !== timeB) return timeA - timeB;

        // B. LOAD BALANCING (Tie-breaker)
        const countA = allBookings.filter(bk => bk.driver_id === a.id && bk.pickup_date === booking.pickup_date).length;
        const countB = allBookings.filter(bk => bk.driver_id === b.id && bk.pickup_date === booking.pickup_date).length;
        return countA - countB;
    })[0];
}

/**
 * Detects conflicts in existing assignments.
 * Returns a list of human-readable conflict messages AND the IDs of the conflicting bookings.
 */
export function detectScheduleConflicts(bookings: any[]): { messages: string[], conflictIds: string[] } {
    const messages: string[] = [];
    const conflictIds: string[] = [];

    // Only check assigned, non-cancelled/completed bookings
    const assignedBookings = bookings.filter(b => b.driver_id && b.status !== 'Cancelled' && b.status !== 'Completed');

    // Group by driver
    const bookingsByDriver: Record<string, any[]> = {};
    for (const b of assignedBookings) {
        if (!bookingsByDriver[b.driver_id]) {
            bookingsByDriver[b.driver_id] = [];
        }
        bookingsByDriver[b.driver_id].push(b);
    }

    // Check each driver's schedule
    for (const driverId in bookingsByDriver) {
        const driverName = bookingsByDriver[driverId][0].assigned_driver_name || 'Conductor';
        // Sort by date/time
        const driverSchedule = bookingsByDriver[driverId].sort((a, b) => {
            const dateA = parseDateTime(a.pickup_date, a.pickup_time);
            const dateB = parseDateTime(b.pickup_date, b.pickup_time);
            return dateA.getTime() - dateB.getTime();
        });

        for (let i = 0; i < driverSchedule.length - 1; i++) {
            const current = driverSchedule[i];
            const next = driverSchedule[i + 1];

            const currentEnd = calculateAvailableAt(current);
            const nextStart = parseDateTime(next.pickup_date, next.pickup_time);

            let conflict = false;

            const repositionTime = estimateTravelTime(current.destination, next.origin);
            const arrivalTime = currentEnd.getTime() + repositionTime * 60000;
            const delayMs = arrivalTime - nextStart.getTime();

            if (delayMs > 0) {
                const delayMinutes = Math.round(delayMs / 60000);
                const isAirportPickup = next.origin.toLowerCase().includes('aeropuerto') || next.origin.toLowerCase().includes('alc');
                const allowableDelay = isAirportPickup ? AIRPORT_DELAY_TOLERANCE : CITY_DELAY_TOLERANCE;

                if (delayMinutes <= allowableDelay) {
                    messages.push(`⚠️ ${driverName}: Llegará ${delayMinutes} min tarde a ${next.origin} (Tolerancia admitida < ${allowableDelay} min). Recogida original: ${next.pickup_time}`);
                } else {
                    const expectedTimeStr = new Date(arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    messages.push(`🛑 ${driverName}: SOLAPAMIENTO. Llegará a las ${expectedTimeStr} a ${next.origin} (${delayMinutes} min tarde).`);
                    conflict = true;
                }
            }

            if (conflict) {
                // Mark the *later* booking as the conflicting one to be unassigned
                if (!conflictIds.includes(next.id)) {
                    conflictIds.push(next.id);
                }
            }
        }
    }

    return { messages, conflictIds };
}
