// framework
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import isAuth from "../components/isAuth.jsx"; 
import { Input, Button } from "@nextui-org/react";
import { FaRegTrashCan } from "react-icons/fa6";
import SaveModal from "../components/SaveModal";
import RevertModal from "../components/RevertModal";
import UploadModal from "../components/UploadModal";
import * as XLSX from 'xlsx';
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function UpdatePage() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();

  // State variables for prompt management
  const [promptText, setPromptText] = useState("");
  const [originalPromptText, setOriginalPromptText] = useState("");
  const [promptType, setPromptType] = useState("");
  const [editPromptState, setEditPromptState] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");
  const [lastUpdatedBy, setLastUpdatedBy] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPromptRevertModal, setShowPromptRevertModal] = useState(false);

  // State variables for vectorstore management
  const [csvFile, setCsvFile] = useState(null);
  const [csvUploadMessage, setCsvUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVectorstoreRevertModal, setShowVectorstoreRevertModal] = useState(false);

  // State variables for system management
  const [systems, setSystems] = useState([]);
  const [newSystem, setNewSystem] = useState({ name: "", url: "" });
  const [editMode, setEditMode] = useState(false);
  const [editedSystems, setEditedSystems] = useState([]);
  const [systemMessage, setSystemMessage] = useState("");

  useEffect(() => {
    if (downloadMessage) {
      const timer = setTimeout(() => {
        setDownloadMessage(""); // Clear the message after 3 seconds
      }, 3000);

      return () => clearTimeout(timer); // Cleanup the timer if the component unmounts
    }
  }, [downloadMessage]);

  // Fetch prompt and systems when the component mounts
  useEffect(() => {
    const fetchPrompt = async () => {
      // Retrieve the token from localStorage
      const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
      const token = loggedUser ? loggedUser.access_token : null;

      if (!token) {
        router.push("/");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/prompt/current`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setPromptText(data.prompt_text);
          setOriginalPromptText(data.prompt_text);
          setPromptType(data.prompt_type);
          setLastUpdatedBy(data.updated_by || "DEFAULT"); 
          setLastUpdatedAt(data.updated_at ? new Date(data.updated_at).toLocaleString() : "NO DATE AVAILABLE"); 
        } else {
          console.error("Failed to fetch prompt:", res.status);
          // Handle unauthorized access
          if (res.status === 401 || res.status === 403) {
            router.push("/");
          }
        }
      } catch (error) {
        console.error("Error fetching prompt:", error);
      }
    };

    const fetchSystems = async () => {
      try {
        const res = await fetch(`${API_URL}/systems`);
        if (res.ok) {
          const data = await res.json();
          setSystems(data);
        } else {
          console.error("Failed to fetch systems:", res.status);
        }
      } catch (error) {
        console.error("Error fetching systems:", error);
      }
    };

    fetchPrompt();
    fetchSystems();
  }, [router]);

  // Prompt management handlers
  const handleUpdatePrompt = async () => {
    // Retrieve the token from localStorage
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;

    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/prompt`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt_text: promptText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPromptMessage(data.message);
        setOriginalPromptText(promptText);
        setPromptType("dynamic");
        setEditPromptState(false);
        setCompareResult(null);

        // Fetch updated prompt data to show the latest "updated by" and "updated at" fields
        const updatedPromptResponse = await fetch(`${API_URL}/prompt/current`, {
          method: "GET",
          headers: {
              Authorization: `Bearer ${token}`,
          },
      });

      if (updatedPromptResponse.ok) {
          const updatedPromptData = await updatedPromptResponse.json();
          // Set updated values from the latest prompt
          setPromptText(updatedPromptData.prompt_text);
          setLastUpdatedBy(updatedPromptData.updated_by || "DEFAULT");
          setLastUpdatedAt(
              updatedPromptData.updated_at
                  ? new Date(updatedPromptData.updated_at).toLocaleString()
                  : "NO DATE AVAILABLE"
          );
      }
    } else {
      console.error("Failed to update prompt:", res.status);
      setPromptMessage("Failed to update prompt");
    }
    } catch (error) {
    console.error("Error updating prompt:", error);
    setPromptMessage("Error updating prompt");
    }
  };

  const handleRevertToDefault = async () => {
    // Retrieve the token from localStorage
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;

    if (!token) {
      router.push("/");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/prompt`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setPromptMessage(data.message);
        // After deleting, fetch the default prompt
        const res2 = await fetch(`${API_URL}/prompt/current`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res2.ok) {
          const data2 = await res2.json();
          setPromptText(data2.prompt_text);
          setOriginalPromptText(data2.prompt_text);
          setPromptType(data2.prompt_type);
          setLastUpdatedBy(data2.updated_by || "DEFAULT");
          setLastUpdatedAt(
              data2.updated_at
                  ? new Date(data2.updated_at).toLocaleString()
                  : "NO DATE AVAILABLE"
          );
          setEditPromptState(false);
        } else {
          console.error("Failed to fetch default prompt:", res2.status);
          setPromptMessage("Failed to fetch default prompt");
        }
      } else {
        console.error("Failed to revert to default prompt:", res.status);
        setPromptMessage("Failed to revert to default prompt");
      }
    } catch (error) {
      console.error("Error reverting to default prompt:", error);
      setPromptMessage("Error reverting to default prompt");
    }
  };

  const handleRevertToPreviousPrompt = async () => {
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;
  
    if (!token) {
      router.push("/");
      return;
    }
  
    try {
      // Fetch the count of dynamic prompt versions
      const versionRes = await fetch(`${API_URL}/prompt/history/count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (versionRes.ok) {
        const versionData = await versionRes.json();

        // If there are no dynamic prompt versions, show a message and do nothing
        if (versionData.count === 0) {
          setPromptMessage("Cannot rollback. Only default prompt exist.");
          return;
        }
  
        // If there is only one version of the dynamic prompt, revert to default
        if (versionData.count === 1) {
          setPromptMessage(
            "Only one dynamic prompt version exists. Reverting to default..."
          );
          await handleRevertToDefault();
          return;
        }
  
        // Rollback logic for more than one version
        const rollbackRes = await fetch(`${API_URL}/prompt/rollback`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
  
        if (rollbackRes.ok) {
          const rollbackData = await rollbackRes.json();
          setPromptMessage(rollbackData.message);
  
          // Fetch the updated prompt after rollback
          const updatedRes = await fetch(`${API_URL}/prompt/current`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
  
          if (updatedRes.ok) {
            const updatedData = await updatedRes.json();
            setPromptText(updatedData.prompt_text);
            setOriginalPromptText(updatedData.prompt_text);
            setPromptType(updatedData.prompt_type);
            setLastUpdatedBy(updatedData.updated_by || "DEFAULT");
            setLastUpdatedAt(
              updatedData.updated_at
                ? new Date(updatedData.updated_at).toLocaleString()
                : "NO DATE AVAILABLE"
            );
          }
        } else {
          console.error("Failed to revert to previous prompt:", rollbackRes.status);
          setPromptMessage("Failed to revert to previous prompt.");
        }
      } else {
        console.error("Failed to fetch prompt version count:", versionRes.status);
        setPromptMessage("Failed to determine prompt version count.");
      }
    } catch (error) {
      console.error("Error reverting to previous prompt:", error);
      setPromptMessage("Error reverting to previous prompt.");
    }
  };  
  
  // Function to convert prompt details to CSV
  const convertPromptToExcel = () => {
    const worksheetData = [
      ["Prompt Text", "Updated By", "Updated At"],
      [promptText, lastUpdatedBy, lastUpdatedAt],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Prompt Details");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    return excelBuffer;
  };

  // Function to download the prompt details as an Excel file
  const handleDownloadExcel = () => {
    if (promptType !== "dynamic") {
      setDownloadMessage("No dynamic prompt available to download.");
      return;
    }

    const excelBuffer = convertPromptToExcel();
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `prompt_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadMessage(""); // Clear message after successful download
  };

  const handleCancelPrompt = () => {
    setPromptText(originalPromptText);
    setEditPromptState(false);
    setCompareResult(null);
  };

  const handleComparePrompt = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/attempt/compare-latest-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt_text: promptText }),  // Ensure key is 'prompt_text'
      });
  
      if (res.ok) {
        const result = await res.json();
        setCompareResult(result);  // Store the comparison result
      } else {
        console.error("Failed to compare prompts:", res.status);
      }
    } catch (error) {
      console.error("Error comparing prompts:", error);
    } finally {
      setLoading(false); 
    }
  };

  const makeLinksClickable = (text) => {
    if (!text) return null; // Handle null or undefined inputs gracefully
  
    // Regular expression to detect URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
  
    // Replace URLs in the text with anchor tags
    const parts = text.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  
    return <span>{parts}</span>;
  };
  

  // Vectorstore management handlers
  const handleUploadCsv = async () => {
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;
  
    if (!token) {
      router.push("/");
      return;
    }
  
    if (!csvFile) {
      setCsvUploadMessage("Please select a CSV file to upload.");
      return;
    }
  
    const formData = new FormData();
    formData.append("file", csvFile);

    setIsUploading(true); // Start loading
  
    try {
      const res = await fetch(`${API_URL}/upload-faq-csv`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (res.ok) {
        const data = await res.json();
        setCsvUploadMessage(data.message);
        setCsvFile(null); // Reset the file input
      } else {
        const errorData = await res.json();
        setCsvUploadMessage(`Failed to upload CSV: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Error uploading CSV:", error);
      setCsvUploadMessage("Error uploading CSV");
    } finally {
      setIsUploading(false); // End loading
    }
  };
  
  const handleRevertVectorstore = async () => {
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;
  
    if (!token) {
      router.push("/");
      return;
    }

    setIsUploading(true); // Start loading
  
    try {
      const res = await fetch(`${API_URL}/revert-faq-csv`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (res.ok) {
        const data = await res.json();
        setCsvUploadMessage(data.message);
      } else {
        const errorData = await res.json();
        setCsvUploadMessage(`Failed to revert vectorstore: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Error reverting vectorstore:", error);
      setCsvUploadMessage("Error reverting vectorstore");
    } finally {
      setIsUploading(false); // End loading
    }
  };

  // System management handlers
  function handleEdit() {
    // Create a deep copy of systems to edit
    setEditedSystems(JSON.parse(JSON.stringify(systems)));
    setEditMode(true);
    setSystemMessage("");
  }

  // Save changes
  async function handleSave() {
    const updates = [];
    const deletes = [];

    // Find deleted systems
    systems.forEach((system) => {
      const found = editedSystems.find((s) => s.id === system.id);
      if (!found) {
        deletes.push(system.id);
      }
    });

    // Find updated systems
    editedSystems.forEach((editedSystem) => {
      const originalSystem = systems.find((s) => s.id === editedSystem.id);
      if (originalSystem) {
        if (
          originalSystem.name !== editedSystem.name ||
          originalSystem.url !== editedSystem.url
        ) {
          updates.push(editedSystem);
        }
      }
    });

    try {
      // Perform delete requests
      for (const id of deletes) {
        await fetch(`${API_URL}/systems/${id}`, {
          method: "DELETE",
        });
      }

      // Perform update requests
      for (const system of updates) {
        await fetch(`${API_URL}/systems/${system.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: system.name, url: system.url }),
        });
      }

      // Refresh systems from backend
      const res = await fetch(`${API_URL}/systems`);
      if (res.ok) {
        const data = await res.json();
        setSystems(data);
      }

      setEditMode(false);
      setSystemMessage("Systems updated successfully");
    } catch (error) {
      console.error("Error saving systems:", error);
      setSystemMessage("Failed to save systems");
    }
  }

  // Cancel editing
  function handleCancel() {
    setEditMode(false);
    setSystemMessage("Changes discarded");
  }

  // Handle deleting a system in edit mode
  function handleDeleteInEditMode(index) {
    const newEditedSystems = editedSystems.filter((_, i) => i !== index);
    setEditedSystems(newEditedSystems);
  }

  // Handle adding a new system
  const handleAddSystem = async () => {
    if (newSystem.name && newSystem.url) {
      try {
        const res = await fetch(`${API_URL}/systems`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newSystem),
        });

        if (res.ok) {
          const data = await res.json();
          setSystems([...systems, data]);
          setNewSystem({ name: "", url: "" });
          setSystemMessage("System added successfully");
        } else {
          console.error("Failed to add system:", res.status);
          setSystemMessage("Failed to add system");
        }
      } catch (error) {
        console.error("Error adding system:", error);
        setSystemMessage("Error adding system");
      }
    }
  };

  return (
    <div className="profile-card">
      <div className="bg-white min-w-full rounded-md p-6 mb-8">
        <p className="font-bold text-xl mb-4">Prompt Management</p>
        <div className="flex flex-row justify-between mb-4">
            {/* <p className="text-gray-600">
            Current Prompt Type:{" "}
            {promptType.charAt(0).toUpperCase() + promptType.slice(1)}
          </p> */}
          {editPromptState ? (
            <div className="flex flex-row gap-2">
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={() => setShowSaveModal(true)}  // Show modal instead of saving
              >
                Save
              </button>
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={handleComparePrompt} 
              >
                Compare Before Save
              </button>
              <button
                className="text-white bg-red-500 hover:bg-red-700 px-4 py-2 rounded-md"
                onClick={handleCancelPrompt}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-row gap-2">
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={() => setEditPromptState(true)}
              >
                Edit
              </button>
              <button
                className="text-white bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-md"
                onClick={handleRevertToPreviousPrompt} 
              >
                Revert to Previous Prompt
              </button>
              <button
                className="text-white bg-red-500 hover:bg-red-700 px-4 py-2 rounded-md"
                onClick={() => setShowPromptRevertModal(true)}
              >
                Revert to Default Prompt
              </button>
            </div>
          )}
        </div>

        {/* SaveModal */}
        {showSaveModal && (
          <SaveModal
            setShowModal={setShowSaveModal}
            handleSave={handleUpdatePrompt}  // Save action when confirmed
          />
        )}

        {/* RevertModal */}
        {showPromptRevertModal && (
          <RevertModal
            setRevertModal={setShowPromptRevertModal}
            handleRevert={handleRevertToDefault}  
          />
        )}

        {/* Show loading spinner */}
        {loading && (
          <div className="flex justify-center items-center">
            <svg className="animate-spin h-5 w-5 text-dark-green" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="ml-2">Comparing...</span>
          </div>
        )}

        {/* Show comparison result */}
        {!loading && compareResult && (
          <div className="bg-gray-100 p-4 rounded-md mb-4">
            <h3 className="text-lg font-bold">Comparison Result</h3>

            <div className="mt-4">
              <p className="mb-2"><strong>Question and Answer:</strong></p>
              {compareResult?.old_feedback ? (
                <>
                  <p className="mb-2"><span className="underline">Scheme:</span> {compareResult.old_feedback.question.scheme_name}</p>
                  <p className="mb-2"><span className="underline">Question Title:</span> {compareResult.old_feedback.question.title}</p>
                  <p className="mb-2"><span className="underline">Question Details:</span> {compareResult.old_feedback.question.question_details}</p>
                  <p className="mb-2"><span className="underline">Answer:</span> {makeLinksClickable(compareResult.old_feedback.answer)}</p>
                  <p className="mb-2"><span className="underline">System Name:</span> {compareResult.old_feedback.system_name}</p>
                  <p className="mb-2"><span className="underline">System URL:</span> (compareResult.old_feedback.system_url)</p>
                </>
              ) : (
                <p>No old feedback available.</p>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2"><strong>Old Feedback:</strong></p>
              {compareResult?.old_feedback ? (
                <>
                  <p className="mb-2"><span className="underline">Accuracy Score:</span> {compareResult.old_feedback.accuracy_score}</p>
                  <p className="mb-2"><span className="underline">Comprehension Score:</span> {compareResult.old_feedback.precision_score}</p>
                  <p className="mb-2"><span className="underline">Tone Score:</span> {compareResult.old_feedback.tone_score}</p>
                  <p className="mb-2"><span className="underline">Accuracy Feedback:</span> {compareResult.old_feedback.accuracy_feedback}</p>
                  <p className="mb-2"><span className="underline">Comprehension Feedback:</span> {compareResult.old_feedback.precision_feedback}</p>
                  <p className="mb-2"><span className="underline">Tone Feedback:</span> {compareResult.old_feedback.tone_feedback}</p>
                </>
              ) : (
                <p>No old feedback available.</p>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2"><strong>New Feedback:</strong></p>
              {compareResult?.new_feedback ? (
                <>
                  <p className="mb-2"><span className="underline">Accuracy Score:</span> {compareResult.new_feedback.accuracy_score}</p>
                  <p className="mb-2"><span className="underline">Comprehension Score:</span> {compareResult.new_feedback.precision_score}</p>
                  <p className="mb-2"><span className="underline">Tone Score:</span> {compareResult.new_feedback.tone_score}</p>
                  <p className="mb-2"><span className="underline">Accuracy Feedback:</span> {compareResult.new_feedback.accuracy_feedback}</p>
                  <p className="mb-2"><span className="underline">Comprehension Feedback:</span> {compareResult.new_feedback.precision_feedback}</p>
                  <p className="mb-2"><span className="underline">Tone Feedback:</span> {compareResult.new_feedback.tone_feedback}</p>
                </>
              ) : (
                <p>No new feedback available.</p>
              )}
            </div>
          </div>
        )}

        <div className="w-full h-max-content flex justify-end items-center font-bold">
            <button type="button" className="button" onClick={handleDownloadExcel}>
              <Download fontSize="medium" />
              Download Excel
            </button>
        </div>
    
        {promptMessage && (
          <div className="mb-4 text-green-600 font-semibold">{promptMessage}</div>
        )}
        {/* Display message for CSV download */}
        {downloadMessage && (
          <div className="mt-2 text-red-500 text-sm">{downloadMessage}
        </div>
        )}

        {/* Side-by-Side Prompt View */}
        {editPromptState && (
          <div className="flex flex-row gap-4">
            {/* Old Prompt */}
            <div className="w-1/2">
              <p className="font-semibold mb-2">Old Prompt:</p>
              <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md h-full overflow-auto max-h-[400px]">
                {originalPromptText}
              </pre>
            </div>

            {/* New Prompt */}
            <div className="w-1/2">
              <p className="font-semibold mb-2">New Prompt (Editing):</p>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={20}
                cols={40}
                className="w-full border border-gray-300 p-2 rounded-md"
              />
            </div>
          </div>
        )}

        {!editPromptState && (
          <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md h-full overflow-auto max-h-[400px]">
            {promptText}
          </pre>
        )}

        {/* Display last updated by user and time */}
        <div className="text-gray-500 text-sm mt-2">
          Last updated by: {lastUpdatedBy} on {lastUpdatedAt}
        </div>
      </div>

      <div className="bg-white min-w-full rounded-md p-6 mt-8">
        <p className="font-bold text-xl mb-4">Vectorstore Management</p>
        {csvUploadMessage && (
          <div className="mb-4 text-green-600 font-semibold">{csvUploadMessage}</div>
        )}
        <div className="flex flex-col gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files[0])}
            disabled={isUploading}
          />
          <button
            className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md w-fit"
            onClick={() => setShowUploadModal(true)} 
            disabled={!csvFile || isUploading}
          >
            Upload CSV
          </button>
          <button
            className="text-white bg-red-500 hover:bg-red-700 px-4 py-2 rounded-md w-fit"
            onClick={() => setShowVectorstoreRevertModal(true)}
            disabled={isUploading}
          >
            Revert to Default Vectorstore
          </button>

          {/* RevertModal */}
          {showVectorstoreRevertModal && (
            <RevertModal
              setRevertModal={setShowVectorstoreRevertModal}
              handleRevert={handleRevertVectorstore}  
            />
          )}

          {isUploading && (
            <div className="flex items-center gap-2 mt-4">
              <svg
                className="animate-spin h-5 w-5 text-dark-green"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
              <span>Updating vectorstore, please wait...</span>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          setUploadModal={setShowUploadModal}
          handleUpload={handleUploadCsv}  // Upload action when confirmed
        />
      )}
      
      <div className="bg-white min-w-full rounded-md p-6">
        <p className="font-bold text-xl mb-4">System Name Management</p>
        {/* {systemMessage && (
        <div className="mb-4 text-green-600 font-semibold">{systemMessage}</div>
        )} */}
        <div className="flex flex-row justify-between">
        {editMode ? (
            <div className="flex flex-row gap-2">
            <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
                onClick={handleSave}
            >
                Save
            </button>
            <button
                className="text-white bg-red-500 hover:bg-red-700 px-4 rounded-md"
                onClick={handleCancel}
            >
                Cancel
            </button>
            </div>
        ) : (
            <button
            className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
            onClick={handleEdit}
            >
            Edit
            </button>
        )}
        </div>

        <table className="w-full table-auto border border-collapse border-slate-200 mt-2">
        <thead>
            <tr>
            <th className="text-start py-2 px-3 border">System Name</th>
            <th className="text-start py-2 px-3 border">System URL</th>
            {editMode && <th className="w-[0px] p-0" />}
            </tr>
        </thead>
        <tbody>
            {editMode ? (
            editedSystems.map((system, index) => (
                <tr className="hover:bg-light-gray hover:cursor-pointer" key={system.id}>
                <td className="text-start py-2 px-3 border">
                    <input
                    type="text"
                    value={system.name}
                    onChange={(e) => {
                        const newEditedSystems = [...editedSystems];
                        newEditedSystems[index].name = e.target.value;
                        setEditedSystems(newEditedSystems);
                    }}
                    className="border border-gray-300 p-1 w-full"
                    />
                </td>
                <td className="text-start py-2 px-3 border">
                    <input
                    type="text"
                    value={system.url}
                    onChange={(e) => {
                        const newEditedSystems = [...editedSystems];
                        newEditedSystems[index].url = e.target.value;
                        setEditedSystems(newEditedSystems);
                    }}
                    className="border border-gray-300 p-1 w-full"
                    />
                </td>
                <td className="text-center py-2 px-3 border">
                    <button className="flex items-center">
                      <FaRegTrashCan
                        className="text-red-500 ml-0.5"
                        onClick={() => handleDeleteInEditMode(index)}
                      />
                    </button>
                </td>
                </tr>
            ))
            ) : (
            systems.map((system) => (
                <tr className="hover:bg-light-gray hover:cursor-pointer" key={system.id}>
                <td className="text-start py-2 px-3 border">{system.name}</td>
                <td className="text-start py-2 px-3 border">{system.url}</td>
                </tr>
            ))
            )}
        </tbody>
        </table>

        <div className="mt-6">
        <h2 className="font-bold text-lg mb-2">Add New System</h2>
        <div className="flex items-center gap-2">
            <Input
            placeholder="System Name"
            value={newSystem.name}
            onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
            className="w-1/3"
            />
            <Input
            placeholder="System URL"
            value={newSystem.url}
            onChange={(e) => setNewSystem({ ...newSystem, url: e.target.value })}
            className="w-1/3"
            />
            <Button color="primary" className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md" onClick={handleAddSystem}>
            Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default isAuth(UpdatePage);
