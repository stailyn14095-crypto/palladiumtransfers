-- Seed Drivers
INSERT INTO public.drivers (name, plate, vehicle, status, compliance, created_at) VALUES
('Carlos Ruiz', '2412 KLP', 'S-Class', 'Active', true, NOW()),
('Miguel Torres', '9982 BBC', 'V-Class', 'Active', true, NOW()),
('Elena Gomez', '3321 JKL', 'Model X', 'Off', true, NOW());

-- Seed Vehicles
INSERT INTO public.vehicles (plate, model, year, itv, km, status, created_at) VALUES
('2412 KLP', 'Mercedes S-Class', 2023, '2025-12-01', 45200, 'Operativo', NOW()),
('9982 BBC', 'Mercedes V-Class', 2022, '2024-05-01', 89100, 'Operativo', NOW()),
('3321 JKL', 'Tesla Model X', 2023, '2026-01-01', 12500, 'Taller', NOW());

-- Seed Clients
INSERT INTO public.clients (name, company, email, notes, created_at) VALUES
('Hotel Arts', 'Partner', 'recepcion@arts.com', 'VIP', NOW()),
('Tech Solutions SL', 'Corporate', 'admin@techsol.com', 'Net 30', NOW()),
('Mr. John Smith', 'Private', 'john@gmail.com', '', NOW());

-- Seed Tariffs
INSERT INTO public.tariffs (name, base_price, created_at) VALUES
('Aeropuerto (ALC) - Benidorm', 85.00, NOW()),
('Aeropuerto (ALC) - Alicante Centro', 45.00, NOW()),
('Tarifa Larga Distancia', 1.90, NOW()),
('Disposición por Hora', 90.00, NOW());

-- Seed Bookings (linked to drivers if possible, but using placeholders for simplicity or need to look up UUIDs)
-- For simplicity, we insert without linking to specific driver UUIDs in this quick seed, or we assume order.
-- Actually, better to just insert text for `assigned_driver_name` as the current UI uses names.
INSERT INTO public.bookings (route, passenger, time, status, assigned_driver_name, created_at) VALUES
('BCN -> Hotel', 'Mr. Smith', NOW() + INTERVAL '1 hour', 'Pending', NULL, NOW()),
('Hotel -> BCN', 'Ms. Doe', NOW() + INTERVAL '2 hours', 'Confirmed', 'Carlos Ruiz', NOW()),
('Tour City', 'Fam. Garcia', NOW() + INTERVAL '3 hours', 'Completed', 'Miguel Torres', NOW()),
('Office -> Dinner', 'CEO Tech', NOW() + INTERVAL '5 hours', 'Confirmed', 'Elena Gomez', NOW());

-- Seed Invoices
-- (Skipping relation constraints for speed if table allows nulls, or just inserting basic info)
INSERT INTO public.invoices (amount, status, date_issued, created_at) VALUES
(1250.00, 'Paid', '2023-10-01', NOW()),
(450.00, 'Pending', '2023-10-05', NOW()),
(890.00, 'Draft', '2023-10-06', NOW());

-- Seed Profiles (Users)
-- We need valid user IDs for profiles. Since we don't have them easily, we can skip or insert dummy rows if we relaxed constraints.
-- But profiles references auth.users. We can't easily seed this without creating users in Auth.
-- We'll skip profiles for now.
