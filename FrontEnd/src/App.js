import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Summary from './pages/Summary';
import Breakdown from './pages/Breakdown';
import Anomalies from './pages/Anomalies';
import Recommendations from './pages/Recommendations';
import Jobs from './pages/Jobs';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="summary" element={<Summary />} />
            <Route path="breakdown" element={<Breakdown />} />
            <Route path="anomalies" element={<Anomalies />} />
            <Route path="recommendations" element={<Recommendations />} />
            <Route path="jobs" element={<Jobs />} />
            <Route path="jobs/:id" element={<Jobs />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
        <ToastContainer position="top-right" autoClose={3000} />
      </Router>
    </AuthProvider>
  );
}

export default App;

