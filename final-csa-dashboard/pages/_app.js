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
      const inactivityThreshold = 3600000; // 1 hour timeout in milliseconds

      // Function to handle user activity
      const handleActivity = () => {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(logoutUser, inactivityThreshold);
      };

      const logoutUser = () => {
        window.localStorage.removeItem("loggedUser");
        setUser("");
        alert("You have been logged out due to inactivity.");
        router.push("/");
      };

      const handleUnload = () => {
        logoutUser();
      };

      // Event listeners to detect user activity
      const events = ['load', 'mousemove', 'mousedown', 'click', 'scroll', 'keypress'];
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

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
    <div className="overflow-y-scroll overflow-x-clip scrollbar-hide">
      <Header user={user} setUser={setUser} />
      <Component {...pageProps} user={user} setUser={setUser} />
      <Footer />
    </div>
  );
}
