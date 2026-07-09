'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminUser } from '@/lib/api';
import {
  Users, Search, Filter, MoreVertical,
  ShieldCheck, ShieldAlert, UserX, UserCheck,
  Mail, Phone, Calendar, CreditCard,
  ChevronLeft, ChevronRight, Loader2,
  ExternalLink, CheckCircle2, AlertCircle, Clock, X,
  Eye, EyeOff, Save, MessageSquare, XCircle, Download, Plus
} from 'lucide-react';
import clsx from 'clsx';

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [creditInput, setCreditInput] = useState<number>(0);
  const [updatingCredits, setUpdatingCredits] = useState(false);
  const [brokerCredits, setBrokerCredits] = useState<any>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [creditPackages, setCreditPackages] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // User Provisioning States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState('AGENT');
  const [createPassword, setCreatePassword] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Show/Hide Password States
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch credit packages and manage toast timeout
  useEffect(() => {
    adminApi.getCreditPackages().then(res => {
      if (res.success && res.data) {
        setCreditPackages(res.data);
      }
    }).catch(err => console.error('Failed to load credit packages:', err));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Sync edit mode fields when selected user changes
  useEffect(() => {
    setIsEditMode(false);
    setEditPassword('');
    setEditError('');
    setEditSuccess('');
    setShowEditPassword(false);
    if (selectedUser) {
      setEditName(selectedUser.name || '');
      setEditPhone(selectedUser.phone || '');
      setEditRole(selectedUser.role || '');
      setCreditInput(selectedUser.creditsBalance || 0);

      if (['SOLO_BROKER', 'AGENT', 'FIRM'].includes(selectedUser.role)) {
        setLoadingCredits(true);
        setBrokerCredits(null);
        adminApi.getBrokerCredits(selectedUser.id)
          .then(res => {
            if (res.success && res.data) {
              setBrokerCredits(res.data);
            }
            setLoadingCredits(false);
          })
          .catch(() => setLoadingCredits(false));
      }
    }
  }, [selectedUser]);

  const handleUpdateCredits = async () => {
    if (!selectedUser) return;
    setUpdatingCredits(true);
    setEditError('');
    setEditSuccess('');
    try {
      const result = await adminApi.updateUserCredits(selectedUser.id, creditInput);
      if (result.success) {
        setEditSuccess('Credits updated successfully!');
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, creditsBalance: creditInput } : u));
        setSelectedUser(prev => (prev && prev.id === selectedUser.id) ? { ...prev, creditsBalance: creditInput } : prev);
      } else {
        setEditError(result.message || 'Failed to update credits');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setUpdatingCredits(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setIsSubmittingCreate(true);
    try {
      const result = await adminApi.createUser({
        name: createName,
        email: createEmail,
        phone: createPhone || undefined,
        role: createRole,
        password: createPassword,
      });
      if (result.success && result.data) {
        setCreateSuccess('User created successfully!');
        loadUsers();
        setTimeout(() => {
          setIsCreateOpen(false);
          setCreateSuccess('');
        }, 1000);
      } else {
        setCreateError(result.message || result.error || 'Failed to create user');
      }
    } catch (err: any) {
      setCreateError(err.message || 'An error occurred');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setEditError('');
    setEditSuccess('');
    setIsSubmittingEdit(true);
    try {
      const result = await adminApi.updateUser(selectedUser.id, {
        name: editName,
        phone: editPhone || undefined,
        role: editRole,
        password: editPassword || undefined,
      });
      if (result.success && result.data) {
        setEditSuccess('User updated successfully!');
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...result.data! } : u));
        setSelectedUser({ ...selectedUser, ...result.data! });
        setTimeout(() => {
          setIsEditMode(false);
          setEditSuccess('');
          setEditPassword('');
        }, 1000);
      } else {
        setEditError(result.message || result.error || 'Failed to update user');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Reset page when filters or search change
  useEffect(() => {
    setPage(1);
  }, [filterRole, filterStatus, debouncedSearchTerm]);

  useEffect(() => {
    loadUsers();
  }, [page, filterRole, filterStatus, debouncedSearchTerm]);

  async function loadUsers() {
    setLoading(true);
    const result = await adminApi.getUsers({
      page,
      role: filterRole || undefined,
      status: filterStatus || undefined,
      search: debouncedSearchTerm || undefined,
    });

    if (result.success && result.data) {
      setUsers(result.data.users);
      setTotal(result.data.total);
    }
    setLoading(false);
  }

  const handleExportUsers = async () => {
    setExporting(true);
    try {
      const result = await adminApi.getUsers({
        role: filterRole || undefined,
        status: filterStatus || undefined,
        search: debouncedSearchTerm || undefined,
        limit: 5000,
      });

      if (result.success && result.data) {
        const usersToExport = result.data.users;
        const csvRows = [
          ['Name', 'Email', 'Phone', 'Role', 'Subscription Tier', 'Credits Balance', 'Verification Status', 'Rega Licence', 'Active Listings', 'Active Projects', 'Created At']
        ];
        
        usersToExport.forEach((u: any) => {
          csvRows.push([
            u.name || '',
            u.email || '',
            u.phone || '',
            u.role || '',
            u.subscriptionTier || 'FREE',
            String(u.creditsBalance ?? 0),
            u.verificationStatus || 'UNVERIFIED',
            u.regaLicence || '',
            String(u.listingCount ?? 0),
            String(u.projectCount ?? 0),
            new Date(u.createdAt).toLocaleDateString('en-GB')
          ]);
        });

        const csvContent = "\uFEFF" + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `users_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to export users:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    const result = await adminApi.approveUser(userId);
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verificationStatus: 'VERIFIED', isActive: true, regaVerified: true } : u));
    }
    setActionLoading(null);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    const result = await adminApi.rejectUser(userId);
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verificationStatus: 'REJECTED', regaVerified: false } : u));
    }
    setActionLoading(null);
  };

  const handleSuspend = async (userId: string) => {
    setActionLoading(userId);
    const result = await adminApi.suspendUser(userId);
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !u.isActive } : u));
    }
    setActionLoading(null);
  };

  // No longer needed as we use server-side search
  const filteredUsers = users;

  return (
    <div className="flex flex-col h-full">
      <AdminTopBar title="Users & Brokers Management" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Header Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-surface-200 shadow-sm w-full md:w-96">
            <Search className="w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-surface-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              className="admin-input py-2 w-auto min-w-[140px]"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="ADMIN">Admins</option>
              <option value="FIRM">Firms</option>
              <option value="AGENT">Agents</option>
              <option value="SOLO_BROKER">Solo Brokers</option>
              <option value="SALES_AGENT">Sales Agents</option>
              <option value="OWNER">Property Owners</option>
              <option value="BUYER">Buyers</option>
            </select>

            <select
              className="admin-input py-2 w-auto min-w-[140px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending Verif.</option>
            </select>

            <button
              onClick={handleExportUsers}
              disabled={exporting}
              className="btn-secondary border border-surface-200 bg-white hover:bg-slate-50 text-surface-700 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 py-2 px-4 shadow-sm disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-surface-500" />}
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => {
                setCreateName('');
                setCreateEmail('');
                setCreatePhone('');
                setCreateRole('AGENT');
                setCreatePassword('');
                setCreateError('');
                setCreateSuccess('');
                setShowCreatePassword(false);
                setIsCreateOpen(true);
              }}
              className="btn-primary bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 py-2 px-4 shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User / Info</th>
                  <th>Role & Identity</th>
                  <th>Subscription</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading users...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Users className="w-6 h-6 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No users found</p>
                      <p className="text-xs text-surface-400 mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="group cursor-pointer hover:bg-surface-50 transition-colors"
                      onClick={() => setSelectedUser(user)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center font-bold text-surface-600">
                            {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-surface-900 truncate">
                              {user.name || 'Anonymous User'}
                            </div>
                            <div className="text-xs text-surface-500 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <div className="badge badge-gray">{user.role}</div>
                          {user.regaLicence && (
                            <div className="text-[10px] text-surface-400 font-mono">
                              REGA: {user.regaLicence}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3 text-surface-400" />
                          <span className="text-xs font-semibold text-surface-700">
                            {user.subscriptionTier}
                          </span>
                        </div>
                        <div className="text-[10px] text-surface-400 mt-0.5">
                          Balance: {user.creditsBalance} credits
                        </div>
                        {['SOLO_BROKER', 'AGENT', 'FIRM'].includes(user.role) && (
                          <div className="text-[9.5px] text-slate-500 mt-1 font-bold flex flex-col gap-0.5 border-t border-slate-100 pt-1">
                            <span>Listings: {user.listingCount ?? 0} active</span>
                            <span>Projects: {user.projectCount ?? 0} active</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <VerificationBadge status={user.verificationStatus} rega={user.regaVerified} />
                      </td>
                      <td>
                        <div className={clsx(
                          "badge",
                          user.isActive ? "badge-green" : "badge-red"
                        )}>
                          {user.isActive ? "Active" : "Suspended"}
                        </div>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSuspend(user.id); }}
                            disabled={!!actionLoading}
                            className={clsx(
                              "btn-ghost p-2 rounded-lg",
                              user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                            )}
                            title={user.isActive ? "Suspend User" : "Activate User"}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                            className="btn-ghost text-primary-600 hover:bg-primary-50 p-2 rounded-lg"
                            title="User Details"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
            <div className="text-xs text-surface-500">
              Showing <b>{filteredUsers.length}</b> of <b>{total}</b> users
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-secondary p-1.5 disabled:opacity-50"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold px-3">Page {page}</div>
              <button
                className="btn-secondary p-1.5 disabled:opacity-50"
                disabled={page * 20 >= total}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* User Details Slide-Over Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Glassmorphic Backdrop */}
          <div
            className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedUser(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-surface-150 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-lg">
                  {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                </div>
                 <div>
                  <h2 className="text-base font-bold text-surface-900">
                    {selectedUser.name || 'Anonymous User'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      className="admin-input py-0.5 px-2 text-[10px] w-auto h-auto min-h-0 bg-surface-100 border-surface-200 rounded-lg font-bold text-surface-600 outline-none"
                      value={selectedUser.role}
                      onChange={(e) => {
                        const newRole = e.target.value;
                        setConfirmModal({
                          title: 'Change User Role',
                          message: `Are you sure you want to change this user's role to ${newRole}?`,
                          onConfirm: async () => {
                            try {
                              const res = await adminApi.updateUser(selectedUser.id, { role: newRole });
                              if (res.success && res.data) {
                                setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, role: newRole } : u));
                                setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
                                setToast({ message: 'User role updated successfully.', type: 'success' });
                              }
                            } catch (err: any) {
                              setToast({ message: err.message || 'Failed to update user role.', type: 'error' });
                            }
                          }
                        });
                      }}
                    >
                      <option value="BUYER">Buyer</option>
                      <option value="OWNER">Property Owner</option>
                      <option value="AGENT">Agent</option>
                      <option value="SOLO_BROKER">Solo Broker</option>
                      <option value="FIRM">Firm</option>
                      <option value="SALES_AGENT">Sales Agent</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                 </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {isEditMode ? (
                <form onSubmit={handleEditSubmit} className="space-y-6">
                  {editError && (
                    <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}
                  {editSuccess && (
                    <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{editSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Full Name</label>
                    <input
                      type="text"
                      className="admin-input w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="text"
                      className="admin-input w-full"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">User Role</label>
                    <select
                      className="admin-input w-full"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      required
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="FIRM">Firm</option>
                      <option value="AGENT">Agent</option>
                      <option value="SOLO_BROKER">Solo Broker</option>
                      <option value="SALES_AGENT">Sales Agent</option>
                      <option value="OWNER">Property Owner</option>
                      <option value="BUYER">Buyer</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Reset Password (Optional)</label>
                    <div className="relative flex items-center">
                      <input
                        type={showEditPassword ? "text" : "password"}
                        placeholder="Enter new password to reset"
                        className="admin-input w-full pr-10"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 text-surface-400 hover:text-surface-600 transition-colors p-1"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-surface-400">Leave blank to keep the current password.</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="flex-1 btn-secondary justify-center py-2.5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingEdit}
                      className="flex-1 btn-primary bg-primary-600 hover:bg-primary-700 border-none justify-center py-2.5 text-white"
                    >
                      {isSubmittingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Account Overview Card */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Account Overview</h3>
                    <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4 space-y-3.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500 flex items-center gap-1.5"><Mail className="w-4 h-4 text-surface-400" /> Email</span>
                        <span className="font-semibold text-surface-900 font-mono text-xs">{selectedUser.email}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500 flex items-center gap-1.5"><Phone className="w-4 h-4 text-surface-400" /> Phone</span>
                        <span className="font-semibold text-surface-900">{selectedUser.phone || 'Not Provided'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-surface-400" /> Member Since</span>
                        <span className="font-semibold text-surface-900">
                          {new Date(selectedUser.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t border-surface-200/60 pt-3">
                        <span className="text-surface-500 flex items-center gap-1.5">User ID</span>
                        <span className="font-mono text-[10px] text-surface-400 select-all">{selectedUser.id}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Compliance */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Compliance & Security</h3>
                    <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4 space-y-3.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500">Account Status</span>
                        <div className={clsx("badge font-bold", selectedUser.isActive ? "badge-green" : "badge-red")}>
                          {selectedUser.isActive ? "Active" : "Suspended"}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500">Verification Status</span>
                        <VerificationBadge status={selectedUser.verificationStatus} rega={selectedUser.regaVerified} />
                      </div>
                      {selectedUser.regaLicence && (
                        <div className="flex justify-between items-center text-sm border-t border-surface-200/60 pt-3">
                          <span className="text-surface-500">REGA Falcon License</span>
                          <span className="font-mono font-semibold text-surface-900">{selectedUser.regaLicence}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Broker Application Answers (Only if role is SOLO_BROKER or they have a regaLicence) */}
                  {(selectedUser.role === 'SOLO_BROKER' || selectedUser.regaLicence) && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Submitted Application Answers</h3>
                      <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4 space-y-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block mb-1">REGA Falcon License / Ad Permit</span>
                          <span className="text-sm font-mono font-bold text-surface-900 bg-white p-2 rounded-lg border border-surface-200 block">
                            {selectedUser.regaLicence || 'No License Provided'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block mb-1">City</span>
                            <span className="text-sm font-semibold text-surface-900">
                              {selectedUser.city || 'Not specified'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block mb-1">Nationality</span>
                            <span className="text-sm font-semibold text-surface-900">
                              {selectedUser.nationality || 'Not specified'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block mb-1">Professional Bio</span>
                          <span className="text-xs text-surface-700 leading-relaxed block bg-white p-3 rounded-lg border border-surface-150 whitespace-pre-line">
                            {selectedUser.bioEn || selectedUser.bioAr || 'No professional bio submitted.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subscription & Credit Ledger */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Plan & Credit Ledger</h3>
                    <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4 space-y-3.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-surface-500 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-surface-400" /> Subscription Plan</span>
                        <span className="font-bold text-primary-700 uppercase tracking-wide text-xs">{selectedUser.subscriptionTier}</span>
                      </div>

                      <div className="border-t border-surface-200/60 pt-3 space-y-2">
                        <label className="text-xs font-bold flex items-center justify-between text-surface-500">
                          <span>Adjust Credit Balance</span>
                          <span className="font-semibold text-surface-700 font-mono">{selectedUser.creditsBalance} Current</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            className="admin-input flex-1 py-1.5 text-sm"
                            value={creditInput}
                            onChange={(e) => setCreditInput(Number(e.target.value))}
                          />
                          <button
                            type="button"
                            onClick={handleUpdateCredits}
                            disabled={updatingCredits}
                            className="btn-primary bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold py-1.5 px-3 shadow-sm flex items-center gap-1"
                          >
                            {updatingCredits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            <span>Update</span>
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-surface-200/60 pt-3 space-y-2">
                        <label className="text-xs font-bold text-surface-500">
                          Grant Credit Package (Adds Credits)
                        </label>
                        <div className="flex gap-2">
                          <select
                            className="admin-input flex-1 py-1.5 text-xs bg-white text-surface-700 outline-none"
                            id="manualPackageSelect"
                            defaultValue=""
                          >
                            <option value="" disabled>Select package...</option>
                            {creditPackages.map(pkg => (
                              <option key={pkg.id} value={pkg.credits}>
                                {pkg.nameEn} (+{pkg.credits} cr - {pkg.priceSar} SAR)
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const selectEl = document.getElementById('manualPackageSelect') as HTMLSelectElement;
                              const amount = Number(selectEl.value);
                              if (!amount) return;
                              const selectedPkgText = selectEl.options[selectEl.selectedIndex].text;
                              setConfirmModal({
                                title: 'Grant Credits',
                                message: `Are you sure you want to manually grant ${amount} credits (${selectedPkgText}) to this user?`,
                                onConfirm: async () => {
                                  setUpdatingCredits(true);
                                  try {
                                    const res = await adminApi.grantCredits(selectedUser.id, amount, `Admin manually granted: ${selectedPkgText}`);
                                    if (res.success) {
                                      const newBalance = (selectedUser.creditsBalance ?? 0) + amount;
                                      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, creditsBalance: newBalance } : u));
                                      setSelectedUser(prev => prev ? { ...prev, creditsBalance: newBalance } : null);
                                      setCreditInput(newBalance);
                                      setToast({ message: 'Credits granted successfully!', type: 'success' });
                                      // reload credit history
                                      if (['SOLO_BROKER', 'AGENT', 'FIRM'].includes(selectedUser.role)) {
                                        adminApi.getBrokerCredits(selectedUser.id).then(res => {
                                          if (res.success && res.data) setBrokerCredits(res.data);
                                        });
                                      }
                                    } else {
                                      setToast({ message: 'Failed to grant credits.', type: 'error' });
                                    }
                                  } catch (err: any) {
                                    setToast({ message: err.message || 'Failed to grant credits.', type: 'error' });
                                  } finally {
                                    setUpdatingCredits(false);
                                  }
                                }
                              });
                            }}
                            disabled={updatingCredits}
                            className="btn-primary bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold py-1.5 px-3 shadow-sm flex items-center gap-1"
                          >
                            {updatingCredits ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>Grant</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm border-t border-surface-200/60 pt-3">
                        <span className="text-surface-500">Active Listings</span>
                        <span className="font-semibold text-surface-900">{selectedUser.listingCount ?? 0} active listings</span>
                      </div>

                      <div className="flex justify-between items-center text-sm border-t border-surface-200/60 pt-3">
                        <span className="text-surface-500">Active Projects</span>
                        <span className="font-semibold text-surface-900">{selectedUser.projectCount ?? 0} active projects</span>
                      </div>
                    </div>
                  </div>

                  {/* Broker Credit History (Orders & Ledger) */}
                  {['SOLO_BROKER', 'AGENT', 'FIRM'].includes(selectedUser.role) && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Credit Transactions & History</h3>
                      
                      {loadingCredits ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                        </div>
                      ) : brokerCredits ? (
                        <div className="space-y-3">
                          {/* Ledger Entries */}
                          <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4">
                            <h4 className="text-xs font-bold text-surface-750 mb-3">Spend & Activity Ledger</h4>
                            {!brokerCredits.ledger || brokerCredits.ledger.length === 0 ? (
                              <p className="text-xs text-surface-400 italic">No credit activities recorded</p>
                            ) : (
                              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                {brokerCredits.ledger.map((entry: any) => (
                                  <div key={entry.id} className="flex justify-between items-start text-xs border-b border-surface-200/50 pb-2 last:border-0 last:pb-0">
                                    <div className="min-w-0 pr-2">
                                      <p className="font-medium text-slate-800 break-words leading-relaxed">{entry.description || entry.type}</p>
                                      <p className="text-[10px] text-slate-400 mt-1 font-semibold">
                                        {new Date(entry.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} · {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </p>
                                    </div>
                                    <span className={clsx("font-bold shrink-0 text-sm", entry.amount < 0 ? "text-red-500" : "text-emerald-600")}>
                                      {entry.amount < 0 ? '' : '+'}{entry.amount}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Purchase Orders */}
                          <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4">
                            <h4 className="text-xs font-bold text-surface-750 mb-3">Purchase Orders</h4>
                            {!brokerCredits.orders || brokerCredits.orders.length === 0 ? (
                              <p className="text-xs text-surface-400 italic">No purchase orders found</p>
                            ) : (
                              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                                {brokerCredits.orders.map((order: any) => (
                                  <div
                                    key={order.id}
                                    onClick={() => router.push(`/admin-credit-orders?orderId=${order.id}`)}
                                    className="flex justify-between items-center text-xs border-b border-surface-200/50 pb-2 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-200/55 p-1 rounded transition-all"
                                    title="Click to view order details in orders view"
                                  >
                                    <div>
                                      <p className="font-semibold text-slate-800 hover:text-primary-700 transition-colors">{order.packageNameEn || 'Credits'}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{order.creditsAmount} cr · {order.priceSar} SAR</p>
                                    </div>
                                    <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0", 
                                      order.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                      order.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                                      'bg-red-50 text-red-700 border-red-100'
                                    )}>
                                      {order.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-surface-400 italic">Failed to load credit history.</p>
                      )}
                    </div>
                  )}

                  {/* Broker Outreach */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Broker Outreach</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedUser.phone ? (
                        <a
                          href={`https://wa.me/${selectedUser.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(selectedUser.name || '')},%20this%20is%20Saudi%20Real%20Estate%20Properties%20regarding%20your%20broker%20application.`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition-colors shadow-sm"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>WhatsApp Chat</span>
                        </a>
                      ) : (
                        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-50 border border-surface-150 text-surface-400 font-medium text-xs rounded-xl cursor-not-allowed">
                          <MessageSquare className="w-4 h-4" />
                          <span>No Phone</span>
                        </div>
                      )}

                      <a
                        href={`mailto:${selectedUser.email}?subject=Saudi%20Real%20Estate%20Properties%20-%20Broker%20Application&body=Hello%20${encodeURIComponent(selectedUser.name || 'Broker')},`}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 hover:bg-primary-100 border border-primary-200 text-primary-700 font-bold text-xs rounded-xl transition-colors shadow-sm"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Send Email</span>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="p-6 border-t border-surface-150 bg-surface-50 flex items-center gap-3">
              {!isEditMode && (
                <>
                  <button
                    onClick={() => {
                      setEditName(selectedUser.name || '');
                      setEditPhone(selectedUser.phone || '');
                      setEditRole(selectedUser.role || '');
                      setEditPassword('');
                      setEditError('');
                      setEditSuccess('');
                      setIsEditMode(true);
                    }}
                    className="flex-1 btn-secondary justify-center py-2.5 font-semibold"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={async () => {
                      await handleSuspend(selectedUser.id);
                      setSelectedUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                    }}
                    disabled={!!actionLoading}
                    className={clsx(
                      "flex-1 btn-secondary justify-center py-2.5 font-semibold",
                      selectedUser.isActive ? "text-red-600 hover:bg-red-50 border-red-200" : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                    )}
                  >
                    {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedUser.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    <span>{selectedUser.isActive ? "Suspend Account" : "Activate Account"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Slide-Over Drawer */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Glassmorphic Backdrop */}
          <div
            className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsCreateOpen(false)}
          />

          {/* Drawer Panel */}
          <form
            onSubmit={handleCreateSubmit}
            className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out translate-x-0 animate-slide-in"
          >
            {/* Header */}
            <div className="p-6 border-b border-surface-150 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-lg">
                  <Users className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900">
                    Create New User
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">Provision a new user account with role and password</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {createError && (
                <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
              {createSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{createSuccess}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Abdullah bin Fahd"
                  className="admin-input w-full"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  className="admin-input w-full"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +966500000000"
                  className="admin-input w-full"
                  value={createPhone}
                  onChange={(e) => setCreatePhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">User Role</label>
                <select
                  className="admin-input w-full"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  required
                >
                  <option value="BUYER">Buyer</option>
                  <option value="OWNER">Property Owner</option>
                  <option value="AGENT">Agent</option>
                  <option value="SOLO_BROKER">Solo Broker</option>
                  <option value="FIRM">Firm</option>
                  <option value="SALES_AGENT">Sales Agent</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-surface-500 uppercase tracking-wider">Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Min 6 characters"
                    className="admin-input w-full pr-10"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 text-surface-400 hover:text-surface-600 transition-colors p-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-surface-150 bg-surface-50 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 btn-secondary justify-center py-2.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingCreate}
                className="flex-1 btn-primary bg-primary-600 hover:bg-primary-700 border-none justify-center py-2.5 text-white"
              >
                {isSubmittingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className={clsx(
          'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white animate-in fade-in slide-in-from-top duration-300',
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        )}>
          {toast.message}
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-surface-200 shadow-2xl max-w-sm w-full p-6 space-y-6 transform scale-100 transition-all animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-surface-900">{confirmModal.title}</h3>
              <p className="text-xs text-surface-500 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 btn-secondary justify-center py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 btn-primary bg-primary-600 hover:bg-primary-700 text-white border-none justify-center py-2 text-xs font-semibold rounded-xl"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationBadge({ status, rega }: { status: string, rega: boolean }) {
  if (status === 'VERIFIED') {
    return (
      <div className="flex flex-col gap-1 items-start">
        <div className="badge badge-green gap-1">
          <ShieldCheck className="w-3 h-3" /> Verified
        </div>
        {rega && <span className="text-[9px] text-emerald-600 font-bold uppercase">REGA Compliant</span>}
      </div>
    );
  }
  if (status === 'PENDING') {
    return (
      <div className="badge badge-yellow gap-1">
        <Clock className="w-3 h-3" /> Awaiting Review
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="badge badge-red gap-1">
        <ShieldAlert className="w-3 h-3" /> Rejected
      </div>
    );
  }
  return (
    <div className="badge badge-gray gap-1">
      Unverified
    </div>
  );
}
