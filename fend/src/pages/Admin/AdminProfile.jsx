import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/api/user");
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user info", err);
      }
    };
    fetchUser();
  }, []);

  const handleResetRequest = async () => {
    try {
      await api.post("/logout");
      localStorage.removeItem("token");
    } catch (err) {
      console.warn("Logout failed, proceeding anyway.");
    }

    navigate("/forgot-password", {
      state: {
        email: user.email,
        fromProfile: true,
      },
    });
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: "600px" }}>
      <h2 className="mb-4">Admin Account</h2>

      <div className="mb-4 p-3 border rounded bg-light">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </div>

      <button
        className="btn btn-outline-primary"
        onClick={handleResetRequest}
      >
        Send Password Reset Link to My Email
      </button>
    </div>
  );
};

export default AdminProfile;
