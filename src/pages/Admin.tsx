import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useProfessionals, useServices } from '@/hooks/useAppointments';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users, Scissors, Calendar, List, Phone, Clock, Trash2, Edit, Loader2, CheckCircle, XCircle, DollarSign, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formulários
  const [newProfessional, setNewProfessional] = useState({ name: '', specialty: '', phone: '' });
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });
  const [editingProfessional, setEditingProfessional] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [serviceFormProfessional, setServiceFormProfessional] = useState<string>('');
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);

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

  // Carregar agendamentos
  useEffect(() => {
    if (!error) {
      loadAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfessional]);

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

  const handleAddProfessional = async () => {
    if (!newProfessional.name || !newProfessional.specialty || !newProfessional.phone) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const { error } = await supabase
      .from('professionals')
      .insert({
        name: newProfessional.name,
        specialty: newProfessional.specialty,
        phone: newProfessional.phone,
      });

    if (error) {
      console.error('Error adding professional:', error);
      toast.error('Erro ao adicionar profissional');
    } else {
      toast.success(`Profissional "${newProfessional.name}" adicionada!`);
      setNewProfessional({ name: '', specialty: '', phone: '' });
      setIsDialogOpen(false);
      window.location.reload(); // Recarregar para atualizar lista
    }
  };

  const handleUpdateProfessional = async () => {
    if (!editingProfessional) return;

    const { error } = await supabase
      .from('professionals')
      .update({
        name: editingProfessional.name,
        specialty: editingProfessional.specialty,
        phone: editingProfessional.phone,
      })
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

    const serviceData = {
      professional_id: professionalId,
      name: newService.name.trim(),
      price: parseFloat(newService.price),
      duration: parseInt(newService.duration),
    };

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
      setNewService({ name: '', price: '', duration: '' });
      setServiceFormProfessional('');
      setIsServiceDialogOpen(false);
      // Atualizar a seleção e recarregar serviços
      setSelectedProfessional(professionalId);
      loadServices(professionalId);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;

    const { error } = await supabase
      .from('services')
      .update({
        name: editingService.name,
        price: parseFloat(editingService.price),
        duration: parseInt(editingService.duration),
      })
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
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4 hidden sm:inline" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="professionals" className="gap-2">
              <Users className="h-4 w-4 hidden sm:inline" />
              Profissionais
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Scissors className="h-4 w-4 hidden sm:inline" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <List className="h-4 w-4 hidden sm:inline" />
              Clientes
            </TabsTrigger>
          </TabsList>

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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
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
                                <TableCell>
                                  {format(new Date(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell>{apt.appointment_time}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{apt.client_name}</p>
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
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{service?.name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {professional?.name || 'N/A'}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
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
                                  <div className="flex gap-2 items-center">
                                    <Select
                                      value={apt.status}
                                      onValueChange={(value) => handleUpdateAppointmentStatus(apt.id, value)}
                                    >
                                      <SelectTrigger className="w-[140px]">
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
                                      onClick={() => handleSendEmail(apt.id)}
                                      disabled={sendingEmail === apt.id}
                                      title="Enviar email de confirmação"
                                    >
                                      {sendingEmail === apt.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Mail className="h-4 w-4" />
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
                  <DialogContent>
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
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsDialogOpen(false);
                            setEditingProfessional(null);
                            setNewProfessional({ name: '', specialty: '', phone: '' });
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
                          <img
                            src={pro.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face'}
                            alt={pro.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
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
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {!editingService && (
                          <div>
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
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setIsServiceDialogOpen(false);
                              setEditingService(null);
                              setNewService({ name: '', price: '', duration: '' });
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
                                    setEditingService(service);
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
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Lista de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Total de Agendamentos</TableHead>
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
                            <TableCell className="font-medium">{client.name}</TableCell>
                            <TableCell>
                              <a
                                href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                <Phone className="h-3 w-3" />
                                {client.phone}
                              </a>
                            </TableCell>
                            <TableCell>{clientAppointments.length}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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
