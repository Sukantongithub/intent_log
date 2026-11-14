import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, registerUser } from '../services/api';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('intentlog_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    // Default fallback to Application Super Admin
    return {
      user_id: 'USER_SUPER_ADMIN',
      name: 'Application Super Admin',
      email: 'admin@intentlog.ai',
      role: 'super_admin',
      role_level: 5,
      role_display_name: 'Application Super Admin',
      org_id: 'GLOBAL',
      status: 'active',
      token: 'intentlog_demo_super_admin_token'
    };
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('intentlog_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('intentlog_user');
    }
  }, [user]);

  const login = async (email, password) => {
    try {
      const data = await loginUser({ email, password });
      setUser(data);
      toast.success(`Welcome back, ${data.name}! [${data.role_display_name || data.role.toUpperCase()}]`);
      return data;
    } catch (err) {
      toast.error(err.message || 'Login failed.');
      throw err;
    }
  };

  const register = async (name, email, password, role = 'employee', orgId = 'ORG_ACME') => {
    try {
      const data = await registerUser({ name, email, password, role, org_id: orgId });
      setUser(data);
      toast.success(`Account created: ${data.name} [${data.role_display_name || role}]`);
      return data;
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
      throw err;
    }
  };

  const quickLogin = (presetUser) => {
    setUser(presetUser);
    localStorage.setItem('intentlog_user', JSON.stringify(presetUser));
    toast.info(`Switched active profile: ${presetUser.name} (${presetUser.role_display_name || presetUser.role.toUpperCase()})`);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('intentlog_user');
    toast.info('Logged out successfully.');
  };

  const role = user?.role || 'employee';
  const roleLevel = user?.role_level || 1;
  const orgId = user?.org_id || 'ORG_ACME';

  const updateCurrentUser = (partialUser) => {
    setUser(prev => {
      const updated = { ...prev, ...partialUser };
      localStorage.setItem('intentlog_user', JSON.stringify(updated));
      return updated;
    });
  };

  const value = {
    user,
    role,
    roleLevel,
    orgId,
    roleDisplayName: user?.role_display_name || 'Employee',
    isAdmin: roleLevel >= 4 || role === 'super_admin' || role === 'org_admin',
    isSuperAdmin: role === 'super_admin' || roleLevel === 5,
    isOrgAdmin: role === 'org_admin' || roleLevel === 4,
    isManager: role === 'manager' || roleLevel === 3,
    isTeamLead: role === 'team_lead' || roleLevel === 2,
    isEmployee: role === 'employee' || roleLevel === 1,
    canManageUsers: roleLevel >= 4, // Super Admin & Org Admin
    canManageTeam: roleLevel >= 3,  // Super Admin, Org Admin, Manager
    canAssignTasks: roleLevel >= 2, // Super Admin, Org Admin, Manager, Team Lead
    login,
    register,
    quickLogin,
    updateCurrentUser,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
