export default function UpdateModal({ setShowModal, handleUpdate }) {
    return (
      <>
        {/* Backdrop to grey out the rest of the page */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-40"></div>
  
        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-light-green h-2/5 w-1/4 rounded-lg flex flex-col justify-evenly items-center p-4 shadow-lg">
            <p className="font-bold text-xl">Update Confirmation</p>
            <p style={{ textAlign: "center" }}>Are you sure you want to update all attempts?</p>
            <p style={{ textAlign: "center" }}>
              This action will update all attempts with the latest feedback using the latest prompt.
            </p>
            <div className="flex flex-row gap-10 mt-4">
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={() => {
                  handleUpdate(); // Trigger the update action
                  setShowModal(false); // Close the modal after updating
                }}
              >
                Update
              </button>
              <button
                className="text-white bg-red-500 hover:bg-red-700 px-4 py-2 rounded-md"
                onClick={() => setShowModal(false)} // Close the modal without updating
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  