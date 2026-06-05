import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const RoleContext = createContext();

export const RoleProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [activeUser, setActiveUser] = useState(() => {
    const cached = localStorage.getItem('activeUser');
    return cached ? JSON.parse(cached) : null;
  });
  const [activeRole, setActiveRole] = useState(() => {
    const cached = localStorage.getItem('activeUser');
    return cached ? JSON.parse(cached).role : 'student';
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('ui-theme') || 'dark');
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Set initial axios auth headers if token exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Fetch all profiles (useful for listing accounts in admin or role switcher)
  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/profiles');
      setProfiles(res.data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [isAuthenticated]);

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
    if (!isAuthenticated) return;
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Periodically refresh notifications every 1 minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeUser]);

  // WebSocket connection lifecycle
  useEffect(() => {
    if (isAuthenticated && token) {
      const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
      console.log('Connecting to WebSockets:', socketUrl);
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.emit('authenticate', { token });

      // Listen for real-time online status changes
      newSocket.on('userStatusChanged', (data) => {
        console.log('WebSocket: userStatusChanged received:', data);
        
        // Update local profiles list dynamically to reflect isOnline change
        setProfiles(prev => prev.map(p => p._id === data.userId ? { ...p, isOnline: data.isOnline } : p));

        setOnlineUsers(prev => {
          const filtered = prev.filter(u => u.userId !== data.userId);
          if (data.isOnline) {
            return [...filtered, data];
          }
          return filtered;
        });
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  // Fetch initial online users list by inspecting seeded profiles
  useEffect(() => {
    if (profiles.length > 0) {
      const onlineList = profiles
        .filter(p => p.isOnline)
        .map(p => ({
          userId: p._id,
          username: p.username,
          role: p.role,
          isOnline: true,
          lastActiveAt: p.lastActiveAt
        }));
      setOnlineUsers(onlineList);
    }
  }, [profiles]);

  const markNotificationRead = async (id) => {
    if (!isAuthenticated) return;
    try {
      await axios.put(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    const { token: jwtToken, user } = res.data;
    
    setToken(jwtToken);
    setActiveUser(user);
    setActiveRole(user.role);
    setIsAuthenticated(true);
    
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('activeUser', JSON.stringify(user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    
    return user;
  };

  const register = async (username, email, password, role) => {
    const res = await axios.post('/api/auth/register', { username, email, password, role });
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout API call failed:', err);
    }

    setToken(null);
    setActiveUser(null);
    setActiveRole('student');
    setIsAuthenticated(false);
    
    localStorage.removeItem('token');
    localStorage.removeItem('activeUser');
    delete axios.defaults.headers.common['Authorization'];
    
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);
    setOnlineUsers([]);
  };

  // Perform a fast login for developer simulation dropdown
  const switchRole = async (role) => {
    try {
      const emailMap = {
        student: 'alex.student@example.com',
        recruiter: 'sarah.recruiter@example.com',
        admin: 'devon.admin@example.com'
      };
      const email = emailMap[role];
      if (email) {
        await login(email, 'password123');
      }
    } catch (err) {
      console.error('Fast role switch failed:', err);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getAuthHeaders = () => {
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`
    };
  };

  return (
    <RoleContext.Provider value={{
      activeRole,
      profiles,
      activeUser,
      isAuthenticated,
      loading,
      theme,
      notifications,
      mobileMenuOpen,
      setMobileMenuOpen,
      onlineUsers,
      login,
      register,
      logout,
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
