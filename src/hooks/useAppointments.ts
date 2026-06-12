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
  const { data: existingAppointments, error: appointmentsError } = await supabase
    .rpc('get_booked_slots', {
      p_professional_id: professionalId,
      p_date: dateStr,
    });

  if (appointmentsError) {
    console.error('Erro ao buscar agendamentos existentes:', appointmentsError);
  }

  // Buscar durações dos serviços dos agendamentos existentes
  const serviceIds = existingAppointments?.filter(a => a.service_id).map(a => a.service_id) || [];
  let serviceDurations: Map<string, number> = new Map();
  
  if (serviceIds.length > 0) {
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, duration')
      .in('id', serviceIds);
    
    if (servicesError) {
      console.error('Erro ao buscar durações dos serviços:', servicesError);
    } else if (services) {
      services.forEach(service => {
        serviceDurations.set(service.id, service.duration);
      });
    }
  }

  // Função helper para adicionar minutos a um horário (formato "HH:MM")
  const addMinutes = (time: string, minutes: number): string => {
    const [h, m] = time.split(':').map(Number);
    const totalMinutes = h * 60 + m + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
  };

  // Função helper para converter horário "HH:MM" para minutos desde meia-noite
  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  // Função helper para verificar se um horário está dentro de um intervalo
  const isTimeInRange = (time: string, startTime: string, endTime: string): boolean => {
    const timeMin = timeToMinutes(time);
    const startMin = timeToMinutes(startTime);
    const endMin = timeToMinutes(endTime);
    return timeMin >= startMin && timeMin < endMin; // endTime não está incluído (intervalo aberto à direita)
  };

  // Criar Set com horários ocupados (incluindo todos os horários onde o serviço está em andamento)
  const bookedTimes = new Set<string>();
  
  if (existingAppointments) {
    for (const appointment of existingAppointments) {
      const startTime = appointment.appointment_time;
      
      // Se tiver serviço, buscar duração e bloquear todos os horários onde o serviço está em andamento
      if (appointment.service_id) {
        const duration = serviceDurations.get(appointment.service_id);
        if (duration && duration > 0) {
          // Calcular horário de término (início + duração em minutos)
          const endTime = addMinutes(startTime, duration);
          
          // Bloquear todos os horários disponíveis que estão dentro do intervalo [startTime, endTime)
          // Exemplo: serviço de 120 min começando às 09:00 termina às 11:00
          // Bloqueia 09:00 e 10:00 (mas não 11:00, pois o serviço termina exatamente às 11:00)
          for (const hour of hours) {
            if (isTimeInRange(hour, startTime, endTime)) {
              bookedTimes.add(hour);
            }
          }
        } else {
          // Se não tiver duração, bloquear apenas o horário inicial
          bookedTimes.add(startTime);
        }
      } else {
        // Se não tiver serviço, bloquear apenas o horário inicial
        bookedTimes.add(startTime);
      }
    }
  }

  return hours.map(hour => ({
    time: hour,
    available: !blockedTimes.has(hour) && !bookedTimes.has(hour),
  }));
};

