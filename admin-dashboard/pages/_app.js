// admin-dashboard/pages/_app.js
import "../styles/global.css";
import Header from "../components/Layouts/Header";
import Footer from "../components/Layouts/Footer";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const loggedUserJSON = window.localStorage.getItem("loggedUser");
      let token = null;

      if (loggedUserJSON) {
        const loggedUser = JSON.parse(loggedUserJSON);
        token = loggedUser.access_token;
      }

      const [resource, config] = args;
      const newConfig = {
        ...config,
        credentials: 'include',  // Always include credentials
        headers: {
          ...config?.headers,
          Authorization: `Bearer ${token}`, // Attach token if available
        },
      };
      return originalFetch(resource, newConfig);
    };

    const loggedUserJSON = window.localStorage.getItem("loggedUser");
    if (loggedUserJSON) {
      const loggedUser = JSON.parse(loggedUserJSON);
      setUser(loggedUser);
      handleInactivity(loggedUser);
    }
  }, [router]);

  const handleInactivity = (loggedUser) => {
    let inactivityTimeout;
    const inactivityThreshold = 3600000; // 1 hour in milliseconds

    const logoutUser = () => {
      window.localStorage.removeItem("loggedUser");
      setUser(null);
      router.push("/").then(() => {
        alert("You have been logged out due to inactivity.");
      });
    };

    const handleActivity = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(logoutUser, inactivityThreshold);
    };

    const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    const handleUnload = () => {};

    window.addEventListener('beforeunload', handleUnload);
    handleActivity();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener('beforeunload', handleUnload);
      clearTimeout(inactivityTimeout);
    };
  };

  return (
    <div className="login-container">
      <div className="header"><Header user={user} setUser={setUser} /></div>
      <div className="page-component"><Component {...pageProps} setUser={setUser} /></div>
      <div className="footer"><Footer /></div>
    </div>
  );
}
