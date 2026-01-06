export interface Professional {
  id: string;
  name: string;
  specialty: string;
  photo: string;
  phone: string;
  services: Service[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  professionalId: string;
  photo?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  professionalId: string;
  serviceId: string;
  date: string;
  time: string;
  paymentType: 'sinal' | 'total';
  status: 'pending' | 'confirmed' | 'completed';
}

export const professionals: Professional[] = [
  {
    id: '1',
    name: 'Ingrid Leandro',
    specialty: 'Especialista em Cílios e Unhas',
    photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400&h=400&fit=crop&crop=face',
    phone: '(11) 99027-8446',
    services: [],
  },
  {
    id: '2',
    name: 'Amanda Silva',
    specialty: 'Nail Designer',
    photo: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=400&fit=crop&crop=face',
    phone: '(11) 99999-0000',
    services: [],
  },
];

export const services: Service[] = [
  { id: '1', name: 'Alongamento de Cílios Fio a Fio', price: 150, duration: 90, professionalId: '1' },
  { id: '2', name: 'Alongamento Volume Russo', price: 200, duration: 120, professionalId: '1' },
  { id: '3', name: 'Manutenção de Cílios', price: 80, duration: 60, professionalId: '1' },
  { id: '4', name: 'Alongamento de Unhas em Gel', price: 120, duration: 90, professionalId: '1' },
  { id: '5', name: 'Esmaltação em Gel', price: 60, duration: 45, professionalId: '1' },
  { id: '6', name: 'Nail Art', price: 80, duration: 60, professionalId: '2' },
  { id: '7', name: 'Manicure Completa', price: 45, duration: 45, professionalId: '2' },
  { id: '8', name: 'Pedicure Completa', price: 50, duration: 50, professionalId: '2' },
];

export const generateTimeSlots = (date: Date): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const hours = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  
  hours.forEach((hour) => {
    slots.push({
      time: hour,
      available: Math.random() > 0.3,
    });
  });
  
  return slots;
};

export const appointments: Appointment[] = [
  {
    id: '1',
    clientName: 'Maria Santos',
    clientPhone: '(11) 98765-4321',
    professionalId: '1',
    serviceId: '1',
    date: '2026-01-07',
    time: '09:00',
    paymentType: 'sinal',
    status: 'confirmed',
  },
  {
    id: '2',
    clientName: 'Julia Costa',
    clientPhone: '(11) 91234-5678',
    professionalId: '1',
    serviceId: '4',
    date: '2026-01-07',
    time: '14:00',
    paymentType: 'total',
    status: 'pending',
  },
];
