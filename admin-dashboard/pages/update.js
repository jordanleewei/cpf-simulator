// framework
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import isAuth from "../components/isAuth.jsx"; 
import { Input, Button } from "@nextui-org/react";

function UpdatePage() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();

  // State variables for prompt management
  const [promptText, setPromptText] = useState("");
  const [originalPromptText, setOriginalPromptText] = useState("");
  const [promptType, setPromptType] = useState("");
  const [editPromptState, setEditPromptState] = useState(false);
  const [promptMessage, setPromptMessage] = useState("");

  // State variables for system management
  const [systems, setSystems] = useState([]);
  const [newSystem, setNewSystem] = useState({ name: "", url: "" });
  const [editMode, setEditMode] = useState(false);
  const [editedSystems, setEditedSystems] = useState([]);
  const [systemMessage, setSystemMessage] = useState("");

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

  const handleCancelPrompt = () => {
    setPromptText(originalPromptText);
    setEditPromptState(false);
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
                onClick={handleUpdatePrompt}
              >
                Save
              </button>
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
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
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={handleRevertToDefault}
              >
                Revert to Default Prompt
              </button>
            </div>
          )}
        </div>

        {promptMessage && (
          <div className="mb-4 text-green-600 font-semibold">{promptMessage}</div>
        )}

        {editPromptState ? (
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={20}
            cols={80}
            className="w-full border border-gray-300 p-2 rounded-md"
          />
        ) : (
          <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded-md">
            {promptText}
          </pre>
        )}
      </div>
      
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
                    <button
                    className="text-white bg-red-500 hover:bg-red-700 px-2 rounded-md"
                    onClick={() => handleDeleteInEditMode(index)}
                    >
                    Delete
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
