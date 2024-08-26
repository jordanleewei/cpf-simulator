import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import isAuth from "../../components/isAuth";
import BackBar from "../../components/BackBar";

function Question() {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();
  const [question, setQuestion] = useState(null);  // Initially set as null
  const [editMode, setEditMode] = useState(false);
  const [shouldRefetch, setShouldRefetch] = useState(false); // This state will trigger data refetch
  const [formState, setFormState] = useState({
    title: "",
    question_difficulty: "",
    question_details: "",
    ideal: "",
    scheme_name: "",
    ideal_system_name: "",
    ideal_system_url: "",
  });

  useEffect(() => {
    async function getData() {
      if (router.isReady) {
        try {
          const res = await fetch(`${API_URL}/question/${router.query.slug}`);
          if (!res.ok) {
            throw new Error("Failed to fetch data");
          } else {
            const data = await res.json();
            setQuestion(data);  // Update the question object
            setFormState({
              title: data.title || "",
              question_difficulty: data.question_difficulty || "",
              question_details: data.question_details || "",
              ideal: data.ideal || "",
              scheme_name: data.scheme_name || "",
              ideal_system_name: data.ideal_system_name || "",
              ideal_system_url: data.ideal_system_url || "",
            });
          }
        } catch (e) {
          console.log(e);
        }
      }
    }

    // Call getData when the component is mounted and when refetch is triggered
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

  // Handle Difficulty change
  const handleDifficultyChange = (e) => {
    const value = e.target.value;
    setFormState((prevState) => ({
      ...prevState,
      question_difficulty: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/question/${router.query.slug}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formState),
      });

      if (!res.ok) {
        throw new Error("Failed to update question");
      }

      // Trigger refetch after form submission
      setShouldRefetch(prev => !prev); // Toggle the state to trigger useEffect
      setEditMode(false); // Exit edit mode on success
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  if (!question) {
    return <div>Loading...</div>; // Show a loading state if the question hasn't been fetched yet
  }

  return (
    <div className="exercise-container">
      <BackBar review={false} submit={false} profile={false} />

      <div className="exercise-card relative">
        {/* Edit Button at the Top Right Corner of the Card */}
        {!editMode && (
          <button
            className="bg-dark-green hover:bg-darker-green text-white py-2 px-4 rounded-md absolute top-4 right-4"
            onClick={() => setEditMode(true)}
          >
            Edit
          </button>
        )}

        {editMode ? (
          <form onSubmit={handleSubmit} style={{ width: "100%", padding: "10px" }}>
            <div className="font-bold text-2xl">
              <label>
                Title:{" "}
                <input
                  type="text"
                  name="title"
                  value={formState.title}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ width: "100%", padding: "10px" }}
                />
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Scheme: </span>
                {question.scheme_name}
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Difficulty: </span>
                <select
                  name="question_difficulty"
                  value={formState.question_difficulty}
                  onChange={handleDifficultyChange}
                  className="input-field"
                  style={{ width: "100%", padding: "10px" }}
                >
                  <option value="Easy">Easy</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Complex">Complex</option>
                </select>
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Question:</span>
                <textarea
                  name="question_details"
                  value={formState.question_details}
                  onChange={handleInputChange}
                  className="textarea-field"
                  style={{
                    width: "100%",
                    padding: "10px",
                    height: "200px",
                    overflowY: "scroll",
                  }}
                />
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Ideal Answer:</span>
                <textarea
                  name="ideal"
                  value={formState.ideal}
                  onChange={handleInputChange}
                  className="textarea-field"
                  style={{
                    width: "100%",
                    padding: "10px",
                    height: "200px",
                    overflowY: "scroll",
                  }}
                />
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Verified System Names:</span>
                <input
                  type="text"
                  name="ideal_system_name"
                  value={formState.ideal_system_name}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ width: "100%", padding: "10px" }}
                />
              </label>
            </div>

            <div>
              <label>
                <span className="font-bold">Verified System URLs:</span>
                <input
                  type="text"
                  name="ideal_system_url"
                  value={formState.ideal_system_url}
                  onChange={handleInputChange}
                  className="input-field"
                  style={{ width: "100%", padding: "10px" }}
                />
              </label>
            </div>

            <div className="flex justify-between mt-4">
              <button
                type="button"
                className="bg-red-500 hover:bg-red-600 text-white rounded-md py-2 px-4"
                onClick={() => setEditMode(false)}
              >
                Back
              </button>
              <button
                type="submit"
                className="bg-dark-green hover:bg-darker-green rounded-md text-white py-2 px-4"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="font-bold text-2xl">{question.title}</div>
            <div>
              <div>
                <span className="font-bold">Scheme: </span>
                {question.scheme_name}
              </div>

              <div>
                <span className="font-bold">Difficulty: </span>
                {question.question_difficulty}
              </div>
            </div>

            <div>
              <p className="font-bold">Question:</p>
              <p>{question.question_details}</p>
            </div>
            <div>
              <p className="font-bold">Ideal Answer:</p>
              <p>{question.ideal}</p>
            </div>
            <div>
              <p className="font-bold">Verified System Names:</p>
              <ul>
                {formState.ideal_system_name.split(", ").map((name, index) => (
                  <li key={index}>{name}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-bold">Verified System URLs:</p>
              <ul>
                {formState.ideal_system_url.split(", ").map((url, index) => (
                  <li key={index}>{url}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default isAuth(Question);
