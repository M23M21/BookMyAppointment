import React, { useState, useEffect } from 'react';
import { db } from '../../utils/firebase';
import { collection, doc, setDoc, getDocs, getDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';

const CustomerDashboard = () => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState('all'); 
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceDuration, setServiceDuration] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (selectedBusiness?.id) {
      fetchBusinessData(selectedBusiness.id);
    } else {
      clearBusinessData();
    }
  }, [selectedBusiness]);

  useEffect(() => {
    if (selectedBusiness?.uidTeamAvailability) {
      fetchTeamMembers(selectedBusiness.uidTeamAvailability);
    }
  }, [selectedBusiness?.uidTeamAvailability]);

  const fetchBusinesses = async () => {
    try {
      const businessesSnapshot = await getDocs(collection(db, 'businesses'));
      const businessesData = businessesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBusinesses(businessesData);
      console.log('Fetched businesses:', businessesData);
    } catch (error) {
      console.error('Error fetching businesses:', error.message);
      setErrorMessage('Failed to fetch businesses. Please try again.');
    }
  };

  const fetchBusinessData = async (id) => {
    try {
      const businessRef = doc(db, 'businesses', id);
      const businessSnapshot = await getDoc(businessRef);
      if (businessSnapshot.exists()) {
        const businessData = businessSnapshot.data();
        setSelectedBusiness({ id, ...businessData });
        setErrorMessage('');

        fetchServices(id);
      } else {
        setSelectedBusiness(null);
        setErrorMessage('Business not found. Please check the ID and try again.');
      }
    } catch (error) {
      console.error('Error fetching business data:', error.message);
      setErrorMessage('Failed to fetch business data. Please try again.');
    }
  };

  const fetchServices = async (businessId) => {
    try {
      const servicesSnapshot = await getDocs(
        query(collection(db, 'services'), where('businessId', '==', businessId))
      );
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServices(servicesData);
      console.log('Fetched services:', servicesData);
    } catch (error) {
      console.error('Error fetching services:', error.message);
      setErrorMessage('Failed to fetch services. Please try again.');
    }
  };

  const fetchTeamMembers = async (uidTeamAvailability) => {
    try {
      const userIds = Object.keys(uidTeamAvailability || {});
      const usersPromises = userIds.map(id => getDoc(doc(db, 'users', id)));
      const usersSnapshots = await Promise.all(usersPromises);

      const teamMembersData = usersSnapshots.map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }));
      setTeamMembers(teamMembersData);
      console.log('Fetched team members:', teamMembersData);
    } catch (error) {
      console.error('Error fetching team members:', error.message);
      setErrorMessage('Failed to fetch team members. Please try again.');
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedBusiness || !selectedService || !appointmentDate || !appointmentTime || !customerName || !customerEmail || !customerPhone) {
      alert('Please fill in all the required fields.');
      return;
    }
  
    const teamMemberData = selectedTeamMember === 'all'
      ? teamMembers.map(member => ({ id: member.id, displayName: member.displayName }))
      : [{ id: selectedTeamMember.id, displayName: selectedTeamMember.displayName }];
  
    try {
      const appointmentRef = doc(collection(db, 'appointments'));
  
      const appointmentData = {
        businessId: selectedBusiness.id || '',
        teamMemberData: teamMemberData,
        serviceId: selectedService?.id || '',
        date: appointmentDate || '',
        time: appointmentTime || '',
        name: selectedService?.name || '',
        description: serviceDescription || '', 
        duration: serviceDuration || '', 
        status: 'booked',
        customerName: customerName || '',
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || ''
      };
  
      await setDoc(appointmentRef, appointmentData);
      console.log('Appointment booked:', appointmentData);
  
      const emailResponse = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: customerEmail,
          subject: 'Appointment Confirmation',
          message: `Dear ${customerName},\n\nYour appointment for ${selectedService?.name} is confirmed on ${appointmentDate} at ${appointmentTime}.\n\nThank you!`,
        }),
      });
  
      if (emailResponse.ok) {
        console.log('Email sent successfully');
        alert('Appointment booked successfully! A confirmation email has been sent.');
      } else {
        console.error('Failed to send email:', emailResponse.statusText);
        alert('Appointment booked, but failed to send confirmation email.');
      }
  
      clearBusinessData();
    } catch (error) {
      console.error('Error booking appointment:', error.message);
      alert('Failed to book appointment. Please try again.');
    }
  };

  const handleTeamMemberChange = (e) => {
    const value = e.target.value;
    if (value === 'all') {
      setSelectedTeamMember('all');
    } else {
      const selected = teamMembers.find(member => member.id === value);
      setSelectedTeamMember(selected);
    }
  };

  const handleServiceChange = (e) => {
    const selectedId = e.target.value;
    const selected = services.find(service => service.id === selectedId);
    setSelectedService(selected);
    if (selected) {
      setServiceDescription(selected.description || '');
      setServiceDuration(
        `Duration: ${selected.duration?.hours || '0'} hours ${selected.duration?.minutes || '0'} minutes` || ''
      );
    } else {
      setServiceDescription('');
      setServiceDuration('');
    }
  };

  const clearBusinessData = () => {
    setSelectedBusiness(null);
    setTeamMembers([]);
    setServices([]);
    setSelectedService(null);
    setSelectedTeamMember('all');
    setAppointmentDate('');
    setAppointmentTime('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Book an Appointment</h2>

        {businesses.length > 0 ? (
          <div className="mb-6">
            <label htmlFor="business-select" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
              Select a Business:
            </label>
            <select
              id="business-select"
              className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
              value={selectedBusiness ? selectedBusiness.id : ''}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selected = businesses.find(business => business.id === selectedId);
                setSelectedBusiness(selected);
              }}
            >
              <option key="default" value="">Select a business</option>
              {businesses.map(business => (
                <option key={business.id} value={business.id}>
                  {business.name} - {business.address}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p className="text-gray-600">Loading businesses...</p>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 border border-red-300 rounded">
            {errorMessage}
          </div>
        )}

        {selectedBusiness && (
          <>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-700">
                {selectedBusiness.name}
              </h3>
              <p className="text-sm font-medium text-gray-600 mb-2">{selectedBusiness.details}</p>
              <Link href={`/booking/${selectedBusiness.id}`}>
                Go to Booking Page for {selectedBusiness.name}
              </Link>
            </div>

            <div className="mb-6">
              <label htmlFor="service-select" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Select Service:
              </label>
              <select
                id="service-select"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={selectedService ? selectedService.id : ''}
                onChange={handleServiceChange}
              >
                <option key="default" value="">Select a service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                  <h4 className="text-md font-semibold mb-2">Service Details:</h4>
                  <p className="text-sm font-medium text-gray-600 mb-2">Description: {serviceDescription}</p>
                  <p className="text-sm font-medium text-gray-600">Duration: {serviceDuration}</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="team-member-select" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Select Team Member:
              </label>
              <select
                id="team-member-select"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={selectedTeamMember === 'all' ? 'all' : selectedTeamMember.id}
                onChange={handleTeamMemberChange}
              >
                <option value="all">All Team Members</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.displayName} ({member.email})
                  </option>
                ))}
              </select>

              <div className="mt-4">
                <h3 className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">Team Member Info:</h3>
                {selectedTeamMember === 'all' ? (
                  <TeamMemberList teamMembers={teamMembers} />
                ) : (
                  selectedTeamMember && (
                    <div className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                      <h4 className="text-md font-semibold mb-2">{selectedTeamMember.displayName}</h4>
                      <p className="text-sm font-medium text-gray-600 mb-2">Email: {selectedTeamMember.email}</p>
                      <ul className="list-disc pl-5">
                        {Object.keys(selectedTeamMember.availability || {}).map(day => (
                          <li key={day} className={`text-sm ${selectedTeamMember.availability[day] === 'Available' ? 'text-green-500' : 'text-red-500'}`}>
                            {day}: {selectedTeamMember.availability[day] || 'Not set'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="appointment-date" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Appointment Date:
              </label>
              <input
                type="date"
                id="appointment-date"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="appointment-time" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Appointment Time:
              </label>
              <input
                type="time"
                id="appointment-time"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={appointmentTime}
                onChange={(e) => setAppointmentTime(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label htmlFor="customer-name" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Customer Name:
              </label>
              <input
                type="text"
                id="customer-name"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="customer-email" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Customer Email:
              </label>
              <input
                type="email"
                id="customer-email"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="customer-phone" className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2">
                Customer Phone:
              </label>
              <input
                type="tel"
                id="customer-phone"
                className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 leading-tight focus:outline-none focus:bg-white focus:border-gray-500"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            <button
              type="button"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-700"
              onClick={handleBookAppointment}
            >
              Book Appointment
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const TeamMemberList = React.memo(({ teamMembers }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {teamMembers.map(member => (
      <div key={member.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
        <h4 className="text-md font-semibold mb-2">{member.displayName}</h4>
        <p className="text-sm font-medium text-gray-600 mb-2">Email: {member.email}</p>
        <ul className="list-disc pl-5">
          {Object.keys(member.availability || {}).map(day => (
            <li key={day} className={`text-sm ${member.availability[day] === 'Available' ? 'text-green-500' : 'text-red-500'}`}>
              {day}: {member.availability[day] || 'Not set'}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
));

export default CustomerDashboard;
