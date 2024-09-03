import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import isAuth from "../../../components/isAuth.jsx";
import BackBar from "../../../components/BackBar.jsx";

function Feedback() {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();
  const [feedbackData, setFeedbackData] = useState(null);  // Initially set as null
  const [editMode, setEditMode] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false); // This state will trigger data refetch
  const [formState, setFormState] = useState({
    manual_feedback_id: "",
    feedback: ""
  });

  useEffect(() => {
    async function getData() {
      if (router.isReady) {
        try {
          const res = await fetch(`${API_URL}/manual-feedback/attempt/${router.query.slug}`);
          if (!res.ok) {
            const errorData = await res.json();
            console.error("Backend Error: ", errorData);
            throw new Error("Failed to fetch feedback");
          } else {
            const data = await res.json();
            setFeedbackData(data);
            setFormState({
              manual_feedback_id: data.manual_feedback_id || "",
              feedback: data.feedback || "",
            });
          }
        } catch (e) {
          console.error("Fetch error: ", e);
        }
      }
    }
    getData();
  }, [router.isReady, API_URL, router.query.slug, shouldRefetch]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/manual-feedback/${formState.manual_feedback_id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        throw new Error("Failed to update feedback");
      }

      // Trigger refetch after form submission
      setShouldRefetch(prev => !prev); // Toggle the state to trigger useEffect
      setEditMode(false); // Exit edit mode on success
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  };

  if (!feedbackData) {
    return <div>Loading...</div>; // Show a loading state if the question hasn't been fetched yet
  }

  return (
    <div className="exercise-container">
      <BackBar review={false} submit={false} profile={false} />
  
      <div className="exercise-card relative" style={{ height: 'calc(100vh - 80px)', width: '100%' }}>
        {/* Title and Feedback positioned at the top left */}
        <div style={{ textAlign: 'left', marginBottom: '20px', width: '100%', height: '100%' }}>
          <div className="font-bold text-2xl" style={{ marginBottom: '20px' }}>Feedback</div>
          {editMode ? (
            <textarea
              name="feedback"
              value={formState.feedback}
              onChange={handleInputChange}
              className="textarea-field"
              style={{
                width: "100%",
                height: "calc(100% - 100px)", // Adjust height to fill the area while accounting for padding and title
                padding: "10px",
                overflowY: "scroll",
                whiteSpace: "pre-wrap", // Ensure line breaks are respected
                marginBottom: "20px", // Added space between title and feedback
                boxSizing: "border-box", // Ensure padding is included in the width
              }}
            />
          ) : (
            <p style={{ whiteSpace: "pre-wrap", width: "100%" }}>{feedbackData.feedback}</p> // Ensure line breaks are reflected in view mode
          )}
        </div>
  
        {/* Edit Button at the Top Right Corner of the Card */}
        {!editMode && (
          <button
            className="bg-dark-green hover:bg-darker-green text-white py-2 px-4 rounded-md absolute top-4 right-4"
            onClick={() => setEditMode(true)}
          >
            Edit
          </button>
        )}
  
        {editMode && (
          <div className="flex justify-between mt-4">
            <button
              type="button"
              className="bg-red-500 hover:bg-red-600 text-white rounded-md py-2 px-4"
              onClick={() => setEditMode(false)}
              style={{ marginRight: '10px' }} // Added margin to create space between buttons
            >
              Back
            </button>
            <button
              type="submit"
              className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
              onClick={handleSubmit}
            >
              Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );  
}
export default isAuth(Feedback);
