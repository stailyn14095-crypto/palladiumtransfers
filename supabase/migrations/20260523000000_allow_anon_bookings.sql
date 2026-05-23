-- Allow anonymous users to insert into bookings table
-- This is necessary so the AI Assistant (and the Booking Form) can create pre-bookings when the user is not logged in.

-- 1. Grant INSERT privileges to the anon role on the bookings table
GRANT INSERT ON TABLE public.bookings TO anon;

-- 2. Create an RLS policy allowing anon to insert rows
CREATE POLICY "Allow anon insert to bookings" 
ON public.bookings 
FOR INSERT 
TO anon 
WITH CHECK (true);
