import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const ApprovedDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/approved-devices');
      setDevices(res.data);
    } catch (err) {
      console.error('Failed to load approved devices:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id) => {
    try {
      await api.put('/api/rename-device', { device_id: id, device_name: newName });
      setEditingId(null);
      setNewName('');
      fetchDevices();
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.post('/api/revoke-device', { device_id: id });
      fetchDevices();
    } catch (err) {
      console.error('Revoke failed:', err);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div>
      <h2>Approved Staff Devices</h2>
      {loading ? (
        <p>Loading devices...</p>
      ) : (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Device Name</th>
              <th>Device Fingerprint</th>
              <th>Last Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr key={device.id}>
                <td>{device.staff_name}</td>
                <td>
                  {editingId === device.id ? (
                    <>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="New device name"
                      />
                      <button className="btn btn-success btn-sm ms-2" onClick={() => handleRename(device.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm ms-1" onClick={() => setEditingId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      {device.device_name || '(Unnamed)'}
                      <button className="btn btn-link btn-sm ms-2" onClick={() => {
                        setEditingId(device.id);
                        setNewName(device.device_name || '');
                      }}>Edit</button>
                    </>
                  )}
                </td>
                <td>{device.device_fingerprint}</td>
                <td>{new Date(device.updated_at).toLocaleString()}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => handleRevoke(device.id)}>
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ApprovedDevices;
