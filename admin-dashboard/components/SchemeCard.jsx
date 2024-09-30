// framework
import { useState, useEffect} from "react"; 
import Image from "next/image";
import { useRouter } from "next/router";
// images
import caseimg from "../public/new_case_img.png";
import { TiDelete } from "react-icons/ti";

export default function SchemeCard({
  scheme_name,
  scheme_img,
  questions,
  scheme_button,
  editState,
  setDeleteId,
  updateSchemeName,
  originalSchemeName, 
  cancelEdit, 
}) {
  const router = useRouter();
  const [localSchemeName, setLocalSchemeName] = useState(scheme_name);

  // Handle input change for local state
  const handleInputChange = (e) => {
    setLocalSchemeName(e.target.value);
  };

  // Update the scheme name in the parent state when the input loses focus
  const handleBlur = () => {
    updateSchemeName(localSchemeName);
  };

  // Revert the scheme name to the original value if editing is canceled
  useEffect(() => {
    if (cancelEdit) {
      setLocalSchemeName(originalSchemeName); // Revert to original scheme name
    }
  }, [cancelEdit, originalSchemeName]);

  function onClick() {
    const pagename = localSchemeName.toLowerCase();
    router.push(`/${pagename}/exercises`, undefined, { shallow: true });
  }

  return (
    <div className="flex flex-col p-4 border-4 rounded-xl max-w-[350px] relative items-start">
      <img
        src={scheme_img}
        alt="scheme image"
        className="rounded-xl object-cover w-60 h-60"
      />
      {editState ? (
        <input
          type="text"
          value={localSchemeName}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="font-bold pt-2 pb-4 border border-gray-300 rounded-md px-2 py-1"
          style={{ width: "100%" }}
        />
      ) : (
        <div className="font-bold pt-2 pb-4">{localSchemeName}</div>
      )}
      <div className="flex flex-row gap-2">
        <Image src={caseimg} alt="case icon" width={20} height={20} />
        <span>Case Scenarios: {questions}</span>
      </div>
      {scheme_button ? (
        <div className="flex flex-row gap-2 pt-6">
          <button
            onClick={onClick}
            className="bg-dark-green text-white py-2 px-4 rounded-md hover:bg-darker-green"
          >
            View Questions
          </button>
        </div>
      ) : null}
      {editState ? (
        <button
          className="absolute text-red-600 p-1 -top-6 -right-6"
          onClick={() => setDeleteId(scheme_name)}
        >
          <TiDelete size={40} />
        </button>
      ) : null}
    </div>
  );
}