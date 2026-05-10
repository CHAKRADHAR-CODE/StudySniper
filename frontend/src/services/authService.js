import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const authService = {
  sendOTP: async (email, type = 'register') => {
    const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, { email, type });
    return response.data;
  },

  verifyOTP: async (email, otp) => {
    const response = await axios.post(`${API_BASE_URL}/auth/verify-otp`, { email, otp });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
    return response.data;
  }
};
