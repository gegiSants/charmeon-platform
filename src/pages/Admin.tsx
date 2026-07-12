import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProfessionals, useServices } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users, Scissors, Calendar, List, Phone, Clock, Trash2, Edit, Loader2, CheckCircle, XCircle, DollarSign, Mail, Ban, Upload, X, Tag, Sparkles, MapPin, Instagram, Shield, CreditCard, FileText, UserCircle, LogOut, Wallet, MessageCircle, TrendingUp } from 'lucide-react';
import CashFlowTab from '@/components/CashFlowTab';
import AgendaCalendar from '@/components/AgendaCalendar';
import AvailabilityRulesSection from '@/components/AvailabilityRulesSection';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { formatCountdown, paymentReminderMessage, whatsappUrl, daysSince, normalizePhoneDigits } from '@/lib/leads';

// Função helper para formatar data YYYY-MM-DD para dd/MM/yyyy
// Evita problemas de timezone ao usar new Date()
function formatDateString(dateStr: string): string {
  // Se a data já está no formato YYYY-MM-DD, converter diretamente
  const [year, month, day] = dateStr.split('-');
  if (year && month && day) {
    return `${day}/${month}/${year}`;
  }
  // Fallback: tentar usar date-fns
  try {
    return format(new Date(dateStr + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  professional_id: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  payment_type: 'sinal' | 'total';
  amount_paid: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  lead_expires_at?: string | null;
  payment_link_url?: string | null;
  email_confirmation_sent?: boolean;
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
  professionals?: { name: string; phone: string };
  services?: { name: string; price: number; duration: number; sinal_fixo?: number | null };
}

const Admin = () => {
  const { professionals, loading: loadingProfessionals } = useProfessionals({ includeInactive: true });
  // Filtros isolados por aba (evita vazamento entre Serviços/Agenda/Clientes)
  const [scheduleProfessionalFilter, setScheduleProfessionalFilter] = useState<string>('all');
  const [leadsProfessionalFilter, setLeadsProfessionalFilter] = useState<string>('all');
  const [servicesProfessionalFilter, setServicesProfessionalFilter] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [agendaView, setAgendaView] = useState<'table' | 'calendar'>('table');
  const [remainingConfirmApt, setRemainingConfirmApt] = useState<Appointment | null>(null);
  const [savingRemaining, setSavingRemaining] = useState(false);
  const [clientsSearch, setClientsSearch] = useState('');
  const [clientsProfessionalFilter, setClientsProfessionalFilter] = useState<string>('all');
  const [resendingLeadId, setResendingLeadId] = useState<string | null>(null);
  const [proRevenueRank, setProRevenueRank] = useState<{ id: string; name: string; total: number }[]>([]);
  
  // Estados para formulários
  const [newProfessional, setNewProfessional] = useState({
    name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '',
    is_active: true, commission_percent: '',
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingServicePhoto, setUploadingServicePhoto] = useState(false);
  const [servicePhotoPreview, setServicePhotoPreview] = useState<string | null>(null);
  const [newService, setNewService] = useState({ 
    name: '', 
    price: '', 
    duration: '', 
    allow_full_payment: false, 
    sinal_fixo: '',
    category_id: '',
    short_description: '',
    description: '',
    is_featured: false,
    display_order: '0',
    photo_url: ''
  });
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [serviceFormProfessional, setServiceFormProfessional] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState<Appointment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  // Estados para gerenciamento de horários
  const [availableHours, setAvailableHours] = useState<any[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);
  const [hoursProfessionalFilter, setHoursProfessionalFilter] = useState<string>('all');
  const [newHour, setNewHour] = useState({ time: '', professionalId: '' });
  const [isHourDialogOpen, setIsHourDialogOpen] = useState(false);
  
  // Estados para gerenciamento de bloqueios
  const [blockedSlots, setBlockedSlots] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [blockedProfessionalFilter, setBlockedProfessionalFilter] = useState<string>('all');
  const [newBlocked, setNewBlocked] = useState({ date: '', time: '', professionalId: '', reason: '' });
  const [isBlockedDialogOpen, setIsBlockedDialogOpen] = useState(false);
  
  // Estados para informações do estúdio
  const [studioInfo, setStudioInfo] = useState<any>(null);
  const [loadingStudioInfo, setLoadingStudioInfo] = useState(false);
  const [savingStudioInfo, setSavingStudioInfo] = useState(false);
  
  // Estados para agendamento manual
  const [isManualAppointmentDialogOpen, setIsManualAppointmentDialogOpen] = useState(false);
  const [newManualAppointment, setNewManualAppointment] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    professional_id: '',
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    status: 'confirmed' as 'pending' | 'confirmed' | 'completed' | 'cancelled',
    total_amount: '',
    amount_paid: '',
    force_override: false
  });
  const [loadingManualAppointment, setLoadingManualAppointment] = useState(false);
  const [manualAppointmentServices, setManualAppointmentServices] = useState<any[]>([]);

  // Verificar configuração do Supabase
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Variáveis de ambiente não configuradas. Verifique o arquivo .env.local');
      console.error('Supabase não configurado. Verifique VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
    }
  }, []);

  // Carregar serviços quando filtro da aba Serviços muda
  useEffect(() => {
    loadServices(servicesProfessionalFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicesProfessionalFilter]);

  // Carregar serviços para agendamento manual
  const loadServicesForManualAppointment = async (professionalId: string) => {
    try {
      const { data, error: queryError } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId)
        .order('name');

      if (queryError) {
        console.error('Error loading services:', queryError);
        toast.error(`Erro ao carregar serviços: ${queryError.message}`);
        setManualAppointmentServices([]);
      } else {
        setManualAppointmentServices(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading services:', err);
      toast.error('Erro inesperado ao carregar serviços');
      setManualAppointmentServices([]);
    }
  };

  // Carregar serviços quando profissional é selecionada no formulário de agendamento manual
  useEffect(() => {
    if (newManualAppointment.professional_id) {
      loadServicesForManualAppointment(newManualAppointment.professional_id);
    } else {
      setManualAppointmentServices([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newManualAppointment.professional_id]);

  // Carregar categorias
  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('Error loading categories:', error);
      toast.error('Erro ao carregar categorias');
    } else {
      setCategories(data || []);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Digite o nome da categoria');
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: newCategoryName.trim(),
        is_active: true,
        display_order: categories.length + 1
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      toast.error('Erro ao adicionar categoria');
    } else {
      toast.success('Categoria adicionada!');
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      loadCategories();
      // Selecionar a categoria recém-criada no serviço
      if (editingService) {
        setEditingService({ ...editingService, category_id: data.id });
      } else {
        setNewService({ ...newService, category_id: data.id });
      }
    }
  };

  useEffect(() => {
    loadCategories();
    loadStudioInfo();
  }, []);

  const loadStudioInfo = async () => {
    setLoadingStudioInfo(true);
    try {
      const { data, error } = await supabase
        .from('studio_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading studio info:', error);
        // Se não existir, criar objeto vazio com valores padrão
        setStudioInfo({
          phone: '',
          instagram: '',
          payment_methods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']
        });
      } else {
        setStudioInfo(data || {
          phone: '',
          instagram: '',
          payment_methods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']
        });
      }
    } catch (error) {
      console.error('Error loading studio info:', error);
      setStudioInfo({
        phone: '',
        instagram: '',
        payment_methods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']
      });
    } finally {
      setLoadingStudioInfo(false);
    }
  };

  const handleSaveStudioInfo = async () => {
    if (!studioInfo) return;

    setSavingStudioInfo(true);
    try {
      // Verificar se já existe registro
      const { data: existing } = await supabase
        .from('studio_info')
        .select('id')
        .limit(1)
        .maybeSingle();

      const dataToSave = {
        ...studioInfo,
        payment_methods: typeof studioInfo.payment_methods === 'string' 
          ? JSON.parse(studioInfo.payment_methods) 
          : (Array.isArray(studioInfo.payment_methods) ? studioInfo.payment_methods : ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'])
      };

      let error;
      if (existing?.id) {
        // Atualizar
        const { error: updateError } = await supabase
          .from('studio_info')
          .update(dataToSave)
          .eq('id', existing.id);
        error = updateError;
      } else {
        // Inserir
        const { error: insertError } = await supabase
          .from('studio_info')
          .insert(dataToSave);
        error = insertError;
      }

      if (error) {
        console.error('Error saving studio info:', error);
        toast.error('Erro ao salvar informações do estúdio');
      } else {
        toast.success('Informações do estúdio salvas com sucesso!');
        loadStudioInfo();
      }
    } catch (error) {
      console.error('Error saving studio info:', error);
      toast.error('Erro ao salvar informações do estúdio');
    } finally {
      setSavingStudioInfo(false);
    }
  };

  // Carregar agendamentos (sempre todos — filtros por aba são client-side)
  useEffect(() => {
    if (!error) {
      loadAppointments();
      loadProRevenueRank();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carregar horários disponíveis
  const loadAvailableHours = async () => {
    try {
      setLoadingHours(true);
      let query = supabase
        .from('available_hours')
        .select('*, professionals:professional_id(id, name)')
        .not('professional_id', 'is', null) // Apenas horários com profissional específica
        .order('time');

      if (hoursProfessionalFilter !== 'all') {
        query = query.eq('professional_id', hoursProfessionalFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Error loading hours:', queryError);
        toast.error(`Erro ao carregar horários: ${queryError.message}`);
        setAvailableHours([]);
      } else {
        setAvailableHours(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading hours:', err);
      toast.error('Erro ao carregar horários');
      setAvailableHours([]);
    } finally {
      setLoadingHours(false);
    }
  };

  // Carregar horários quando a aba é selecionada ou filtro muda
  useEffect(() => {
    loadAvailableHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoursProfessionalFilter]);

  // Carregar bloqueios de agenda
  const loadBlockedSlots = async () => {
    try {
      setLoadingBlocked(true);
      let query = supabase
        .from('blocked_slots')
        .select('*, professionals:professional_id(id, name)')
        .order('blocked_date', { ascending: true })
        .order('blocked_time', { ascending: true });

      if (blockedProfessionalFilter !== 'all') {
        query = query.eq('professional_id', blockedProfessionalFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Error loading blocked slots:', queryError);
        toast.error(`Erro ao carregar bloqueios: ${queryError.message}`);
        setBlockedSlots([]);
      } else {
        setBlockedSlots(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading blocked slots:', err);
      toast.error('Erro ao carregar bloqueios');
      setBlockedSlots([]);
    } finally {
      setLoadingBlocked(false);
    }
  };

  // Carregar bloqueios quando a aba é selecionada ou filtro muda
  useEffect(() => {
    loadBlockedSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedProfessionalFilter]);

  const handleAddBlocked = async () => {
    if (!newBlocked.professionalId || !newBlocked.date) {
      toast.error('Preencha a profissional e a data');
      return;
    }

    const blockedData: any = {
      professional_id: newBlocked.professionalId,
      blocked_date: newBlocked.date,
      reason: newBlocked.reason || null,
    };

    // Se foi selecionado horário específico, adicionar ao bloqueio
    if (newBlocked.time && newBlocked.time !== 'all-day') {
      blockedData.blocked_time = newBlocked.time;
    }
    // Se não foi selecionado horário (all-day), blocked_time fica NULL (bloqueia dia inteiro)

    const { error } = await supabase
      .from('blocked_slots')
      .insert(blockedData);

    if (error) {
      console.error('Error adding blocked slot:', error);
      toast.error(`Erro ao adicionar bloqueio: ${error.message}`);
    } else {
      toast.success('Bloqueio adicionado!');
      setIsBlockedDialogOpen(false);
      setNewBlocked({ date: '', time: '', professionalId: '', reason: '' });
      loadBlockedSlots();
    }
  };

  const handleDeleteBlocked = async (blockedId: string) => {
    if (!confirm('Tem certeza que deseja remover este bloqueio?')) {
      return;
    }

    const { error } = await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', blockedId);

    if (error) {
      console.error('Error deleting blocked slot:', error);
      toast.error('Erro ao remover bloqueio');
    } else {
      toast.success('Bloqueio removido!');
      loadBlockedSlots();
    }
  };

  const loadServices = async (professionalId: string) => {
    try {
      setLoadingServices(true);
      let query = supabase
        .from('services')
        .select('*, professionals:professional_id (id, name)')
        .order('name');

      if (professionalId && professionalId !== 'all') {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        console.error('Error loading services:', queryError);
        toast.error(`Erro ao carregar serviços: ${queryError.message}`);
        setServices([]);
      } else {
        setServices(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading services:', err);
      toast.error('Erro inesperado ao carregar serviços');
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadAppointments = async () => {
    try {
      setLoadingAppointments(true);
      setError(null);

      try {
        await supabase.rpc('expire_stale_leads');
      } catch (e) {
        console.warn('expire_stale_leads:', e);
      }
      
      const { data, error: queryError } = await supabase
        .from('appointments')
        .select(`
          *,
          professionals:professional_id (name, phone),
          services:service_id (name, price, duration, sinal_fixo)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (queryError) {
        console.error('Error loading appointments:', queryError);
        setError(`Erro ao carregar agendamentos: ${queryError.message}`);
        toast.error('Erro ao carregar agendamentos');
        setAppointments([]);
      } else {
        setAppointments(data || []);
      }
    } catch (err: any) {
      console.error('Unexpected error loading appointments:', err);
      setError(`Erro inesperado: ${err?.message || 'Erro desconhecido'}`);
      toast.error('Erro ao carregar agendamentos');
      setAppointments([]);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const loadProRevenueRank = async () => {
    try {
      const from = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const to = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('professional_id, amount, professionals:professional_id(name)')
        .eq('entry_type', 'income')
        .gte('entry_date', from)
        .lte('entry_date', to);

      if (error) throw error;
      const map = new Map<string, { id: string; name: string; total: number }>();
      for (const row of data || []) {
        const id = row.professional_id || 'none';
        const name = (row.professionals as { name?: string } | null)?.name || 'Sem profissional';
        const prev = map.get(id) || { id, name, total: 0 };
        prev.total += Number(row.amount) || 0;
        map.set(id, prev);
      }
      setProRevenueRank(Array.from(map.values()).sort((a, b) => b.total - a.total));
    } catch (e) {
      console.warn('ranking:', e);
      setProRevenueRank([]);
    }
  };

  const handleUploadPhoto = async (file: File) => {
    if (!file) return null;

    setUploadingPhoto(true);
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `professionals/${fileName}`;

      // Fazer upload para Supabase Storage
      // Nota: O nome do bucket deve corresponder exatamente ao criado no Supabase
      // Se você executou o SQL com 'professional-photos', use esse nome
      // Se o bucket foi criado como "PROFESSIONAL-PHOTOS" (maiúsculas), use esse
      // Se foi criado como "fotos profissionais" (com espaço), use esse
      const bucketName = 'professional-photos'; // Nome usado nas políticas SQL
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        toast.error('Erro ao fazer upload da foto');
        return null;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      toast.success('Foto enviada com sucesso!');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleUploadServicePhoto = async (file: File) => {
    if (!file) return null;

    setUploadingServicePhoto(true);
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `services/${fileName}`;

      // Usar o mesmo bucket ou criar um específico para serviços
      const bucketName = 'professional-photos'; // Pode criar um bucket separado depois
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Error uploading service photo:', uploadError);
        toast.error('Erro ao fazer upload da foto');
        return null;
      }

      // Obter URL pública da imagem
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      toast.success('Foto enviada com sucesso!');
      return publicUrl;
    } catch (error) {
      console.error('Error uploading service photo:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    } finally {
      setUploadingServicePhoto(false);
    }
  };

  const handleAddProfessional = async () => {
    if (!newProfessional.name || !newProfessional.specialty || !newProfessional.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const professionalData: any = {
      name: newProfessional.name,
      specialty: newProfessional.specialty,
      phone: newProfessional.phone,
      photo_url: newProfessional.photo_url.trim() || null,
      is_active: newProfessional.is_active !== false,
    };

    if (newProfessional.sinal_padrao && parseFloat(newProfessional.sinal_padrao) > 0) {
      professionalData.sinal_padrao = parseFloat(newProfessional.sinal_padrao);
    }
    if (newProfessional.commission_percent !== '' && !Number.isNaN(parseFloat(newProfessional.commission_percent))) {
      professionalData.commission_percent = parseFloat(newProfessional.commission_percent);
    }

    const { error } = await supabase
      .from('professionals')
      .insert(professionalData);

    if (error) {
      console.error('Error adding professional:', error);
      toast.error('Erro ao adicionar profissional');
    } else {
      toast.success(`Profissional "${newProfessional.name}" adicionada!`);
      setNewProfessional({
        name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '',
        is_active: true, commission_percent: '',
      });
      setPhotoPreview(null);
      setIsDialogOpen(false);
      window.location.reload();
    }
  };

  const handleUpdateProfessional = async () => {
    if (!editingProfessional) return;

    const professionalData: any = {
      name: editingProfessional.name,
      specialty: editingProfessional.specialty,
      phone: editingProfessional.phone,
      photo_url: editingProfessional.photo_url?.trim() || null,
      is_active: editingProfessional.is_active !== false,
    };

    if (editingProfessional.sinal_padrao && parseFloat(editingProfessional.sinal_padrao) > 0) {
      professionalData.sinal_padrao = parseFloat(editingProfessional.sinal_padrao);
    } else {
      professionalData.sinal_padrao = null;
    }

    if (
      editingProfessional.commission_percent !== '' &&
      editingProfessional.commission_percent != null &&
      !Number.isNaN(parseFloat(String(editingProfessional.commission_percent)))
    ) {
      professionalData.commission_percent = parseFloat(String(editingProfessional.commission_percent));
    } else {
      professionalData.commission_percent = null;
    }

    const { error } = await supabase
      .from('professionals')
      .update(professionalData)
      .eq('id', editingProfessional.id);

    if (error) {
      console.error('Error updating professional:', error);
      toast.error('Erro ao atualizar profissional');
    } else {
      toast.success('Profissional atualizada!');
      setEditingProfessional(null);
      window.location.reload();
    }
  };

  const handleDeleteProfessional = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta profissional?')) return;

    const { error } = await supabase
      .from('professionals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao excluir profissional');
    } else {
      toast.success('Profissional excluída!');
      window.location.reload();
    }
  };

  const handleAddService = async () => {
    const professionalId = serviceFormProfessional || (servicesProfessionalFilter !== 'all' ? servicesProfessionalFilter : '');
    
    // Validação mais detalhada
    if (!professionalId) {
      toast.error('Selecione uma profissional');
      return;
    }
    
    if (!newService.name || !newService.name.trim()) {
      toast.error('Preencha o nome do serviço');
      return;
    }
    
    if (!newService.price || parseFloat(newService.price) <= 0) {
      toast.error('Preencha um valor válido');
      return;
    }
    
    if (!newService.duration || parseInt(newService.duration) <= 0) {
      toast.error('Preencha uma duração válida');
      return;
    }

    const serviceData: any = {
      professional_id: professionalId,
      name: newService.name.trim(),
      price: parseFloat(newService.price),
      duration: parseInt(newService.duration),
      allow_full_payment: newService.allow_full_payment || false,
      is_featured: newService.is_featured || false,
      display_order: parseInt(newService.display_order) || 0,
      is_active: true,
    };

    // Se sinal_fixo foi preenchido, adicionar ao objeto
    if (newService.sinal_fixo && parseFloat(newService.sinal_fixo) > 0) {
      serviceData.sinal_fixo = parseFloat(newService.sinal_fixo);
    }

    // Campos de catálogo
    if (newService.category_id && newService.category_id !== 'none' && newService.category_id !== '') {
      serviceData.category_id = newService.category_id;
    } else {
      serviceData.category_id = null;
    }
    if (newService.short_description?.trim()) {
      serviceData.short_description = newService.short_description.trim();
    }
    if (newService.description?.trim()) {
      serviceData.description = newService.description.trim();
    }
    if (newService.photo_url?.trim()) {
      serviceData.photo_url = newService.photo_url.trim();
    } else {
      serviceData.photo_url = null;
    }

    console.log('Inserindo serviço:', serviceData);

    const { data, error } = await supabase
      .from('services')
      .insert(serviceData)
      .select();

    if (error) {
      console.error('Error adding service:', error);
      toast.error(`Erro ao adicionar serviço: ${error.message || 'Erro desconhecido'}`);
    } else {
      console.log('Serviço adicionado com sucesso:', data);
      toast.success(`Serviço "${newService.name}" adicionado!`);
      setNewService({ 
        name: '', 
        price: '', 
        duration: '', 
        allow_full_payment: false, 
        sinal_fixo: '',
        category_id: '',
        short_description: '',
        description: '',
        is_featured: false,
        display_order: '0'
      });
      setServiceFormProfessional('');
      setIsServiceDialogOpen(false);
      loadServices(servicesProfessionalFilter);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    const serviceData: any = {
      name: editingService.name,
      price: parseFloat(editingService.price),
      duration: parseInt(editingService.duration),
      allow_full_payment: editingService.allow_full_payment || false,
      is_featured: editingService.is_featured || false,
      display_order: parseInt(editingService.display_order) || 0,
      is_active: editingService.is_active !== false,
    };

    // Se sinal_fixo foi preenchido, adicionar ao objeto
    if (editingService.sinal_fixo && parseFloat(editingService.sinal_fixo) > 0) {
      serviceData.sinal_fixo = parseFloat(editingService.sinal_fixo);
    } else {
      serviceData.sinal_fixo = null;
    }

    // Campos de catálogo
    if (editingService.category_id && editingService.category_id !== 'none' && editingService.category_id !== '') {
      serviceData.category_id = editingService.category_id;
    } else {
      serviceData.category_id = null;
    }
    if (editingService.short_description?.trim()) {
      serviceData.short_description = editingService.short_description.trim();
    } else {
      serviceData.short_description = null;
    }
    if (editingService.description?.trim()) {
      serviceData.description = editingService.description.trim();
    } else {
      serviceData.description = null;
    }
    if (editingService.photo_url?.trim()) {
      serviceData.photo_url = editingService.photo_url.trim();
    } else {
      serviceData.photo_url = null;
    }

    const { error } = await supabase
      .from('services')
      .update(serviceData)
      .eq('id', editingService.id);

    if (error) {
      console.error('Error updating service:', error);
      toast.error('Erro ao atualizar serviço');
    } else {
      toast.success('Serviço atualizado!');
      setEditingService(null);
      loadServices(servicesProfessionalFilter);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      toast.error('Erro ao excluir serviço');
    } else {
      toast.success('Serviço excluído!');
      loadServices(servicesProfessionalFilter);
    }
  };

  // Criar agendamento manual
  const handleAddManualAppointment = async () => {
    if (!newManualAppointment.client_name.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }
    if (!newManualAppointment.client_phone.trim()) {
      toast.error('Telefone do cliente é obrigatório');
      return;
    }
    if (!newManualAppointment.professional_id) {
      toast.error('Selecione uma profissional');
      return;
    }
    if (!newManualAppointment.service_id) {
      toast.error('Selecione um serviço');
      return;
    }
    if (!newManualAppointment.appointment_date) {
      toast.error('Selecione uma data');
      return;
    }
    if (!newManualAppointment.appointment_time) {
      toast.error('Selecione um horário');
      return;
    }
    if (!newManualAppointment.total_amount || parseFloat(newManualAppointment.total_amount) <= 0) {
      toast.error('Valor total deve ser maior que zero');
      return;
    }

    setLoadingManualAppointment(true);
    try {
      const dateStr = newManualAppointment.appointment_date; // Já vem no formato YYYY-MM-DD do input type="date"
      
      // Verificar se já existe agendamento (a menos que force_override esteja marcado)
      if (!newManualAppointment.force_override) {
        const { data: existingAppointment, error: checkError } = await supabase
          .from('appointments')
          .select('id, client_name, appointment_time')
          .eq('professional_id', newManualAppointment.professional_id)
          .eq('appointment_date', dateStr)
          .eq('appointment_time', newManualAppointment.appointment_time)
          .in('status', ['pending', 'confirmed'])
          .maybeSingle();

        if (checkError) {
          throw new Error(`Erro ao verificar disponibilidade: ${checkError.message}`);
        }

        if (existingAppointment) {
          toast.error(
            `Este horário já está ocupado. Marque "Forçar criação" se deseja criar mesmo assim.`
          );
          setLoadingManualAppointment(false);
          return;
        }
      }

      // Se email foi fornecido, salvar na tabela de clientes
      if (newManualAppointment.client_email?.trim()) {
        const { error: emailError } = await supabase
          .from('clients')
          .upsert({
            phone: newManualAppointment.client_phone.trim(),
            email: newManualAppointment.client_email.trim(),
            name: newManualAppointment.client_name.trim()
          }, {
            onConflict: 'phone'
          });

        if (emailError) {
          console.error('Erro ao salvar email do cliente:', emailError);
        }
      }

      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          client_name: newManualAppointment.client_name.trim(),
          client_phone: newManualAppointment.client_phone.trim(),
          client_email: newManualAppointment.client_email?.trim() || null,
          professional_id: newManualAppointment.professional_id,
          service_id: newManualAppointment.service_id,
          appointment_date: dateStr,
          appointment_time: newManualAppointment.appointment_time,
          payment_type: 'sinal', // Agendamentos manuais sempre são sinal
          total_amount: parseFloat(newManualAppointment.total_amount),
          amount_paid: parseFloat(newManualAppointment.amount_paid || '0'),
          status: newManualAppointment.status,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
          throw new Error('Este horário já está ocupado. Marque "Forçar criação" se deseja criar mesmo assim.');
        }
        throw error;
      }

      toast.success('Agendamento criado com sucesso!');
      setIsManualAppointmentDialogOpen(false);
      setNewManualAppointment({
        client_name: '',
        client_phone: '',
        client_email: '',
        professional_id: '',
        service_id: '',
        appointment_date: '',
        appointment_time: '',
        status: 'confirmed',
        total_amount: '',
        amount_paid: '',
        force_override: false
      });
      setManualAppointmentServices([]);
      loadAppointments();
    } catch (err: any) {
      console.error('Error creating manual appointment:', err);
      toast.error(`Erro ao criar agendamento: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setLoadingManualAppointment(false);
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating appointment:', error);
      toast.error('Erro ao atualizar agendamento');
    } else {
      toast.success('Status atualizado!');
      loadAppointments();
    }
  };

  const handleDiscardLead = async (id: string) => {
    if (!confirm('Descartar este lead? O horário será liberado na agenda.')) return;
    await handleUpdateAppointmentStatus(id, 'cancelled');
  };

  const handleResendPaymentWhatsApp = async (lead: Appointment) => {
    setResendingLeadId(lead.id);
    try {
      const service = lead.services;
      const professional = lead.professionals;
      const sinalFixo = service?.sinal_fixo;
      const amount =
        lead.payment_type === 'sinal'
          ? (sinalFixo && Number(sinalFixo) > 0
              ? Number(sinalFixo)
              : Number(lead.total_amount) * 0.3)
          : Number(lead.total_amount);

      let paymentUrl = lead.payment_link_url || null;

      const { data, error } = await supabase.functions.invoke('create-payment-mp', {
        body: {
          appointmentId: lead.id,
          clientName: lead.client_name,
          clientEmail: lead.client_email || undefined,
          clientPhone: lead.client_phone,
          serviceName: service?.name || 'Serviço',
          amount: Math.round(amount * 100) / 100,
          paymentType: lead.payment_type || 'sinal',
          professionalName: professional?.name || '',
          appointmentDate: lead.appointment_date,
          appointmentTime: lead.appointment_time,
        },
      });

      if (!error && data?.initPoint) {
        paymentUrl = data.initPoint;
        await supabase
          .from('appointments')
          .update({
            payment_link_url: paymentUrl,
            mercado_pago_preference_id: data.preferenceId || null,
          })
          .eq('id', lead.id);
      }

      const msg = paymentReminderMessage({
        clientName: lead.client_name,
        serviceName: service?.name || 'serviço',
        date: formatDateString(lead.appointment_date),
        time: lead.appointment_time,
        amount,
        paymentUrl,
      });

      window.open(whatsappUrl(lead.client_phone, msg), '_blank', 'noopener,noreferrer');
      toast.success(paymentUrl ? 'WhatsApp aberto com link de pagamento' : 'WhatsApp aberto (gere o PIX se o link falhar)');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reenviar link de pagamento');
    } finally {
      setResendingLeadId(null);
    }
  };

  const openPaymentDialog = (apt: Appointment) => {
    const restante = Math.max(0, Number(apt.total_amount) - Number(apt.amount_paid));
    setPaymentAppointment(apt);
    setPaymentAmount(restante > 0 ? restante.toFixed(2) : '');
    setPaymentDialogOpen(true);
  };

  const handleMarkRemainingPaid = async () => {
    if (!remainingConfirmApt) return;
    const total = Number(remainingConfirmApt.total_amount) || 0;
    const paid = Number(remainingConfirmApt.amount_paid) || 0;
    const restante = Math.max(0, total - paid);
    if (restante <= 0.009) {
      toast.error('Este agendamento já está totalmente pago');
      setRemainingConfirmApt(null);
      return;
    }

    setSavingRemaining(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          amount_paid: total,
          status: remainingConfirmApt.status === 'cancelled' ? remainingConfirmApt.status : 'completed',
        })
        .eq('id', remainingConfirmApt.id)
        .lt('amount_paid', total); // idempotência: só atualiza se ainda houver restante

      if (error) throw error;

      toast.success(`Restante de R$ ${restante.toFixed(2)} registrado no Caixa`);
      setRemainingConfirmApt(null);
      loadAppointments();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao marcar restante como pago');
    } finally {
      setSavingRemaining(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!paymentAppointment) return;
    const value = parseFloat(paymentAmount.replace(',', '.'));
    if (!value || value <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }

    const currentPaid = Number(paymentAppointment.amount_paid) || 0;
    const total = Number(paymentAppointment.total_amount) || 0;
    const newPaid = Math.min(currentPaid + value, total > 0 ? total : currentPaid + value);
    const fullyPaid = total > 0 && newPaid >= total;

    setSavingPayment(true);
    try {
      const updatePayload: Record<string, unknown> = { amount_paid: newPaid };
      if (fullyPaid && paymentAppointment.status !== 'cancelled') {
        updatePayload.status = 'completed';
      } else if (newPaid > 0 && paymentAppointment.status === 'pending') {
        updatePayload.status = 'confirmed';
      }

      const { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', paymentAppointment.id);

      if (error) throw error;

      toast.success(
        fullyPaid
          ? 'Pagamento total registrado! Entrada criada no Caixa.'
          : 'Pagamento registrado! Entrada criada no Caixa.',
      );
      setPaymentDialogOpen(false);
      setPaymentAppointment(null);
      loadAppointments();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar pagamento');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSendEmail = async (appointmentId: string) => {
    setSendingEmail(appointmentId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Email enviado com sucesso!');
        loadAppointments(); // Recarregar para atualizar status
      } else {
        toast.error(data.error || 'Erro ao enviar email');
      }
    } catch (err: any) {
      console.error('Unexpected error sending email:', err);
      toast.error(`Erro ao enviar email: ${err?.message || 'Erro desconhecido'}`);
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-800' },
      completed: { label: 'Concluído', className: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // Separar agendamentos confirmados (para aba Agenda) e leads (para aba Leads)
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'completed');
  const leadAppointments = appointments.filter(a => a.status === 'pending');
  
  const filteredAppointments = scheduleProfessionalFilter && scheduleProfessionalFilter !== 'all'
    ? confirmedAppointments.filter(a => a.professional_id === scheduleProfessionalFilter)
    : confirmedAppointments;
    
  const filteredLeads = leadsProfessionalFilter && leadsProfessionalFilter !== 'all'
    ? leadAppointments.filter(a => a.professional_id === leadsProfessionalFilter)
    : leadAppointments;

  // Conversão lead → pago (últimos 30 dias por created_at)
  const leadsConversion = (() => {
    const cutoff = Date.now() - 30 * 86400000;
    const recent = appointments.filter((a) => new Date(a.created_at).getTime() >= cutoff);
    const startedAsLead = recent.length; // todos começam pending; usamos todos criados
    const converted = recent.filter((a) => a.status === 'confirmed' || a.status === 'completed').length;
    const lost = recent.filter((a) => a.status === 'cancelled').length;
    const pending = recent.filter((a) => a.status === 'pending').length;
    const rate = startedAsLead > 0 ? Math.round((converted / startedAsLead) * 100) : 0;
    return { startedAsLead, converted, lost, pending, rate };
  })();

  const clientStats = (() => {
    const byPhone = new Map<string, {
      name: string;
      phone: string;
      count: number;
      ltv: number;
      lastDate: string;
      phones: Set<string>;
    }>();

    for (const apt of appointments) {
      if (clientsProfessionalFilter !== 'all' && apt.professional_id !== clientsProfessionalFilter) continue;
      const key = normalizePhoneDigits(apt.client_phone);
      const prev = byPhone.get(key) || {
        name: apt.client_name,
        phone: apt.client_phone,
        count: 0,
        ltv: 0,
        lastDate: apt.appointment_date,
        phones: new Set<string>(),
      };
      prev.count += 1;
      prev.ltv += Number(apt.amount_paid) || 0;
      if (apt.appointment_date > prev.lastDate) prev.lastDate = apt.appointment_date;
      prev.phones.add(apt.client_phone);
      if (apt.client_name) prev.name = apt.client_name;
      byPhone.set(key, prev);
    }

    return Array.from(byPhone.values())
      .map((c) => ({
        ...c,
        daysAway: daysSince(c.lastDate),
        duplicatePhones: c.phones.size > 1,
      }))
      .filter((client) => {
        if (!clientsSearch.trim()) return true;
        const q = clientsSearch.trim().toLowerCase();
        return (
          client.name.toLowerCase().includes(q) ||
          client.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
        );
      })
      .sort((a, b) => b.ltv - a.ltv);
  })();

  const uniqueClients = clientStats;

  // Mostrar loading inicial
  if (loadingProfessionals && professionals.length === 0) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando área administrativa...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Mostrar erro se houver
  if (error && !loadingAppointments && !loadingProfessionals) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-destructive">Erro ao Carregar Admin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">{error}</p>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Possíveis soluções:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Verifique se o arquivo .env.local está configurado corretamente</li>
                    <li>Certifique-se de que executou o script setup.sql no Supabase</li>
                    <li>Verifique se as tabelas foram criadas no Supabase</li>
                    <li>Reinicie o servidor após alterar variáveis de ambiente</li>
                  </ul>
                </div>
                <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-2">
              Área Administrativa
            </h1>
            <p className="text-muted-foreground">Gerencie profissionais, serviços e agendamentos</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = '/admin/login';
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="schedule" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Agenda</span>
                <span className="xs:hidden">Ag.</span>
              </TabsTrigger>
              <TabsTrigger value="leads" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <UserCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Leads</span>
                <span className="xs:hidden">Ld.</span>
              </TabsTrigger>
              <TabsTrigger value="professionals" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Profissionais</span>
                <span className="xs:hidden">Prof.</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Scissors className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Serviços</span>
                <span className="xs:hidden">Serv.</span>
              </TabsTrigger>
              <TabsTrigger value="hours" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Horários</span>
                <span className="xs:hidden">Hor.</span>
              </TabsTrigger>
              <TabsTrigger value="blocked" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Ban className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Bloqueios</span>
                <span className="xs:hidden">Bloq.</span>
              </TabsTrigger>
              <TabsTrigger value="clients" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <List className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Clientes</span>
                <span className="xs:hidden">Cli.</span>
              </TabsTrigger>
              <TabsTrigger value="studio" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Estúdio</span>
                <span className="xs:hidden">Est.</span>
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Caixa</span>
                <span className="xs:hidden">Cx.</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab: Agenda */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Agenda</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={scheduleProfessionalFilter} onValueChange={setScheduleProfessionalFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todas as profissionais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as profissionais</SelectItem>
                      {professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-md border overflow-hidden">
                    <Button
                      type="button"
                      variant={agendaView === 'table' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setAgendaView('table')}
                    >
                      Lista
                    </Button>
                    <Button
                      type="button"
                      variant={agendaView === 'calendar' ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-none"
                      onClick={() => setAgendaView('calendar')}
                    >
                      Calendário
                    </Button>
                  </div>
                  <Button onClick={loadAppointments} variant="outline" size="sm">
                    Atualizar
                  </Button>
                  <Dialog open={isManualAppointmentDialogOpen} onOpenChange={setIsManualAppointmentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Agendamento
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Adicionar Agendamento Manual</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="manual-client-name">Nome do Cliente *</Label>
                            <Input
                              id="manual-client-name"
                              value={newManualAppointment.client_name}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, client_name: e.target.value })}
                              placeholder="Nome completo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-client-phone">Telefone *</Label>
                            <Input
                              id="manual-client-phone"
                              value={newManualAppointment.client_phone}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, client_phone: e.target.value })}
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="manual-client-email">Email (opcional)</Label>
                            <Input
                              id="manual-client-email"
                              type="email"
                              value={newManualAppointment.client_email}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, client_email: e.target.value })}
                              placeholder="cliente@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-professional">Profissional *</Label>
                            <Select
                              value={newManualAppointment.professional_id}
                              onValueChange={(value) => setNewManualAppointment({ ...newManualAppointment, professional_id: value, service_id: '' })}
                            >
                              <SelectTrigger id="manual-professional">
                                <SelectValue placeholder="Selecione uma profissional" />
                              </SelectTrigger>
                              <SelectContent>
                                {professionals.map((pro) => (
                                  <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-service">Serviço *</Label>
                            <Select
                              value={newManualAppointment.service_id}
                              onValueChange={(value) => {
                                const service = manualAppointmentServices.find(s => s.id === value);
                                setNewManualAppointment({
                                  ...newManualAppointment,
                                  service_id: value,
                                  total_amount: service ? service.price.toString() : ''
                                });
                              }}
                              disabled={!newManualAppointment.professional_id || manualAppointmentServices.length === 0}
                            >
                              <SelectTrigger id="manual-service">
                                <SelectValue placeholder={!newManualAppointment.professional_id ? "Selecione primeiro a profissional" : "Selecione um serviço"} />
                              </SelectTrigger>
                              <SelectContent>
                                {manualAppointmentServices.map((service) => (
                                  <SelectItem key={service.id} value={service.id}>
                                    {service.name} - R$ {parseFloat(service.price).toFixed(2)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-date">Data *</Label>
                            <Input
                              id="manual-date"
                              type="date"
                              value={newManualAppointment.appointment_date}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, appointment_date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-time">Horário *</Label>
                            <Input
                              id="manual-time"
                              type="time"
                              value={newManualAppointment.appointment_time}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, appointment_time: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-status">Status *</Label>
                            <Select
                              value={newManualAppointment.status}
                              onValueChange={(value: 'pending' | 'confirmed' | 'completed' | 'cancelled') => setNewManualAppointment({ ...newManualAppointment, status: value })}
                            >
                              <SelectTrigger id="manual-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="confirmed">Confirmado</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-total-amount">Valor Total (R$) *</Label>
                            <Input
                              id="manual-total-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={newManualAppointment.total_amount}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, total_amount: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-amount-paid">Valor Pago (R$)</Label>
                            <Input
                              id="manual-amount-paid"
                              type="number"
                              step="0.01"
                              min="0"
                              value={newManualAppointment.amount_paid}
                              onChange={(e) => setNewManualAppointment({ ...newManualAppointment, amount_paid: e.target.value })}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="force-override"
                            checked={newManualAppointment.force_override}
                            onCheckedChange={(checked) => setNewManualAppointment({ ...newManualAppointment, force_override: checked as boolean })}
                          />
                          <Label htmlFor="force-override" className="text-sm cursor-pointer">
                            Forçar criação mesmo se o horário estiver ocupado
                          </Label>
                        </div>
                      </div>
                      <DialogFooter className="mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setIsManualAppointmentDialogOpen(false)}
                          disabled={loadingManualAppointment}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleAddManualAppointment}
                          disabled={loadingManualAppointment}
                        >
                          {loadingManualAppointment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Criar Agendamento'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : agendaView === 'calendar' ? (
                  <AgendaCalendar
                    appointments={filteredAppointments}
                    professionals={professionals}
                    onRefresh={loadAppointments}
                  />
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data</TableHead>
                          <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                          <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Serviço</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">Pagamento</TableHead>
                          <TableHead className="text-xs sm:text-sm">Status</TableHead>
                          <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAppointments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Nenhum agendamento encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAppointments.map((apt) => {
                            const service = apt.services;
                            const professional = apt.professionals;
                            const restante = apt.total_amount - apt.amount_paid;
                            
                            return (
                              <TableRow key={apt.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  {formatDateString(apt.appointment_date)}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{apt.appointment_time}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-xs sm:text-sm">{apt.client_name}</p>
                                    <a
                                      href={`https://wa.me/55${apt.client_phone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="h-3 w-3" />
                                      {apt.client_phone}
                                    </a>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div>
                                    <p className="font-medium text-xs sm:text-sm">{service?.name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {professional?.name || 'N/A'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="text-xs sm:text-sm">
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>Pago: R$ {Number(apt.amount_paid).toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Total: R$ {Number(apt.total_amount).toFixed(2)}
                                    </div>
                                    {apt.payment_type === 'sinal' && restante > 0 && (
                                      <div className="text-xs text-orange-600">
                                        Restante: R$ {restante.toFixed(2)}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {apt.payment_type === 'sinal' ? 'Sinal (PIX)' : 'Total'}
                                    {(Number(apt.total_amount) - Number(apt.amount_paid)) > 0.009 && apt.payment_type !== 'sinal' && (
                                      <div className="text-xs text-orange-600">
                                        Restante: R$ {(Number(apt.total_amount) - Number(apt.amount_paid)).toFixed(2)}
                                      </div>
                                    )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="space-y-1">
                                    {getStatusBadge(apt.status)}
                                    {apt.email_confirmed && (
                                      <div className="flex items-center gap-1 text-xs text-green-600">
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Confirmado via email</span>
                                      </div>
                                    )}
                                    {apt.email_confirmation_sent && !apt.email_confirmed && apt.status === 'pending' && (
                                      <div className="flex items-center gap-1 text-xs text-yellow-600">
                                        <Mail className="h-3 w-3" />
                                        <span>Aguardando confirmação</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                                    <Select
                                      value={apt.status}
                                      onValueChange={(value) => handleUpdateAppointmentStatus(apt.id, value)}
                                    >
                                      <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="confirmed">Confirmado</SelectItem>
                                        <SelectItem value="completed">Concluído</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    {restante > 0.009 && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          className="text-xs gap-1"
                                          onClick={() => setRemainingConfirmApt(apt)}
                                          title="Marcar restante como pago"
                                        >
                                          <DollarSign className="h-3 w-3" />
                                          Marcar restante pago
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-xs gap-1"
                                          onClick={() => openPaymentDialog(apt)}
                                          title="Registrar pagamento parcial"
                                        >
                                          Pagar parcial
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Leads */}
          <TabsContent value="leads">
            <Card>
              <CardHeader className="flex flex-col gap-4">
                <div className="flex flex-row items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="font-serif">Leads (Clientes que não pagaram)</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leads sem pagamento expiram automaticamente (prazo em Informações do Estúdio) e liberam o horário.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Select value={leadsProfessionalFilter} onValueChange={setLeadsProfessionalFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todas as profissionais" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as profissionais</SelectItem>
                        {professionals.map((pro) => (
                          <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={loadAppointments} variant="outline" size="sm">
                      Atualizar
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Conversão (30 dias)</p>
                    <p className="text-2xl font-semibold text-emerald-600">{leadsConversion.rate}%</p>
                    <p className="text-[11px] text-muted-foreground">lead → pago/confirmado</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Convertidos</p>
                    <p className="text-2xl font-semibold">{leadsConversion.converted}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Perdidos / cancelados</p>
                    <p className="text-2xl font-semibold text-rose-600">{leadsConversion.lost}</p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Aguardando agora</p>
                    <p className="text-2xl font-semibold text-amber-600">{leadsConversion.pending}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data</TableHead>
                          <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                          <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Serviço</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">Valor</TableHead>
                          <TableHead className="text-xs sm:text-sm">Expira em</TableHead>
                          <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              Nenhum lead encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredLeads.map((lead) => {
                            const service = lead.services;
                            const professional = lead.professionals;
                            
                            return (
                              <TableRow key={lead.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  {formatDateString(lead.appointment_date)}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">{lead.appointment_time}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-xs sm:text-sm">{lead.client_name}</p>
                                    <a
                                      href={whatsappUrl(lead.client_phone)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="h-3 w-3" />
                                      {lead.client_phone}
                                    </a>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <div>
                                    <p className="font-medium text-xs sm:text-sm">{service?.name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {professional?.name || 'N/A'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <div className="text-xs sm:text-sm">
                                    <div className="flex items-center gap-1">
                                      <DollarSign className="h-3 w-3" />
                                      <span>Total: R$ {Number(lead.total_amount).toFixed(2)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {lead.payment_type === 'sinal' ? 'Sinal (PIX)' : 'Total (Cartão)'}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm">
                                  <span className={
                                    lead.lead_expires_at && new Date(lead.lead_expires_at).getTime() < Date.now()
                                      ? 'text-rose-600'
                                      : 'text-amber-700'
                                  }>
                                    {formatCountdown(lead.lead_expires_at)}
                                  </span>
                                  <div className="text-[10px] text-muted-foreground">
                                    criado {format(new Date(lead.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="text-xs gap-1"
                                      disabled={resendingLeadId === lead.id}
                                      onClick={() => handleResendPaymentWhatsApp(lead)}
                                    >
                                      {resendingLeadId === lead.id
                                        ? <Loader2 className="h-3 w-3 animate-spin" />
                                        : <MessageCircle className="h-3 w-3" />}
                                      Reenviar pagamento
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-xs gap-1 text-destructive"
                                      onClick={() => handleDiscardLead(lead.id)}
                                    >
                                      <Ban className="h-3 w-3" />
                                      Descartar
                                    </Button>
                                    <Select
                                      value={lead.status}
                                      onValueChange={(value) => handleUpdateAppointmentStatus(lead.id, value)}
                                    >
                                      <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="confirmed">Confirmado</SelectItem>
                                        <SelectItem value="completed">Concluído</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Profissionais */}
          <TabsContent value="professionals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif">Profissionais Cadastradas</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                      <DialogTitle>
                        {editingProfessional ? 'Editar Profissional' : 'Nova Profissional'}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="pro-name">Nome *</Label>
                        <Input
                          id="pro-name"
                          value={editingProfessional?.name || newProfessional.name}
                          onChange={(e) => 
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, name: e.target.value })
                              : setNewProfessional({ ...newProfessional, name: e.target.value })
                          }
                          placeholder="Nome da profissional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-specialty">Especialidade *</Label>
                        <Input
                          id="pro-specialty"
                          value={editingProfessional?.specialty || newProfessional.specialty}
                          onChange={(e) => 
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, specialty: e.target.value })
                              : setNewProfessional({ ...newProfessional, specialty: e.target.value })
                          }
                          placeholder="Ex: Especialista em Cílios"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-phone">Telefone *</Label>
                        <Input
                          id="pro-phone"
                          value={editingProfessional?.phone || newProfessional.phone}
                          onChange={(e) => 
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, phone: e.target.value })
                              : setNewProfessional({ ...newProfessional, phone: e.target.value })
                          }
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-sinal-padrao">Sinal Padrão (R$) - Opcional</Label>
                        <Input
                          id="pro-sinal-padrao"
                          type="number"
                          step="0.01"
                          value={editingProfessional?.sinal_padrao || newProfessional.sinal_padrao}
                          onChange={(e) => 
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, sinal_padrao: e.target.value })
                              : setNewProfessional({ ...newProfessional, sinal_padrao: e.target.value })
                          }
                          placeholder="Ex: 50.00"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor fixo de sinal para todos os serviços desta profissional. Se não preenchido, usa 30% do valor de cada serviço (ou o sinal_fixo do serviço).
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="pro-commission">Comissão (%)</Label>
                        <Input
                          id="pro-commission"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={
                            editingProfessional
                              ? (editingProfessional.commission_percent ?? '')
                              : newProfessional.commission_percent
                          }
                          onChange={(e) =>
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, commission_percent: e.target.value })
                              : setNewProfessional({ ...newProfessional, commission_percent: e.target.value })
                          }
                          placeholder="Ex: 40"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Percentual sobre as entradas do Caixa desta profissional (referência para fechar comissão).
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="pro-active"
                          checked={
                            editingProfessional
                              ? editingProfessional.is_active !== false
                              : newProfessional.is_active
                          }
                          onCheckedChange={(checked) =>
                            editingProfessional
                              ? setEditingProfessional({ ...editingProfessional, is_active: !!checked })
                              : setNewProfessional({ ...newProfessional, is_active: !!checked })
                          }
                        />
                        <Label htmlFor="pro-active" className="cursor-pointer">
                          Profissional ativa (aparece no agendamento público)
                        </Label>
                      </div>
                      <div>
                        <Label htmlFor="pro-photo">Foto da Profissional (opcional)</Label>
                        <div className="space-y-2">
                          {/* Preview da foto */}
                          {(photoPreview || editingProfessional?.photo_url || newProfessional.photo_url) && (
                            <div className="relative inline-block">
                              <img
                                src={photoPreview || editingProfessional?.photo_url || newProfessional.photo_url || ''}
                                alt="Preview"
                                className="w-24 h-24 rounded-full object-cover border-2 border-border"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                onClick={() => {
                                  setPhotoPreview(null);
                                  if (editingProfessional) {
                                    setEditingProfessional({ ...editingProfessional, photo_url: '' });
                                  } else {
                                    setNewProfessional({ ...newProfessional, photo_url: '' });
                                  }
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                          
                          {/* Upload de arquivo */}
                          <div className="flex gap-2">
                            <Input
                              id="pro-photo-file"
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                // Validar tamanho (máx 5MB)
                                if (file.size > 5 * 1024 * 1024) {
                                  toast.error('A imagem deve ter no máximo 5MB');
                                  return;
                                }

                                // Preview local
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPhotoPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);

                                // Upload para Supabase
                                const photoUrl = await handleUploadPhoto(file);
                                if (photoUrl) {
                                  if (editingProfessional) {
                                    setEditingProfessional({ ...editingProfessional, photo_url: photoUrl });
                                  } else {
                                    setNewProfessional({ ...newProfessional, photo_url: photoUrl });
                                  }
                                }
                              }}
                              disabled={uploadingPhoto}
                              className="flex-1"
                            />
                            {uploadingPhoto && (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            )}
                          </div>
                          
                          {/* Campo de URL manual (alternativa) */}
                          <div>
                            <Label htmlFor="pro-photo-url" className="text-xs text-muted-foreground">
                              Ou cole uma URL de imagem:
                            </Label>
                            <Input
                              id="pro-photo-url"
                              type="url"
                              value={editingProfessional?.photo_url || newProfessional.photo_url}
                              onChange={(e) => {
                                const url = e.target.value;
                                setPhotoPreview(url);
                                if (editingProfessional) {
                                  setEditingProfessional({ ...editingProfessional, photo_url: url });
                                } else {
                                  setNewProfessional({ ...newProfessional, photo_url: url });
                                }
                              }}
                              placeholder="https://exemplo.com/foto.jpg"
                              className="mt-1"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Faça upload de uma imagem ou cole uma URL. Deixe vazio para não exibir foto.
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                            onClick={() => {
                              setIsDialogOpen(false);
                              setEditingProfessional(null);
                              setNewProfessional({
                                name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '',
                                is_active: true, commission_percent: '',
                              });
                              setPhotoPreview(null);
                            }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={editingProfessional ? handleUpdateProfessional : handleAddProfessional}
                        >
                          {editingProfessional ? 'Atualizar' : 'Salvar'}
                        </Button>
                      </DialogFooter>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {proRevenueRank.length > 0 && (
                  <div className="mb-6 rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h4 className="font-medium text-sm">Ranking de faturamento no mês (Caixa)</h4>
                    </div>
                    <div className="space-y-2">
                      {proRevenueRank.slice(0, 5).map((row, i) => (
                        <div key={row.id} className="flex items-center justify-between text-sm">
                          <span>
                            <span className="text-muted-foreground mr-2">#{i + 1}</span>
                            {row.name}
                          </span>
                          <span className="font-medium text-emerald-600">
                            R$ {row.total.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {loadingProfessionals ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                <div className="space-y-4">
                  {professionals.map((pro) => (
                    <div
                      key={pro.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        {pro.photo_url ? (
                        <img
                            src={pro.photo_url}
                          alt={pro.name}
                          className="w-12 h-12 rounded-full object-cover"
                            onError={(e) => {
                              // Se a imagem falhar ao carregar, esconder
                              e.currentTarget.style.display = 'none';
                            }}
                        />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{pro.name}</h4>
                            <Badge variant="outline" className={pro.is_active === false ? 'bg-muted' : 'bg-emerald-50 text-emerald-700'}>
                              {pro.is_active === false ? 'Inativa' : 'Ativa'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{pro.specialty}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {pro.phone}
                          </p>
                          {pro.commission_percent != null && (
                            <p className="text-xs text-muted-foreground">
                              Comissão: {Number(pro.commission_percent).toFixed(0)}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              const next = !(pro.is_active !== false);
                              const { error } = await supabase
                                .from('professionals')
                                .update({ is_active: next })
                                .eq('id', pro.id);
                              if (error) toast.error('Erro ao atualizar status');
                              else {
                                toast.success(next ? 'Profissional ativada' : 'Profissional desativada');
                                window.location.reload();
                              }
                            }}
                          >
                            {pro.is_active === false ? 'Ativar' : 'Desativar'}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setEditingProfessional(pro);
                              setPhotoPreview(pro.photo_url || null);
                              setIsDialogOpen(true);
                            }}
                          >
                          <Edit className="h-4 w-4" />
                        </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteProfessional(pro.id)}
                          >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Serviços */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Serviços</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select 
                    value={servicesProfessionalFilter}
                    onValueChange={setServicesProfessionalFilter}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todas as profissionais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as profissionais</SelectItem>
                      {professionals.length > 0 ? (
                        professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder" disabled>Nenhuma profissional cadastrada</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>
                          {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {!editingService && (
                          <div className="md:col-span-2">
                            <Label htmlFor="service-professional">Profissional *</Label>
                            <Select 
                              value={serviceFormProfessional} 
                              onValueChange={setServiceFormProfessional}
                            >
                              <SelectTrigger id="service-professional">
                                <SelectValue placeholder="Selecione uma profissional" />
                              </SelectTrigger>
                              <SelectContent>
                                {professionals.map((pro) => (
                                  <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div>
                          <Label htmlFor="service-name">Nome do Serviço *</Label>
                          <Input
                            id="service-name"
                            value={editingService?.name || newService.name}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, name: e.target.value })
                                : setNewService({ ...newService, name: e.target.value })
                            }
                            placeholder="Ex: Alongamento de Cílios"
                          />
                        </div>
                        <div>
                          <Label htmlFor="service-price">Valor (R$) *</Label>
                          <Input
                            id="service-price"
                            type="number"
                            step="0.01"
                            value={editingService?.price || newService.price}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, price: e.target.value })
                                : setNewService({ ...newService, price: e.target.value })
                            }
                            placeholder="150.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="service-duration">Duração (minutos) *</Label>
                          <Input
                            id="service-duration"
                            type="number"
                            value={editingService?.duration || newService.duration}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, duration: e.target.value })
                                : setNewService({ ...newService, duration: e.target.value })
                            }
                            placeholder="90"
                          />
                        </div>
                        <div>
                          <Label htmlFor="service-sinal-fixo">Sinal Fixo (R$) - Opcional</Label>
                          <Input
                            id="service-sinal-fixo"
                            type="number"
                            step="0.01"
                            value={editingService?.sinal_fixo || newService.sinal_fixo}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, sinal_fixo: e.target.value })
                                : setNewService({ ...newService, sinal_fixo: e.target.value })
                            }
                            placeholder="Ex: 50.00"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Se preenchido, este será o valor do sinal para este serviço. Caso contrário, usa o padrão da profissional ou 30% do valor total.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Checkbox
                            id="service-allow-full"
                            checked={
                              editingService
                                ? !!editingService.allow_full_payment
                                : newService.allow_full_payment
                            }
                            onCheckedChange={(checked) =>
                              editingService
                                ? setEditingService({ ...editingService, allow_full_payment: !!checked })
                                : setNewService({ ...newService, allow_full_payment: !!checked })
                            }
                          />
                          <Label htmlFor="service-allow-full" className="cursor-pointer">
                            Permitir pagamento total (além do sinal)
                          </Label>
                        </div>
                        <div className="flex items-center gap-2 md:col-span-2">
                          <Checkbox
                            id="service-active"
                            checked={
                              editingService
                                ? editingService.is_active !== false
                                : true
                            }
                            onCheckedChange={(checked) =>
                              editingService
                                ? setEditingService({ ...editingService, is_active: !!checked })
                                : setNewService({ ...newService, is_active: !!checked } as typeof newService)
                            }
                          />
                          <Label htmlFor="service-active" className="cursor-pointer">
                            Serviço ativo (aparece no catálogo / agendamento)
                          </Label>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="service-photo">Foto do Serviço (opcional)</Label>
                          <div className="space-y-2">
                            {(servicePhotoPreview || editingService?.photo_url || newService.photo_url) && (
                              <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                <img
                                  src={servicePhotoPreview || editingService?.photo_url || newService.photo_url || ''}
                                  alt="Preview"
                                  className="w-full h-full object-cover"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1 right-1 h-6 w-6"
                                  onClick={() => {
                                    setServicePhotoPreview(null);
                                    if (editingService) {
                                      setEditingService({ ...editingService, photo_url: '' });
                                    } else {
                                      setNewService({ ...newService, photo_url: '' });
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Input
                                id="service-photo-file"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Preview local
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setServicePhotoPreview(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);

                                    // Upload para Supabase
                                    const url = await handleUploadServicePhoto(file);
                                    if (url) {
                                      if (editingService) {
                                        setEditingService({ ...editingService, photo_url: url });
                                      } else {
                                        setNewService({ ...newService, photo_url: url });
                                      }
                                    }
                                  }
                                }}
                                disabled={uploadingServicePhoto}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingServicePhoto}
                                className="gap-2"
                                onClick={() => {
                                  document.getElementById('service-photo-file')?.click();
                                }}
                              >
                                {uploadingServicePhoto ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="h-4 w-4" />
                                    {servicePhotoPreview || editingService?.photo_url || newService.photo_url ? 'Trocar Foto' : 'Enviar Foto'}
                                  </>
                                )}
                              </Button>
                              <Input
                                id="service-photo-url"
                                type="url"
                                placeholder="Ou cole a URL da imagem"
                                value={editingService?.photo_url || newService.photo_url}
                                onChange={(e) => {
                                  if (editingService) {
                                    setEditingService({ ...editingService, photo_url: e.target.value });
                                  } else {
                                    setNewService({ ...newService, photo_url: e.target.value });
                                  }
                                  setServicePhotoPreview(null);
                                }}
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="service-category">Categoria (opcional)</Label>
                          <div className="flex gap-2">
                            <Select
                              value={(editingService?.category_id || newService.category_id || 'none') === '' ? 'none' : (editingService?.category_id || newService.category_id || 'none')}
                              onValueChange={(value) => {
                                const categoryValue = value === 'none' ? '' : value;
                                if (editingService) {
                                  setEditingService({ ...editingService, category_id: categoryValue });
                                } else {
                                  setNewService({ ...newService, category_id: categoryValue });
                                }
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem categoria</SelectItem>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                              <DialogTrigger asChild>
                                <Button type="button" variant="outline" size="icon" title="Adicionar nova categoria">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="w-[95vw] max-w-md p-4 sm:p-6">
                                <DialogHeader>
                                  <DialogTitle>Nova Categoria</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                  <div>
                                    <Label htmlFor="category-name">Nome da Categoria *</Label>
                                    <Input
                                      id="category-name"
                                      value={newCategoryName}
                                      onChange={(e) => setNewCategoryName(e.target.value)}
                                      placeholder="Ex: Cílios, Unhas, etc."
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleAddCategory();
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => {
                                    setIsCategoryDialogOpen(false);
                                    setNewCategoryName('');
                                  }}>
                                    Cancelar
                                  </Button>
                                  <Button onClick={handleAddCategory}>
                                    Adicionar
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="service-short-description">Descrição Curta (opcional)</Label>
                          <Input
                            id="service-short-description"
                            value={editingService?.short_description || newService.short_description}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, short_description: e.target.value })
                                : setNewService({ ...newService, short_description: e.target.value })
                            }
                            placeholder="Ex: Procedimento para quem gosta de volumão..."
                            maxLength={150}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Descrição curta que aparece nos cards do catálogo (máx. 150 caracteres)
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="service-description">Descrição Completa (opcional)</Label>
                          <Textarea
                            id="service-description"
                            value={editingService?.description || newService.description}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, description: e.target.value })
                                : setNewService({ ...newService, description: e.target.value })
                            }
                            placeholder="Descrição detalhada do serviço, durabilidade, manutenção, etc..."
                            rows={4}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Descrição completa que aparece na página de detalhes do serviço
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="service-featured"
                            checked={editingService?.is_featured || newService.is_featured}
                            onCheckedChange={(checked) => 
                              editingService
                                ? setEditingService({ ...editingService, is_featured: checked as boolean })
                                : setNewService({ ...newService, is_featured: checked as boolean })
                            }
                          />
                          <Label htmlFor="service-featured" className="cursor-pointer">
                            Destacar no catálogo
                          </Label>
                        </div>
                        <div>
                          <Label htmlFor="service-display-order">Ordem de Exibição (opcional)</Label>
                          <Input
                            id="service-display-order"
                            type="number"
                            value={editingService?.display_order || newService.display_order}
                            onChange={(e) => 
                              editingService
                                ? setEditingService({ ...editingService, display_order: e.target.value })
                                : setNewService({ ...newService, display_order: e.target.value })
                            }
                            placeholder="0"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Número menor aparece primeiro no catálogo
                          </p>
                        </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsServiceDialogOpen(false);
                              setEditingService(null);
                              setNewService({ 
        name: '', 
        price: '', 
        duration: '', 
        allow_full_payment: false, 
        sinal_fixo: '',
        category_id: '',
        short_description: '',
        description: '',
        is_featured: false,
        display_order: '0',
        photo_url: ''
      });
                              setServicePhotoPreview(null);
                              setServiceFormProfessional('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={editingService ? handleUpdateService : handleAddService}
                          >
                            {editingService ? 'Atualizar' : 'Salvar'}
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingServices ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      {servicesProfessionalFilter === 'all' && (
                        <TableHead>Profissional</TableHead>
                      )}
                      <TableHead>Duração</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {services.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={servicesProfessionalFilter === 'all' ? 6 : 5}
                            className="text-center py-8 text-muted-foreground"
                          >
                            Nenhum serviço encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        services.map((service) => (
                      <TableRow key={service.id} className={service.is_active === false ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          {service.name}
                          {service.sinal_fixo != null && Number(service.sinal_fixo) > 0 && (
                            <div className="text-[11px] text-muted-foreground">
                              Sinal: R$ {Number(service.sinal_fixo).toFixed(2)}
                            </div>
                          )}
                        </TableCell>
                        {servicesProfessionalFilter === 'all' && (
                          <TableCell className="text-sm text-muted-foreground">
                            {service.professionals?.name || '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </span>
                        </TableCell>
                            <TableCell>R$ {Number(service.price).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={service.is_active === false ? '' : 'bg-emerald-50 text-emerald-700'}>
                            {service.is_active === false ? 'Inativo' : 'Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    const next = !(service.is_active !== false);
                                    const { error } = await supabase
                                      .from('services')
                                      .update({ is_active: next })
                                      .eq('id', service.id);
                                    if (error) toast.error('Erro ao atualizar status');
                                    else {
                                      toast.success(next ? 'Serviço ativado' : 'Serviço desativado');
                                      loadServices(servicesProfessionalFilter);
                                    }
                                  }}
                                >
                                  {service.is_active === false ? 'Ativar' : 'Desativar'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    // Garantir que category_id null/vazio seja tratado como 'none' para o Select
                                    const serviceToEdit = {
                                      ...service,
                                      category_id: service.category_id || 'none',
                                      display_order: service.display_order?.toString() || '0',
                                    };
                                    setEditingService(serviceToEdit);
                                    setServicePhotoPreview(service.photo_url || null);
                                    setIsServiceDialogOpen(true);
                                  }}
                                >
                              <Edit className="h-4 w-4" />
                            </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteService(service.id)}
                                >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                        ))
                      )}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Clientes */}
          {/* Tab: Horários */}
          <TabsContent value="hours">
            <AvailabilityRulesSection
              professionals={professionals}
              professionalFilter={hoursProfessionalFilter}
            />
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-serif text-lg sm:text-xl">Exceções pontuais (horários avulsos)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Prefira as <strong>regras recorrentes</strong> acima. Aqui só cadastre um horário extra específico.
                    A aba <strong>Bloqueios</strong> é o oposto: tira um dia/horário da grade (férias, folga, imprevisto).
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={hoursProfessionalFilter} onValueChange={setHoursProfessionalFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm">
                      <SelectValue placeholder="Filtrar por profissional" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas as profissionais</SelectItem>
                    {professionals.map((pro) => (
                      <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                  <Dialog open={isHourDialogOpen} onOpenChange={setIsHourDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 text-xs sm:text-sm">
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Adicionar Horário</span>
                        <span className="xs:hidden">Adicionar</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Adicionar Horário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="hour-time">Horário (HH:MM) *</Label>
                          <Input
                            id="hour-time"
                            type="time"
                            value={newHour.time}
                            onChange={(e) => setNewHour({ ...newHour, time: e.target.value })}
                            placeholder="09:00"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Exemplo: 09:00, 14:30
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="hour-professional">Profissional *</Label>
                          <Select
                            value={newHour.professionalId}
                            onValueChange={(value) => setNewHour({ ...newHour, professionalId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma profissional" />
                            </SelectTrigger>
                            <SelectContent>
                              {professionals.map((pro) => (
                                <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Selecione a profissional para este horário
                          </p>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsHourDialogOpen(false);
                              setNewHour({ time: '', professionalId: '' });
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={async () => {
                              if (!newHour.time) {
                                toast.error('Preencha o horário');
                                return;
                              }

                              if (!newHour.professionalId) {
                                toast.error('Selecione uma profissional');
                                return;
                              }

                              const hourData: any = {
                                time: newHour.time,
                                professional_id: newHour.professionalId,
                                is_active: true,
                              };

                              const { error } = await supabase
                                .from('available_hours')
                                .insert(hourData);

                              if (error) {
                                console.error('Error adding hour:', error);
                                toast.error(`Erro ao adicionar horário: ${error.message}`);
                              } else {
                                toast.success('Horário adicionado!');
                                setIsHourDialogOpen(false);
                                setNewHour({ time: '', professionalId: '' });
                                loadAvailableHours();
                              }
                            }}
                          >
                            Salvar
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={loadAvailableHours} variant="outline" size="sm" className="text-xs sm:text-sm">
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHours ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                      <TableHead className="text-xs sm:text-sm">Profissional</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                        {availableHours.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                              Nenhum horário configurado
                            </TableCell>
                          </TableRow>
                        ) : (
                          availableHours.map((hour) => (
                            <TableRow key={hour.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">{hour.time}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                                {hour.professional_id ? (
                                  <span>{hour.professionals?.name || 'Carregando...'}</span>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Global</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={hour.is_active ? 'default' : 'secondary'} className="text-xs">
                                  {hour.is_active ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      const { error } = await supabase
                                        .from('available_hours')
                                        .update({ is_active: !hour.is_active })
                                        .eq('id', hour.id);

                                      if (error) {
                                        toast.error('Erro ao atualizar horário');
                                      } else {
                                        toast.success(`Horário ${!hour.is_active ? 'ativado' : 'desativado'}`);
                                        loadAvailableHours();
                                      }
                                    }}
                                  >
                                    {hour.is_active ? 'Desativar' : 'Ativar'}
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="text-xs sm:text-sm"
                                    onClick={async () => {
                                      if (!confirm('Tem certeza que deseja excluir este horário?')) return;

                                      const { error } = await supabase
                                        .from('available_hours')
                                        .delete()
                                        .eq('id', hour.id);

                                      if (error) {
                                        toast.error('Erro ao excluir horário');
                                      } else {
                                        toast.success('Horário excluído!');
                                        loadAvailableHours();
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Bloqueios */}
          <TabsContent value="blocked">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="font-serif text-lg sm:text-xl">Gerenciar Bloqueios de Agenda</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Use para <strong>tirar</strong> disponibilidade pontual (férias, folga, imprevisto).
                    Em Horários você define quando a profissional atende; aqui você bloqueia exceções.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Select value={blockedProfessionalFilter} onValueChange={setBlockedProfessionalFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] text-xs sm:text-sm">
                      <SelectValue placeholder="Filtrar por profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as profissionais</SelectItem>
                      {professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog open={isBlockedDialogOpen} onOpenChange={setIsBlockedDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2 text-xs sm:text-sm">
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden xs:inline">Adicionar Bloqueio</span>
                        <span className="xs:hidden">Adicionar</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                      <DialogHeader>
                        <DialogTitle>Adicionar Bloqueio de Agenda</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                            <div>
                          <Label htmlFor="blocked-professional">Profissional *</Label>
                          <Select
                            value={newBlocked.professionalId}
                            onValueChange={(value) => setNewBlocked({ ...newBlocked, professionalId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a profissional" />
                            </SelectTrigger>
                            <SelectContent>
                              {professionals.map((pro) => (
                                <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                            </div>
                        <div>
                          <Label htmlFor="blocked-date">Data *</Label>
                          <Input
                            id="blocked-date"
                            type="date"
                            value={newBlocked.date}
                            onChange={(e) => setNewBlocked({ ...newBlocked, date: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div>
                          <Label htmlFor="blocked-time">Tipo de Bloqueio *</Label>
                          <Select
                            value={newBlocked.time}
                            onValueChange={(value) => setNewBlocked({ ...newBlocked, time: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all-day">Dia inteiro</SelectItem>
                              <SelectItem value="08:00">08:00</SelectItem>
                              <SelectItem value="09:00">09:00</SelectItem>
                              <SelectItem value="10:00">10:00</SelectItem>
                              <SelectItem value="11:00">11:00</SelectItem>
                              <SelectItem value="13:00">13:00</SelectItem>
                              <SelectItem value="14:00">14:00</SelectItem>
                              <SelectItem value="15:00">15:00</SelectItem>
                              <SelectItem value="16:00">16:00</SelectItem>
                              <SelectItem value="17:00">17:00</SelectItem>
                              <SelectItem value="18:00">18:00</SelectItem>
                              <SelectItem value="19:00">19:00</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Selecione "Dia inteiro" para bloquear todo o dia ou um horário específico
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="blocked-reason">Motivo (opcional)</Label>
                          <Input
                            id="blocked-reason"
                            value={newBlocked.reason}
                            onChange={(e) => setNewBlocked({ ...newBlocked, reason: e.target.value })}
                            placeholder="Ex: Férias, Evento, etc"
                          />
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsBlockedDialogOpen(false);
                              setNewBlocked({ date: '', time: '', professionalId: '', reason: '' });
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleAddBlocked}>
                            Salvar
                          </Button>
                        </DialogFooter>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button onClick={loadBlockedSlots} variant="outline" size="sm" className="text-xs sm:text-sm">
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBlocked ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs sm:text-sm">Data</TableHead>
                          <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Profissional</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden md:table-cell">Motivo</TableHead>
                          <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {blockedSlots.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhum bloqueio encontrado
                          </TableCell>
                          </TableRow>
                        ) : (
                          blockedSlots.map((blocked) => {
                            const professional = blocked.professionals;
                            return (
                              <TableRow key={blocked.id}>
                          <TableCell className="text-xs sm:text-sm">
                                  {formatDateString(blocked.blocked_date)}
                                </TableCell>
                                <TableCell>
                                  {blocked.blocked_time ? (
                                    <Badge variant="outline" className="text-xs">{blocked.blocked_time}</Badge>
                                  ) : (
                                    <Badge variant="destructive" className="text-xs">Dia inteiro</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                  {professional?.name || 'N/A'}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs sm:text-sm">
                                  {blocked.reason || (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 sm:h-10 sm:w-10"
                                    onClick={() => handleDeleteBlocked(blocked.id)}
                                    title="Remover bloqueio"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                                  </Button>
                          </TableCell>
                        </TableRow>
                      );
                          })
                        )}
                  </TableBody>
                </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Lista de Clientes</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Input
                    className="w-[200px]"
                    placeholder="Buscar nome ou telefone"
                    value={clientsSearch}
                    onChange={(e) => setClientsSearch(e.target.value)}
                  />
                  <Select value={clientsProfessionalFilter} onValueChange={setClientsProfessionalFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todas as profissionais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as profissionais</SelectItem>
                      {professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                        <TableHead className="text-xs sm:text-sm">Telefone</TableHead>
                        <TableHead className="text-xs sm:text-sm">Agendamentos</TableHead>
                        <TableHead className="text-xs sm:text-sm">LTV (pago)</TableHead>
                        <TableHead className="text-xs sm:text-sm">Última visita</TableHead>
                        <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {uniqueClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      uniqueClients.map((client, index) => {
                      return (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {client.name}
                              {client.duplicatePhones && (
                                <Badge variant="outline" className="ml-2 text-[10px] text-amber-700">
                                  telefones variantes
                                </Badge>
                              )}
                            </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <a
                                href={whatsappUrl(client.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                                {client.phone}
                            </a>
                          </TableCell>
                            <TableCell className="text-xs sm:text-sm">{client.count}</TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-emerald-600">
                              R$ {client.ltv.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {formatDateString(client.lastDate)}
                              {client.daysAway != null && client.daysAway >= 30 && (
                                <div className="text-[11px] text-amber-700">
                                  Não volta há {client.daysAway} dias
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {client.daysAway != null && client.daysAway >= 30 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs gap-1"
                                  onClick={() => {
                                    const msg = `Olá, ${client.name}! Sentimos sua falta no salão 💛 Já faz um tempo desde sua última visita. Quer agendar um horário?`;
                                    window.open(whatsappUrl(client.phone, msg), '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Retorno
                                </Button>
                              )}
                            </TableCell>
                        </TableRow>
                      );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Informações do Estúdio */}
          <TabsContent value="cashflow">
            <CashFlowTab />
          </TabsContent>

          <TabsContent value="studio">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Informações do Estúdio</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Edite as informações que aparecem no catálogo para os clientes
                </p>
              </CardHeader>
              <CardContent>
                {loadingStudioInfo ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : studioInfo ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-6xl">
                    <div className="space-y-4">
                    <Accordion type="multiple" defaultValue={['contato', 'leads']} className="w-full">
                      <AccordionItem value="contato">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Contato</span>
                        </AccordionTrigger>
                        <AccordionContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <Label htmlFor="studio-phone">Telefone *</Label>
                          <Input
                            id="studio-phone"
                            value={studioInfo.phone || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, phone: e.target.value })}
                            placeholder="+55 11 90000-0000"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-instagram">Instagram</Label>
                          <Input
                            id="studio-instagram"
                            value={studioInfo.instagram || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, instagram: e.target.value })}
                            placeholder="@seuinstagram"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-email">Email</Label>
                          <Input
                            id="studio-email"
                            type="email"
                            value={studioInfo.email || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, email: e.target.value })}
                            placeholder="contato@studio.com"
                          />
                        </div>
                      </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="leads">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Leads e atraso</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <div>
                              <Label htmlFor="lead-expiry">Expiração de lead (minutos)</Label>
                              <Input
                                id="lead-expiry"
                                type="number"
                                min={5}
                                max={10080}
                                value={studioInfo.lead_expiry_minutes ?? 60}
                                onChange={(e) => setStudioInfo({
                                  ...studioInfo,
                                  lead_expiry_minutes: parseInt(e.target.value, 10) || 60,
                                })}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Após esse prazo sem pagamento, o lead é cancelado e o horário libera.
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="late-tolerance">Tolerância de atraso (minutos)</Label>
                              <Input
                                id="late-tolerance"
                                type="number"
                                min={0}
                                max={120}
                                value={studioInfo.late_tolerance_minutes ?? 15}
                                onChange={(e) => setStudioInfo({
                                  ...studioInfo,
                                  late_tolerance_minutes: parseInt(e.target.value, 10) || 0,
                                })}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Valor numérico exibido nas políticas (base para regras futuras no sistema).
                              </p>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="endereco">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Endereço</span>
                        </AccordionTrigger>
                        <AccordionContent>
                    {/* Endereço */}
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="studio-address">Endereço</Label>
                          <Input
                            id="studio-address"
                            value={studioInfo.address || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, address: e.target.value })}
                            placeholder="Rua Dr. Rafael de Araújo Ribeiro"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-complement">Complemento</Label>
                          <Input
                            id="studio-complement"
                            value={studioInfo.address_complement || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, address_complement: e.target.value })}
                            placeholder="Apto, Sala, etc"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-neighborhood">Bairro</Label>
                          <Input
                            id="studio-neighborhood"
                            value={studioInfo.neighborhood || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, neighborhood: e.target.value })}
                            placeholder="Bairro"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-city">Cidade</Label>
                          <Input
                            id="studio-city"
                            value={studioInfo.city || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, city: e.target.value })}
                            placeholder="São Paulo"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-state">Estado</Label>
                          <Input
                            id="studio-state"
                            value={studioInfo.state || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, state: e.target.value })}
                            placeholder="SP"
                            maxLength={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-zip">CEP</Label>
                          <Input
                            id="studio-zip"
                            value={studioInfo.zip_code || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, zip_code: e.target.value })}
                            placeholder="00000-000"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="studio-maps">Link Google Maps (opcional)</Label>
                          <Input
                            id="studio-maps"
                            type="url"
                            value={studioInfo.google_maps_url || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, google_maps_url: e.target.value })}
                            placeholder="https://maps.google.com/..."
                          />
                        </div>
                      </div>
                    </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="horarios">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Horários de atendimento</span>
                        </AccordionTrigger>
                        <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="studio-hours">Horário de Atendimento</Label>
                          <Input
                            id="studio-hours"
                            value={studioInfo.business_hours || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, business_hours: e.target.value })}
                            placeholder="Segunda a Sábado das 07h às 16h com horário marcado"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-saturday">Nota sobre Sábado</Label>
                          <Input
                            id="studio-saturday"
                            value={studioInfo.saturday_note || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, saturday_note: e.target.value })}
                            placeholder="(sábado tendo alterações de horário)"
                          />
                        </div>
                      </div>
                    </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="politicas">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Políticas</span>
                        </AccordionTrigger>
                        <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <div>
                          <Label htmlFor="studio-rescheduling">Política de Remarcação</Label>
                          <Textarea
                            id="studio-rescheduling"
                            value={studioInfo.rescheduling_policy || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, rescheduling_policy: e.target.value })}
                            placeholder="Em caso de imprevisto: Avisar 48h antes..."
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-cancellation">Política de Cancelamento</Label>
                          <Textarea
                            id="studio-cancellation"
                            value={studioInfo.cancellation_policy || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, cancellation_policy: e.target.value })}
                            placeholder="Em caso de atraso ou não comparecimento..."
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-late">Política de Atrasos</Label>
                          <Textarea
                            id="studio-late"
                            value={studioInfo.late_policy || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, late_policy: e.target.value })}
                            placeholder={`ATRASOS: Tolerância de ${studioInfo.late_tolerance_minutes ?? 15} min...`}
                            rows={3}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-deposit">Política de Sinal</Label>
                          <Textarea
                            id="studio-deposit"
                            value={studioInfo.deposit_policy || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, deposit_policy: e.target.value })}
                            placeholder="Sinal: nenhum valor de agendamento é ressarcido..."
                            rows={2}
                          />
                        </div>
                    </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="pagamento-sobre">
                        <AccordionTrigger className="font-semibold">
                          <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Pagamento e Sobre</span>
                        </AccordionTrigger>
                        <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <div>
                          <Label htmlFor="studio-payment-note">Nota de pagamento</Label>
                          <Textarea
                            id="studio-payment-note"
                            value={studioInfo.payment_note || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, payment_note: e.target.value })}
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-about">Sobre o estúdio</Label>
                          <Textarea
                            id="studio-about"
                            value={studioInfo.about_text || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, about_text: e.target.value })}
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-bio-title">Título biossegurança</Label>
                          <Input
                            id="studio-bio-title"
                            value={studioInfo.biosecurity_title || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, biosecurity_title: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-bio-desc">Descrição biossegurança</Label>
                          <Textarea
                            id="studio-bio-desc"
                            value={studioInfo.biosecurity_description || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, biosecurity_description: e.target.value })}
                            rows={3}
                          />
                        </div>
                    </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <div className="pt-4">
                      <Button onClick={handleSaveStudioInfo} disabled={savingStudioInfo} className="w-full sm:w-auto">
                        {savingStudioInfo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Salvar informações
                      </Button>
                    </div>
                    </div>

                    {/* Preview ao vivo */}
                    <div className="rounded-lg border bg-muted/20 p-4 h-fit sticky top-4">
                      <h4 className="font-serif font-semibold mb-3">Preview do catálogo</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Contato</p>
                          <p>{studioInfo.phone || '—'}</p>
                          <p className="text-muted-foreground">{studioInfo.instagram || ''}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Endereço</p>
                          <p>
                            {[studioInfo.address, studioInfo.neighborhood, studioInfo.city, studioInfo.state]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Horário</p>
                          <p>{studioInfo.business_hours || '—'}</p>
                        </div>
                        {studioInfo.about_text && (
                          <div>
                            <p className="text-xs text-muted-foreground">Sobre</p>
                            <p className="text-muted-foreground line-clamp-4">{studioInfo.about_text}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Lead expira em</p>
                          <p>{studioInfo.lead_expiry_minutes ?? 60} min · atraso {studioInfo.late_tolerance_minutes ?? 15} min</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Não foi possível carregar as informações.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          {paymentAppointment && (
            <div className="space-y-4 mt-2">
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <p><strong>Cliente:</strong> {paymentAppointment.client_name}</p>
                <p><strong>Total:</strong> R$ {Number(paymentAppointment.total_amount).toFixed(2)}</p>
                <p><strong>Já pago:</strong> R$ {Number(paymentAppointment.amount_paid).toFixed(2)}</p>
                <p className="text-orange-600">
                  <strong>Restante:</strong>{' '}
                  R$ {Math.max(0, Number(paymentAppointment.total_amount) - Number(paymentAppointment.amount_paid)).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Valor recebido agora (R$)</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Registra um valor parcial. Cada aumento de &quot;pago&quot; gera um lançamento no Caixa (sinal automático ou restante).
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rest = Math.max(0, Number(paymentAppointment.total_amount) - Number(paymentAppointment.amount_paid));
                    setPaymentAmount(rest.toFixed(2));
                  }}
                >
                  Preencher restante
                </Button>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)} disabled={savingPayment}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment} disabled={savingPayment}>
              {savingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
              Confirmar pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!remainingConfirmApt} onOpenChange={(open) => !open && setRemainingConfirmApt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar recebimento do restante</AlertDialogTitle>
            <AlertDialogDescription>
              {remainingConfirmApt && (
                <>
                  Confirmar recebimento de{' '}
                  <strong>
                    R${' '}
                    {Math.max(
                      0,
                      Number(remainingConfirmApt.total_amount) - Number(remainingConfirmApt.amount_paid),
                    ).toFixed(2)}
                  </strong>{' '}
                  de <strong>{remainingConfirmApt.client_name}</strong>?
                  Isso zera o restante na Agenda e cria um lançamento manual no Fluxo de Caixa.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingRemaining}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleMarkRemainingPaid();
              }}
              disabled={savingRemaining}
            >
              {savingRemaining ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default Admin;
