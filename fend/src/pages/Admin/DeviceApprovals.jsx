import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const DeviceApprovals = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveLabels, setApproveLabels] = useState({});

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/admin/pending-devices');
      console.log('Pending devices:', res.data);
      setDevices(res.data);
    } catch (error) {
      console.error('Failed to load pending devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleApprove = async (deviceId) => {
    try {
      await api.post('/api/admin/approve-device', {
        device_id: deviceId,
        device_name: approveLabels[deviceId] || ''
      });
      fetchDevices(); // Refresh the list
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleReject = async (deviceId) => {
    try {
      await api.post('/api/admin/reject-device', {
        device_id: deviceId,
      });
      fetchDevices(); // Refresh the list
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  };

  return (
    <div>
      <h2 className="mb-4">Pending Staff Device Approvals</h2>
      {loading ? (
        <p>Loading...</p>
      ) : devices.length === 0 ? (
        <p className="text-muted">No devices pending approval.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle">
            <thead className="table-light">
              <tr>
                <th>#</th>
                <th>Staff Name</th>
                <th>Fingerprint</th>
                <th>Temp Code</th>
                <th>Device Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device, i) => (
                <tr key={device.id}>
                  <td>{i + 1}</td>
                  <td>{device.staff_name}</td>
                  <td className="text-break">{device.device_fingerprint}</td>
                  <td><span className="badge bg-warning">{device.temporary_code}</span></td>
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Front Desk PC"
                      value={approveLabels[device.id] || ''}
                      onChange={(e) =>
                        setApproveLabels((prev) => ({
                          ...prev,
                          [device.id]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button className="btn btn-success btn-sm me-2" onClick={() => handleApprove(device.id)}>
                      ✅ Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleReject(device.id)}>
                      ❌ Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DeviceApprovals;
