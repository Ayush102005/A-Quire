import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./PAGES/home";
import Auth from "./PAGES/login_signup";
import StudentInfo from "./PAGES/student_info";
import Dashboard from "./PAGES/dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth initialPage="login" />} />
        <Route path="/signup" element={<Auth initialPage="signup" />} />
        <Route path="/studentinfo" element={<StudentInfo />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}