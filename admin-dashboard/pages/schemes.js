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
  const [editState, setEditState] = useState(false);
  const [deletedSchemes, setDeletedSchemes] = useState([]);
  const [deleteId, setDeleteId] = useState("");
  const [originalSchemes, setOriginalSchemes] = useState([]);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function getSchemes() {
      try {
        const res = await fetch(`${API_URL}/scheme`);
        const schemeData = await res.json();

        // Format scheme names to capitalized format and ensure questions is an array
        const formattedSchemes = schemeData.map(scheme => ({
          ...scheme,
          scheme_name: scheme.scheme_name.charAt(0).toUpperCase() + scheme.scheme_name.slice(1).toLowerCase(),
          questions: Array.isArray(scheme.questions) ? scheme.questions : [] // Ensure questions is an array
        }));

        setSchemes(formattedSchemes);
        setOriginalSchemes(formattedSchemes);
      } catch (e) {
        console.log(e);
      }
    }

    getSchemes();
  }, []);

  // Function to handle CSV file selection
  const handleFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  // Function to handle CSV file upload
  const handleFileUpload = async () => {
    if (!csvFile) {
      setUploadMessage("Please select a CSV file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);

    try {
      const res = await fetch(`${API_URL}/upload-questions-csv`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadMessage("CSV uploaded successfully.");
        setCsvFile(null); // Clear the file input after upload
        // Optionally, refresh schemes data after upload
        getSchemes();
      } else {
        setUploadMessage("Failed to upload CSV. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setUploadMessage("An error occurred during upload.");
    }
  };

  // Function to delete a scheme from frontend only
  const handleDelete = (schemeName) => {
    const updatedSchemes = schemes.filter(
      (scheme) => scheme.scheme_name !== schemeName
    );
    setSchemes(updatedSchemes);
    setDeletedSchemes([...deletedSchemes, schemeName]);
    setDeleteId(""); // 
  };

  // Function to cancel delete operation
  const cancelDelete = () => {
    setSchemes(originalSchemes);
    setDeletedSchemes([]);
    setDeleteId("");
    setEditState(false);
  };

  // Function to save deleted schemes to the backend
  const handleSave = async () => {
    try {
      // Delete schemes from the backend
      for (const schemeName of deletedSchemes) {
        const res = await fetch(`${API_URL}/scheme/${schemeName}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          console.error(`Failed to delete scheme ${schemeName}`);
        }
      }
      setDeletedSchemes([]);
      setDeleteId("");
      setEditState(false);
    } catch (error) {
      console.error("Error deleting scheme:", error);
    }
  };

  return (
    <div className="schemes-page-container">
      {/* Header */}
      <div className="flex flex-row justify-between items-center text-black">
        <div className="font-bold text-3xl">Schemes Overview</div>
        {/* Add Scheme and Edit Buttons */}
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
                  onClick={handleSave}
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
      
      {/* CSV Upload Section */}
      <div className="my-4">
        <input type="file" accept=".csv" onChange={handleFileChange} />
        <button
          className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4 ml-3"
          onClick={handleFileUpload}
        >
          Upload Questions CSV
        </button>
        {uploadMessage && <p className="mt-2 text-red-500">{uploadMessage}</p>}
      </div>
      
      <div className="schemes-container">
        {schemes.length > 0 ? (
          schemes.map((scheme) => (
            <SchemeCard
              key={scheme.scheme_name}
              scheme_name={scheme.scheme_name}
              scheme_img={scheme.scheme_admin_img_path}
              questions={scheme.questions.length}  // Safely access the questions length
              scheme_button={true}
              editState={editState}
              schemes={schemes}
              setSchemes={setSchemes}
              setDeleteId={setDeleteId}
              isDeleted={deletedSchemes.includes(scheme.scheme_name)}
              handleDelete={() => handleDelete(scheme.scheme_name)}
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

      {/* Delete Modal */}
      {deleteId && (
        <div className="w-full h-full flex justify-center items-center fixed top-0 left-0 z-40">
          <DeleteModal
            id={deleteId}
            setId={setDeleteId}
            handleDelete={() => handleDelete(deleteId)}
            text={
              schemes.filter((scheme) => scheme.scheme_name === deleteId).map((scheme) => scheme.scheme_name)[0]
            }
          />
          <div className="w-screen h-screen bg-gray-500/50 absolute z-30" />
        </div>
      )}
    </div>
  );
}

export default isAuth(Schemes);
