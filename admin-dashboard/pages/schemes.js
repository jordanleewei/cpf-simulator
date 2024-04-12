// framework
import { useEffect, useState } from "react";
// components
import SchemeCard from "../components/SchemeCard";
// import isAuth from "../components/isAuth";

function Schemes() {
  const [schemes, setSchemes] = useState([]);

  useEffect(() => {
    async function getSchemes() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/scheme`);

        const schemeData = await res.json();
        setSchemes(schemeData);
      } catch (e) {
        console.log(e);
      }
    }

    getSchemes();
  }, []);

  return (
    <div className="text-base">
      <div>
        {/* Header */}
        <div className="w-screen h-auto flex flex-row justify-between items-center px-20 pt-10 pb-10 text-black">
          <div className="font-bold text-3xl">Schemes</div>
        </div>
        <div className="flex flex-col gap-y-5 min-h-screen">
          <div className="flex flex-row flex-wrap px-20 justify-around gap-y-7 mb-8">
            {schemes.map((i) => (
              <SchemeCard
                key={i.scheme_name}
                scheme_name={i.scheme_name}
                scheme_img={i.scheme_admin_img_path}
                questions={i.questions.length}
                scheme_button={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Schemes;