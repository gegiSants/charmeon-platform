import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Copy, ExternalLink, AlertCircle, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PixPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentLink, setPaymentLink] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [qrCodeBase64, setQrCodeBase64] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const bookingData = location.state as {
    appointmentId: string;
    clientName: string;
    clientPhone: string;
    professional: { id: string; name: string };
    service: { id: string; name: string; price: number };
    date: Date;
    time: string;
    paymentId?: string;
    preferenceId?: string;
    initPoint?: string;
    sandboxInitPoint?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    amount: number;
    restante: number;
  } | null;

  useEffect(() => {
    if (!bookingData) {
      navigate('/pagamento');
      return;
    }

    // Se temos código PIX direto, usar ele (prioridade)
    if (bookingData.qrCode) {
      setPixCode(bookingData.qrCode);
      if (bookingData.qrCodeBase64) {
        setQrCodeBase64(bookingData.qrCodeBase64);
      }
      setIsLoading(false);
      startPaymentPolling();
    } 
    // Se temos link de pagamento (fallback), usar ele
    else if (bookingData.initPoint || bookingData.sandboxInitPoint) {
      const link = bookingData.initPoint || bookingData.sandboxInitPoint;
      setPaymentLink(link || '');
      setIsLoading(false);
      startPaymentPolling();
    } 
    // Se temos preferenceId, tentar buscar o link
    else if (bookingData.preferenceId) {
      fetchPaymentLink();
    } 
    else {
      toast.error('Dados de pagamento inválidos');
      setIsLoading(false);
    }
  }, []);

  const fetchPaymentLink = async () => {
    if (!bookingData?.preferenceId) return;
    
    try {
      // Tentar buscar dados da preferência
      const { data, error } = await supabase.functions.invoke('verify-payment-mp', {
        body: {
          preferenceId: bookingData.preferenceId,
          appointmentId: bookingData.appointmentId,
        },
      });

      if (error) {
        console.error('Error retrieving payment data:', error);
        toast.error('Erro ao obter dados do pagamento');
        setIsLoading(false);
        return;
      }

      // Se já está pago, redirecionar
      if (data?.paid) {
        setIsPaid(true);
        handlePaymentSuccess();
      } else {
        toast.error('Link de pagamento não disponível');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in fetchPaymentLink:', error);
      toast.error('Erro ao processar pagamento PIX');
      setIsLoading(false);
    }
  };

  const startPaymentPolling = () => {
    if (!bookingData?.paymentId && !bookingData?.preferenceId || !bookingData?.appointmentId) return;
    
    setCheckingPayment(true);
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment-mp', {
          body: {
            paymentId: bookingData?.paymentId,
            preferenceId: bookingData?.preferenceId,
            appointmentId: bookingData.appointmentId,
          },
        });

        if (!error && data?.paid) {
          clearInterval(interval);
          setIsPaid(true);
          setCheckingPayment(false);
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error('Error checking payment:', err);
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      setCheckingPayment(false);
    }, 1800000);
  };

  const handlePaymentSuccess = async () => {
    navigate('/pagamento-sucesso', {
      state: {
        ...bookingData,
        paymentType: 'sinal',
        amountPaid: bookingData?.amount,
        restante: bookingData?.restante,
        pending: false,
      },
    });
  };

  const copyPaymentLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      toast.success('Link de pagamento copiado!');
    }
  };

  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      toast.success('Código PIX copiado!');
    }
  };

  const openPaymentLink = () => {
    if (paymentLink) {
      window.open(paymentLink, '_blank');
    }
  };

  if (!bookingData) {
    return null;
  }

  const sinalValue = bookingData.amount;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 space-y-2">
                <h4 className="font-semibold mb-3">Resumo do Agendamento</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span>{bookingData.service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span>{bookingData.professional.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{format(new Date(bookingData.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horário:</span>
                  <span>{bookingData.time}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Valor:</span>
                  <span className="font-semibold text-primary">R$ {sinalValue.toFixed(2)}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Gerando dados de pagamento PIX...</p>
                </div>
              ) : isPaid ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Pagamento Confirmado!</h3>
                  <p className="text-muted-foreground">Redirecionando...</p>
                </div>
              ) : pixCode ? (
                <div className="space-y-6">
                  <div className="bg-primary/5 rounded-lg p-6 text-center">
                    <p className="text-sm font-medium mb-4">Escaneie o QR Code com seu app de pagamento</p>
                    {qrCodeBase64 ? (
                      <div className="bg-white p-4 rounded-lg inline-block mb-4">
                        <img 
                          src={qrCodeBase64}
                          alt="QR Code PIX"
                          className="w-64 h-64 mx-auto"
                        />
                      </div>
                    ) : (
                      <div className="bg-white p-4 rounded-lg inline-block mb-4">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixCode)}`}
                          alt="QR Code PIX"
                          className="w-64 h-64 mx-auto"
                        />
                      </div>
                    )}
                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Ou copie o código PIX:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs break-all text-left">{pixCode}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPixCode}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O QR Code expira em 30 minutos
                    </p>
                    {bookingData?.ticketUrl && (
                      <div className="mt-4">
                        <a
                          href={bookingData.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Abrir comprovante em nova aba
                        </a>
                      </div>
                    )}
                  </div>

                  {checkingPayment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <p className="text-sm text-blue-600">
                          Aguardando confirmação do pagamento...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : paymentLink ? (
                <div className="space-y-6">
                  <div className="bg-primary/5 rounded-lg p-6 text-center">
                    <p className="text-sm font-medium mb-4">
                      Clique no botão abaixo para pagar via PIX
                    </p>
                    
                    <Button
                      size="lg"
                      className="w-full mb-4 gap-2"
                      onClick={openPaymentLink}
                    >
                      <ExternalLink className="h-5 w-5" />
                      Abrir Link de Pagamento
                    </Button>

                    <div className="bg-muted rounded-lg p-4 mb-4">
                      <p className="text-xs text-muted-foreground mb-2 font-semibold">
                        Ou copie o link e cole no seu app do banco:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs break-all text-left bg-background p-2 rounded">
                          {paymentLink}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPaymentLink}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                      <p className="text-xs text-blue-800 font-semibold mb-2">
                        💡 Como pagar:
                      </p>
                      <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Copie o link acima</li>
                        <li>Abra o app do seu banco</li>
                        <li>Cole o link no navegador do app</li>
                        <li>Complete o pagamento PIX</li>
                      </ol>
                    </div>
                  </div>

                  {checkingPayment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <p className="text-sm text-blue-600">
                          Aguardando confirmação do pagamento...
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">
                      <strong>Importante:</strong> Após realizar o pagamento, aguarde alguns instantes para confirmação automática. 
                      O pagamento via PIX é confirmado instantaneamente.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Erro ao gerar dados de pagamento PIX</p>
                  <Button onClick={() => navigate('/pagamento', { state: bookingData })}>
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PixPayment;
