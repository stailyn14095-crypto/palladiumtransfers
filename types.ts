export interface Flight {
  id: string;
  number: string;
  origin: string;
  scheduled: string;
  estimated: string;
  status: 'Final Approach' | 'Taxiing' | 'Block In' | 'Delayed' | 'Landed';
  passenger: string;
  paxCount?: number;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  plate: string;
  avatar: string;
  status: 'Active' | 'En Route' | 'Finished' | 'AVL' | 'Busy' | 'Off';
  location?: string;
  compliance?: boolean;
}

export interface Vehicle {
  plate: string;
  model: string;
  year: number;
  itv: string;
  km: number;
  lastService: string;
  status: string;
  insuranceExpiry: string;
}

export interface Booking {
  id: string;
  route: string;
  passenger: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'En Route' | 'At Origin' | 'In Progress' | 'Completed' | 'Cancelled';
  driverId?: string;
  assignedDriverName?: string; // New field
}

export enum ViewState {
  OPERATIONS = 'OPERATIONS',
  DISPATCH = 'DISPATCH',
  CONFIG = 'CONFIG',
  RESERVAS = 'RESERVAS',
  CONDUCTORES = 'CONDUCTORES',
  VEHICULOS = 'VEHICULOS',
  TALLER = 'TALLER',
  CLIENTES = 'CLIENTES',
  TARIFAS = 'TARIFAS',
  USUARIOS = 'USUARIOS',
  TURNOS = 'TURNOS',
  FACTURAS = 'FACTURAS',
  API = 'API',
  DRIVER_APP = 'DRIVER_APP', // New
  REPORTES = 'REPORTES', // New
  DRIVER_ACCESS = 'DRIVER_ACCESS',
  EXTRAS = 'EXTRAS',
  MUNICIPALITIES = 'municipalities',
  FICHAJES = 'FICHAJES',
  CONFIGURACION = 'CONFIGURACION',
  CLIENT_PORTAL = 'CLIENT_PORTAL',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isMapResponse?: boolean;
  mapData?: any;
}

export type Language = 'es' | 'en';
