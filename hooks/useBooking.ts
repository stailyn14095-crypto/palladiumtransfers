import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { jsPDF } from 'jspdf';
import { useToast } from '../components/ui/Toast';

export interface BookingFormData {
    tripType: string;
    origin: string;
    destination: string;
    date: string;
    time: string;
    returnDate: string;
    returnTime: string;
    passengers: number;
    email: string;
    name: string;
    phone: string;
    flightNumber: string;
    pickupAddress: string;
    notes: string;
    vehicleModel: string;
}

export const useBooking = (language: string = 'es') => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const [availableExtras, setAvailableExtras] = useState<any[]>([]);
    const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
    const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
    const [estimatedCollaboratorPrice, setEstimatedCollaboratorPrice] = useState<number | null>(null);
    const [origins, setOrigins] = useState<string[]>([]);
    const [destinations, setDestinations] = useState<string[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
    const [maxCapacity, setMaxCapacity] = useState<number>(8);
    const [roundTripMultiplier, setRoundTripMultiplier] = useState<number>(1.8);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const [formData, setFormData] = useState<BookingFormData>({
        tripType: 'One Way',
        origin: '',
        destination: '',
        date: '',
        time: '',
        returnDate: '',
        returnTime: '',
        passengers: 1,
        email: '',
        name: '',
        phone: '',
        flightNumber: '',
        pickupAddress: '',
        notes: '',
        vehicleModel: 'Standard',
    });

    useEffect(() => {
        const controller = new AbortController();
        fetchInitialData(controller.signal);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        calculatePrice();
    }, [formData.origin, formData.destination, tariffs, formData.tripType, selectedExtras, formData.vehicleModel, roundTripMultiplier]);

    // Update destinations when origin changes
    useEffect(() => {
        if (formData.origin) {
            const forward = tariffs.filter(t => t.origin === formData.origin).map(t => t.destination);
            const backward = tariffs.filter(t => t.destination === formData.origin).map(t => t.origin);
            const relevantDestinations = Array.from(new Set([...forward, ...backward])).filter(d => d !== formData.origin);

            setDestinations(relevantDestinations);
            if (!relevantDestinations.includes(formData.destination)) {
                setFormData(prev => ({ ...prev, destination: '' }));
            }
        } else {
            setDestinations([]);
        }
    }, [formData.origin, tariffs]);

    // Compute available vehicles for the selected route
    useEffect(() => {
        if (formData.origin && formData.destination) {
            const matchingTariffs = tariffs.filter(t =>
                (t.origin === formData.origin && t.destination === formData.destination) ||
                (t.origin === formData.destination && t.destination === formData.origin)
            );

            // Extract unique vehicle classes and their prices
            const vehiclesMap = new Map();
            matchingTariffs.forEach(t => {
                const cls = (t.class || 'Standard').trim();
                const price = parseFloat(t.base_price || t.price || 0);
                let displayPrice = price;
                if (formData.tripType === 'Round Trip') displayPrice = price * roundTripMultiplier;

                if (!vehiclesMap.has(cls) || vehiclesMap.get(cls).price > price) {
                    vehiclesMap.set(cls, { id: cls, price: displayPrice });
                }
            });

            const uniqueVehicles = Array.from(vehiclesMap.values());
            setAvailableVehicles(uniqueVehicles);

            // if current forms.vehicleModel is not in uniqueVehicles, pick the first one
            if (uniqueVehicles.length > 0 && !uniqueVehicles.find(v => v.id === formData.vehicleModel)) {
                setFormData(prev => ({ ...prev, vehicleModel: uniqueVehicles[0].id }));
            }
        } else {
            setAvailableVehicles([]);
        }
    }, [formData.origin, formData.destination, tariffs, formData.tripType, roundTripMultiplier]);

    async function fetchInitialData(signal?: AbortSignal) {
        console.log('useBooking: fetchInitialData started');
        try {
            const [tariffsRes, extrasRes, settingsRes, sessionRes] = await Promise.all([
                supabase.from('tariffs').select('*').abortSignal(signal),
                supabase.from('service_extras').select('*').abortSignal(signal),
                supabase.from('system_settings').select('key, value').eq('key', 'round_trip_multiplier').abortSignal(signal),
                supabase.auth.getSession()
            ]);

            const session = sessionRes.data?.session;
            if (session?.user) {
                setIsLoggedIn(true);
                setFormData(prev => ({
                    ...prev,
                    email: prev.email || session.user.email || '',
                    name: prev.name || session.user.user_metadata?.full_name || '',
                    phone: prev.phone || session.user.user_metadata?.phone || ''
                }));
            }

            if (tariffsRes.error) {
                if (tariffsRes.error.message?.includes('aborted')) return;
                console.error('useBooking: Error fetching tariffs:', tariffsRes.error);
                showToast('Error al cargar tarifas', 'error');
            }

            if (tariffsRes.data) {
                console.log('useBooking: Tariffs fetched:', tariffsRes.data.length);
                setTariffs(tariffsRes.data);
                const allLocs = tariffsRes.data.reduce((acc: string[], t: any) => {
                    if (t.origin) acc.push(t.origin);
                    if (t.destination) acc.push(t.destination);
                    return acc;
                }, []);
                const uniqueOrigins = Array.from(new Set(allLocs)).filter(Boolean).sort();
                console.log('useBooking: Unique locations found:', uniqueOrigins.length);
                setOrigins(uniqueOrigins as string[]);
            }

            if (extrasRes.error) {
                if (extrasRes.error.message?.includes('aborted')) return;
                console.error('useBooking: Error fetching extras:', extrasRes.error);
            }
            if (extrasRes.data) setAvailableExtras(extrasRes.data);

            if (settingsRes && settingsRes.data && settingsRes.data.length > 0) {
                const multiplierStr = settingsRes.data[0].value;
                const multiplier = parseFloat(multiplierStr);
                if (!isNaN(multiplier)) {
                    setRoundTripMultiplier(multiplier);
                }
            }

            // Fetch Maximum Capacity from Vehicles
            const { data: vehiclesData } = await supabase.from('vehicles').select('capacity');
            if (vehiclesData && vehiclesData.length > 0) {
                const max = Math.max(...vehiclesData.map(v => v.capacity || 0));
                if (max > 0) setMaxCapacity(max);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || err.message?.includes('aborted')) return;
            console.error('useBooking: Unexpected error in fetchInitialData:', err);
        }
    }

    const calculatePrice = () => {
        if (!formData.origin || !formData.destination) {
            setEstimatedPrice(null);
            setEstimatedCollaboratorPrice(null);
            return;
        }

        const matchingTariffs = tariffs.filter(t =>
            (t.origin === formData.origin && t.destination === formData.destination) ||
            (t.origin === formData.destination && t.destination === formData.origin)
        );

        // Client Price Match (for estimating what the client pays)
        let clientMatch = matchingTariffs.find(t =>
            (t.audience_type === 'Cliente' || !t.audience_type) &&
            (t.class || 'Standard').trim() === formData.vehicleModel
        );
        if (!clientMatch && matchingTariffs.length > 0) {
            clientMatch = matchingTariffs.find(t => (t.audience_type === 'Cliente' || !t.audience_type));
        }

        // Collaborator Price Match (for estimating what the driver gets)
        let collabMatch = matchingTariffs.find(t =>
            t.audience_type === 'Conductor' &&
            (t.class || 'Standard').trim() === formData.vehicleModel
        );
        if (!collabMatch && matchingTariffs.length > 0) {
            collabMatch = matchingTariffs.find(t => t.audience_type === 'Conductor');
        }

        let totalPrice = 0;
        let totalCollabPrice = 0;

        if (clientMatch) {
            totalPrice = parseFloat(clientMatch.base_price || clientMatch.price || 0);
            if (formData.tripType === 'Round Trip') totalPrice *= roundTripMultiplier;
        }

        if (collabMatch) {
            totalCollabPrice = parseFloat(collabMatch.base_price || collabMatch.price || 0);
            // Each leg should have the base conductor price, but for the total estimated sum:
            if (formData.tripType === 'Round Trip') totalCollabPrice *= 2; // Split later by 2
        }

        if (!clientMatch && !collabMatch) {
            setEstimatedPrice(null);
            setEstimatedCollaboratorPrice(null);
            return;
        }

        selectedExtras.forEach(extraId => {
            const extra = availableExtras.find(e => e.id === extraId);
            if (extra) {
                const p = parseFloat(extra.price || 0);
                totalPrice += p;
                // extras might not add to collaborator price, but if they do, we could add here
            }
        });

        setEstimatedPrice(totalPrice);
        setEstimatedCollaboratorPrice(totalCollabPrice);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto-fill logic for addresses based on selections
            if (name === 'origin' || name === 'destination') {
                const selectedTariff = tariffs.find(t =>
                    (name === 'origin' && t.origin === value) ||
                    (name === 'destination' && t.destination === value)
                );

                if (selectedTariff) {
                    if (name === 'origin') {
                        // We used to auto-fill pickupAddress here, but the user requested it to be blank
                        // so the client can fill it manually.
                    } else if (name === 'destination') {
                        // For destination, we don't have a separate 'returnPickupAddress' in the base state yet,
                        // but if we are in a 'One Way' and the destination is an airport, we might want to prompt or fill.
                        // However, usually 'pickupAddress' is the main one.
                        // If it's a Return trip, we might want to handle returnPickupAddress.
                    }
                }
            }

            return newData;
        });
    };

    const toggleExtra = (extraId: string) => {
        setSelectedExtras(prev =>
            prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]
        );
    };

    const generateVoucher = (bookings: any[]) => {
        const doc = new jsPDF();
        const primaryColor = [20, 30, 43];
        const accentColor = [59, 130, 246];

        // Base64 PNG representation of the logo (previously an inline SVG)
        const logoPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOAAAAA4CAMAAAAEq5/ZAAAABGdBTUEAALGPC/xhBQAAAwBQTFRF////3bNe2LNd2LNd2bNd2rNd2rNc2bNc2bRd2LRd17Rd17Rc1rRc1rRb1rRb1LVb1LVa07Va07VZ0bVZ0bVY0LVY0LVXz7VXz7VWzrVWzrVVzbVVzbVUzbVUzbRUzbRUzLRTzLRTzLRSy7RSy7RRy7RRyrRRyrRQyrRQybRQybRPyLRPx7RPx7ROx7NNx7NNxrNNxrNMxLNMxLLMxLLMw7LMw7LLwrLLwrLKwbLKwbLJwLLJwLHIwLHIv7HIv7HHvrHHvrHGvrHGvbHGvbHFvbHFvLHFvLHEu7HEu7HDurHDurHCurHCuLHCubHBuLGBt7GBt7GAtbGBtbGAtbF/tLF/tLF+s7F+s7F9srF9sbF9sbF8sbF8sLF8r7F8r7F7r7F7rrF7rrF6rbF5rLFX2LRZ2bVZ2rVZ2rVY27ZY3LZY3LZZ3bdZ3rhZ37ha4Lla4bpa4bpb4rpb47tc47td5Ltd5Lte5bxe5bxf5rxf5rxg571g571h575h6L5i6L9i6b9i6b9j6r9j6r9k6sBk6sBl68Bl68Bm7MBm7MFm7MFn7cFo7cJo7cJo7cJo7cJo7sJp7sNp7sNq7sNq78Rq78Rr78Vs78Vs8MZs8MZs8MZt8cdu8cdu8cdv8shw8shw8shx8shx8shx88ly88ly88ly88lz88p09Mp19cp29cp39cp39cp39cp39cp49cp49cp59st59st69st69st79st89st89st89sx89sx99sx99sx+9sx+9sx/98x/982A982A982A982B982B982C982D982D986E986F986F986G986H986H986I+M6I+M+I+M+J+M+J+c+K+c+K+c+L+c+L+c+M+c+M+dCN+dCO+dCO+dCP+dCP+dCQ+dCR+dCR+dCS+dGT+dGU+tGU+tGV+tGV+tGW+tGW+tGX+tGX+tGY+tGY+tGZ+tH2/tH2/tH3/9H3/9H3/9L4/9L4/9L4/9L4/9L4/9P5/9P5/9P5/9P5/9P6/9P6/9P6/9P6/9P6/9P6/9P7/9T7/9T8/9T8/9T8/9T8/9T9/9T9/9T9/9T9/9T9/9T9/9X+/9X+/9X+/9X+/9X//9X//9X//9X//9X//9X//9X//9X//9X//9X//9X/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////yvC8hAAAAMt0Uk5T/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AJ0p4mAAAAxQSURBVHja7V1ZgBNFGp6eScdxOCyHoiJ4gBdc8d71vI9zPTDqoih44aKrrsrqrrvGeKBuxvOq7HrrrsKKLrsuu8hOZhJJJzNJJjPJTCaTySTv91811TM9011TMxlN9m/4p6en/6qu+t9/X1VXXZ0R/4uLzR7gB7p9XAA0iP4HGA3tI0g9T/sN5mXUvjQO6bH4J8c2f1fbrI9F22YQ8vL4l6m+/8e2T/2e9tmnpMhY1+I21eQ766xN+0iUfev1w324q7rV21e0xbbw+Oeq7y1t//Zf2v52u1WntTjP7k1bK7e1B6m2oQkP4O7qV287R9tuba4fH/h/V3n+pdtC13Y3N630c7q3+9a5PtR2wXqG20Q/gA5pWbzthg1bbzI3+Bfc2qfVbb2zbsHnb3S2pY2+Tmm/TtsE/q3f2tqStqUptAwr2Nqn1V29g27CRUvX7W9L2WIVaH4B7G9H26qG2DUvSdmtrWntvtdoGFextRNuhR9g2LEHboa3N62VqfQDubb7a1hym1yY3U9v1rY9pPU+tDwR7m662tT+yXQ+TqO2GNndpUusDwd5mqu2iX9g++wG1ndu2Jq6b1DqBYG/Da7vsbNsnv1Dbm9rOxj2t1gcO9jaztgv+1563F9S2rm1N3C6pdQLB3mbXdtb/2D77ltoeajsbszVaH9iwtwdq++q/bd0oUduHbd0kXh+AvT1U2xn/a8/+Z2rbuU19jE/S+kCwtxm1nf6/9uzvqO3+Nl2+zdp3oGBvj9I27W/tsR+i7cE2XRbnM1v9Dnbp/D103x47R243fH8t9+Nl2v62rRskY4P1v32iPXYsYn6k9yM/x1u0XZfK0D+Erb103x47C20X1X/b8v5l2n6S1Mv1T6aE4O7sX++tI/iZqba9/Nsu4y9R20nJDE2D0Hq5EII99HnJ19z5+oR3Nqg99zX09P8R5+Jitf0oZzG+mRL9R7Vebg3Bnv6iT151h+A1L25XW2gT8SfcD7S8S/zHkE+gE0/X22f2h+T6zH+E1rT3A0F1W9K5+m130vUvtO11sQd/H4m1oI1dC6jP0Y9x/+W05B92bX0sM/ZbaE37wIPU2z13T9q0bQ/TduLftL3q2W0OtbG/Y+J7qO9Rj3A/JvnPZ2yR1K3U1O/fB+hN/P2kX/hL0PZ7vG1XjYVqY1dh30B9wFvX81Puj00m/kM0r72ZmsZtnf0T2eH4u3LwIrz4xVvXofP7G2pjP8Eewv6E+hj/CfdHpvJ+aUaEpl1Z1299yG9v0rQ23N2SntJ2l6wN1R66FvsU9l20Z1J4T3H/Z3Kcf8DMTc+GfX32T2SF2N28P20q1B6Yy/qIty1t7GfYA9gnUB/lfsZf2gXnE+K8J2ZuaoZ+618B7S12Tdrb6sA7PjKpjT2D/R77KOpD3E+4z/FXd0Hj5E1t5ibH1wfgH2x9xNuxNvaPx/6IfRxv5yvcl/nPZ34u5QZ4GZua1tffHqBprdtQG/vLsd/l24d9jNf4Bvdl/vOZEE27sSka+20Q3i213QvO2lRtbBb7LfYh7GPYx3qNr3A/ZhF3QdN20Q+4j36zT2i9O7fUxp6O/Yp9H/ZbvO07uM/wlzfH25sV+m2Af0b98K1vTepjX479Ens/+gW8R1yY+yn30y8V25s5/jbIbrn/jVvtE+aR2NjPYr/A3ptvF7xHnMZ7I/dTf1o09iZPv/WvB36C8k9f/eB+YRyEPRT7Oexd2C9gH8U+xmf8Kfc7E7nPGiU1t+5B6wNgZ1fD89X/J2h9Y0r2qdjLsrZg78LejX0E+yifcQv3u9O5zyoOzd3kffutD36w3ZfJ56s/8wtsqE+Ese/GHsz3sE/wGbXcXzK5zz43Q3P3Ruvbb2dnqT/M+A+2vjGpe9qLsYdiD8B+Evsos8Xcfz22PvvC1gfcW/X2kX4T2M2p6g8y/gNtY4PZp2IPxB6CPRR7WcYW1EeV21aI+8tz67PPb32wX25BvbnR5n2eA18Xm98144k1aDso21764+Xz2I1qH2W2uH/G5g2mH5f0O/T3P9p/tXf2j18p84qgRjXbFh+VbS/1fB27Ve1jzBZu5F2mHZeYIajzBvuN1vcvsXgK2F6P2vJt01S2vXRxU12A3ar24dk893fN0PSjmR76E219/cZ3z5vI9nrcnI9pZduLXh/G1a+0/Rj2Eeynso7Hhbn/b+G0Y3PzNO7H2219/SbeJ2T9BbaX40q+L6+2vaQxK1cXYr+IfZjvYR+d4Tz3/y2cdhxo0K6r/TZoXb+J91lZd4Pt1Sj1uY8MbdV0Y5q9X1Kfx34R+yX2S9Q07MNz28r9A4unHYcbaE+Zfhtc12/iXSPr9bIdR6nIu8z1l49t11vE+lixd2UXYL/MOg37cOxD2Mf4jD/k/rHF047DBrQH6bHBL9SbgfcYWX1sH0ApzBstD9rZtueU1LqA12b2HuxC7KPYR/mM2VyQ+wlLpx2HGWjXGnx+2tO3oTqT4p2WdTHbR1FaeoPlPjvbNrR2qA8g0qQ22Iexj/IZI7hfskracZiBdm3qt0Hq2fN1zK6DItl+hpK5d1jeD07u05LwB1kfHkCshT2AfaTfQx/L/fXl0o5DDdReX7/1wb3VB1n20P8WdpeQrdvT1D01l90mN95zV7a1h7nB42vH2mS9/BqO2l14b3I/f0Pz2nGYgXahXmH2Z3rP6mPswjLZnkfx3N8Z91mK47yubItaf5d1E0FvK7W1O/AeTz7K/eWbteMQg3Zhnd8Go14dZDwLtsZmeznFUx6t9fmsXyI5x11o5DuxPrgL6X2m2jZkH8d7HPk49y9u1Y5DDdpdrt8Gw14cZKSDrTXZXkWxkEfqfQY57m1u+DutD4M7Q9vW7GPZx29yX/l27TjEoH3a7DfqH2Psq12A7Y2UCmF/X0aOd4sb+G7rj+DO1/bwYf6A+/f21o5DDNrf3X4bxP0wQ2lHsh2m1Gg292d3Ose+021OQn0Q2zN624cO9yUv1I5DDBqjZ54t9dsgru5PzFA6lu2pFIpge09ejv3oGyeif1YI7LzH9vBhbuF3uB+1RjsOsWfHn6x/HNRsP9sA22mKQ9jeN8q12Uf2OAn1QW5Hn2lrm0T/7eBvuf+hUzG1L9v6j2xd+2qE3+X+FwzVjkPs2V8uNPoLcJntIEX/2N4X33Yn4i77/1E2xLY9gDvnS7aD2j5Q7oO/Z/Zf2Zp8r9m10K//XnQv7eK+3i/rxyEG7dErzP4E1tkOM4/v7X0k3NnOXfbT1oG2PcyYlK1q26dF/iA70F284x3/n+v091i76cEOfx7uuzxIPw4xaJ/d3fAnWGi7lWKE1l9Rczf50s2yXU70a1s2s214f4e3c9H+/4v2L/pXG2qD79N+O0+w/wN+uX4cYtB+usHsjzK07RaK4Vp/Rc214nfcbCehfmGrZoa2T+K/w9r1f8T6F/3rh1QbjNH2T+vMv3aDflzSgXbgTLM1sNJ2S4oRWn81zdHkVxRMOy7q16oE/o6gXf8rrH/R39jL8e4n+pcd+3HJKtqDlzZbAxNtT0gxpGt9Nck0n9qM220rP9rO2qopY9vJ//wTa9f/Gu2rVtswTtvdzP3045LVtN++x2gNlLTdkGIvWn91M43n1r9vQ+0m0A+zbT/eW76wdf0v0b5vtQ1jaduddfpxSaedn7Q3bFh0BtrjUuxN66/oA7r/qZ+d15v1P8H6F/2aX8320/Xjkk67XjU9g8l2dIqDafvH6xUfP217S//x5+k/0fr1P7v+Rb9mtNl+tn5c0mkXn1Yc/u3m1W//B00i845i6n+9AAAAAElFTkSuQmCC";

        let fileWidth = 50;
        let fileHeight = 50 * (180 / 440); // Maintain aspect ratio: height = width * (SVG height / SVG width)

        bookings.forEach((booking, index) => {
            if (index > 0) doc.addPage();

            // Header Background
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, 210, 35, 'F');

            // Add PNG Logo
            doc.addImage(logoPngBase64, 'PNG', 10, 5, fileWidth, fileHeight);

            // Title
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('VOUCHER DE RESERVA', 20, 32);

            // Booking Details
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(index === 0 ? 'DATOS DEL TRAYECTO (IDA)' : 'DATOS DEL TRAYECTO (VUELTA)', 20, 55);

            doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
            doc.setLineWidth(1);
            doc.line(20, 58, 190, 58);

            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');

            const startY = 70;
            const lineSpacing = 10;

            const rawNotes = booking.notes || '';
            const extrasMatch = rawNotes.match(/Extras: (.*?)\./);
            const extrasText = extrasMatch ? extrasMatch[1] : 'Ninguno';

            const userNotesMatch = rawNotes.match(/Notas: (.*)/);
            const userNotesText = userNotesMatch ? userNotesMatch[1] : 'Sin notas adicionales';

            const details = [
                ['Referencia:', booking.id?.substring(0, 8).toUpperCase() || 'PENDIENTE'],
                ['Pasajero:', booking.passenger],
                ['Email:', booking.email],
                ['Teléfono:', booking.phone || 'N/A'],
                ['Origen:', booking.origin],
                ['Destino:', booking.destination],
                ['Fecha:', booking.pickup_date],
                ['Hora:', booking.pickup_time],
                ['Vuelo:', booking.flight_number || 'N/A'],
                ['Dirección:', booking.pickup_address || 'Punto de encuentro estándar'],
                ['Extras:', extrasText],
                ['Precio:', `${booking.price}€`],
                ['Notas:', userNotesText]
            ];

            details.forEach((detail, i) => {
                doc.setFont('helvetica', 'bold');
                doc.text(detail[0], 20, startY + (i * lineSpacing));
                doc.setFont('helvetica', 'normal');
                doc.text(detail[1], 60, startY + (i * lineSpacing));
            });

            // Footer
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            const footerY = 265;
            doc.text('Gracias por confiar en Palladium Transfers.', 105, footerY, { align: 'center' });
            doc.text('Puede solicitar cambios en su reserva directamente desde su Portal de Cliente.', 105, footerY + 5, { align: 'center' });
            doc.setFont('helvetica', 'bold');
            doc.text('* Cambios de hora solo permitidos hasta 24h antes. Para cambios urgentes (<24h),', 105, footerY + 12, { align: 'center' });
            doc.text('contacte a reservas@palladiumtransfers.com.', 105, footerY + 16, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text('Este documento sirve como comprobante de su reserva.', 105, footerY + 23, { align: 'center' });
        });

        doc.save(`Voucher_Palladium_${formData.name || 'Reserva'}.pdf`);
        return doc.output('datauristring').split(',')[1];
    };

    const submitBooking = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || null;

            // 1. Fetch total fleet size
            const { data: vehicles } = await supabase.from('vehicles').select('id');
            const TOTAL_FLEET = vehicles?.length || 12;

            // Re-fetch properly
            const { data: bookingsAtDate } = await supabase
                .from('bookings')
                .select('pickup_time')
                .eq('pickup_date', formData.date)
                .neq('status', 'Cancelled');

            const hour = parseInt(formData.time.split(':')[0]);
            const count = bookingsAtDate?.filter((b: any) =>
                b.pickup_time && parseInt(b.pickup_time.split(':')[0]) === hour
            ).length || 0;

            if (count >= TOTAL_FLEET) {
                showToast(`DISPONIBILIDAD AGOTADA: No quedan vehículos para las ${hour}:00`, 'error');
                setLoading(false);
                return false;
            }

            const selectedExtrasNames = selectedExtras
                .map(id => availableExtras.find(e => e.id === id)?.name)
                .filter(Boolean)
                .join(', ');

            const bookingsToInsert = [];

            // Intelligent Address Mapping for Outbound
            const isOriginHub = ['aeropuerto', 'tren', 'puerto', 'hotel'].includes(
                tariffs.find(t => t.origin === formData.origin)?.origin_type || ''
            ) || formData.origin.toLowerCase().includes('aeropuerto') || formData.origin.toLowerCase().includes('alc');

            const isDestHub = ['aeropuerto', 'tren', 'puerto', 'hotel'].includes(
                tariffs.find(t => t.destination === formData.destination)?.destination_type || ''
            ) || formData.destination.toLowerCase().includes('aeropuerto') || formData.destination.toLowerCase().includes('alc');

            let finalOriginAddress = formData.pickupAddress || formData.origin;
            let finalDestAddress = formData.destination;

            if (isOriginHub) {
                finalOriginAddress = formData.origin; // Hub is the origin address
                finalDestAddress = formData.pickupAddress || formData.destination; // Use user input or fallback to city name
            } else if (isDestHub) {
                finalOriginAddress = formData.pickupAddress || formData.origin; // Use user input or fallback to city name
                finalDestAddress = formData.destination; // Hub is the destination address
            }

            // 1. Outbound Booking
            bookingsToInsert.push({
                origin: formData.origin,
                destination: formData.destination,
                route: `${formData.origin} - ${formData.destination}`,
                passenger: formData.name || 'Invitado',
                email: formData.email,
                phone: formData.phone,
                pickup_date: formData.date,
                pickup_time: formData.time,
                time: new Date(`${formData.date}T${formData.time}`).toISOString(),
                trip_type: formData.tripType,
                return_date: formData.tripType === 'Round Trip' ? formData.returnDate : null,
                return_time: formData.tripType === 'Round Trip' ? formData.returnTime : null,
                status: 'Pending',
                price: formData.tripType === 'Round Trip' ? (estimatedPrice || 0) / 2 : estimatedPrice,
                driver_price: formData.tripType === 'Round Trip' ? (estimatedCollaboratorPrice || estimatedPrice || 0) / 2 : (estimatedCollaboratorPrice || estimatedPrice),
                collaborator_price: formData.tripType === 'Round Trip' ? (estimatedCollaboratorPrice || 0) / 2 : (estimatedCollaboratorPrice || 0),
                payment_method: 'Efectivo',
                client_name: 'Palladium Transfers S.L.',
                client_id: 'e2954bc3-fb9f-4702-b371-e910663b7f9e',
                flight_number: formData.flightNumber,
                pickup_address: formData.pickupAddress,
                origin_address: finalOriginAddress,
                destination_address: finalDestAddress,
                notes: `[IDA] Extras: ${selectedExtrasNames || 'Ninguno'}. Vehículo: ${formData.vehicleModel}. Notas: ${formData.notes}`,
                vehicle_class: formData.vehicleModel,
                user_id: userId,
                created_at: new Date().toISOString()
            });

            // 2. Return Booking (if Round Trip)
            if (formData.tripType === 'Round Trip') {
                // For return, it's basically the reverse
                bookingsToInsert.push({
                    origin: formData.destination,
                    destination: formData.origin,
                    route: `${formData.destination} - ${formData.origin}`,
                    passenger: formData.name || 'Invitado',
                    email: formData.email,
                    phone: formData.phone,
                    pickup_date: formData.returnDate,
                    pickup_time: formData.returnTime,
                    time: new Date(`${formData.returnDate}T${formData.returnTime}`).toISOString(),
                    trip_type: formData.tripType,
                    status: 'Pending',
                    price: (estimatedPrice || 0) / 2,
                    driver_price: (estimatedCollaboratorPrice || estimatedPrice || 0) / 2,
                    collaborator_price: (estimatedCollaboratorPrice || 0) / 2,
                    payment_method: 'Efectivo',
                    client_name: 'Palladium Transfers S.L.',
                    client_id: 'e2954bc3-fb9f-4702-b371-e910663b7f9e',
                    flight_number: '',
                    pickup_address: finalDestAddress, // Pick up from where they were dropped off
                    origin_address: finalDestAddress,
                    destination_address: finalOriginAddress,
                    notes: `[VUELTA] Regreso de reserva de ida. Extras: ${selectedExtrasNames || 'Ninguno'}. Vehículo: ${formData.vehicleModel}.`,
                    vehicle_class: formData.vehicleModel,
                    user_id: userId,
                    created_at: new Date().toISOString()
                });
            }

            const { error } = await supabase.from('bookings').insert(bookingsToInsert);
            if (error) throw error;

            const base64Voucher = generateVoucher(bookingsToInsert);

            // Fetch email settings from system settings (safely)
            const { data: settingsData } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['email_sender', 'admin_notification_email']);

            let senderEmail = 'noreply@palladiumtransfers.com';
            let adminEmail = null;

            if (settingsData) {
                const senderSetting = settingsData.find(s => s.key === 'email_sender');
                if (senderSetting) senderEmail = senderSetting.value;

                const adminSetting = settingsData.find(s => s.key === 'admin_notification_email');
                if (adminSetting && adminSetting.value) adminEmail = adminSetting.value;
            }

            const bookingRef = bookingsToInsert[0].id?.substring(0, 8).toUpperCase() || 'NUEVA';

            const logoSvg = `
            <svg viewBox="0 0 440 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 40 85 L 340 85" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
                <path d="M 120 68 Q 220 20 310 80 Q 325 85 340 85 L 380 85 Q 405 85 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
                <path d="M 160 110 L 415 110" stroke="#dbb35e" stroke-width="4" stroke-linecap="round" fill="none"/>
                <text x="220" y="140" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: 300; letter-spacing: 0.15em; font-size: 24px; text-transform: uppercase;">PALLADIUM TRANSFERS</text>
                <text x="220" y="165" text-anchor="middle" fill="#ffffff" style="font-family: helvetica, sans-serif; font-weight: bold; letter-spacing: 0.4em; font-size: 10px; text-transform: uppercase; opacity: 0.8;">EXCELLENCE IN MOTION</text>
            </svg>`.trim();

            // We need the logoSvg encoded for the HTML src attribute too
            const svgBase64Url = 'data:image/svg+xml;base64,' + btoa(encodeURIComponent(logoSvg).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));

            // Prepare email payload
            const emailPayload: any = {
                to: formData.email,
                subject: `Confirmación de Reserva - ${bookingRef}`,
                from: senderEmail,
                attachments: [
                    {
                        filename: `Voucher_Palladium_${bookingRef}.pdf`,
                        content: base64Voucher,
                    }
                ],
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; padding: 20px;">
                        <div style="background-color: #1a2533; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <img src="${svgBase64Url}" alt="Palladium Transfers Logo" style="max-height: 60px; margin-bottom: 10px;" />
                            <p style="color: #94a3b8; margin: 10px 0 0 0;">CONFIRMACIÓN DE RESERVA</p>
                        </div>
                        <div style="background-color: #ffffff; padding: 30px; border-radius: 0 0 10px 10px;">
                            <h2 style="color: #1a2533; margin-top: 0;">¡Gracias por su reserva!</h2>
                            <p style="color: #475569; line-height: 1.6;">Hola ${bookingsToInsert[0].passenger},</p>
                            <p style="color: #475569; line-height: 1.6;">Su reserva ha sido procesada con éxito.</p>
                            <p style="color: #475569; line-height: 1.6; margin-top: 20px;">Puede acceder a su <a href="https://palladiumtransfers.com/" style="color: #3b82f6;">Portal de Cliente</a> para gestionar su reserva o solicitar cambios (cambios de hora permitidos hasta 24h antes por el portal, o a través de reservas@palladiumtransfers.com).</p>
                            <p style="color: #475569; line-height: 1.6; margin-top: 20px;">El voucher en PDF adjunto contiene todos los detalles de su traslado.</p>
                        </div>
                    </div>
                `
            };

            if (adminEmail) {
                emailPayload.bcc = adminEmail;
            }

            // Trigger Edge Function for Email
            supabase.functions.invoke('send-email-resend', {
                body: emailPayload
            }).catch(e => console.error("Email error:", e));

            showToast(language === 'es' ? '¡Reserva solicitada con éxito!' : 'Booking requested successfully!', 'success');
            setStep(4); // Go to summary step
            setSelectedExtras([]);
            // Don't reset formData yet so Step 3 can show the summary
            return true;
        } catch (error: any) {
            console.error('Error booking:', error);
            showToast(language === 'es' ? 'Hubo un error al procesar tu solicitud.' : 'There was an error processing your request.', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        step, setStep,
        loading,
        formData, setFormData,
        origins, destinations, availableVehicles,
        availableExtras, selectedExtras, toggleExtra,
        estimatedPrice,
        maxCapacity,
        handleChange,
        submitBooking,
        isLoggedIn
    };
};
