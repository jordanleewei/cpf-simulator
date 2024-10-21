export default function DeleteModal({ id, setId, text, handleDelete }) {
  return (
    <div className="bg-light-green h-2/5 w-1/4 absolute z-40 rounded-lg flex flex-col justify-evenly items-center p-4">
      <p className="font-bold text-xl">Delete Confirmation</p>
      <p>Delete <i>{text}</i>?</p>
      <p style={{ textAlign: 'center' }}>This action will only be executed upon saving on the main page.</p>
      <div className="flex flex-row gap-10 mt-4">
        <button
          className="text-white bg-red-600 hover:bg-red-800 px-4 py-2 rounded-md"
          onClick={() => handleDelete(id)}
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
  );
}
