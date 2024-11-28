import { useState } from "react";

export default function DeleteModal({ id, setId, text, handleDelete }) {
  const [pin, setPin] = useState(""); // State to store the entered PIN
  const [errorMessage, setErrorMessage] = useState(""); // State for error messages
  const correctPin = "8496"; // Replace with your desired PIN

  const validateAndDelete = () => {
    if (pin === correctPin) {
      handleDelete(id);
    } else {
      setErrorMessage("Incorrect PIN. Please try again.");
    }
  };

  return (
    <div className="bg-light-green h-1/2 w-1/3 absolute z-40 rounded-lg flex flex-col justify-evenly items-center p-4">
      <p className="font-bold text-xl">Delete Confirmation</p>
      <p>
        Delete <i>{text}</i>?
      </p>
      <p style={{ textAlign: "center" }}>
        This action will only be executed upon saving on the main page.
      </p>
      <div className="flex flex-col gap-3 items-center mt-4 w-full">
        {/* PIN Input */}
        <input
          type="password"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter 4-digit PIN"
          className="border border-gray-300 rounded-md p-2 w-2/3 text-center"
        />
        {errorMessage && (
          <p className="text-red-600 text-sm">{errorMessage}</p>
        )}
        {/* Buttons */}
        <div className="flex flex-row gap-10 mt-4">
          <button
            className="text-white bg-red-600 hover:bg-red-800 px-4 py-2 rounded-md"
            onClick={validateAndDelete}
          >
            Delete
          </button>
          <button
            className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
            onClick={() => setId("")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}