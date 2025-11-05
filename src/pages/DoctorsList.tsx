import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, ArrowLeft, User, Stethoscope, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Doctor {
  id: string;
  user_id: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  about: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface TimeSlot {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorsList() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [timeSlots, setTimeSlots] = useState<Record<string, TimeSlot[]>>({});
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchDoctors();
  }, []);

  const checkAuthAndFetchDoctors = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to book appointments",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }
    fetchDoctors();
  };

  const fetchDoctors = async () => {
    // Fetch doctors
    const { data: doctorsData, error: doctorsError } = await supabase
      .from("doctors")
      .select("*");

    if (doctorsError) {
      toast({
        title: "Error",
        description: "Failed to fetch doctors",
        variant: "destructive"
      });
      return;
    }

    // Fetch profiles for all doctors
    const userIds = doctorsData?.map(d => d.user_id) || [];
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    if (profilesError) {
      toast({
        title: "Error",
        description: "Failed to fetch doctor profiles",
        variant: "destructive"
      });
      return;
    }

    // Combine doctors with profiles
    const combinedData = doctorsData?.map(doctor => ({
      ...doctor,
      profiles: profilesData?.find(p => p.id === doctor.user_id) || {
        full_name: "Unknown",
        avatar_url: null
      }
    })) || [];

    setDoctors(combinedData);
    
    // Fetch time slots for all doctors
    const { data: slotsData } = await supabase
      .from("time_slots")
      .select("*")
      .eq("is_available", true);

    if (slotsData) {
      const slotsByDoctor = slotsData.reduce((acc, slot) => {
        if (!acc[slot.doctor_id]) {
          acc[slot.doctor_id] = [];
        }
        acc[slot.doctor_id].push(slot);
        return acc;
      }, {} as Record<string, TimeSlot[]>);
      setTimeSlots(slotsByDoctor);
    }
  };

  const handleBookAppointment = async (slot: TimeSlot) => {
    if (!selectedDoctor) return;

    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Create appointment
    const { error: appointmentError } = await supabase.from("appointments").insert({
      user_id: user?.id,
      doctor_id: selectedDoctor.id,
      time_slot_id: slot.id,
      appointment_date: selectedDate.toISOString(),
      appointment_type: "consultation",
      provider_name: selectedDoctor.profiles.full_name,
      status: "scheduled"
    });

    if (appointmentError) {
      toast({
        title: "Error",
        description: "Failed to book appointment",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    // Mark slot as unavailable
    const { error: slotError } = await supabase
      .from("time_slots")
      .update({ is_available: false })
      .eq("id", slot.id);

    if (slotError) {
      toast({
        title: "Error",
        description: "Failed to update time slot",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Success",
      description: "Appointment booked successfully"
    });

    setIsLoading(false);
    setSelectedDoctor(null);
    fetchDoctors();
  };

  const getAvailableSlotsForDay = (doctorId: string) => {
    const dayOfWeek = selectedDate.getDay();
    return timeSlots[doctorId]?.filter(slot => slot.day_of_week === dayOfWeek) || [];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Our Doctors</h1>
          <p className="text-muted-foreground">Book an appointment with our experienced healthcare professionals</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => (
            <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={doctor.profiles.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{doctor.profiles.full_name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <Stethoscope className="w-4 h-4" />
                      {doctor.specialization}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="w-4 h-4 text-muted-foreground" />
                    <span>{doctor.qualification}</span>
                  </div>
                  <Badge variant="secondary">{doctor.experience_years} years experience</Badge>
                  {doctor.about && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{doctor.about}</p>
                  )}
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full mt-4"
                        onClick={() => setSelectedDoctor(doctor)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        View Schedule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Book Appointment with Dr. {doctor.profiles.full_name}</DialogTitle>
                        <DialogDescription>
                          Select an available time slot for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Date</label>
                          <input
                            type="date"
                            value={format(selectedDate, "yyyy-MM-dd")}
                            onChange={(e) => setSelectedDate(new Date(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md"
                            min={format(new Date(), "yyyy-MM-dd")}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium mb-2 block">Available Time Slots</label>
                          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                            {getAvailableSlotsForDay(doctor.id).length === 0 ? (
                              <p className="col-span-2 text-center text-muted-foreground py-4">
                                No available slots for this day
                              </p>
                            ) : (
                              getAvailableSlotsForDay(doctor.id).map((slot) => (
                                <Button
                                  key={slot.id}
                                  variant="outline"
                                  className="justify-start"
                                  onClick={() => handleBookAppointment(slot)}
                                  disabled={isLoading}
                                >
                                  <Clock className="w-4 h-4 mr-2" />
                                  {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                                </Button>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {doctors.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">No doctors available at the moment</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
