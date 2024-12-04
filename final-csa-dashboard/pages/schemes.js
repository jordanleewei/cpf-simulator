// framework
import { useEffect, useState } from "react";
// components
import SchemeCard from "../components/SchemeCard";
import isAuth from "../components/isAuth";

function Schemes({ user }) {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const [schemes, setSchemes] = useState([]);

  const getAuthHeaders = () => {
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    async function getSchemes() {
      if (user) {
        try {
          const res = await fetch(`${API_URL}/scheme/${user.uuid}`, {
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const schemeData = await res.json();
  
            // Transform and sort scheme names alphabetically
            const transformedSchemes = schemeData
              .map((scheme) => ({
                ...scheme,
                scheme_name:
                  scheme.scheme_name.charAt(0).toUpperCase() +
                  scheme.scheme_name.slice(1).toLowerCase(),
              }))
              .sort((a, b) => a.scheme_name.localeCompare(b.scheme_name)); // Sort by scheme_name alphabetically
  
            setSchemes(transformedSchemes);
          } else {
            console.error("Failed to fetch schemes:", res.status);
          }
        } catch (e) {
          console.log(e);
        }
      }
    }
    getSchemes();
  }, [user]);

  return (
    <div className="schemes-page-container">
      {/* Header */}
      <div className="flex flex-row justify-between items-center text-black">
        <div className="font-bold text-3xl">Schemes Overview</div>
      </div>
      <div className="schemes-container">
        {schemes.length > 0 ? (
          schemes.map((scheme) => (
            <SchemeCard
              key={scheme.scheme_name}
              scheme_name={scheme.scheme_name}
              scheme_img={scheme.scheme_csa_img_path}
              questions={scheme.questions.length}
              scheme_button={true}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="text-xl font-semibold text-gray-600 mb-4">
              No Scheme Found. Please contact your administrator.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default isAuth(Schemes);
