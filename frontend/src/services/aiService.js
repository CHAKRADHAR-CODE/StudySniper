import axios from "axios";

// Using relative path for the Vite proxy
const API_BASE_URL = "/api";

const aiService = {
  analyzeSyllabus: async (filesOrContent, userId, subjects = []) => {
    try {
      const formData = new FormData();
      if (Array.isArray(filesOrContent)) {
        filesOrContent.forEach(file => {
          formData.append("files", file);
        });
      } else if (filesOrContent instanceof File) {
        formData.append("files", filesOrContent);
      } else {
        formData.append("content", filesOrContent);
      }
      formData.append("userId", userId);
      formData.append("subjects", JSON.stringify(subjects));

      const response = await axios.post(`${API_BASE_URL}/analyze`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 120000 // Increased timeout for multiple files
      });
      return response.data;
    } catch (error) {
      console.error("AI Syllabus Analysis Error:", error);
      throw error;
    }
  },

  chat: async (messages, userId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chat`, { messages, userId }, {
        timeout: 60000
      });
      return response.data;
    } catch (error) {
      console.error("AI Chat Error:", error);
      throw error;
    }
  },

  generateStudyPlan: async (studentData, userId) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/study-plan`, { studentData, userId }, {
        timeout: 60000
      });
      return response.data;
    } catch (error) {
      console.error("AI Study Plan Error:", error);
      throw error;
    }
  },

  analyzeQuestionBank: async (files, userId) => {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      formData.append("userId", userId);

      const response = await axios.post(`${API_BASE_URL}/analyze-question-bank`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000
      });
      return response.data;
    } catch (error) {
      console.error("AI Question Bank Error:", error);
      throw error;
    }
  }
};

export default aiService;
