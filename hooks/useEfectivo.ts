import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';

export interface EfectivoReconciliation {
    driver_name: string;
    saldo_inicial: number;
    uber_cash_collected: number;
    vgd_cash_collected: number;
    total_cash_collected: number;
    cash_delivered: number;
    gastos: number;
    difference: number;
}

export function useEfectivo() {
    const [loading, setLoading] = useState(false);
    const [cycle, setCycle] = useState<any>(null);
    const [reconciliations, setReconciliations] = useState<EfectivoReconciliation[]>([]);
    const [aliases, setAliases] = useState<any[]>([]);
    const [uploadHistory, setUploadHistory] = useState({ uber: 'Ninguno', entregas: 'Ninguno', vgd: 'Ninguno' });
    const [allCycles, setAllCycles] = useState<any[]>([]);

    const normalizeName = (name: any) => {
        if (!name) return "";
        return String(name).trim().replace(/\s+/g, ' ').toUpperCase();
    };

    const fetchAliases = async () => {
        const { data } = await supabase.from('efectivo_aliases').select('*');
        if (data) setAliases(data);
        return data || [];
    };

    const resolveName = (rawName: string, aliasesData: any[]) => {
        let curr = rawName;
        const visited = new Set();
        while (!visited.has(curr)) {
            visited.add(curr);
            const found = aliasesData.find((a: any) => a.bad_name === curr);
            if (found) {
                curr = found.good_name;
            } else {
                break;
            }
        }
        return curr;
    };

    const fetchActiveCycle = async () => {
        setLoading(true);
        try {
            // 1. Try to fetch the current active cycle
            const { data: active, error: fetchError } = await supabase
                .from('efectivo_cycles')
                .select('*')
                .eq('is_active', true)
                .maybeSingle(); // maybeSingle() avoids 406 error if zero rows found
                
            if (active) {
                setCycle(active);
                await loadReconciliations(active.id);
                await fetchAllCycles();
                return;
            }

            // 2. If no active cycle, see if any cycle exists to reactivate
            const { data: anyCycle } = await supabase
                .from('efectivo_cycles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (anyCycle) {
                // Activate the most recent one
                await supabase.from('efectivo_cycles').update({ is_active: true }).eq('id', anyCycle.id);
                const updated = { ...anyCycle, is_active: true };
                setCycle(updated);
                await loadReconciliations(updated.id);
            } else {
                // 3. If zero cycles exist in DB, create 'Ciclo 1'
                console.log("No cycles exist in DB. Creating 'Ciclo 1'...");
                const { data: newCycle, error: insertError } = await supabase
                    .from('efectivo_cycles')
                    .insert({ name: 'Ciclo 1', is_active: true })
                    .select()
                    .single();
                
                if (newCycle) {
                    setCycle(newCycle);
                    await loadReconciliations(newCycle.id);
                } else if (insertError) {
                    // If 'Ciclo 1' already existed but was not identified as 'latest' for some reason, 
                    // try one more time to fetch it by name or use a unique name
                    console.error("Failed to auto-create cycle:", insertError);
                }
            }
            await fetchAllCycles();
        } finally {
            setLoading(false);
        }
    };

    const fetchAllCycles = async () => {
        const { data, error } = await supabase.from('efectivo_cycles').select('*').order('created_at', { ascending: false });
        if (!error && data) {
            setAllCycles(data);
        }
    };

    const loadSpecificCycle = async (cycleId: number) => {
        const target = allCycles.find(c => c.id === cycleId);
        if (target) {
            setCycle(target);
            await loadReconciliations(cycleId);
        }
    };

    const renameCycle = async (cycleId: number, newName: string) => {
        const { error } = await supabase.from('efectivo_cycles').update({ name: newName }).eq('id', cycleId);
        if (!error) {
            setCycle((prev: any) => prev && prev.id === cycleId ? { ...prev, name: newName } : prev);
            await fetchAllCycles();
        } else {
            alert('Error renaming cycle: ' + error.message);
        }
    };

    const deleteCycle = async (cycleId: number) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('efectivo_cycles').delete().eq('id', cycleId);
            if (error) throw error;
            
            // Refresh the full list for the dropdown
            await fetchAllCycles();
            
            // If we deleted the current one, find an active one or the most recent
            if (cycle?.id === cycleId) {
                await fetchActiveCycle();
            }
        } catch (err) {
            console.error("Error deleting cycle:", err);
            alert("Error deleting cycle: " + (err as any).message);
        } finally {
            setLoading(false);
        }
    };

    const clearCurrentCycleData = async () => {
        if (!cycle) return;
        setLoading(true);
        try {
            await Promise.all([
                supabase.from('efectivo_uber_records').delete().eq('cycle_id', cycle.id),
                supabase.from('efectivo_vgd_records').delete().eq('cycle_id', cycle.id),
                supabase.from('efectivo_entrega_records').delete().eq('cycle_id', cycle.id),
                supabase.from('efectivo_expense_records').delete().eq('cycle_id', cycle.id),
                supabase.from('efectivo_upload_history').delete().eq('cycle_id', cycle.id),
                supabase.from('efectivo_initial_balances').delete().eq('cycle_id', cycle.id)
            ]);
            await loadReconciliations(cycle.id);
        } finally {
            setLoading(false);
        }
    };

    const loadReconciliations = async (cycleId: number) => {
        setLoading(true);
        try {
            const aliasesData = await fetchAliases();

            const { data: historyData } = await supabase.from('efectivo_upload_history').select('*').eq('cycle_id', cycleId).order('upload_time', { ascending: false });
            if (historyData) {
                const history = { uber: 'Ninguno', entregas: 'Ninguno', vgd: 'Ninguno' };
                const uberFile = historyData.find(d => d.file_type === 'uber');
                const entregasFile = historyData.find(d => d.file_type === 'entregas');
                const vgdFile = historyData.find(d => d.file_type === 'vgd');
                if (uberFile) history.uber = uberFile.file_name;
                if (entregasFile) history.entregas = entregasFile.file_name;
                if (vgdFile) history.vgd = vgdFile.file_name;
                setUploadHistory(history);
            }

            const [
                { data: ibData },
                { data: uberData },
                { data: vgdData },
                { data: entregaData },
                { data: expenseData }
            ] = await Promise.all([
                supabase.from('efectivo_initial_balances').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_uber_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_vgd_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_entrega_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_expense_records').select('*').eq('cycle_id', cycleId),
            ]);

            const drivers = new Set<string>();
            const initialBalances: Record<string, number> = {};
            const uberTotals: Record<string, number> = {};
            const vgdTotals: Record<string, number> = {};
            const entregaTotals: Record<string, number> = {};
            const expenseTotals: Record<string, number> = {};

            const mapData = (data: any[], totalsMap: Record<string, number>, valueKey: string) => {
                if (!data) return;
                data.forEach(item => {
                    const dName = resolveName(item.driver_name, aliasesData);
                    drivers.add(dName);
                    totalsMap[dName] = (totalsMap[dName] || 0) + (Number(item[valueKey]) || 0);
                });
            };

            mapData(ibData || [], initialBalances, 'balance');
            mapData(uberData || [], uberTotals, 'cash_collected');
            mapData(vgdData || [], vgdTotals, 'cash_collected');
            mapData(entregaData || [], entregaTotals, 'amount');
            mapData(expenseData || [], expenseTotals, 'amount');

            const results: EfectivoReconciliation[] = Array.from(drivers).sort().map(d => {
                const ib = initialBalances[d] || 0;
                const uCashRaw = uberTotals[d] || 0;
                const uCash = -1 * uCashRaw; // Uber cash is a deduction in the file (-), so we flip it to (+) for collection.

                const vCash = vgdTotals[d] || 0;
                const eCash = entregaTotals[d] || 0;
                const gCash = expenseTotals[d] || 0;
                const totalCollected = uCash + vCash;

                return {
                    driver_name: d,
                    saldo_inicial: ib,
                    uber_cash_collected: uCash,
                    vgd_cash_collected: vCash,
                    total_cash_collected: totalCollected,
                    cash_delivered: eCash,
                    gastos: gCash,
                    difference: ib + totalCollected - eCash - gCash
                };
            });

            setReconciliations(results);
        } catch (err) {
            console.error("Error loading reconciliations:", err);
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (date: any) => {
        if (!date) return "Unknown Date";
        try {
            let d: Date;
            
            // Handle Excel serial numbers (e.g., 46101.75)
            const numDate = Number(date);
            if (!isNaN(numDate) && numDate > 30000 && numDate < 60000) {
                // Excel dates start from Dec 30, 1899. 
                // We convert to JS date. 25569 is the difference in days between 1900 and 1970.
                d = new Date((numDate - 25569) * 86400 * 1000);
            } else {
                // Handle various formats (mixed, strings with CET/CEST, etc)
                d = new Date(String(date).replace(/\s[A-Z]{3,4}$/, ''));
            }

            if (isNaN(d.getTime())) return String(date);
            
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            
            return `${day}-${month}-${year} ${hours}:${minutes}`;
        } catch (e) {
            return String(date);
        }
    };

    const formatUberPeriod = (period: string) => {
        if (!period || period === "UNKNOWN_PERIOD") return period;
        const match = period.match(/(\d{8})-(\d{8})/);
        if (match) {
            const start = match[1];
            const end = match[2];
            return `${start.substring(6,8)}/${start.substring(4,6)} - ${end.substring(6,8)}/${end.substring(4,6)}/${end.substring(0,4)}`;
        }
        return period;
    };

    const getMonthStr = (date: any) => {
        try {
            let d: Date;
            const numDate = Number(date);
            if (!isNaN(numDate) && numDate > 30000 && numDate < 60000) {
                d = new Date((numDate - 25569) * 86400 * 1000);
            } else {
                d = new Date(String(date).replace(/\s[A-Z]{3,4}$/, ''));
            }
            
            if (isNaN(d.getTime())) return "1970-01";
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        } catch (e) {
            return "1970-01";
        }
    };

    const processUberFile = async (file: File) => {
        if (!cycle) return;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const bstr = e.target?.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    const match = file.name.match(/(\d{8})-(\d{8})/);
                    let periodOrDate = "UNKNOWN_PERIOD";
                    if (match) {
                        periodOrDate = formatUberPeriod(match[0]);
                    }
                    const uberMonthDefault = match ? `${match[1].substring(0,4)}-${match[1].substring(4,6)}` : "1970-01";

                    if (!jsonData.length) return resolve({ inserted: 0 });

                    const cols = Object.keys(jsonData[0]);
                    const firstNameCol = cols.find(c => {
                        const cl = c.toLowerCase(); 
                        return (cl.includes('nombre') || cl.includes('first') || cl.includes('conductor')) && !cl.includes('uuid');
                    });
                    const lastNameCol = cols.find(c => {
                        const cl = c.toLowerCase(); 
                        return (cl.includes('apellido') || cl.includes('last')) && !cl.includes('uuid');
                    });
                    const cashCol = cols.find(c => {
                        const cl = c.toLowerCase();
                        return (cl.includes('efectivo') && cl.includes('cobrado')) || 
                               (cl.includes('cash') && cl.includes('collected')) ||
                               (cl.includes('pago') && cl.includes('efectivo')) ||
                               (cl.includes('saldo del viaje')) ||
                               (cl === 'efectivo') || (cl === 'cash') || (cl === 'pagos');
                    }) || cols.find(c => {
                        const cl = c.toLowerCase();
                        return cl.includes('neto') || cl.includes('net payout') || cl.includes('pagado');
                    });
                    
                    // New Format detection
                    const uuidTransCol = cols.find(c => c.toLowerCase().includes('uuid de la trans'));
                    const uuidViajeCol = cols.find(c => c.toLowerCase().includes('uuid del viaje'));
                    const dateCol = cols.find(c => {
                        const cl = c.toLowerCase(); 
                        return cl.includes('fecha') || cl.includes('date') || cl.includes('en comparación con') || cl.includes('completed');
                    });

                    const activityTypeCol = cols.find(c => {
                        const cl = c.toLowerCase();
                        return cl.includes('tipo') || cl.includes('actividad') || cl.includes('type') || cl.includes('categoria') || cl.includes('descripción') || cl.includes('descripcion');
                    });

                    console.log('--- UPLOAD DEBUG ---');
                    console.log('File:', file.name);
                    console.log('Columns found:', cols);
                    console.log('Detected Cash Column:', cashCol);
                    console.log('Detected Activity Column:', activityTypeCol);

                    if (!firstNameCol || !cashCol) {
                        return reject(new Error("Columnas esenciales no encontradas en el archivo de Uber."));
                    }

                    const isNewFormat = !!(uuidTransCol || uuidViajeCol);
                    const records: any[] = [];

                    jsonData.forEach(row => {
                        // Skip non-trip activities
                        if (activityTypeCol) {
                            const type = String(row[activityTypeCol]).toLowerCase();
                            const isExcluded = type.includes('comisión') || 
                                            type.includes('fee') || 
                                            type.includes('impuesto') || 
                                            type.includes('tax') || 
                                            type.includes('tasa') || 
                                            type.includes('pago') || 
                                            type.includes('reembolso');
                            
                            // If it's a generic payout or fee row, skip it.
                            // But keep it if it mentions "viaje" or "trip".
                            if (isExcluded && !type.includes('viaje') && !type.includes('trip')) return;
                        }

                        const first = row[firstNameCol] || '';
                        const last = lastNameCol ? (row[lastNameCol] || '') : '';
                        const fullName = normalizeName(`${first} ${last}`);
                        if (!fullName) return;

                        // --- DIAGNOSTIC LOG FOR ALVARO ---
                        if (fullName.includes('ALVARO') || fullName.includes('OBLANCA')) {
                            console.log('Row for Alvaro:', {
                                descripcion: activityTypeCol ? row[activityTypeCol] : 'N/A',
                                importe_bruto: row[cashCol],
                                row_raw: row
                            });
                        }
                        // ---------------------------------

                        let cash = parseFloat(String(row[cashCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;
                        if (cash === 0) return;

                        // We no longer invert the sign per-row or filter by sign.
                        // We preserve the CSV's sign (+ for adjustments, - for cash collected)
                        // so they correctly cancel each other out during summation.
                        
                        if (isNewFormat) {
                            const rawId = String(row[uuidViajeCol || uuidTransCol!]);
                            // We append the row index to ensure uniqueness for all rows in the file, 
                            // as Uber often has separate rows for the trip and its adjustments 
                            // that might share the same transaction/trip ID.
                            const txId = `${rawId}_row${records.length + 1}`;
                            const dateStr = dateCol ? formatDateTime(row[dateCol]) : "Unknown Date";
                            const monthStr = dateCol ? getMonthStr(row[dateCol]) : uberMonthDefault;

                            records.push({
                                cycle_id: cycle.id,
                                driver_name: fullName,
                                transaction_id: txId,
                                period: rawId, // store original ID here
                                month: monthStr,
                                cash_collected: cash,
                                fecha_hora: dateStr
                            });
                        } else {
                            // Aggregated old format (we'll group by driver)
                            const existing = records.find(r => r.driver_name === fullName);
                            if (existing) {
                                existing.cash_collected += cash;
                            } else {
                                records.push({
                                    cycle_id: cycle.id,
                                    driver_name: fullName,
                                    period: periodOrDate,
                                    month: uberMonthDefault,
                                    cash_collected: cash,
                                    transaction_id: `${fullName}_${periodOrDate}` // fallback
                                });
                            }
                        }
                    });

                    if (records.length === 0) return resolve({ inserted: 0 });

                    const { error } = await supabase.from('efectivo_uber_records').upsert(records, { 
                        onConflict: 'transaction_id, cycle_id', 
                        ignoreDuplicates: true 
                    });
                    if (error) throw error;
                    
                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'uber', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: records.length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const processEntregasFile = async (file: File) => {
        if (!cycle) return;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const bstr = e.target?.result;
                    const workbook = XLSX.read(bstr, { type: 'binary' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    if (!jsonData.length) return resolve({ inserted: 0 });

                    const cols = Object.keys(jsonData[0]);
                    const nameCol = cols.find(c => {
                        const cl = c.toLowerCase();
                        return (cl.includes('nombre') || cl.includes('conductor')) && !cl.includes('uuid');
                    }) || cols[0];
                    const timeCol = cols.find(c => c.toLowerCase().includes('marca') || c.toLowerCase().includes('timestamp') || c.toLowerCase().includes('fecha')) || cols[0];
                    const amountCol = cols.find(c => c.toLowerCase().includes('importe') || c.toLowerCase().includes('entregado') || c.toLowerCase().includes('efectivo')) || cols[0];
                    
                    const dateDeliveryCol = cols.find(c => c.toLowerCase().includes('fecha de entrega') || c.toLowerCase().includes('date')) || timeCol;

                    const records = jsonData.map(row => {
                        const driverName = normalizeName(row[nameCol]);
                        if (!driverName) return null;

                        const timestampStr = formatDateTime(row[timeCol]);
                        const monthStr = getMonthStr(row[dateDeliveryCol]);
                        let cash = parseFloat(String(row[amountCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;

                        return {
                            cycle_id: cycle.id,
                            driver_name: driverName,
                            timestamp: timestampStr,
                            month: monthStr,
                            amount: cash
                        };
                    }).filter(u => u !== null);

                    const { error } = await supabase.from('efectivo_entrega_records').upsert(records, { onConflict: 'driver_name, timestamp, cycle_id', ignoreDuplicates: true });
                    if (error) throw error;

                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'entregas', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: records.length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsBinaryString(file);
        });
    };

    const processVGDFile = async (file: File) => {
        if (!cycle) return;
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                    if (!jsonData.length) return resolve({ inserted: 0 });

                    const cols = Object.keys(jsonData[0]);
                    const driverCol = cols.find(c => {
                        const cl = c.toLowerCase();
                        return (cl.includes('conductor') || cl.includes('nombre')) && !cl.includes('uuid');
                    });
                    // Smart amount column detection for V-GD
                    // We prioritize 'importe' AND 'efectivo' in the same name to avoid taking 'Importe Total'
                    const amountCol = cols.find(c => {
                        const cl = c.toLowerCase();
                        return cl.includes('importe') && (cl.includes('efectivo') || cl.includes('cobrado'));
                    }) || cols.find(c => c.toLowerCase().includes('importe') || c.toLowerCase().includes('efectivo'));

                    const dateCol = cols.find(c => c.toLowerCase().includes('fecha') || c.toLowerCase().includes('date'));
                    const idCol = cols.find(c => c.toLowerCase().includes('id') && c.length <= 4);

                    console.log(`--- VGD UPLOAD DEBUG ---`);
                    console.log(`Columns found:`, cols);
                    console.log(`Detected Amount Column:`, amountCol);

                    if (!driverCol || !amountCol || !dateCol) {
                        return reject(new Error("Faltan columnas esenciales en el Excel V-GD."));
                    }

                    const records = jsonData.map(row => {
                        const driverName = normalizeName(row[driverCol]);
                        if (!driverName) return null;

                        let cash = parseFloat(String(row[amountCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;

                        const dateStr = formatDateTime(row[dateCol]);
                        const monthStr = getMonthStr(row[dateCol]);

                        if (driverName.includes('BRUNO') || driverName.includes('MORON')) {
                            console.log(`Row for Bruno: {id: ${row[idCol!]}, raw_val: ${row[amountCol!]}, cash: ${cash}}`);
                        }

                        return {
                            cycle_id: cycle.id,
                            vgd_id: idCol ? parseInt(row[idCol]) : null,
                            driver_name: driverName,
                            month: monthStr,
                            fecha_hora: dateStr,
                            cash_collected: cash
                        };
                    }).filter(i => i !== null);

                    const { error } = await supabase.from('efectivo_vgd_records').upsert(records, {
                        onConflict: 'vgd_id, cycle_id',
                        ignoreDuplicates: true
                    });
                    if (error) throw error;

                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'vgd', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: records.length });
                } catch (err) {
                    reject(err);
                }
            };
            reader.readAsArrayBuffer(file);
        });
    };

    const addExpense = async (driverName: string, description: string, amount: number) => {
        if (!cycle) return;
        const { error } = await supabase.from('efectivo_expense_records').insert({
            cycle_id: cycle.id,
            driver_name: normalizeName(driverName),
            description,
            amount
        });
        if (!error) await loadReconciliations(cycle.id);
    };

    const addEntregaManual = async (driverName: string, amount: number) => {
        if (!cycle) return;
        const { error } = await supabase.from('efectivo_entrega_records').insert({
            cycle_id: cycle.id,
            driver_name: normalizeName(driverName),
            timestamp: new Date().toISOString(),
            amount
        });
        if (!error) await loadReconciliations(cycle.id);
    };

    const closeCycle = async () => {
        if (!cycle) return;
        setLoading(true);
        try {
            await supabase.from('efectivo_cycles').update({ is_active: false }).eq('id', cycle.id);
            const cycleNum = parseInt(cycle.name.match(/\d+/)?.[0] || '0') + 1;
            
            const { data: newCycle, error: cycleErr } = await supabase.from('efectivo_cycles').insert({
                name: `Ciclo ${cycleNum}`,
                is_active: true
            }).select().single();

            if (cycleErr) throw cycleErr;

            const ibInserts = reconciliations
                .filter(r => Math.abs(r.difference) > 0.01)
                .map(r => ({
                    cycle_id: newCycle.id,
                    driver_name: r.driver_name,
                    balance: r.difference
                }));

            if (ibInserts.length > 0) {
                await supabase.from('efectivo_initial_balances').insert(ibInserts);
            }

            setCycle(newCycle);
            await loadReconciliations(newCycle.id);
        } finally {
            setLoading(false);
        }
    };

    const getDriverReport = useCallback(async (driverName: string, cycleId: number) => {
        setLoading(true);
        try {
            const aliasesData = await fetchAliases();
            const targetDriver = resolveName(driverName, aliasesData);

            const [
                { data: ibData },
                { data: uberData },
                { data: vgdData },
                { data: entregaData },
                { data: expenseData }
            ] = await Promise.all([
                supabase.from('efectivo_initial_balances').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_uber_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_vgd_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_entrega_records').select('*').eq('cycle_id', cycleId),
                supabase.from('efectivo_expense_records').select('*').eq('cycle_id', cycleId),
            ]);

            const filterAndResolve = (data: any[]) => 
                (data || []).filter(item => resolveName(item.driver_name, aliasesData) === targetDriver);

            const uberDetails = filterAndResolve(uberData || []).map(r => ({
                period: r.fecha_hora ? formatDateTime(r.fecha_hora) : formatUberPeriod(r.period),
                cash_collected: -1 * (Number(r.cash_collected) || 0) // Flip sign: deduction in file (-) = cash in hand (+)
            }));

            const vgdDetails = filterAndResolve(vgdData || []).map(r => ({
                month: r.fecha_hora ? formatDateTime(r.fecha_hora) : getMonthStr(r.month),
                cash_collected: Number(r.cash_collected)
            }));

            const entregaDetails = filterAndResolve(entregaData || []).map(r => ({
                id: r.id,
                timestamp: formatDateTime(r.timestamp),
                amount: Number(r.amount)
            }));

            const gastosDetails = filterAndResolve(expenseData || []).map(r => ({
                id: r.id,
                description: r.description,
                amount: Number(r.amount),
                timestamp: formatDateTime(r.timestamp)
            }));

            const saldoInicial = filterAndResolve(ibData || []).reduce((acc, curr) => acc + Number(curr.balance), 0);
            
            const totalUber = uberDetails.reduce((acc, curr) => acc + curr.cash_collected, 0);
            const totalVgd = vgdDetails.reduce((acc, curr) => acc + curr.cash_collected, 0);
            const totalEntregas = entregaDetails.reduce((acc, curr) => acc + curr.amount, 0);
            const totalGastos = gastosDetails.reduce((acc, curr) => acc + curr.amount, 0);

            return {
                driver_name: targetDriver,
                saldo_inicial: saldoInicial,
                uber_details: uberDetails,
                vgd_details: vgdDetails,
                entrega_details: entregaDetails,
                gastos_details: gastosDetails,
                total_uber: totalUber,
                total_vgd: totalVgd,
                total_entregas: totalEntregas,
                total_gastos: totalGastos,
                difference: saldoInicial + totalUber + totalVgd - totalEntregas - totalGastos
            };
        } finally {
            setLoading(false);
        }
    }, [aliases]);

    return {
        cycle,
        allCycles,
        loading,
        reconciliations,
        aliases,
        fetchActiveCycle,
        loadSpecificCycle,
        renameCycle,
        processUberFile,
        processEntregasFile,
        processVGDFile,
        addExpense,
        addEntregaManual,
        closeCycle,
        uploadHistory,
        getDriverReport,
        deleteCycle
    };
}
