import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import SymptomChecker from "./pages/SymptomChecker";
import Appointments from "./pages/Appointments";
import Reminders from "./pages/Reminders";
import Feedback from "./pages/Feedback";
import DoctorsList from "./pages/DoctorsList";
import DoctorDashboard from "./pages/DoctorDashboard";
import { Auth } from "./components/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/symptom-checker" element={<SymptomChecker />} />
          <Route path="/appointments" element={<Appointments />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/doctors" element={<DoctorsList />} />
          <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
