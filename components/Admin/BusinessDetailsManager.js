import React, { useState, useEffect } from 'react';
import { db, storage } from '../../utils/firebase';
import { collection, doc, setDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage functions
import BusinessAvailabilityManager from './BusinessAvailabilityManager';
import BusinessServices from './BusinessServices';

const BusinessDetailsManager = () => {
  const [user, setUser] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [newBusinessDetails, setNewBusinessDetails] = useState('');
  const [newBusinessPhone, setNewBusinessPhone] = useState('');
  const [newBusinessAddress, setNewBusinessAddress] = useState('');
  const [newBusinessCategory, setNewBusinessCategory] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editBusinessDetails, setEditBusinessDetails] = useState('');
  const [editBusinessPhone, setEditBusinessPhone] = useState('');
  const [editBusinessAddress, setEditBusinessAddress] = useState('');
  const [editBusinessCategory, setEditBusinessCategory] = useState('');
  const [services, setServices] = useState([]);
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
        fetchBusinesses(user.uid);
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedBusiness && selectedBusiness.id) {
      fetchServices(selectedBusiness.id);
      setLogoPreview(selectedBusiness.logo || ''); // Set the logo preview to the existing logo URL
    }
  }, [selectedBusiness]);

  const fetchBusinesses = async (userId) => {
    try {
      const businessesSnapshot = await getDocs(
        query(collection(db, 'businesses'), where('userId', '==', userId))
      );
      const businessesData = businessesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBusinesses(businessesData);

      if (businessesData.length > 0) {
        const business = businessesData[0];
        setSelectedBusiness(business);
        setEditBusinessName(business.name);
        setEditBusinessDetails(business.details);
        setEditBusinessPhone(business.phone);
        setEditBusinessAddress(business.address);
        setEditBusinessCategory(business.category);
        setLogoPreview(business.logo || '');
      } else {
        setSelectedBusiness(null);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error.message);
    }
  };

  const fetchServices = async (businessId) => {
    if (!businessId) {
      console.error('Invalid businessId provided for fetching services.');
      return;
    }

    try {
      const servicesSnapshot = await getDocs(
        query(collection(db, 'services'), where('businessId', '==', businessId))
      );
      const servicesData = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error.message);
    }
  };

  const handleLogoChange = async (event) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setLogo(file); // Store the file in state
      setLogoPreview(URL.createObjectURL(file)); // Display a preview of the selected logo

      try {
        const storageRef = ref(storage, `logos/${selectedBusiness ? selectedBusiness.id : 'new'}/${file.name}`);
        await uploadBytes(storageRef, file);
        const logoUrl = await getDownloadURL(storageRef);

        if (selectedBusiness) {
          const businessRef = doc(db, 'businesses', selectedBusiness.id);
          await updateDoc(businessRef, { logo: logoUrl });
          setSelectedBusiness((prev) => ({ ...prev, logo: logoUrl }));
          alert('Logo updated successfully!');
        }
      } catch (error) {
        console.error('Error uploading logo:', error.message);
        alert('Failed to upload logo. Please try again.');
      }
    }
  };

  const handleCreateBusiness = async () => {
    if (!newBusinessName || !newBusinessDetails || !newBusinessPhone || !newBusinessAddress || !newBusinessCategory) {
      alert('Please fill out all fields.');
      return;
    }

    if (selectedBusiness) {
      alert('You already have a business. Please update it if necessary.');
      return;
    }

    try {
      const auth = getAuth();
      const userId = auth.currentUser.uid;
      let logoUrl = '';
      if (logo) {
        const storageRef = ref(storage, `logos/${userId}/${logo.name}`);
        await uploadBytes(storageRef, logo);
        logoUrl = await getDownloadURL(storageRef);
      }

      const newBusiness = {
        name: newBusinessName,
        details: newBusinessDetails,
        phone: newBusinessPhone,
        address: newBusinessAddress,
        category: newBusinessCategory,
        userId,
        logo: logoUrl,
      };

      const docRef = doc(collection(db, 'businesses'));
      await setDoc(docRef, newBusiness);

      alert('Business created successfully!');
      setNewBusinessName('');
      setNewBusinessDetails('');
      setNewBusinessPhone('');
      setNewBusinessAddress('');
      setNewBusinessCategory('');
      fetchBusinesses(userId);
    } catch (error) {
      console.error('Error creating business:', error.message);
      alert('Failed to create business. Please try again.');
    }
  };

  const handleUpdateBusiness = async () => {
    if (!selectedBusiness || !editBusinessName || !editBusinessDetails || !editBusinessPhone || !editBusinessAddress || !editBusinessCategory) {
      alert('Please fill out all fields.');
      return;
    }

    try {
      let logoUrl = selectedBusiness.logo || '';
      if (logo) {
        const storageRef = ref(storage, `logos/${selectedBusiness.id}/${logo.name}`);
        await uploadBytes(storageRef, logo);
        logoUrl = await getDownloadURL(storageRef);
      }

      const businessRef = doc(db, 'businesses', selectedBusiness.id);
      await updateDoc(businessRef, {
        name: editBusinessName,
        details: editBusinessDetails,
        phone: editBusinessPhone,
        address: editBusinessAddress,
        category: editBusinessCategory,
        logo: logoUrl,
      });

      alert('Business updated successfully!');
      fetchBusinesses(user.uid);
    } catch (error) {
      console.error('Error updating business:', error.message);
      alert('Failed to update business. Please try again.');
    }
  };

  const handleDeleteBusiness = async () => {
    if (!selectedBusiness) {
      alert('Please select a business to delete.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this business?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'businesses', selectedBusiness.id));
      alert('Business deleted successfully!');
      setSelectedBusiness(null);
      fetchBusinesses(user.uid);
    } catch (error) {
      console.error('Error deleting business:', error.message);
      alert('Failed to delete business. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-6 bg-gray-100 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8 text-blue-600">Business Details</h1>

      {!selectedBusiness && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Create New Business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="newBusinessName" className="block text-gray-700 font-bold mb-2">Business Name</label>
              <input
                id="newBusinessName"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newBusinessPhone" className="block text-gray-700 font-bold mb-2">Business Phone</label>
              <input
                id="newBusinessPhone"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newBusinessPhone}
                onChange={(e) => setNewBusinessPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newBusinessAddress" className="block text-gray-700 font-bold mb-2">Business Address</label>
              <input
                id="newBusinessAddress"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newBusinessAddress}
                onChange={(e) => setNewBusinessAddress(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="newBusinessCategory" className="block text-gray-700 font-bold mb-2">Business Category</label>
              <select
                id="newBusinessCategory"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newBusinessCategory}
                onChange={(e) => setNewBusinessCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Beauty and Wellness">Beauty and Wellness</option>
                <option value="Sport">Sport</option>
                <option value="Personal Meetings and Services">Personal Meetings and Services</option>
                <option value="Medical">Medical</option>
                <option value="Events and Entertainment">Events and Entertainment</option>
                <option value="Education">Education</option>
                <option value="Retailers">Retailers</option>
                <option value="Other Category">Other Category</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label htmlFor="newBusinessDetails" className="block text-gray-700 font-bold mb-2">Business Details</label>
            <textarea
              id="newBusinessDetails"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              value={newBusinessDetails}
              onChange={(e) => setNewBusinessDetails(e.target.value)}
            />
          </div>
          <button
            onClick={handleCreateBusiness}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Create Business
          </button>
        </div>
      )}

      {selectedBusiness && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Edit Business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="editBusinessName" className="block text-gray-700 font-bold mb-2">Business Name</label>
              <input
                id="editBusinessName"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editBusinessName}
                onChange={(e) => setEditBusinessName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="editBusinessPhone" className="block text-gray-700 font-bold mb-2">Business Phone</label>
              <input
                id="editBusinessPhone"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editBusinessPhone}
                onChange={(e) => setEditBusinessPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="editBusinessAddress" className="block text-gray-700 font-bold mb-2">Business Address</label>
              <input
                id="editBusinessAddress"
                type="text"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editBusinessAddress}
                onChange={(e) => setEditBusinessAddress(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="editBusinessCategory" className="block text-gray-700 font-bold mb-2">Business Category</label>
              <select
                id="editBusinessCategory"
                className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={editBusinessCategory}
                onChange={(e) => setEditBusinessCategory(e.target.value)}
              >
                <option value="">Select Category</option>
                <option value="Beauty and Wellness">Beauty and Wellness</option>
                <option value="Sport">Sport</option>
                <option value="Personal Meetings and Services">Personal Meetings and Services</option>
                <option value="Medical">Medical</option>
                <option value="Events and Entertainment">Events and Entertainment</option>
                <option value="Education">Education</option>
                <option value="Retailers">Retailers</option>
                <option value="Other Category">Other Category</option>
              </select>
            </div>
          </div>
          <div className="mb-6">
            <label htmlFor="editBusinessDetails" className="block text-gray-700 font-bold mb-2">Business Details</label>
            <textarea
              id="editBusinessDetails"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="4"
              value={editBusinessDetails}
              onChange={(e) => setEditBusinessDetails(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label htmlFor="logoUpload" className="block text-gray-700 font-bold mb-2">Business Logo</label>
            <input
              id="logoUpload"
              type="file"
              accept="image/*"
              className="border border-gray-300 p-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={handleLogoChange}
            />
            {logoPreview && <img src={logoPreview} alt="Business Logo" className="mt-4 w-32 h-32 object-cover rounded" />}
          </div>
          <div className="flex space-x-4 items-center">
            <button
              onClick={handleUpdateBusiness}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Update Business
            </button>
            <button
              onClick={handleDeleteBusiness}
              className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Delete Business
            </button>
            <span className="bg-gray-300 text-black py-2 px-4 rounded focus:outline-none">
              Business ID: {selectedBusiness.id}
            </span>
          </div>
        </div>
      )}

      {selectedBusiness && (
        <BusinessAvailabilityManager selectedBusiness={selectedBusiness} />
      )}

      {selectedBusiness && selectedBusiness.logo && (
        <img src={selectedBusiness.logo} alt="Business Logo" className="mt-4 w-32 h-32 object-cover rounded" />
      )}

      {selectedBusiness && selectedBusiness.id && (
        <BusinessServices
          businessId={selectedBusiness.id}
          onServicesUpdated={() => fetchServices(selectedBusiness.id)}
        />
      )}
    </div>
  );
};

export default BusinessDetailsManager;
