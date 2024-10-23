import { useState } from "react";
import { FaCaretDown } from "react-icons/fa";

export default function SchemeFilter({
  schemeFilter,
  setSchemeFilter,
  allSchemes,
}) {
  const [open, setOpen] = useState(false);
  const handleCheckboxChange = async (event) => {
    const inputValue = event.target.value;

    setSchemeFilter(inputValue);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        className={`flex flex-row items-center justify-between bg-light-gray w-32 rounded-md py-1 px-3 hover:bg-gray-200 ${
          open ? "rounded-b-none" : "rounded-b-lg"
        }`}
        onClick={() => setOpen(!open)}
      >
        <div>{schemeFilter}</div>
        <div>
          <FaCaretDown />
        </div>
      </button>
      {open ? (
        <div className="z-10 bg-light-gray absolute top-full rounded-b-lg p-4 max-h-48 overflow-y-auto shadow-lg">
          <ul className="space-y-3">
            <li className="flex items-center w-full gap-2">
              <button
                value="All"
                className="w-full h-auto text-left hover:bg-gray-200 rounded"
                onClick={handleCheckboxChange}
              >
                All
              </button>
            </li>
            {allSchemes.map((scheme) => (
              <li key={scheme} className="flex items-center w-full gap-2">
                <button
                  value={scheme}
                  className="w-full h-auto text-left hover:bg-gray-200 rounded"
                  onClick={handleCheckboxChange}
                >
                  {scheme}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}