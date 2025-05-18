import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Login.css';
import camionImage from '../pictures/camion.png'; // Import image

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "L'email est requis";
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "L'email est invalide";
    if (!password) newErrors.password = "Le mot de passe est requis";
    return newErrors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const formErrors = validateForm();

    if (Object.keys(formErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        console.log('Form submission:', { email: trimmedEmail, password: trimmedPassword });
        const user = await login(trimmedEmail, trimmedPassword);
        console.log('Login result:', user);
        navigate('/fleet/dashboard', { replace: true });
      } catch (err) {
        console.error('Login error:', err.message);
        setErrors({ auth: err.message === 'Invalid login credentials' ? "Email ou mot de passe incorrect" : err.message });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setErrors(formErrors);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Connexion</h2>
          <div className="login-logo">
            <img src={camionImage} alt="Camion Logo" />
          </div>
        </div>

        <form onSubmit={handleLogin} className="login-form" aria-label="Formulaire de connexion">
          <div className="forme-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Entrez votre email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={errors.email ? "input-error" : ""}
              disabled={isSubmitting}
              aria-label="Adresse email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="forme-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              placeholder="Entrez votre mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={errors.password ? "input-error" : ""}
              disabled={isSubmitting}
              aria-label="Mot de passe"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          {errors.auth && <div className="auth-error">{errors.auth}</div>}

          <button
            type="submit"
            className="btne-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Connexion en cours..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;