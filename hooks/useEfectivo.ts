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
            const { data, error } = await supabase
                .from('efectivo_cycles')
                .select('*')
                .eq('is_active', true)
                .single();
                
            if (error || !data) {
                console.log("No active cycle found. Creating 'Ciclo 1'...");
                const { data: newCycle, error: insertError } = await supabase
                    .from('efectivo_cycles')
                    .insert({ name: 'Ciclo 1', is_active: true })
                    .select()
                    .single();
                
                if (newCycle) {
                    setCycle(newCycle);
                    await loadReconciliations(newCycle.id);
                } else if (insertError) {
                    console.error("Failed to auto-create cycle:", insertError);
                }
            } else {
                setCycle(data);
                await loadReconciliations(data.id);
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

            const { data: historyData } = await supabase.from('efectivo_upload_history').select('*').eq('cycle_id', cycleId).order('created_at', { ascending: false });
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
                const uCash = uberTotals[d] || 0;
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

                    const match = file.name.match(/(\d{8})-\d{8}/);
                    const periodOrDate = match ? match[0] : "UNKNOWN_PERIOD";
                    const uberMonth = match ? `${match[1].substring(0,4)}-${match[1].substring(4,6)}` : "1970-01";

                    if (!jsonData.length) return resolve({ inserted: 0 });

                    const cols = Object.keys(jsonData[0]).map(c => c.toLowerCase());
                    const firstNameCol = Object.keys(jsonData[0]).find(c => {
                        const cl = c.toLowerCase(); return cl.includes('nombre') || cl.includes('first') || cl.includes('conductor');
                    });
                    const lastNameCol = Object.keys(jsonData[0]).find(c => {
                        const cl = c.toLowerCase(); return cl.includes('apellido') || cl.includes('last');
                    });
                    const cashCol = Object.keys(jsonData[0]).find(c => {
                        const cl = c.toLowerCase(); return cl.includes('efectivo') || cl.includes('cash') || cl.includes('cobrado');
                    });

                    if (!firstNameCol || !cashCol) {
                        return reject(new Error("Columnas no encontradas en el CSV de Uber."));
                    }

                    const driverTotals: Record<string, number> = {};
                    jsonData.forEach(row => {
                        const first = row[firstNameCol] || '';
                        const last = lastNameCol ? (row[lastNameCol] || '') : '';
                        const fullName = normalizeName(`${first} ${last}`);
                        if (!fullName) return;

                        let cash = parseFloat(String(row[cashCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;

                        driverTotals[fullName] = (driverTotals[fullName] || 0) + cash;
                    });

                    const upserts = Object.keys(driverTotals).map(driver => ({
                        cycle_id: cycle.id,
                        driver_name: driver,
                        period: periodOrDate,
                        month: uberMonth,
                        cash_collected: driverTotals[driver]
                    }));

                    const { error } = await supabase.from('efectivo_uber_records').upsert(upserts, { onConflict: 'driver_name, period, cycle_id', ignoreDuplicates: true });
                    if (error) throw error;
                    
                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'uber', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: upserts.length });
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
                    const nameCol = cols.find(c => c.toLowerCase().includes('nombre') || c.toLowerCase().includes('conductor')) || cols[0];
                    const timeCol = cols.find(c => c.toLowerCase().includes('marca') || c.toLowerCase().includes('timestamp') || c.toLowerCase().includes('fecha')) || cols[0];
                    const amountCol = cols.find(c => c.toLowerCase().includes('importe') || c.toLowerCase().includes('entregado') || c.toLowerCase().includes('efectivo')) || cols[0];

                    const upserts = jsonData.map(row => {
                        const driverName = normalizeName(row[nameCol]);
                        const timestampStr = String(row[timeCol]);
                        let cash = parseFloat(String(row[amountCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;

                        return {
                            cycle_id: cycle.id,
                            driver_name: driverName,
                            timestamp: timestampStr,
                            month: "2026-03", // simplified
                            amount: cash
                        };
                    }).filter(u => u.driver_name && u.timestamp);

                    const { error } = await supabase.from('efectivo_entrega_records').upsert(upserts, { onConflict: 'driver_name, timestamp, cycle_id', ignoreDuplicates: true });
                    if (error) throw error;

                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'entregas', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: upserts.length });
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

                    const cols = Object.keys(jsonData[0]).map(c => c.toLowerCase());
                    const driverCol = Object.keys(jsonData[0]).find(c => c.toLowerCase().includes('conductor') || c.toLowerCase().includes('nombre'));
                    const amountCol = Object.keys(jsonData[0]).find(c => c.toLowerCase().includes('importe') || c.toLowerCase().includes('efectivo'));
                    const dateCol = Object.keys(jsonData[0]).find(c => c.toLowerCase().includes('fecha') || c.toLowerCase().includes('date'));
                    const idCol = Object.keys(jsonData[0]).find(c => c.toLowerCase().includes('id') && c.length <= 4);

                    if (!driverCol || !amountCol || !dateCol) {
                        return reject(new Error("Faltan columnas esenciales en el Excel V-GD."));
                    }

                    const inserts = jsonData.map(row => {
                        const driverName = normalizeName(row[driverCol]);
                        if (!driverName) return null;

                        let cash = parseFloat(String(row[amountCol]).replace(',', '.'));
                        if (isNaN(cash)) cash = 0;

                        return {
                            cycle_id: cycle.id,
                            vgd_id: idCol ? parseInt(row[idCol]) : null,
                            driver_name: driverName,
                            month: "2026-03",
                            fecha_hora: String(row[dateCol]),
                            cash_collected: cash
                        };
                    }).filter(i => i !== null);

                    const { error } = await supabase.from('efectivo_vgd_records').insert(inserts);
                    if (error) throw error;

                    await supabase.from('efectivo_upload_history').insert({ cycle_id: cycle.id, file_type: 'vgd', file_name: file.name });
                    await loadReconciliations(cycle.id);
                    resolve({ inserted: inserts.length });
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

    return {
        cycle,
        allCycles,
        loading,
        reconciliations,
        aliases,
        fetchActiveCycle,
        loadSpecificCycle,
        renameCycle,
        clearCurrentCycleData,
        processUberFile,
        processEntregasFile,
        processVGDFile,
        addExpense,
        addEntregaManual,
        closeCycle,
        uploadHistory
    };
}
