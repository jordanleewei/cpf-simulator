// final-csa-dashboard/pages/_app.js
import "../styles/global.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Header from "../components/Layouts/Header";
import Footer from "../components/Layouts/Footer";

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (resource, config = {}) => {
      const loggedUserJSON = window.localStorage.getItem("loggedUser");
      let token = null;

      if (loggedUserJSON) {
        const loggedUser = JSON.parse(loggedUserJSON);
        token = loggedUser.access_token;
      }

      // If a token is available, include it in the request headers
      const newConfig = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: token ? `Bearer ${token}` : "",
        },
      };

      return originalFetch(resource, newConfig);
    };

    const loggedUserJSON = window.localStorage.getItem("loggedUser");
    if (loggedUserJSON) {
      const loggedUser = JSON.parse(loggedUserJSON);
      setUser(loggedUser);

      // Inactivity logout logic
      handleInactivity(loggedUser);
    }
  }, [router]);

  const handleInactivity = (loggedUser) => {
    let inactivityTimeout;
    const inactivityThreshold = 3600000; // 1 hour in milliseconds

    const logoutUser = () => {
      window.localStorage.removeItem("loggedUser");
      setUser(null);
      alert("You have been logged out due to inactivity.");
      router.push("/");
    };

    const handleActivity = () => {
      clearTimeout(inactivityTimeout);
      inactivityTimeout = setTimeout(logoutUser, inactivityThreshold);
    };

    const events = ["load", "mousemove", "mousedown", "click", "scroll", "keypress"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    const handleUnload = () => {};

    window.addEventListener("beforeunload", handleUnload);
    handleActivity();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      window.removeEventListener("beforeunload", handleUnload);
      clearTimeout(inactivityTimeout);
    };
  };

  return (
    <div className="login-container">
      <div className="header">
        <Header user={user} setUser={setUser} />
      </div>
      <div className="page-component">
        <Component {...pageProps} user={user} setUser={setUser} />
      </div>
      <div className="footer">
        <Footer />
      </div>
    </div>
  );
}
