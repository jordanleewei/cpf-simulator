import { useEffect, useState } from "react";

export default function SchemeTags({
  schemes,
  allSchemes,
  user_id,
  updateTeamMembers,
  editState,
  onChangeSchemes,
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState([...schemes].sort());

  useEffect(() => {
    setChecked([...schemes].sort());
  }, [schemes]);

  const handleCheckboxChange = (event) => {
    const isChecked = event.target.checked;
    const schemeName = event.target.value;

    let updatedChecked;
    if (isChecked) {
      updatedChecked = [...checked, schemeName].sort();
    } else {
      updatedChecked = checked.filter((name) => name !== schemeName);
    }

    setChecked(updatedChecked);
    onChangeSchemes(updatedChecked);
  };

  const maxSchemeWidth = Math.max(
    ...allSchemes.map((scheme) => scheme.length)
  );

  const SchemeTag = ({ schemeName }) => {
    return (
      <div className="flex justify-center items-center bg-light-blue px-2 py-1 rounded-lg text-dark-blue scheme-tag">
        {schemeName}
        {editState && (
          <button
            className="ml-2 text-red-500 hover:text-red-700"
            onClick={() =>
              handleCheckboxChange({
                target: { checked: false, value: schemeName },
              })
            }
          >
            &times;
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-row flex-wrap px-2 py-1 gap-2 min-h-10">
      {checked.map((name, idx) => (
        <SchemeTag key={idx} schemeName={name} />
      ))}

      {editState && (
        <div className="relative">
          <button
            className={`flex justify-center items-center bg-light-blue px-2 py-1 text-dark-blue rounded-t-lg hover:bg-lighter-blue ${
              open ? "rounded-b-none" : "rounded-b-lg"
            }`}
            onClick={() => setOpen(!open)}
          >
            <span className="text-darker-green">+</span>&nbsp;Add Scheme
          </button>

          {/* dropdown options */}
          {open && (
            <div className="z-10 bg-light-blue absolute top-full left-0 p-2 rounded-b-lg dropdown">
              <ul className="space-y-3">
                {allSchemes.map((scheme) => (
                  <li
                    key={scheme}
                    className="flex items-center w-full gap-2"
                  >
                    <input
                      type="checkbox"
                      value={scheme}
                      style={{ width: "13px", height: "13px", cursor: "pointer" }}
                      checked={checked.includes(scheme)}
                      onChange={handleCheckboxChange}
                    />
                    <label 
                    className="ml-2">{scheme}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
