import { useState } from "react";
import api from "../../api/api";

const StaffRegister = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setErrors({});

    try {
      const res = await api.post("/api/admin/staff", form);
      setMessage("✅ Staff account created!");
      setForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
      });
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setMessage("❌ Something went wrong.");
      }
    }
  };

  return (
    <div>
      <h2 className="mb-4">Register New Staff Account</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Full Name</label>
          <input
            name="name"
            className="form-control"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Jane Dela Cruz"
          />
          {errors.name && <div className="text-danger">{errors.name[0]}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            name="email"
            type="email"
            className="form-control"
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. jane.staff@clinic.com"
          />
          {errors.email && <div className="text-danger">{errors.email[0]}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            name="password"
            type="password"
            className="form-control"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter password"
          />
          {errors.password && (
            <div className="text-danger">{errors.password[0]}</div>
          )}
        </div>

        <div className="mb-3">
          <label className="form-label">Confirm Password</label>
          <input
            name="password_confirmation"
            type="password"
            className="form-control"
            value={form.password_confirmation}
            onChange={handleChange}
            placeholder="Re-enter password"
          />
        </div>

        <button className="btn btn-primary">Register</button>
      </form>
    </div>
  );
};

export default StaffRegister;
