import "../styles/global.css";
import Header from "../components/Layouts/Header";
import Footer from "../components/Layouts/Footer";
import { useState, useEffect } from "react";
import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
  const [user, setUser] = useState(""); // Initialize as an empty string
  const router = useRouter();

  useEffect(() => {
    // Override fetch globally to handle 401 responses
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const token = window.localStorage.getItem("loggedUserToken");

      const [resource, config = {}] = args;
      const newConfig = {
        ...config,
        headers: {
          ...config.headers,
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      };

      try {
        const response = await originalFetch(resource, newConfig);

        if (response.status === 401) {
          localStorage.removeItem("loggedUser");
          localStorage.removeItem("loggedUserToken");
          setUser(""); // Clear user state
          router.push("/");
          return Promise.reject(new Error("Unauthorized")); // Stop further processing and reject the promise
        }

        return response;
      } catch (error) {
        console.error("Fetch error:", error);
        return Promise.reject(error);
      }
    };

    const loggedUserJSON = window.localStorage.getItem("loggedUser");
    if (loggedUserJSON) {
      const loggedUser = JSON.parse(loggedUserJSON);
      setUser(loggedUser);
    } else {
      setUser(""); // Set user as an empty string if no user is logged in
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
