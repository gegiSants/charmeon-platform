import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  photo_url: string | null;
  phone: string;
}

export interface Service {
  id: string;
  professional_id: string;
  name: string;
  price: number;
  duration: number;
  photo_url: string | null;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export const useProfessionals = () => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching professionals:', error);
      } else {
        setProfessionals(data || []);
      }
      setLoading(false);
    };

    fetchProfessionals();
  }, []);

  return { professionals, loading };
};

export const useServices = (professionalId: string | null) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!professionalId) {
      setServices([]);
      return;
    }

    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId)
        .order('name');
      
      if (error) {
        console.error('Error fetching services:', error);
      } else {
        setServices(data || []);
      }
      setLoading(false);
    };

    fetchServices();
  }, [professionalId]);

  return { services, loading };
};

export const generateTimeSlots = async (date: Date, professionalId: string): Promise<TimeSlot[]> => {
  const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  const dateStr = date.toISOString().split('T')[0];

  // Fetch existing appointments for this date and professional
  const { data: existingAppointments } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('professional_id', professionalId)
    .eq('appointment_date', dateStr)
    .neq('status', 'cancelled');

  const bookedTimes = new Set(existingAppointments?.map(a => a.appointment_time) || []);

  return hours.map(hour => ({
    time: hour,
    available: !bookedTimes.has(hour),
  }));
};

export const createAppointment = async (data: {
  clientName: string;
  clientPhone: string;
  professionalId: string;
  serviceId: string;
  date: Date;
  time: string;
  paymentType: 'sinal' | 'total';
  totalAmount: number;
}) => {
  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_name: data.clientName,
      client_phone: data.clientPhone,
      professional_id: data.professionalId,
      service_id: data.serviceId,
      appointment_date: data.date.toISOString().split('T')[0],
      appointment_time: data.time,
      payment_type: data.paymentType,
      total_amount: data.totalAmount,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return appointment;
};
