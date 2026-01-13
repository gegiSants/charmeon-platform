import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  photo_url: string | null;
  phone: string;
  sinal_padrao?: number | null;
}

export interface Service {
  id: string;
  professional_id: string;
  name: string;
  price: number;
  duration: number;
  photo_url: string | null;
  sinal_fixo?: number | null;
  category_id?: string | null;
  description?: string | null;
  short_description?: string | null;
  is_featured?: boolean;
  display_order?: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

// Função helper para converter Date para string YYYY-MM-DD preservando a data local
// Isso evita problemas de timezone onde toISOString() pode mudar o dia
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  const dateStr = formatDateLocal(date);

  // Buscar APENAS horários específicos da profissional (sem globais)
  const { data: specificHours, error: specificError } = await supabase
    .from('available_hours')
    .select('time')
    .eq('is_active', true)
    .eq('professional_id', professionalId)
    .order('time');

  if (specificError) {
    console.error('Erro ao buscar horários específicos:', specificError);
  }

  // Usar apenas horários específicos da profissional
  let hours: string[] = specificHours && specificHours.length > 0
    ? specificHours.map(h => h.time)
    : []; // Se não tiver horários configurados, retorna vazio (profissional não tem horários disponíveis)

  // IMPORTANTE: Não usar horários padrão se a profissional não tiver configurado
  // Cada profissional deve configurar seus próprios horários no admin

  // Buscar bloqueios de agenda (dias/horários indisponíveis)
  const { data: blockedSlots, error: blockedError } = await supabase
    .from('blocked_slots')
    .select('blocked_time')
    .eq('professional_id', professionalId)
    .eq('blocked_date', dateStr);

  if (blockedError) {
    console.error('Erro ao buscar bloqueios:', blockedError);
  }

  // Se o dia inteiro estiver bloqueado (blocked_time IS NULL), retornar todos como indisponíveis
  const dayBlocked = blockedSlots?.some(slot => !slot.blocked_time) || false;
  if (dayBlocked) {
    return hours.map(hour => ({
      time: hour,
      available: false,
    }));
  }

  // Criar Set com horários bloqueados (apenas horários específicos)
  const blockedTimes = new Set(
    blockedSlots?.filter(slot => slot.blocked_time).map(slot => slot.blocked_time) || []
  );

  // Buscar agendamentos existentes para esta data e profissional
  // IMPORTANTE: Buscar TODOS os agendamentos não cancelados (pending, confirmed, etc.)
  const { data: existingAppointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('appointment_time, status')
    .eq('professional_id', professionalId)
    .eq('appointment_date', dateStr)
    .in('status', ['pending', 'confirmed']); // Apenas agendamentos ativos

  if (appointmentsError) {
    console.error('Erro ao buscar agendamentos existentes:', appointmentsError);
  }

  // Criar Set com horários ocupados
  const bookedTimes = new Set(
    existingAppointments?.map(a => a.appointment_time) || []
  );

  return hours.map(hour => ({
    time: hour,
    available: !blockedTimes.has(hour) && !bookedTimes.has(hour),
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
  const dateStr = formatDateLocal(data.date);

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
