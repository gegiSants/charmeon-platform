import { useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AgendaCalendarAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_phone: string;
  status: string;
  professional_id: string | null;
  amount_paid: number;
  total_amount: number;
  professionals?: { name: string; phone?: string } | null;
  services?: { name: string; price?: number; duration?: number } | null;
}

interface Professional {
  id: string;
  name: string;
}

interface AgendaCalendarProps {
  appointments: AgendaCalendarAppointment[];
  professionals: Professional[];
  onRefresh: () => void;
  onEventClick?: (appointmentId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#16a34a',
  completed: '#2563eb',
  pending: '#ca8a04',
  cancelled: '#dc2626',
};

function toEvent(apt: AgendaCalendarAppointment) {
  const durationMin = apt.services?.duration || 60;
  const start = `${apt.appointment_date}T${apt.appointment_time}`;
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMin * 60_000);
  const proName = apt.professionals?.name || 'Sem profissional';
  const serviceName = apt.services?.name || 'Serviço';

  return {
    id: apt.id,
    title: `${apt.client_name} — ${serviceName}`,
    start,
    end: endDate.toISOString(),
    backgroundColor: STATUS_COLORS[apt.status] || '#6b7280',
    borderColor: STATUS_COLORS[apt.status] || '#6b7280',
    extendedProps: {
      professionalId: apt.professional_id,
      professionalName: proName,
      phone: apt.client_phone,
      status: apt.status,
    },
  };
}

export default function AgendaCalendar({
  appointments,
  professionals,
  onRefresh,
  onEventClick,
}: AgendaCalendarProps) {
  const events = useMemo(() => appointments.map(toEvent), [appointments]);

  const handleEventDrop = async (info: EventDropArg) => {
    const start = info.event.start;
    if (!start) {
      info.revert();
      return;
    }
    const date = start.toISOString().slice(0, 10);
    const time = start.toTimeString().slice(0, 5);

    const { error } = await supabase
      .from('appointments')
      .update({ appointment_date: date, appointment_time: time })
      .eq('id', info.event.id);

    if (error) {
      console.error(error);
      toast.error('Não foi possível reagendar');
      info.revert();
      return;
    }
    toast.success('Agendamento reagendado');
    onRefresh();
  };

  const handleEventClick = (info: EventClickArg) => {
    onEventClick?.(info.event.id);
  };

  return (
    <div className="agenda-calendar rounded-lg border bg-card p-2 sm:p-4">
      <p className="mb-3 text-xs text-muted-foreground">
        Vista experimental com FullCalendar (timeGrid). Colunas por profissional (resource-timegrid)
        exigem licença premium — aqui os eventos mostram a profissional no título/tooltip.
        {professionals.length > 0 && ` ${professionals.length} profissional(is) no filtro atual.`}
      </p>
      <FullCalendar
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, listPlugin]}
        locale={ptBrLocale}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        slotMinTime="07:00:00"
        slotMaxTime="21:00:00"
        allDaySlot={false}
        height="auto"
        editable
        eventStartEditable
        eventDurationEditable={false}
        events={events}
        eventDrop={handleEventDrop}
        eventClick={handleEventClick}
        eventDidMount={(info) => {
          const pro = info.event.extendedProps.professionalName;
          if (pro) {
            info.el.title = `${info.event.title}\n${pro}`;
          }
        }}
        nowIndicator
        weekends
      />
    </div>
  );
}
