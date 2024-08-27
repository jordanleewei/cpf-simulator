import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// components
import SchemeCard from "../components/SchemeCard";
import isAuth from "../components/isAuth";
import DeleteModal from "../components/DeleteModal";

function Schemes() {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const [schemes, setSchemes] = useState([]);
  const [originalSchemes, setOriginalSchemes] = useState([]); // Initialize originalSchemes
  const [editState, setEditState] = useState(false);
  const [deletedSchemes, setDeletedSchemes] = useState([]);
  const [deleteId, setDeleteId] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [cancelEdit, setCancelEdit] = useState(false);

  const router = useRouter();

  useEffect(() => {
    async function getSchemes() {
      try {
        const res = await fetch(`${API_URL}/scheme`);
        const schemeData = await res.json();

        const formattedSchemes = schemeData.map((scheme) => ({
          ...scheme,
          scheme_name:
            scheme.scheme_name.charAt(0).toUpperCase() +
            scheme.scheme_name.slice(1).toLowerCase(),
          questions: Array.isArray(scheme.questions) ? scheme.questions : [],
        }));

        setSchemes(formattedSchemes);
        setOriginalSchemes(formattedSchemes); // Store original schemes
      } catch (e) {
        console.log(e);
      }
    }

    getSchemes();
  }, [API_URL]);

  const cancelDelete = () => {
    setSchemes(originalSchemes); 
    setDeletedSchemes([]);
    setDeleteId("");
    setEditState(false);
    setCancelEdit(true); 
  };

  const updateSchemeName = async (index, newName) => {
    const oldName = schemes[index].scheme_name;
  
    try {
      const res = await fetch(`${API_URL}/scheme/update-name/${oldName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ new_scheme_name: newName }),
      });
  
      if (res.ok) {
        const updatedSchemes = schemes.map((scheme, i) =>
          i === index ? { ...scheme, scheme_name: newName } : scheme
        );
        setSchemes(updatedSchemes);
      } else {
        console.error("Failed to update scheme name in the backend.");
      }
    } catch (error) {
      console.error("Error updating scheme name:", error);
    }
  };

  return (
    <div className="schemes-page-container">
      <div className="flex flex-row justify-between items-center text-black">
        <div className="font-bold text-3xl">Schemes Overview</div>
        {schemes.length > 0 && (
          <div className="flex justify-end gap-3">
            {editState ? (
              <>
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
                  onClick={() => router.push("/addscheme")}
                >
                  Add Scheme
                </button>
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
                  onClick={() => setEditState(false)}
                >
                  Save
                </button>
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
                onClick={() => setEditState(true)}
              >
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      <div className="schemes-container">
        {schemes.length > 0 ? (
          schemes.map((scheme, index) => (
            <SchemeCard
              key={scheme.scheme_name}
              scheme_name={scheme.scheme_name}
              scheme_img={scheme.scheme_admin_img_path}
              questions={scheme.questions.length}
              scheme_button={true}
              editState={editState}
              setDeleteId={setDeleteId}
              updateSchemeName={(newName) => updateSchemeName(index, newName)}
              originalSchemeName={originalSchemes[index].scheme_name}
              cancelEdit={cancelEdit} // Pass cancelEdit state
            />
          ))
        ) : (
          <div className="items-center justify-center text-center py-20">
            <div className="text-xl font-semibold text-gray-600 mb-4">
              No Scheme Found
            </div>
            <button
              className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
              onClick={() => router.push("/addscheme")}
            >
              Add Scheme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default isAuth(Schemes);
