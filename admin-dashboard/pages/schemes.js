import { useEffect, useState } from "react";
import isAuth from "../components/isAuth.jsx"; // Adjust the import path according to your project structure

// components
import SchemeCard from "../components/SchemeCard";
import DeleteModal from "../components/DeleteModal";
import { useRouter } from 'next/router';

function Schemes() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const [schemes, setSchemes] = useState([]);
  const [originalSchemes, setOriginalSchemes] = useState([]);
  const [editState, setEditState] = useState(false);
  const [deletedSchemes, setDeletedSchemes] = useState([]);
  const [deleteId, setDeleteId] = useState("");
  const [csvFile, setCsvFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const getSchemes = async () => {
    try {
      const res = await fetch(`${API_URL}/scheme`);

      if (res.ok) {
        const schemeData = await res.json();

        if (Array.isArray(schemeData)) {
          const formattedSchemes = schemeData.map((scheme) => ({
            ...scheme,
            scheme_name:
              scheme.scheme_name.charAt(0).toUpperCase() +
              scheme.scheme_name.slice(1).toLowerCase(),
            questions: Array.isArray(scheme.questions) ? scheme.questions : [],
          }));

          setSchemes(formattedSchemes);
          setOriginalSchemes(formattedSchemes);
        } else {
          setSchemes([]);
        }
      } else {
        setSchemes([]);
      }
    } catch (e) {
      console.log(e);
      setSchemes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSchemes();
  }, [API_URL]);

  // Function to handle CSV file selection
  const handleFileChange = (event) => {
    setCsvFile(event.target.files[0]);
  };

  // Function to handle CSV file upload
  const handleFileUpload = async () => {
    if (!csvFile) {
      setUploadMessage("Please select a CSV file first.");
      setTimeout(() => setUploadMessage(""), 5000);
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
        await getSchemes(); // Refresh schemes data after upload
      } else {
        setUploadMessage("Failed to upload CSV. Please try again.");
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setUploadMessage("An error occurred during upload.");
    } finally {
      // Clear the message after 5 seconds
      setTimeout(() => setUploadMessage(""), 5000);
    }
  };

  // Function to delete a scheme from frontend only
  const handleDelete = (schemeName) => {
    const updatedSchemes = schemes.filter(
      (scheme) => scheme.scheme_name !== schemeName
    );
    setSchemes(updatedSchemes);
    setDeletedSchemes([...deletedSchemes, schemeName]);
    setDeleteId(""); // Clear deleteId
  };

  // Function to cancel edit operation and revert to the original scheme names
  const cancelEdit = () => {
    setSchemes(originalSchemes); // Revert to original schemes
    setDeletedSchemes([]);
    setDeleteId("");
    setEditState(false);
  };

  // Function to save edited scheme names and deleted schemes to the backend
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
  
      // Save updated scheme names to the backend
      for (let i = 0; i < schemes.length; i++) {
        // Skip the update if the scheme was deleted
        if (deletedSchemes.includes(originalSchemes[i].scheme_name)) {
          continue;
        }
  
        if (schemes[i].scheme_name !== originalSchemes[i].scheme_name) {
          try {
            const res = await fetch(
              `${API_URL}/scheme/update-name/${originalSchemes[i].scheme_name}`,
              {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ new_scheme_name: schemes[i].scheme_name }),
              }
            );
  
            if (!res.ok) {
              console.error(
                `Failed to update scheme name ${originalSchemes[i].scheme_name}`
              );
            }
          } catch (error) {
            console.error("Error updating scheme name:", error);
          }
        }
      }
  
      setDeletedSchemes([]);
      setDeleteId("");
      setOriginalSchemes(schemes); // Set originalSchemes to reflect the latest saved schemes
      setEditState(false);
    } catch (error) {
      console.error("Error saving schemes:", error);
    }
  };

  // Function to update the scheme name in the frontend state
  const updateSchemeName = (index, newName) => {
    const updatedSchemes = schemes.map((scheme, i) =>
      i === index ? { ...scheme, scheme_name: newName } : scheme
    );
    setSchemes(updatedSchemes);
  };

  return (
    <div className="schemes-page-container">
      {/* Show loading state if data is being fetched */}
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* Header */}
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
                      onClick={handleSave}
                    >
                      Save
                    </button>
                    <button
                      className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
                      onClick={cancelEdit}
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
              schemes.map((scheme, index) => (
                <SchemeCard
                  key={scheme.scheme_name}
                  scheme_name={scheme.scheme_name}
                  scheme_img={scheme.scheme_admin_img_path}
                  questions={scheme.questions.length} // Safely access the questions length
                  scheme_button={true}
                  editState={editState}
                  setDeleteId={setDeleteId}
                  updateSchemeName={(newName) => updateSchemeName(index, newName)} // Pass the update function to the SchemeCard
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
                  schemes
                    .filter((scheme) => scheme.scheme_name === deleteId)
                    .map((scheme) => scheme.scheme_name)[0]
                }
              />
              <div className="w-screen h-screen bg-gray-500/50 absolute z-30" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default isAuth(Schemes);
