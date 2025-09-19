const axios = require('axios');

async function testIssueSubmission() {
  try {
    // First login to get token
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@jharkhand.gov.in',
      password: 'admin123456'
    });
    
    const token = loginResponse.data.token;
    console.log('Token obtained:', token.substring(0, 20) + '...');
    
    // Create FormData for issue submission
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Add form data
    formData.append('title', 'Test Issue with Fixed FormData');
    formData.append('description', 'This is a test issue with properly structured FormData');
    formData.append('category', 'Road & Pothole Issues');
    formData.append('subcategory', '');
    
    // Add location data - properly structured for FormData
    formData.append('location.type', 'Point');
    formData.append('location.coordinates', JSON.stringify([85.3096, 23.3441]));
    formData.append('location.address', 'Test Address, Ranchi');
    formData.append('location.city', 'Ranchi');
    formData.append('location.state', 'Jharkhand');
    
    formData.append('priority', 'medium');
    formData.append('isAnonymous', 'false');
    
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      console.log(key, value);
    }
    
    // Submit issue
    const response = await axios.post('http://localhost:5000/api/issues', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('Issue submitted successfully:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testIssueSubmission();
