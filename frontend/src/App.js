import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import ChatPage from "./pages/ChatPage";
import CallPage from "./pages/CallPage";
import AvatarCustomize from "./pages/AvatarCustomize";
import FocusMode from "./pages/FocusMode";
import ChallengePage from "./pages/ChallengePage";
import RoutinesPage from "./pages/RoutinesPage";
import WeeklySummary from "./pages/WeeklySummary";
import ProgressCard from "./pages/ProgressCard";

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id SYNCHRONOUSLY (before any route renders)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
      <Route path="/call" element={<ProtectedRoute><CallPage /></ProtectedRoute>} />
      <Route path="/customize" element={<ProtectedRoute><AvatarCustomize /></ProtectedRoute>} />
      <Route path="/focus" element={<ProtectedRoute><FocusMode /></ProtectedRoute>} />
      <Route path="/challenges" element={<ProtectedRoute><ChallengePage /></ProtectedRoute>} />
      <Route path="/routines" element={<ProtectedRoute><RoutinesPage /></ProtectedRoute>} />
      <Route path="/summary" element={<ProtectedRoute><WeeklySummary /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressCard /></ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
