import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [activeRole, setActiveRole] = useState(() => localStorage.getItem('user-role') || 'student');
  const [profiles, setProfiles] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('ui-theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch available profiles on load
  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/profiles');
      setProfiles(res.data);
      
      // Set initial active user matching activeRole
      const matchingUser = res.data.find(u => u.role === activeRole);
      if (matchingUser) {
        setActiveUser(matchingUser);
      } else if (res.data.length > 0) {
        setActiveUser(res.data[0]);
        setActiveRole(res.data[0].role);
      }
    } catch (error) {
      console.error('Failed to load simulated profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Update active user when role changes
  useEffect(() => {
    if (profiles.length > 0) {
      const matchingUser = profiles.find(u => u.role === activeRole);
      if (matchingUser) {
        setActiveUser(matchingUser);
      }
    }
    localStorage.setItem('user-role', activeRole);
    fetchNotifications();
  }, [activeRole, profiles]);

  // Handle Theme switching
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('ui-theme', theme);
  }, [theme]);

  // Fetch notifications for the active user
  const fetchNotifications = async () => {
    if (!activeUser) return;
    try {
      const res = await axios.get('/api/notifications', {
        headers: {
          'x-user-role': activeRole,
          'x-user-id': activeUser._id
        }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  const markNotificationRead = async (id) => {
    if (!activeUser) return;
    try {
      await axios.put(`/api/notifications/${id}/read`, {}, {
        headers: {
          'x-user-role': activeRole,
          'x-user-id': activeUser._id
        }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const switchRole = (role) => {
    setActiveRole(role);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Helper for axios requests to get correct simulated auth headers
  const getAuthHeaders = () => {
    if (!activeUser) return {};
    return {
      'x-user-role': activeRole,
      'x-user-id': activeUser._id
    };
  };

  return (
    <RoleContext.Provider value={{
      activeRole,
      profiles,
      activeUser,
      loading,
      theme,
      notifications,
      mobileMenuOpen,
      setMobileMenuOpen,
      switchRole,
      toggleTheme,
      getAuthHeaders,
      fetchNotifications,
      markNotificationRead,
      refreshProfiles: fetchProfiles
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
export default RoleContext;
