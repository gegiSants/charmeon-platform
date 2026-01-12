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
  const dateStr = date.toISOString().split('T')[0];

  // Buscar horários disponíveis do banco (específicos do profissional ou globais)
  const { data: availableHours } = await supabase
    .from('available_hours')
    .select('time')
    .eq('is_active', true)
    .or(`professional_id.eq.${professionalId},professional_id.is.null`)
    .order('time');

  // Se não houver horários configurados, usar padrão
  const hours = availableHours && availableHours.length > 0
    ? availableHours.map(h => h.time)
    : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  // Buscar agendamentos existentes para esta data e profissional
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

// Buscar email do cliente por telefone
export const getClientEmail = async (phone: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('clients')
    .select('email')
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return null;
  }

  return data.email;
};

// Salvar ou atualizar email do cliente
export const saveClientEmail = async (phone: string, email: string, name?: string): Promise<void> => {
  const { error } = await supabase
    .from('clients')
    .upsert({
      phone,
      email,
      name: name || null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'phone',
    });

  if (error) {
    throw error;
  }
};

export const createAppointment = async (data: {
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  professionalId: string;
  serviceId: string;
  date: Date;
  time: string;
  paymentType: 'sinal' | 'total';
  totalAmount: number;
}) => {
  const dateStr = data.date.toISOString().split('T')[0];

  // VALIDAÇÃO CRÍTICA: Verificar se já existe agendamento para este horário, profissional e data
  const { data: existingAppointment, error: checkError } = await supabase
    .from('appointments')
    .select('id, client_name, appointment_time')
    .eq('professional_id', data.professionalId)
    .eq('appointment_date', dateStr)
    .eq('appointment_time', data.time)
    .neq('status', 'cancelled')
    .maybeSingle();

  if (checkError) {
    throw new Error(`Erro ao verificar disponibilidade: ${checkError.message}`);
  }

  if (existingAppointment) {
    throw new Error(
      `Este horário (${data.time}) já está ocupado para esta profissional nesta data. ` +
      `Por favor, escolha outro horário.`
    );
  }

  // Se email foi fornecido, salvar na tabela de clientes
  if (data.clientEmail) {
    await saveClientEmail(data.clientPhone, data.clientEmail, data.clientName);
  }

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_name: data.clientName,
      client_phone: data.clientPhone,
      client_email: data.clientEmail || null,
      professional_id: data.professionalId,
      service_id: data.serviceId,
      appointment_date: dateStr,
      appointment_time: data.time,
      payment_type: data.paymentType,
      total_amount: data.totalAmount,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    // Se for erro de constraint única (duplicata), dar mensagem mais clara
    if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
      throw new Error(
        `Este horário já está ocupado. Por favor, escolha outro horário.`
      );
    }
    throw error;
  }

  return appointment;
};
