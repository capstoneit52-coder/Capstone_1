import { Outlet } from "react-router-dom";
import PatientNavbar from "../components/PatientNavbar";

function PatientLayout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <PatientNavbar />
 {/* //--------------j */}
      <main 
        className="d-flex justify-content-center align-items-center text-center flex-grow-1"
        style={{
          width: "1300px",
          height: "720px",
          margin:"0 auto",
        }}
        
      >
        <Outlet />
      </main>
    </div>
  );
}

export default PatientLayout;