// framework
import { useEffect, useState } from "react";
// components
import SchemeCard from "../components/SchemeCard";
import isAuth from "../components/isAuth";

function Schemes({ user }) {
  const [schemes, setSchemes] = useState([]);

  useEffect(() => {
    async function getSchemes() {
      if (user) {
        try {
          const res = await fetch(`https://d17ygk7qno65io.cloudfront.net/scheme/${user.uuid}`);
          const schemeData = await res.json();
          
          // Transform scheme names
          const transformedSchemes = schemeData.map(scheme => ({
            ...scheme,
            scheme_name: scheme.scheme_name.charAt(0).toUpperCase() + scheme.scheme_name.slice(1).toLowerCase()
          }));
          
          setSchemes(transformedSchemes);
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
                  No Scheme Found. 
                  Please contact your administrator.
                </div>
              </div>
            )}
          </div>
      </div>
  );
}

export default isAuth(Schemes);
