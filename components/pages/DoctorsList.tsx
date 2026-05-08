import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Button, Container, Grid, Avatar, Rating, TextField, Box } from '@mui/material';
import { Search, LocalHospital } from '@mui/icons-material';
import { UserRole, UserInfo } from '../../types/navigation';

interface Doctor extends UserInfo {
  specialization: string;
  experience: number;
  consultationFee: number;
  rating: number;
  availableSlots: string[];
  bio?: string;
}

const DoctorsList: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchDoctors = async () => {
      try {
        // Mock data - replace with actual API call
        const mockDoctors: Doctor[] = [
          {
            userId: '1',
            name: 'Dr. Sarah Johnson',
            email: 'sarah.johnson@example.com',
            role: 'doctor' as UserRole,
            mobile: '+1234567890',
            gender: 'female',
            specialization: 'Cardiologist',
            experience: 10,
            consultationFee: 150,
            rating: 4.8,
            availableSlots: ['Mon 9:00 AM', 'Wed 2:00 PM', 'Fri 10:00 AM'],
            bio: 'Senior Cardiologist with 10+ years of experience in treating heart conditions.'
          },
          // Add more mock doctors as needed
        ];
        
        setDoctors(mockDoctors);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const filteredDoctors = doctors.filter(doctor =>
    doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBookAppointment = (doctorId: string) => {
    onNavigate(`/book-appointment/${doctorId}`);
  };

  if (loading) {
    return <div>Loading doctors...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Find a Doctor
        </Typography>
        <TextField
          variant="outlined"
          placeholder="Search by name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ color: 'action.active', mr: 1 }} />,
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {filteredDoctors.map((doctor) => (
          <Grid item xs={12} md={6} lg={4} key={doctor.userId}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <Avatar sx={{ width: 80, height: 80, mr: 2 }}>
                    <LocalHospital sx={{ width: 40, height: 40 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="div">
                      {doctor.name}
                    </Typography>
                    <Typography color="text.secondary" gutterBottom>
                      {doctor.specialization}
                    </Typography>
                    <Rating value={doctor.rating} precision={0.5} readOnly />
                  </Box>
                </Box>
                
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Experience:</strong> {doctor.experience} years
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Fee:</strong> ${doctor.consultationFee} per consultation
                  </Typography>
                </Box>

                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Available Slots:
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
                    {doctor.availableSlots.map((slot, index) => (
                      <Button
                        key={index}
                        variant="outlined"
                        size="small"
                        onClick={() => handleBookAppointment(doctor.userId)}
                        sx={{ textTransform: 'none' }}
                      >
                        {slot}
                      </Button>
                    ))}
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handleBookAppointment(doctor.userId)}
                  sx={{ mt: 'auto' }}
                >
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default DoctorsList;