// Buscar email do cliente por telefone
export const getClientEmail = async (phone: string): Promise<string | null> => {
  const { data, error } = await supabase.rpc('get_client_email', { p_phone: phone });

  if (error || !data) {
    return null;
  }

  return data as string;
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

// Função helper para adicionar minutos a um horário (reutilizada de generateTimeSlots)
function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

// Função helper para converter horário para minutos
function timeToMinutesFromMidnight(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

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

  // Buscar duração do serviço
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('duration')
    .eq('id', data.serviceId)
    .single();

  if (serviceError || !service) {
    throw new Error('Erro ao buscar informações do serviço');
  }

  const serviceDuration = service.duration;

  // Buscar horários disponíveis da profissional
  const { data: availableHours, error: hoursError } = await supabase
    .from('available_hours')
    .select('time')
    .eq('professional_id', data.professionalId)
    .eq('is_active', true)
    .order('time');

  if (hoursError) {
    throw new Error('Erro ao verificar horários disponíveis');
  }

  const hours = (availableHours || []).map(h => h.time);

  // Calcular horário de término do serviço
  const endTime = addMinutesToTime(data.time, serviceDuration);

  // VALIDAÇÃO: Verificar se há espaço suficiente nos horários disponíveis
  // O serviço precisa caber dentro dos horários disponíveis
  const startMinutes = timeToMinutesFromMidnight(data.time);
  const endMinutes = timeToMinutesFromMidnight(endTime);
  
  // Verificar se o horário de início está nos horários disponíveis
  if (!hours.includes(data.time)) {
    throw new Error(`O horário ${data.time} não está disponível para esta profissional.`);
  }

  // VALIDAÇÃO CRÍTICA: Verificar se o horário de término está dentro dos horários disponíveis
  // Se os horários disponíveis são 08:00-12:00 (finalizando 13:00), e o serviço de 3h começa às 12:00,
  // ele vai até 15:00, o que está fora dos horários disponíveis - NÃO DEVE PERMITIR
  if (hours.length > 0) {
    const lastAvailableHour = hours[hours.length - 1];
    const lastAvailableMinutes = timeToMinutesFromMidnight(lastAvailableHour);
    
    // O serviço não pode terminar depois do último horário disponível
    // (considerando que o último horário disponível permite serviços de até 1 hora)
    // Na verdade, precisamos verificar se há horários disponíveis suficientes para a duração
    // Verificar se o horário de término está dentro dos horários disponíveis
    const serviceEndsWithinAvailableHours = endMinutes <= (lastAvailableMinutes + 60); // +60 minutos (1 hora) para o último horário
    
    if (!serviceEndsWithinAvailableHours) {
      throw new Error(
        `Não há espaço suficiente para este serviço (${serviceDuration} min) no horário ${data.time}. ` +
        `O serviço terminaria às ${endTime}, mas os horários disponíveis terminam às ${lastAvailableHour}.`
      );
    }
  }

  // Buscar agendamentos existentes que podem conflitar
  // IMPORTANTE: Só verificar conflitos com agendamentos CONFIRMADOS (com pagamento confirmado)
  // Agendamentos 'pending' NÃO ocupam o horário
  const { data: existingAppointments, error: appointmentsError } = await supabase
    .rpc('get_booked_slots', {
      p_professional_id: data.professionalId,
      p_date: dateStr,
    });

  if (appointmentsError) {
    throw new Error(`Erro ao verificar disponibilidade: ${appointmentsError.message}`);
  }

  // Se houver agendamentos existentes, verificar conflitos considerando durações
  if (existingAppointments && existingAppointments.length > 0) {
    // Buscar durações dos serviços dos agendamentos existentes
    const serviceIds = existingAppointments.filter(a => a.service_id).map(a => a.service_id) || [];
    let serviceDurations: Map<string, number> = new Map();
    
    if (serviceIds.length > 0) {
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, duration')
        .in('id', serviceIds);
      
      if (!servicesError && services) {
        services.forEach(s => {
          serviceDurations.set(s.id, s.duration);
        });
      }
    }

    // Verificar conflitos
    for (const appointment of existingAppointments) {
      const existingStartTime = appointment.appointment_time;
      const existingDuration = appointment.service_id ? serviceDurations.get(appointment.service_id) || 0 : 0;
      const existingEndTime = addMinutesToTime(existingStartTime, existingDuration);
      
      const existingStartMinutes = timeToMinutesFromMidnight(existingStartTime);
      const existingEndMinutes = timeToMinutesFromMidnight(existingEndTime);

      // Verificar se há sobreposição: [startTime, endTime) intersecta [existingStartTime, existingEndTime)
      if (!(endMinutes <= existingStartMinutes || startMinutes >= existingEndMinutes)) {
        throw new Error(
          `Este horário conflita com um agendamento existente (${existingStartTime}). ` +
          `Por favor, escolha outro horário.`
        );
      }
    }
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
