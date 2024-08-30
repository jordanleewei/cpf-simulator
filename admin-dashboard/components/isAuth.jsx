"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function isAuth(Component) {
  return function IsAuth(props) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const checkAuth = () => {
        const token = localStorage.getItem("loggedUserToken");

        if (!token) {
          router.push("/");
          alert('Your session has expired. Please log in again.');
        } else {
          setIsAuthenticated(true);
        }
        setIsLoading(false);
      };

      checkAuth();
    }, [router]);

    if (isLoading) {
      return <div>Loading...</div>; // Show a loading state while checking authentication
    }

    return <Component {...props} isAuthenticated={isAuthenticated} />;
  };
}
