import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Loans from './pages/Loans';
import Login from './pages/Login';
import Register from './pages/Register';

const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    return token ? children : <Navigate to="/login" />;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
                <Route path="/loans" element={<PrivateRoute><Loans /></PrivateRoute>} />
                <Route path="/transactions" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
