"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

function authenticated() {
  if (typeof window !== "undefined") {
    const loggedUserJSON = window.localStorage.getItem("loggedUser");
    return loggedUserJSON ? true : false;
  }
  return false;
}

export default function isAuth(Component) {
  return function IsAuth(props) {
    const router = useRouter();

    useEffect(() => {
      const auth = authenticated();
      if (!auth) {
        router.push("/login");
        setTimeout(() => {
          alert('Your session has expired. Please log in again.');
        }, 100); // Adjust the timeout as needed
      }
    }, [router]);

    return <Component {...props} />;
  };
}
