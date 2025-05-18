import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check current session on mount
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error fetching session:', error);
        } else {
          console.log('Initial session:', session);
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Unexpected error fetching session:', err);
      }
    };

    getSession();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', { event, session });
      setUser(session?.user ?? null);
    });

    // Cleanup listener on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    // Validate inputs
    if (typeof email !== 'string' || typeof password !== 'string') {
      console.error('Invalid input types:', { email, password });
      throw new Error('Email et mot de passe doivent être des chaînes de caractères');
    }

    console.log('Attempting login with:', { email, password });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Supabase login error:', error.message);
        throw new Error(error.message);
      }

      console.log('Login successful, user:', data.user);
      setUser(data.user);
      return data.user;
    } catch (err) {
      console.error('Unexpected login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      console.log('Logged out successfully');
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);