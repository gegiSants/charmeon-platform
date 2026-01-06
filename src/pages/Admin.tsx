import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { professionals, services, appointments } from '@/data/mockData';
import { Plus, Users, Scissors, Calendar, List, Phone, Clock, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

const Admin = () => {
  const [selectedProfessional, setSelectedProfessional] = useState(professionals[0]?.id || '');
  
  // Estados para formulários
  const [newProfessional, setNewProfessional] = useState({ name: '', specialty: '', phone: '' });
  const [newService, setNewService] = useState({ name: '', price: '', duration: '' });

  const handleAddProfessional = () => {
    if (newProfessional.name && newProfessional.specialty) {
      toast.success(`Profissional "${newProfessional.name}" adicionada!`);
      setNewProfessional({ name: '', specialty: '', phone: '' });
    }
  };

  const handleAddService = () => {
    if (newService.name && newService.price && newService.duration) {
      toast.success(`Serviço "${newService.name}" adicionado!`);
      setNewService({ name: '', price: '', duration: '' });
    }
  };

  const filteredServices = services.filter(s => s.professionalId === selectedProfessional);
  const filteredAppointments = appointments.filter(a => a.professionalId === selectedProfessional);

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

        <Tabs defaultValue="professionals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="professionals" className="gap-2">
              <Users className="h-4 w-4 hidden sm:inline" />
              Profissionais
            </TabsTrigger>
            <TabsTrigger value="services" className="gap-2">
              <Scissors className="h-4 w-4 hidden sm:inline" />
              Serviços
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="h-4 w-4 hidden sm:inline" />
              Agenda
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <List className="h-4 w-4 hidden sm:inline" />
              Clientes
            </TabsTrigger>
          </TabsList>

          {/* Tab: Profissionais */}
          <TabsContent value="professionals">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif">Profissionais Cadastradas</CardTitle>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Profissional</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="pro-name">Nome</Label>
                        <Input
                          id="pro-name"
                          value={newProfessional.name}
                          onChange={(e) => setNewProfessional({ ...newProfessional, name: e.target.value })}
                          placeholder="Nome da profissional"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-specialty">Especialidade</Label>
                        <Input
                          id="pro-specialty"
                          value={newProfessional.specialty}
                          onChange={(e) => setNewProfessional({ ...newProfessional, specialty: e.target.value })}
                          placeholder="Ex: Especialista em Cílios"
                        />
                      </div>
                      <div>
                        <Label htmlFor="pro-phone">Telefone</Label>
                        <Input
                          id="pro-phone"
                          value={newProfessional.phone}
                          onChange={(e) => setNewProfessional({ ...newProfessional, phone: e.target.value })}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div>
                        <Label>Foto</Label>
                        <Input type="file" accept="image/*" className="mt-1" />
                      </div>
                      <Button onClick={handleAddProfessional} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {professionals.map((pro) => (
                    <div
                      key={pro.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={pro.photo}
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
                        <Button variant="outline" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Serviços */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Serviços</CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {professionals.map((pro) => (
                        <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar Serviço
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Novo Serviço</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label htmlFor="service-name">Nome do Serviço</Label>
                          <Input
                            id="service-name"
                            value={newService.name}
                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                            placeholder="Ex: Alongamento de Cílios"
                          />
                        </div>
                        <div>
                          <Label htmlFor="service-price">Valor (R$)</Label>
                          <Input
                            id="service-price"
                            type="number"
                            value={newService.price}
                            onChange={(e) => setNewService({ ...newService, price: e.target.value })}
                            placeholder="150.00"
                          />
                        </div>
                        <div>
                          <Label htmlFor="service-duration">Duração (minutos)</Label>
                          <Input
                            id="service-duration"
                            type="number"
                            value={newService.duration}
                            onChange={(e) => setNewService({ ...newService, duration: e.target.value })}
                            placeholder="90"
                          />
                        </div>
                        <div>
                          <Label>Foto do Serviço</Label>
                          <Input type="file" accept="image/*" className="mt-1" />
                        </div>
                        <Button onClick={handleAddService} className="w-full">Salvar</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
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
                    {filteredServices.map((service) => (
                      <TableRow key={service.id}>
                        <TableCell className="font-medium">{service.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </span>
                        </TableCell>
                        <TableCell>R$ {service.price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Agenda */}
          <TabsContent value="schedule">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <CardTitle className="font-serif">Agenda</CardTitle>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((pro) => (
                      <SelectItem key={pro.id} value={pro.id}>{pro.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Horário</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAppointments.map((apt) => {
                      const service = services.find(s => s.id === apt.serviceId);
                      return (
                        <TableRow key={apt.id}>
                          <TableCell>{apt.date}</TableCell>
                          <TableCell>{apt.time}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{apt.clientName}</p>
                              <p className="text-xs text-muted-foreground">{apt.clientPhone}</p>
                            </div>
                          </TableCell>
                          <TableCell>{service?.name}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                apt.status === 'confirmed'
                                  ? 'bg-green-100 text-green-800'
                                  : apt.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {apt.status === 'confirmed' ? 'Confirmado' : apt.status === 'pending' ? 'Pendente' : 'Concluído'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
                      <TableHead>Último Serviço</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((apt) => {
                      const service = services.find(s => s.id === apt.serviceId);
                      return (
                        <TableRow key={apt.id}>
                          <TableCell className="font-medium">{apt.clientName}</TableCell>
                          <TableCell>
                            <a
                              href={`https://wa.me/55${apt.clientPhone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              {apt.clientPhone}
                            </a>
                          </TableCell>
                          <TableCell>{service?.name}</TableCell>
                          <TableCell>{apt.date}</TableCell>
                        </TableRow>
                      );
                    })}
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
