import React, { useEffect, useState } from 'react';
import api from '../../api/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const SystemLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    actions: [],
    users: []
  });
  const [filters, setFilters] = useState({
    user_id: '',
    category: '',
    action: '',
    subject_id: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const [selectedContext, setSelectedContext] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.current_page, pagination.per_page]);

  const fetchFilterOptions = async () => {
    try {
      const res = await api.get('/api/system-logs/filter-options');
      setFilterOptions(res.data);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      // Add pagination
      params.append('page', pagination.current_page);
      params.append('per_page', pagination.per_page);

      const res = await api.get(`/api/system-logs?${params.toString()}`);
      setLogs(res.data.data);
      setPagination({
        current_page: res.data.current_page,
        last_page: res.data.last_page,
        per_page: res.data.per_page,
        total: res.data.total
      });
    } catch (error) {
      console.error('Failed to fetch system logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      user_id: '',
      category: '',
      action: '',
      subject_id: '',
      date_from: '',
      date_to: '',
      search: ''
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'appointment': 'bg-primary',
      'dentist': 'bg-info',
      'device': 'bg-warning',
      'user': 'bg-success',
      'inventory': 'bg-secondary',
      'payment': 'bg-dark',
      'system': 'bg-danger'
    };
    return colors[category] || 'bg-light text-dark';
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('create') || action.includes('add')) return 'bg-success';
    if (action.includes('update') || action.includes('edit')) return 'bg-warning text-dark';
    if (action.includes('delete') || action.includes('remove')) return 'bg-danger';
    if (action.includes('approve') || action.includes('accept')) return 'bg-success';
    if (action.includes('reject') || action.includes('cancel')) return 'bg-danger';
    return 'bg-secondary';
  };

  const handleViewContext = (context) => {
    setSelectedContext(context);
    setShowContextModal(true);
  };

  const closeContextModal = () => {
    setShowContextModal(false);
    setSelectedContext(null);
    setCopySuccess(false);
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedContext, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Hide success message after 2 seconds
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>📊 System Logs</h2>
        <button 
          className="btn btn-outline-primary"
          onClick={() => setShowFilters(!showFilters)}
        >
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">Filters</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search in message, category, action..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">User</label>
                <select
                  className="form-select"
                  value={filters.user_id}
                  onChange={(e) => handleFilterChange('user_id', e.target.value)}
                >
                  <option value="">All Users</option>
                  {filterOptions.users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                  <option value="">All Categories</option>
                  {filterOptions.categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Action</label>
                <select
                  className="form-select"
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {filterOptions.actions.map(action => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-3">
                <label className="form-label">Subject ID</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Subject ID"
                  value={filters.subject_id}
                  onChange={(e) => handleFilterChange('subject_id', e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Date From</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <label className="form-label">Date To</label>
                <input
                  type="date"
                  className="form-control"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div>

              <div className="col-md-3 d-flex align-items-end">
                <button 
                  className="btn btn-outline-secondary me-2"
                  onClick={clearFilters}
                >
                  Clear Filters
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={fetchLogs}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="mb-3">
        <p className="text-muted">
          Showing {logs.length} of {pagination.total} logs
          {pagination.total > 0 && (
            <span> (Page {pagination.current_page} of {pagination.last_page})</span>
          )}
        </p>
      </div>

      {/* Logs Table */}
      {loading ? (
        <LoadingSpinner message="Loading system logs..." />
      ) : logs.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">No system logs found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-light">
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Category</th>
                <th>Action</th>
                <th>Subject ID</th>
                <th>Message</th>
                <th>Context</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>
                    {log.user ? (
                      <div>
                        <div className="fw-bold">{log.user.name}</div>
                        <small className="text-muted">{log.user.email}</small>
                      </div>
                    ) : (
                      <span className="text-muted">System</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${getCategoryBadgeColor(log.category)}`}>
                      {log.category}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getActionBadgeColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    {log.subject_id ? (
                      <span className="badge bg-light text-dark">
                        {log.subject_id}
                      </span>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <div style={{ maxWidth: '300px' }}>
                      {log.message}
                    </div>
                  </td>
                  <td>
                    {log.context ? (
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => handleViewContext(log.context)}
                      >
                        View Context
                      </button>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                  <td>
                    <small>{formatDate(log.created_at)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.last_page > 1 && (
        <nav aria-label="System logs pagination">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                disabled={pagination.current_page === 1}
              >
                Previous
              </button>
            </li>
            
            {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
              <li key={page} className={`page-item ${page === pagination.current_page ? 'active' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setPagination(prev => ({ ...prev, current_page: page }))}
                >
                  {page}
                </button>
              </li>
            ))}
            
            <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
              <button
                className="page-link"
                onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                disabled={pagination.current_page === pagination.last_page}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* Per Page Selector */}
      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          <label className="form-label me-2">Per page:</label>
          <select
            className="form-select d-inline-block w-auto"
            value={pagination.per_page}
            onChange={(e) => setPagination(prev => ({ 
              ...prev, 
              per_page: parseInt(e.target.value),
              current_page: 1 
            }))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Context Modal */}
      {showContextModal && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">📋 Context Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeContextModal}
                ></button>
              </div>
              <div className="modal-body">
                {copySuccess && (
                  <div className="alert alert-success alert-dismissible fade show" role="alert">
                    <strong>✅ Success!</strong> Context data copied to clipboard.
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setCopySuccess(false)}
                    ></button>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label fw-bold">Context Data:</label>
                  <pre 
                    className="bg-light p-3 rounded border"
                    style={{ 
                      maxHeight: '400px', 
                      overflowY: 'auto',
                      fontSize: '14px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  >
                    {JSON.stringify(selectedContext, null, 2)}
                  </pre>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeContextModal}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCopyToClipboard}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemLogsPage;
