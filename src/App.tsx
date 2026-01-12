import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Booking from "./pages/Booking";
import Payment from "./pages/Payment";
import PixPayment from "./pages/PixPayment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Admin from "./pages/Admin";
import ConfirmAppointment from "./pages/ConfirmAppointment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/agendar" element={<Booking />} />
          <Route path="/pagamento" element={<Payment />} />
          <Route path="/pagamento-pix" element={<PixPayment />} />
          <Route path="/pagamento-sucesso" element={<PaymentSuccess />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/confirmar" element={<ConfirmAppointment />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
