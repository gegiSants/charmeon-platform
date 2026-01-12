import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ConfirmAppointment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  const token = searchParams.get('token');
  const action = searchParams.get('action'); // 'confirm' ou 'cancel'

  useEffect(() => {
    const processConfirmation = async () => {
      if (!token || !action) {
        setError('Token ou ação não encontrados na URL');
        setLoading(false);
        return;
      }

      if (action !== 'confirm' && action !== 'cancel') {
        setError('Ação inválida. Use "confirm" ou "cancel"');
        setLoading(false);
        return;
      }

      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Configuração do Supabase não encontrada');
        }

        console.log('🔍 Processando confirmação:', { token, action });

        // Buscar dados do agendamento primeiro
        const { data: appointment, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            professionals:professional_id (name, phone),
            services:service_id (name, price, duration)
          `)
          .eq('id', token)
          .single();

        if (fetchError || !appointment) {
          console.error('❌ Erro ao buscar agendamento:', fetchError);
          throw new Error('Agendamento não encontrado');
        }

        console.log('📋 Agendamento encontrado:', {
          id: appointment.id,
          status: appointment.status,
          email_confirmed: appointment.email_confirmed
        });

        setAppointmentData(appointment);

        // Chamar Edge Function para processar confirmação
        const requestBody = {
          appointmentId: token,
          action: action,
        };
        console.log('📤 Enviando requisição para email-webhook:', requestBody);

        const response = await fetch(`${supabaseUrl}/functions/v1/email-webhook`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 Resposta recebida:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Erro na resposta:', errorText);
          throw new Error(`Erro ao processar confirmação: ${errorText}`);
        }

        const data = await response.json();
        console.log('📦 Dados recebidos:', data);

        if (data.success) {
          console.log('✅ Confirmação processada com sucesso');
          setConfirmed(action === 'confirm');
          if (action === 'confirm') {
            toast.success('Agendamento confirmado com sucesso!');
          } else {
            toast.success('Solicitação de reagendamento recebida. Entraremos em contato em breve.');
          }
          
          // Recarregar dados do agendamento para verificar atualização
          setTimeout(async () => {
            const { data: updatedAppointment } = await supabase
              .from('appointments')
              .select('status, email_confirmed, email_confirmed_at')
              .eq('id', token)
              .single();
            console.log('🔄 Agendamento após atualização:', updatedAppointment);
          }, 1000);
        } else {
          console.error('❌ Resposta não indicou sucesso:', data);
          throw new Error(data.error || 'Erro ao processar confirmação');
        }
      } catch (err: any) {
        console.error('Error processing confirmation:', err);
        setError(err.message || 'Erro ao processar confirmação');
        toast.error('Erro ao processar confirmação. Por favor, tente novamente ou entre em contato conosco.');
      } finally {
        setLoading(false);
      }
    };

    processConfirmation();
  }, [token, action]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Processando confirmação...</p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  Erro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => navigate('/')}>
                  Voltar para a Página Inicial
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (confirmed !== null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {confirmed ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Agendamento Confirmado!
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-orange-600" />
                      Solicitação de Reagendamento Recebida
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {appointmentData && (
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-semibold">Detalhes do Agendamento:</p>
                    <p><strong>Cliente:</strong> {appointmentData.client_name}</p>
                    <p><strong>Serviço:</strong> {appointmentData.services?.name || 'N/A'}</p>
                    <p><strong>Profissional:</strong> {appointmentData.professionals?.name || 'N/A'}</p>
                    <p><strong>Data:</strong> {new Date(appointmentData.appointment_date).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Horário:</strong> {appointmentData.appointment_time}</p>
                  </div>
                )}

                {confirmed ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium mb-2">✅ Confirmação recebida!</p>
                    <p className="text-green-700 text-sm">
                      Seu agendamento foi confirmado. Aguardamos você no horário agendado.
                      Em caso de necessidade de reagendamento, entre em contato conosco com pelo menos 48h de antecedência.
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-orange-800 font-medium mb-2">📅 Solicitação recebida!</p>
                    <p className="text-orange-700 text-sm">
                      Recebemos sua solicitação de reagendamento. Entraremos em contato em breve para encontrar um novo horário adequado.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={() => navigate('/')} className="flex-1">
                    Voltar para a Página Inicial
                  </Button>
                  <Button onClick={() => navigate('/agendar')} variant="outline" className="flex-1">
                    Fazer Novo Agendamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return null;
};

export default ConfirmAppointment;






