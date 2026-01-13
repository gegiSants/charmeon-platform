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
import { Plus, Users, Scissors, Calendar, List, Phone, Clock, Trash2, Edit, Loader2, CheckCircle, XCircle, DollarSign, Mail, Ban, Upload, X, Tag, Sparkles, MapPin, Instagram, Shield, CreditCard, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  email_confirmation_sent?: boolean;
  email_confirmed?: boolean;
  email_confirmed_at?: string | null;
  professionals?: { name: string; phone: string };
  services?: { name: string; price: number; duration: number };
}

const Admin = () => {
  const { professionals, loading: loadingProfessionals } = useProfessionals();
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formulários
  const [newProfessional, setNewProfessional] = useState({ name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '' });
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

  // Verificar configuração do Supabase
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Variáveis de ambiente não configuradas. Verifique o arquivo .env.local');
      console.error('Supabase não configurado:', { supabaseUrl, supabaseKey });
    }
  }, []);

  // Carregar serviços quando profissional é selecionado
  useEffect(() => {
    if (selectedProfessional && selectedProfessional !== 'all') {
      loadServices(selectedProfessional);
    }
  }, [selectedProfessional]);

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
          phone: '+55 11 99027-8446',
          instagram: '@studio_ingridl',
          payment_methods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']
        });
      } else {
        setStudioInfo(data || {
          phone: '+55 11 99027-8446',
          instagram: '@studio_ingridl',
          payment_methods: ['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro']
        });
      }
    } catch (error) {
      console.error('Error loading studio info:', error);
      setStudioInfo({
        phone: '+55 11 99027-8446',
        instagram: '@studio_ingridl',
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

  // Carregar agendamentos
  useEffect(() => {
    if (!error) {
      loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfessional]);

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
      const { data, error: queryError } = await supabase
        .from('services')
        .select('*')
        .eq('professional_id', professionalId)
        .order('name');

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
      
      let query = supabase
        .from('appointments')
        .select(`
          *,
          professionals:professional_id (name, phone),
          services:service_id (name, price, duration)
        `)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (selectedProfessional && selectedProfessional !== 'all') {
        query = query.eq('professional_id', selectedProfessional);
      }

      const { data, error: queryError } = await query;

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
    };

    // Se sinal_padrao foi preenchido, adicionar ao objeto
    if (newProfessional.sinal_padrao && parseFloat(newProfessional.sinal_padrao) > 0) {
      professionalData.sinal_padrao = parseFloat(newProfessional.sinal_padrao);
    }

    const { error } = await supabase
      .from('professionals')
      .insert(professionalData);

    if (error) {
      console.error('Error adding professional:', error);
      toast.error('Erro ao adicionar profissional');
    } else {
      toast.success(`Profissional "${newProfessional.name}" adicionada!`);
      setNewProfessional({ name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '' });
      setPhotoPreview(null);
      setIsDialogOpen(false);
      window.location.reload(); // Recarregar para atualizar lista
    }
  };

  const handleUpdateProfessional = async () => {
    if (!editingProfessional) return;

    const professionalData: any = {
      name: editingProfessional.name,
      specialty: editingProfessional.specialty,
      phone: editingProfessional.phone,
      photo_url: editingProfessional.photo_url?.trim() || null,
    };

    // Se sinal_padrao foi preenchido, adicionar ao objeto
    if (editingProfessional.sinal_padrao && parseFloat(editingProfessional.sinal_padrao) > 0) {
      professionalData.sinal_padrao = parseFloat(editingProfessional.sinal_padrao);
    } else {
      professionalData.sinal_padrao = null;
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
    const professionalId = serviceFormProfessional || (selectedProfessional !== 'all' ? selectedProfessional : '');
    
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
      // Atualizar a seleção e recarregar serviços
      setSelectedProfessional(professionalId);
      loadServices(professionalId);
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
      loadServices(selectedProfessional);
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
      loadServices(selectedProfessional);
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

  const filteredAppointments = selectedProfessional && selectedProfessional !== 'all'
    ? appointments.filter(a => a.professional_id === selectedProfessional)
    : appointments;

  const uniqueClients = Array.from(
    new Map(
      appointments.map(apt => [apt.client_phone, { name: apt.client_name, phone: apt.client_phone }])
    ).values()
  );

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
        <div className="mb-8">
          <h1 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Área Administrativa
          </h1>
          <p className="text-muted-foreground">Gerencie profissionais, serviços e agendamentos</p>
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="schedule" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Agenda</span>
                <span className="xs:hidden">Ag.</span>
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
            </TabsList>
          </div>

          {/* Tab: Agenda */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Agenda</CardTitle>
                <div className="flex gap-2">
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
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
              </CardHeader>
              <CardContent>
                {loadingAppointments ? (
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
                                      {apt.payment_type === 'sinal' ? 'Sinal (PIX)' : 'Total (Cartão)'}
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
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 sm:h-10 sm:w-10"
                                      onClick={() => handleSendEmail(apt.id)}
                                      disabled={sendingEmail === apt.id}
                                      title="Enviar email de confirmação"
                                    >
                                      {sendingEmail === apt.id ? (
                                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                      ) : (
                                        <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
                                      )}
                                    </Button>
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
                          Valor fixo de sinal para todos os serviços desta profissional. Se não preenchido, usa 30% do valor de cada serviço.
                        </p>
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
                              setNewProfessional({ name: '', specialty: '', phone: '', photo_url: '', sinal_padrao: '' });
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
                          <h4 className="font-medium">{pro.name}</h4>
                          <p className="text-sm text-muted-foreground">{pro.specialty}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {pro.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
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
                    value={selectedProfessional && selectedProfessional !== 'all' ? selectedProfessional : undefined} 
                    onValueChange={(value) => {
                      if (value) {
                        setSelectedProfessional(value);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Selecione uma profissional" />
                    </SelectTrigger>
                    <SelectContent>
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
                      <TableHead>Duração</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                      {services.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            {selectedProfessional && selectedProfessional !== 'all' ? 'Nenhum serviço encontrado' : 'Selecione uma profissional'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        services.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </span>
                        </TableCell>
                            <TableCell>R$ {Number(service.price).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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
            <Card>
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <CardTitle className="font-serif text-lg sm:text-xl">Gerenciar Horários Disponíveis</CardTitle>
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
                <CardTitle className="font-serif text-lg sm:text-xl">Gerenciar Bloqueios de Agenda</CardTitle>
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
              <CardHeader>
                <CardTitle className="font-serif">Lista de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">Nome</TableHead>
                        <TableHead className="text-xs sm:text-sm">Telefone</TableHead>
                        <TableHead className="text-xs sm:text-sm">Total de Agendamentos</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {uniqueClients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      uniqueClients.map((client, index) => {
                        const clientAppointments = appointments.filter(
                          apt => apt.client_phone === client.phone
                        );
                      return (
                          <TableRow key={index}>
                            <TableCell className="font-medium text-xs sm:text-sm">{client.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <a
                                href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                                {client.phone}
                            </a>
                          </TableCell>
                            <TableCell className="text-xs sm:text-sm">{clientAppointments.length}</TableCell>
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
                  <div className="space-y-6 max-w-4xl">
                    {/* Contato */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Phone className="h-5 w-5 text-primary" />
                        Contato
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="studio-phone">Telefone *</Label>
                          <Input
                            id="studio-phone"
                            value={studioInfo.phone || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, phone: e.target.value })}
                            placeholder="+55 11 99027-8446"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-instagram">Instagram</Label>
                          <Input
                            id="studio-instagram"
                            value={studioInfo.instagram || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, instagram: e.target.value })}
                            placeholder="@studio_ingridl"
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
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Endereço
                      </h3>
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
                            placeholder="Jaraguá - Zona Oeste"
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

                    {/* Horários */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Horários de Atendimento
                      </h3>
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

                    {/* Protocolo */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Protocolo de Atendimentos
                      </h3>
                      <div className="space-y-4">
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
                            placeholder="ATRASOS: Não temos tolerância de atraso..."
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
                    </div>

                    {/* Biossegurança */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Biossegurança
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="studio-biosecurity-title">Título</Label>
                          <Input
                            id="studio-biosecurity-title"
                            value={studioInfo.biosecurity_title || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, biosecurity_title: e.target.value })}
                            placeholder="Biossegurança"
                          />
                        </div>
                        <div>
                          <Label htmlFor="studio-biosecurity-desc">Descrição</Label>
                          <Textarea
                            id="studio-biosecurity-desc"
                            value={studioInfo.biosecurity_description || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, biosecurity_description: e.target.value })}
                            placeholder="Nossa saúde não tem preço..."
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Formas de Pagamento */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Formas de Pagamento
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="studio-payment-note">Nota sobre Pagamento</Label>
                          <Textarea
                            id="studio-payment-note"
                            value={studioInfo.payment_note || ''}
                            onChange={(e) => setStudioInfo({ ...studioInfo, payment_note: e.target.value })}
                            placeholder="Lembrando que cartão de crédito e débito tem acréscimo..."
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Formas de Pagamento Aceitas</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {['PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro'].map((method) => {
                              const methods = Array.isArray(studioInfo.payment_methods) 
                                ? studioInfo.payment_methods 
                                : (typeof studioInfo.payment_methods === 'string' 
                                  ? JSON.parse(studioInfo.payment_methods || '[]') 
                                  : []);
                              const isSelected = methods.includes(method);
                              return (
                                <Badge
                                  key={method}
                                  variant={isSelected ? 'default' : 'outline'}
                                  className="cursor-pointer"
                                  onClick={() => {
                                    const currentMethods = Array.isArray(studioInfo.payment_methods) 
                                      ? studioInfo.payment_methods 
                                      : (typeof studioInfo.payment_methods === 'string' 
                                        ? JSON.parse(studioInfo.payment_methods || '[]') 
                                        : []);
                                    const newMethods = isSelected
                                      ? currentMethods.filter((m: string) => m !== method)
                                      : [...currentMethods, method];
                                    setStudioInfo({ ...studioInfo, payment_methods: newMethods });
                                  }}
                                >
                                  {method}
                                </Badge>
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            PIX é usado para o sinal via sistema. Outros métodos podem ser usados pessoalmente após o sinal.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sobre */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Sobre o Estúdio</h3>
                      <div>
                        <Label htmlFor="studio-about">Texto sobre o Estúdio</Label>
                        <Textarea
                          id="studio-about"
                          value={studioInfo.about_text || ''}
                          onChange={(e) => setStudioInfo({ ...studioInfo, about_text: e.target.value })}
                          placeholder="Especialistas em realçar sua beleza natural..."
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        onClick={handleSaveStudioInfo}
                        disabled={savingStudioInfo}
                        size="lg"
                        className="gap-2"
                      >
                        {savingStudioInfo ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            Salvar Informações
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando informações...
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
