ALTER TABLE clients ADD COLUMN IF NOT EXISTS contract_date DATE;
COMMENT ON COLUMN clients.contract_date IS 'Fecha formal del contrato con el cliente para comunicaciones VTC Fomento';
