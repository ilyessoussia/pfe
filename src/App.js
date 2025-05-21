import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import ProductDetail from "./siteweb/ProductDetail";
import Solutions from "./siteweb/Solutions";
import MissionValues from "./siteweb/MissionValues";
import Login from "./pages/Login";
import Fleet from "./pages/FleetDashboard";
import TruckDetails from "./pages/TruckDetails";
import Parc from "./pages/Parc";
import StockManagement from "./pages/StockManagement";
import TripScheduler from "./pages/TripScheduler";
import MaintenanceOverview from "./pages/MaintenanceOverview";
import IncidentManagement from './pages/IncidentManagement';
import ProtectedRoute from "./ProtectedRoute";
import { AuthProvider } from "./AuthContext";
import TrailerDashboard from "./pages/TrailerDashboard";
import TrailerDetails from "./pages/TrailerDetails";
import DriverPaymentDashboard from "./pages/DriverPaymentDashboard";
import StockCarburant from "./pages/StockCarburant";
import DailyCashTracking from './pages/DailyCashTracking';
import FleetChatbot from './pages/FleetChatbot';

const App = () => (
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductDetail />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/MissionValues" element={<MissionValues />} />
        <Route path="/fleet" element={<Login />} />
        <Route
          path="/fleet/dashboard"
          element={
            <ProtectedRoute>
              <Fleet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fleet/truck/:id"
          element={
            <ProtectedRoute>
              <TruckDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parc"
          element={
            <ProtectedRoute>
              <Parc />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <StockManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <TripScheduler />
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <MaintenanceOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <IncidentManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trailers"
          element={
            <ProtectedRoute>
              <TrailerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trailers/:id"
          element={
            <ProtectedRoute>
              <TrailerDetails />
            </ProtectedRoute>
          }
        />
        <Route 
        path="/fleet/stock-carburant"
         element={
          <ProtectedRoute>
         <StockCarburant /> 
         </ProtectedRoute>
         }
         />
          <Route
          path="/driver-payments"
          element={
            <ProtectedRoute>
              <DriverPaymentDashboard />
            </ProtectedRoute>
          }
        />
             <Route
          path="/chatbot"
          element={
            <ProtectedRoute>
              <FleetChatbot />
            </ProtectedRoute>
          }
        />
        <Route
          path="//cash-tracking"
          element={
            <ProtectedRoute>
              <DailyCashTracking/>
            </ProtectedRoute>
          }
        />
        
      </Routes>
    </Router>
  </AuthProvider>
);

export default App;