import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Video, User, Star, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react';
import './PatientTelehealth.css';

const doctors = [
  { id: 1, name: 'Dr. Sarah Jenkins', role: 'Clinical Pharmacist', rating: 4.9, specialty: 'Medication Therapy Management', available: 'Today' },
  { id: 2, name: 'Dr. Ahmed Al-Farsi', role: 'General Physician', rating: 4.8, specialty: 'General Consultation', available: 'Tomorrow' },
  { id: 3, name: 'Dr. Emily Chen', role: 'Specialist Dermatologist', rating: 4.9, specialty: 'Skin & Allergy', available: 'Available in 2 Days' },
];

const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM', '04:00 PM'];

export default function PatientTelehealth() {
  const [selectedDoc, setSelectedDoc] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);

  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      full: d
    };
  });

  const handleBook = () => {
    setIsBooked(true);
  };

  if (isBooked) {
    return (
      <div className="telehealth-container flex-center animate-fade-in" style={{ height: '70vh', flexDirection: 'column' }}>
        <div className="success-pulse-circle mb-8">
           <CheckCircle2 size={80} className="text-success" />
        </div>
        <h2 className="text-4xl font-black mb-4">Appointment Confirmed!</h2>
        <p className="text-muted text-xl max-w-lg text-center mb-10">Your video consultation link has been sent to your email. You can join the call 5 minutes before the scheduled time.</p>
        <button className="btn btn-primary px-10 py-4 text-lg font-bold shadow-blue" onClick={() => window.location.href='/patient/dashboard'}>Return to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="telehealth-container animate-fade-in">
      <div className="telehealth-header">
        <h1 className="text-4xl font-black mb-4">Telehealth <span className="text-primary">& Clinic</span></h1>
        <p className="text-muted text-lg max-w-xl">Book a virtual consultation with our certified doctors and pharmacists from the comfort of your home.</p>
      </div>

      <div className="telehealth-grid">
        <div className="doctors-list-panel panel p-8">
          <h3 className="text-xl font-bold mb-6">Select Specialist</h3>
          <div className="flex-column gap-4">
             {doctors.map(doc => (
               <div 
                 key={doc.id} 
                 className={`doctor-card ${selectedDoc === doc.id ? 'active' : ''}`}
                 onClick={() => setSelectedDoc(doc.id)}
               >
                 <div className="doc-avatar">
                   <User size={24} />
                 </div>
                 <div className="doc-info flex-1">
                   <h4 className="font-bold" style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{doc.name}</h4>
                   <p className="text-primary font-bold" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{doc.role}</p>
                   <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>{doc.specialty}</p>
                   <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.85rem', fontWeight: 700, marginTop: 'auto' }}>
                     <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="text-warning"><Star size={14} fill="currentColor" /> {doc.rating}</span>
                     <span style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }} className="text-success"><Video size={14} /> Video Call</span>
                   </div>
                 </div>
                 <div className="radio-circle"></div>
               </div>
             ))}
          </div>
        </div>

        <div className="scheduling-panel panel p-8">
          <h3 className="text-xl font-bold mb-6">Schedule Date & Time</h3>
          
          <div className="calendar-week-slider mb-8">
            {dates.map((d, i) => (
               <div 
                 key={i} 
                 className={`date-card ${selectedDate === i ? 'active' : ''}`}
                 onClick={() => setSelectedDate(i)}
               >
                 <span className="date-day">{d.day}</span>
                 <span className="date-num">{d.date}</span>
               </div>
            ))}
          </div>

          <h4 className="font-bold text-sm text-muted uppercase tracking-wider" style={{ marginBottom: '1.5rem', marginTop: '2.5rem' }}>Available Slots</h4>
          <div className="time-slots-grid" style={{ marginBottom: '3rem' }}>
            {timeSlots.map((time, i) => (
              <button 
                key={i} 
                className={`time-slot-btn ${selectedTime === time ? 'active' : ''}`}
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </button>
            ))}
          </div>

          <div className="booking-summary">
            <button 
              className="btn btn-primary font-bold flex-center"
              style={{ width: '100%', padding: '1.2rem', fontSize: '1.125rem', gap: '0.75rem' }}
              disabled={!selectedDoc || selectedDate === null || !selectedTime}
              onClick={handleBook}
            >
              <Video size={22} /> Book Video Consultation
            </button>
            <p className="text-center text-muted" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>Consultation fee will be calculated at checkout based on insurance.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
