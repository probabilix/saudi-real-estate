'use client';
import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminUser } from '@/lib/api';
import {
  Users, Search, Filter, MoreVertical, 
  ShieldCheck, ShieldAlert, UserX, UserCheck,
  Mail, Phone, Calendar, CreditCard,
  ChevronLeft, ChevronRight, Loader2,
  ExternalLink, CheckCircle2, AlertCircle, Clock, X
} from 'lucide-react';
import clsx from 'clsx';

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  
  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

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

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    const result = await adminApi.approveUser(userId);
    if (result.success) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, verificationStatus: 'VERIFIED', isActive: true, regaVerified: true } : u));
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
              <option value="FIRM">Firms</option>
              <option value="AGENT">Agents</option>
              <option value="SOLO_BROKER">Solo Brokers</option>
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
                          {user.verificationStatus === 'PENDING' && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleApprove(user.id); }}
                              disabled={!!actionLoading}
                              className="btn-ghost text-emerald-600 hover:bg-emerald-50"
                              title="Approve User"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleSuspend(user.id); }}
                            disabled={!!actionLoading}
                            className={clsx(
                              "btn-ghost",
                              user.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-600 hover:bg-emerald-50"
                            )}
                            title={user.isActive ? "Suspend User" : "Activate User"}
                          >
                            {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(user); }}
                            className="btn-ghost text-primary-600 hover:bg-primary-50" 
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
                  <div className="badge badge-gray text-[10px] mt-0.5">{selectedUser.role}</div>
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

              {/* Subscription & Credit Ledger */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Plan & Credit Ledger</h3>
                <div className="bg-surface-50 rounded-2xl border border-surface-150 p-4 space-y-3.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-500 flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-surface-400" /> Subscription Plan</span>
                    <span className="font-bold text-primary-700 uppercase tracking-wide text-xs">{selectedUser.subscriptionTier}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-500">Credits Balance</span>
                    <span className="font-bold text-surface-900 text-sm">{selectedUser.creditsBalance} Credits</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-surface-200/60 pt-3">
                    <span className="text-surface-500">Active Listings</span>
                    <span className="font-semibold text-surface-900">{selectedUser.listingCount ?? 0} active properties</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="p-6 border-t border-surface-150 bg-surface-50 flex items-center gap-3">
              {selectedUser.verificationStatus === 'PENDING' && (
                <button
                  onClick={async () => {
                    await handleApprove(selectedUser.id);
                    setSelectedUser(prev => prev ? { ...prev, verificationStatus: 'VERIFIED', regaVerified: true, isActive: true } : null);
                  }}
                  disabled={!!actionLoading}
                  className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 border-none justify-center py-2.5"
                >
                  {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Approve Verification
                </button>
              )}
              <button
                onClick={async () => {
                  await handleSuspend(selectedUser.id);
                  setSelectedUser(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
                }}
                disabled={!!actionLoading}
                className={clsx(
                  "flex-1 btn-secondary justify-center py-2.5",
                  selectedUser.isActive ? "text-red-600 hover:bg-red-50 border-red-200" : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                )}
              >
                {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedUser.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                {selectedUser.isActive ? "Suspend Account" : "Activate Account"}
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
      <div className="flex flex-col gap-1">
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
