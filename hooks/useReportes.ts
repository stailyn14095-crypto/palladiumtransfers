import { useState, useEffect, useMemo } from 'react';
import { useSupabaseData } from './useSupabaseData';

export interface ReportData {
   totalRevenue: number;
   revenueGrowth: number;
   totalFuelCost: number;
   fuelCostPercentage: number;
   totalMaintenanceCost: number;
   vehiclesInShop: number;
   netProfit: number;
   netMargin: number;
   totalCollected: number;
   totalPending: number;
   recentExpenses: any[];
   vehicleProfitability: any[];
   loading: boolean;
}

export const useReportes = (timeFilter: 'Este Mes' | 'Mes Pasado' | 'YTD' = 'Este Mes'): ReportData => {
   const { data: bookings, loading: loadingBookings } = useSupabaseData('bookings');
   const { data: expenses, loading: loadingExpenses } = useSupabaseData('vehicle_expenses');
   const { data: vehicles, loading: loadingVehicles } = useSupabaseData('vehicles');
   const { data: invoices, loading: loadingInvoices } = useSupabaseData('invoices');

   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!loadingBookings && !loadingExpenses && !loadingVehicles && !loadingInvoices) {
         setLoading(false);
      }
   }, [loadingBookings, loadingExpenses, loadingVehicles, loadingInvoices]);

   const report = useMemo(() => {
      if (!bookings || !expenses || !vehicles || !invoices) {
         return {
            totalRevenue: 0,
            revenueGrowth: 0,
            totalFuelCost: 0,
            fuelCostPercentage: 0,
            totalMaintenanceCost: 0,
            vehiclesInShop: 0,
            netProfit: 0,
            netMargin: 0,
            totalCollected: 0,
            totalPending: 0,
            recentExpenses: [],
            vehicleProfitability: []
         };
      }

      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      let prevStartDate = new Date();
      let prevEndDate = new Date();

      if (timeFilter === 'Este Mes') {
         startDate = new Date(now.getFullYear(), now.getMonth(), 1);
         endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
         prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
         prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (timeFilter === 'Mes Pasado') {
         startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
         endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
         prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
         prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      } else if (timeFilter === 'YTD') {
         startDate = new Date(now.getFullYear(), 0, 1);
         endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
         prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
         prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      }

      const filterByDate = (itemDateStr: string, start: Date, end: Date) => {
         if (!itemDateStr) return false;
         const d = new Date(itemDateStr);
         return d >= start && d <= end;
      };

      // Bookings & Revenue
      const currentBookings = bookings.filter((b: any) => filterByDate(b.pickup_date, startDate, endDate) && b.status !== 'Cancelled');
      const prevBookings = bookings.filter((b: any) => filterByDate(b.pickup_date, prevStartDate, prevEndDate) && b.status !== 'Cancelled');

      const totalRevenue = currentBookings.reduce((sum: number, b: any) => sum + (Number(b.price) || 0), 0);
      const prevRevenue = prevBookings.reduce((sum: number, b: any) => sum + (Number(b.price) || 0), 0);
      const revenueGrowth = prevRevenue === 0 ? 100 : ((totalRevenue - prevRevenue) / prevRevenue) * 100;

      // Invoices - Financial Flow
      const currentInvoices = invoices.filter((inv: any) => filterByDate(inv.date_issued, startDate, endDate));
      const totalCollected = currentInvoices
         .filter((inv: any) => inv.status === 'Paid')
         .reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);
      
      const totalPending = currentInvoices
         .filter((inv: any) => inv.status !== 'Paid' && inv.status !== 'Cancelled')
         .reduce((sum: number, inv: any) => sum + (Number(inv.total_amount) || 0), 0);

      // Expenses
      const currentExpenses = expenses.filter((e: any) => filterByDate(e.date, startDate, endDate));
      
      const totalFuelCost = currentExpenses
         .filter((e: any) => e.expense_type === 'Combustible' || e.expense_type === 'Electricidad')
         .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
      
      const totalMaintenanceCost = currentExpenses
         .filter((e: any) => e.expense_type === 'Taller / Mantenimiento' || e.expense_type === 'ITV')
         .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const totalOtherCost = currentExpenses
         .filter((e: any) => !['Combustible', 'Electricidad', 'Taller / Mantenimiento', 'ITV'].includes(e.expense_type))
         .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);

      const allCosts = totalFuelCost + totalMaintenanceCost + totalOtherCost;
      const fuelCostPercentage = totalRevenue === 0 ? 0 : (totalFuelCost / totalRevenue) * 100;

      const netProfit = totalRevenue - allCosts;
      const netMargin = totalRevenue === 0 ? 0 : (netProfit / totalRevenue) * 100;

      const vehiclesInShop = vehicles.filter((v: any) => v.status === 'Taller').length;

      // Formatting recent expenses
      const recentExpenses = [...currentExpenses].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((e: any) => {
         const vehicle = vehicles.find((v: any) => v.id === e.vehicle_id);
         return {
            id: e.id,
            date: new Date(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
            desc: e.description || e.expense_type,
            ref: vehicle ? `${vehicle.plate} (${vehicle.model})` : 'Vehículo Desconocido',
            cat: e.expense_type,
            amount: `${Number(e.amount).toFixed(2)} €`
         };
      });

      // Vehicle Profitability
      const profitsByVehicle: Record<string, { id: string, name: string, plate: string, revenue: number, cost: number }> = {};
      
      vehicles.forEach((v: any) => {
         profitsByVehicle[v.id] = { id: v.id, name: v.model, plate: v.plate, revenue: 0, cost: 0 };
      });

      // Assumes bookings have vehicle_id
      currentBookings.forEach((b: any) => {
         const vId = b.vehicle_id || b.assigned_vehicle_id;
         if (vId && profitsByVehicle[vId]) {
            profitsByVehicle[vId].revenue += (Number(b.price) || 0);
         }
      });

      currentExpenses.forEach((e: any) => {
         if (e.vehicle_id && profitsByVehicle[e.vehicle_id]) {
            profitsByVehicle[e.vehicle_id].cost += (Number(e.amount) || 0);
         }
      });

      const maxRev = Math.max(...Object.values(profitsByVehicle).map(v => v.revenue), 1);
      
      const vehicleProfitability = Object.values(profitsByVehicle)
         .map(v => {
            const profit = v.revenue - v.cost;
            return {
               ...v,
               profit,
               profitPercentage: v.revenue > 0 ? ((v.revenue) / maxRev) * 100 : 0 // for the chart bar
            };
         })
         .sort((a, b) => b.profit - a.profit)
         .slice(0, 3);

      return {
         totalRevenue,
         revenueGrowth,
         totalFuelCost,
         fuelCostPercentage,
         totalMaintenanceCost,
         vehiclesInShop,
         netProfit,
         netMargin,
         totalCollected,
         totalPending,
         recentExpenses,
         vehicleProfitability
      };
   }, [bookings, expenses, vehicles, invoices, timeFilter]);

   return { ...report, loading };
};
