import "../styles/global.css";
// components
import Header from "../components/Layouts/Header";
import Footer from "../components/Layouts/Footer";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState("");
  const router = useRouter();

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem("loggedUser");
    if (loggedUserJSON) {
      const loggedUser = JSON.parse(loggedUserJSON);
      setUser(loggedUser);

      let inactivityTimeout;
      const inactivityThreshold = 3600000; // 1 hour in milliseconds

      const logoutUser = () => {
        window.localStorage.removeItem("loggedUser");
        setUser("");
        alert("You have been logged out due to inactivity.");
        router.push("/");
      };

      // Function to handle user activity
      const handleActivity = () => {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(logoutUser, inactivityThreshold);
      };

      // Event listeners to detect user activity
      const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      const handleUnload = (event) => {
      };

      window.addEventListener('beforeunload', handleUnload);

      handleActivity();

      return () => {
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
        window.removeEventListener('beforeunload', handleUnload);
        clearTimeout(inactivityTimeout);
      };
    }
  }, [router]);

  return (
    <div className="login-container">
      <div className="header"><Header user={user} setUser={setUser} /></div>
      <div className="page-component"><Component {...pageProps} setUser={setUser} /></div>
      <div className="footer"><Footer /></div>
    </div>
  );
}
