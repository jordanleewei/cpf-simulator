export default function UploadModal({ setUploadModal, handleUpload }) {
    return (
      <>
        {/* Backdrop to grey out the rest of the page */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-50 z-40"></div>
  
        {/* Modal */}
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-light-green h-2/5 w-1/4 rounded-lg flex flex-col justify-evenly items-center p-4 shadow-lg">
            <p className="font-bold text-xl">Upload Confirmation</p>
            <p>Are you sure you want to upload the csv?</p>
            <p style={{ textAlign: 'center' }}>
              This action will upload the csv to update vectorstore.
            </p>
            <div className="flex flex-row gap-10 mt-4">
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 py-2 rounded-md"
                onClick={() => {
                  handleUpload(); // Trigger the save action
                  setUploadModal(false); // Close the modal after saving
                }}
              >
                Upload
              </button>
              <button
                className="text-white bg-red-500 hover:bg-red-700 px-4 py-2 rounded-md"
                onClick={() => setUploadModal(false)} // Close the modal
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }