import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Trash2, Clock, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface DoctorProfile {
  id: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  about: string | null;
}

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_type: string;
  status: string;
  profiles: {
    full_name: string;
    phone: string | null;
  };
}

const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorDashboard() {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newSlot, setNewSlot] = useState({
    day_of_week: "0",
    start_time: "09:00",
    end_time: "09:30"
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user is a doctor
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some(r => r.role === "doctor")) {
      toast({
        title: "Access Denied",
        description: "You need to be a doctor to access this page",
        variant: "destructive"
      });
      navigate("/");
      return;
    }

    fetchDoctorProfile();
    fetchTimeSlots();
    fetchAppointments();
  };

  const fetchDoctorProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (error) {
      console.error("Error fetching doctor profile:", error);
      return;
    }

    setDoctorProfile(data);
  };

  const fetchTimeSlots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!doctor) return;

    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("day_of_week")
      .order("start_time");

    if (!error && data) {
      setTimeSlots(data);
    }
  };

  const fetchAppointments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!doctor) return;

    const { data: appointmentsData, error: appointmentsError } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("appointment_date");

    if (appointmentsError || !appointmentsData) return;

    // Fetch profiles for patients
    const userIds = appointmentsData.map(a => a.user_id);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .in("id", userIds);

    // Combine appointments with profiles
    const combinedData = appointmentsData.map(appointment => ({
      ...appointment,
      profiles: profilesData?.find(p => p.id === appointment.user_id) || {
        full_name: "Unknown",
        phone: null
      }
    }));

    setAppointments(combinedData);
  };

  const handleAddTimeSlot = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (!doctor) return;

    const { error } = await supabase.from("time_slots").insert({
      doctor_id: doctor.id,
      day_of_week: parseInt(newSlot.day_of_week),
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      is_available: true
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add time slot",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Time slot added successfully"
    });

    fetchTimeSlots();
  };

  const handleDeleteTimeSlot = async (id: string) => {
    const { error } = await supabase
      .from("time_slots")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete time slot",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Success",
      description: "Time slot deleted"
    });

    fetchTimeSlots();
  };

  const handleToggleSlotAvailability = async (id: string, isAvailable: boolean) => {
    const { error } = await supabase
      .from("time_slots")
      .update({ is_available: !isAvailable })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update time slot",
        variant: "destructive"
      });
      return;
    }

    fetchTimeSlots();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <h1 className="text-4xl font-bold mb-8">Doctor Dashboard</h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle>My Profile</CardTitle>
              <CardDescription>Manage your professional information</CardDescription>
            </CardHeader>
            <CardContent>
              {doctorProfile && (
                <div className="space-y-4">
                  <div>
                    <Label>Specialization</Label>
                    <p className="text-sm mt-1">{doctorProfile.specialization}</p>
                  </div>
                  <div>
                    <Label>Qualification</Label>
                    <p className="text-sm mt-1">{doctorProfile.qualification}</p>
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <p className="text-sm mt-1">{doctorProfile.experience_years} years</p>
                  </div>
                  {doctorProfile.about && (
                    <div>
                      <Label>About</Label>
                      <p className="text-sm mt-1">{doctorProfile.about}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Time Slot */}
          <Card>
            <CardHeader>
              <CardTitle>Add Time Slot</CardTitle>
              <CardDescription>Create new availability slots</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Day of Week</Label>
                  <Select value={newSlot.day_of_week} onValueChange={(val) => setNewSlot({...newSlot, day_of_week: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {daysOfWeek.map((day, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newSlot.start_time}
                      onChange={(e) => setNewSlot({...newSlot, start_time: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newSlot.end_time}
                      onChange={(e) => setNewSlot({...newSlot, end_time: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleAddTimeSlot} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Slot
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Time Slots Management */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Time Slots</CardTitle>
              <CardDescription>Manage your availability schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timeSlots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge>{daysOfWeek[slot.day_of_week]}</Badge>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={slot.is_available}
                          onCheckedChange={() => handleToggleSlotAvailability(slot.id, slot.is_available)}
                        />
                        <span className="text-sm">{slot.is_available ? "Available" : "Unavailable"}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTimeSlot(slot.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {timeSlots.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No time slots added yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>My Appointments</CardTitle>
              <CardDescription>View your booked appointments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <Card key={appointment.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{appointment.profiles.full_name}</span>
                          </div>
                          {appointment.profiles.phone && (
                            <p className="text-sm text-muted-foreground">{appointment.profiles.phone}</p>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{format(new Date(appointment.appointment_date), "PPP")}</span>
                          </div>
                        </div>
                        <Badge>{appointment.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {appointments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No appointments booked yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
