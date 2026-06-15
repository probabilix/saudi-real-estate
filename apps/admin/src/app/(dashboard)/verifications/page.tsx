'use client';

import { useState, useEffect } from 'react';
import { AdminTopBar } from '@/components/AdminSidebar';
import { adminApi, AdminUser } from '@/lib/api';
import {
  ShieldCheck, Clock, ShieldAlert, CheckCircle2, Search, Filter, Loader2,
  ExternalLink, Mail, Phone, Calendar, X, AlertCircle, RefreshCw, XCircle, Globe
} from 'lucide-react';
import clsx from 'clsx';

export default function VerificationsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    loadApplications();
  }, [page, activeTab, searchTerm]);

  // Sync selected user when user list updates
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  async function loadApplications() {
    setLoading(true);
    // Map tab to status filter
    const statusFilter = activeTab === 'ALL' ? undefined : activeTab;
    const result = await adminApi.getUsers({
      page,
      status: statusFilter ? statusFilter.toLowerCase() : undefined,
      search: searchTerm || undefined,
      hasLicense: 'true',
    });

    if (result.success && result.data) {
      setUsers(result.data.users);
      setTotal(result.data.total);
    }
    setLoading(false);
  }

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await adminApi.approveUser(userId);
      if (result.success) {
        setActionSuccess('Broker verification approved successfully! Access email sent.');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, verificationStatus: 'VERIFIED', regaVerified: true, isActive: true } : u));
        setSelectedUser(prev => prev && prev.id === userId ? { ...prev, verificationStatus: 'VERIFIED', regaVerified: true, isActive: true } : prev);
      } else {
        setActionError(result.message || 'Failed to approve user.');
      }
    } catch (err: any) {
      setActionError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const result = await adminApi.rejectUser(userId);
      if (result.success) {
        setActionSuccess('Broker verification disapproved / rejected successfully.');
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, verificationStatus: 'REJECTED', regaVerified: false } : u));
        setSelectedUser(prev => prev && prev.id === userId ? { ...prev, verificationStatus: 'REJECTED', regaVerified: false } : prev);
      } else {
        setActionError(result.message || 'Failed to reject user.');
      }
    } catch (err: any) {
      setActionError(err.message || 'An error occurred.');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas">
      <AdminTopBar title="Verification Queue" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Statistics CTA Strip */}
        <div className="bg-white p-4 rounded-2xl border border-surface-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-surface-200 shadow-sm w-full md:w-96">
            <Search className="w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search broker by name, email or license..."
              className="bg-transparent border-none focus:ring-0 outline-none text-sm w-full text-surface-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={loadApplications}
              className="btn-secondary py-2 px-3 flex items-center gap-1.5"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4 text-surface-500" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-surface-200">
          {[
            { id: 'PENDING', label: 'Awaiting Review', countColor: 'bg-amber-100 text-amber-800' },
            { id: 'VERIFIED', label: 'Approved Brokers', countColor: 'bg-emerald-100 text-emerald-800' },
            { id: 'REJECTED', label: 'Rejected / Disapproved', countColor: 'bg-rose-100 text-rose-800' },
            { id: 'ALL', label: 'All Applications', countColor: 'bg-gray-100 text-gray-800' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                "px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all relative",
                activeTab === tab.id
                  ? "border-primary-600 text-primary-600 font-extrabold"
                  : "border-transparent text-surface-400 hover:text-surface-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Verification Queue Table */}
        <div className="admin-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Broker Applicant</th>
                  <th>REGA License / Info</th>
                  <th>Requested Date</th>
                  <th>Verification Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
                      <p className="text-xs text-surface-500 mt-2">Loading verifications...</p>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="w-12 h-12 bg-surface-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-6 h-6 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-surface-600">No applications in this tab</p>
                      <p className="text-xs text-surface-400 mt-1">Everything is perfectly sorted!</p>
                    </td>
                  </tr>
                ) : (
                  users.map((app) => (
                    <tr
                      key={app.id}
                      className="group cursor-pointer hover:bg-surface-50 transition-colors"
                      onClick={() => setSelectedUser(app)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center font-bold text-surface-600">
                            {app.name?.charAt(0) || app.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-surface-900 truncate flex items-center gap-2">
                              <span>{app.name || 'Anonymous User'}</span>
                              {app.isReapplied && (
                                <span className="bg-amber-150 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0">
                                  Re-applied
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-surface-500 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {app.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-1">
                          <div className="text-xs font-mono font-bold text-surface-900">
                            {app.regaLicence || 'N/A'}
                          </div>
                          {app.phone && (
                            <div className="text-[10px] text-surface-400 flex items-center gap-0.5">
                              <Phone className="w-2.5 h-2.5" /> {app.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="text-xs text-surface-700">
                          {new Date(app.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td>
                        <VerificationBadge status={app.verificationStatus} rega={app.regaVerified} />
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {app.verificationStatus !== 'VERIFIED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(app.id); }}
                              disabled={!!actionLoading}
                              className="btn-ghost text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg"
                              title="Approve Verification"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {app.verificationStatus !== 'REJECTED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(app.id); }}
                              disabled={!!actionLoading}
                              className="btn-ghost text-rose-600 hover:bg-rose-50 p-2 rounded-lg"
                              title="Reject / Disapprove Verification"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedUser(app); }}
                            className="btn-ghost text-primary-600 hover:bg-primary-50 p-2 rounded-lg"
                            title="Review Details"
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
              Showing <b>{users.length}</b> applications
            </div>
          </div>
        </div>

      </div>

      {/* Verification Detailed Review Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          <div
            className="absolute inset-0 bg-surface-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => { setSelectedUser(null); setActionError(null); setActionSuccess(null); }}
          />

          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-surface-150 flex items-center justify-between bg-surface-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-700 flex items-center justify-center font-bold text-lg border border-primary-100">
                  {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-surface-900 flex items-center gap-2">
                    <span>{selectedUser.name || 'Anonymous User'}</span>
                    {selectedUser.isReapplied && (
                      <span className="bg-amber-150 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0">
                        Re-applied
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-surface-500 mt-0.5">Review credentials & verify access</p>
                </div>
              </div>
              <button
                onClick={() => { setSelectedUser(null); setActionError(null); setActionSuccess(null); }}
                className="p-2 rounded-xl text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {actionError && (
                <div className="p-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-4 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Status Section */}
              <div className="p-4 rounded-xl bg-surface-50 border border-surface-200/60 space-y-3">
                <div className="flex justify-between items-center text-xs uppercase tracking-wider text-surface-400 font-bold">
                  <span>Current Verification Status</span>
                  <VerificationBadge status={selectedUser.verificationStatus} rega={selectedUser.regaVerified} />
                </div>
              </div>

              {/* Answers Form Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Submitted Application Answers</h3>
                
                <div className="admin-card p-4 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-surface-400 block mb-1">REGA Falcon License / Ad Permit</span>
                    <span className="text-sm font-mono font-bold text-surface-900 bg-surface-50 p-2 rounded-lg border border-surface-200 block">
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
                    <span className="text-xs text-surface-700 leading-relaxed block bg-surface-50/50 p-3 rounded-lg border border-surface-150 whitespace-pre-line">
                      {selectedUser.bioEn || selectedUser.bioAr || 'No professional bio submitted.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Applicant Profile Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Applicant Contact Info</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-surface-100">
                    <span className="text-surface-500">Email Address</span>
                    <a href={`mailto:${selectedUser.email}`} className="text-primary-600 hover:underline flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{selectedUser.email}</span>
                    </a>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center justify-between py-2 border-b border-surface-100">
                      <span className="text-surface-500">Phone Number</span>
                      <span className="font-semibold text-surface-900 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-surface-400" />
                        <span>{selectedUser.phone}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-surface-500">Registered On</span>
                    <span className="text-surface-900 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-surface-400" />
                      <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Actions Footer */}
            <div className="p-6 border-t border-surface-150 bg-surface-50 flex items-center gap-3">
              {selectedUser.verificationStatus !== 'VERIFIED' ? (
                <button
                  onClick={() => handleApprove(selectedUser.id)}
                  disabled={!!actionLoading}
                  className="flex-1 btn-primary bg-emerald-600 hover:bg-emerald-700 border-none justify-center py-2.5 text-white font-bold flex items-center gap-2"
                >
                  {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Approve Application</span>
                </button>
              ) : (
                <button
                  onClick={() => handleReject(selectedUser.id)}
                  disabled={!!actionLoading}
                  className="flex-1 btn-primary bg-rose-600 hover:bg-rose-700 border-none justify-center py-2.5 text-white font-bold flex items-center gap-2"
                >
                  {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
                  <span>Disapprove Verification</span>
                </button>
              )}

              {selectedUser.verificationStatus === 'PENDING' && (
                <button
                  onClick={() => handleReject(selectedUser.id)}
                  disabled={!!actionLoading}
                  className="flex-1 btn-secondary text-rose-600 hover:bg-rose-50 border-rose-200 justify-center py-2.5 font-bold flex items-center gap-2"
                >
                  {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  <span>Reject Application</span>
                </button>
              )}
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
      <div className="flex flex-col gap-0.5 items-start">
        <div className="badge badge-green gap-1">
          <ShieldCheck className="w-3 h-3" /> Verified
        </div>
        {rega && <span className="text-[8px] text-emerald-600 font-extrabold uppercase tracking-widest mt-0.5">REGA Compliant</span>}
      </div>
    );
  }
  if (status === 'PENDING') {
    return (
      <div className="badge badge-yellow gap-1">
        <Clock className="w-3 h-3 animate-pulse" /> Awaiting Review
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
