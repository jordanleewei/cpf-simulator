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

      try {
        const response = await originalFetch(resource, newConfig);

        if (response.status === 401) {
          // Handle 401 Unauthorized - log out the user and redirect to index
          setUser(null);
          router.push("/login"); // Redirect to login page
          window.localStorage.removeItem("loggedUser");
          window.localStorage.removeItem("loggedUserToken");
          return; // Stop further processing
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
    }
  }, [router]);

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
