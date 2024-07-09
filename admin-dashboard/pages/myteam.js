// framework
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
//components
import SchemeTags from "../components/SchemeTags";
import SchemeFilter from "../components/SchemeFilter";
import SearchBar from "../components/SearchBar";
import isAuth from "../components/isAuth";
// icons
import { AiFillCaretDown, AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaRegTrashCan } from "react-icons/fa6";
import DeleteModal from "../components/DeleteModal";
import { BiRefresh } from "react-icons/bi";
// nextui components
import { Dropdown, DropdownMenu, DropdownTrigger, DropdownItem, Button } from "@nextui-org/react";


export const getServerSideProps = async () => {
  // get all team members
  const res = await fetch("https://d17ygk7qno65io.cloudfront.net/user", { method: "GET" });

  const teamMembers = await res.json();

  // get all schemes
  const res2 = await fetch("https://d17ygk7qno65io.cloudfront.net/distinct/scheme", {
    method: "GET",
  });

  let allSchemes = await res2.json();
  if (!Array.isArray(allSchemes)) {
    allSchemes = [];
  } else {
    allSchemes = allSchemes.map((scheme) =>
      scheme.charAt(0).toUpperCase() + scheme.slice(1).toLowerCase()
    );
  }

  return { props: { teamMembers, allSchemes } };
};

function MyTeam({ teamMembers, allSchemes }) {
  const router = useRouter();

  // styles
  const tableCellStyle = `text-start py-2 px-3 border`;

  // states
  const [allTeamMembers, setAllTeamMembers] = useState(teamMembers);
  const [originalTeamMembers, setOriginalTeamMembers] = useState(teamMembers);
  const [displayMembers, setDisplayMembers] = useState(teamMembers);
  const [editState, setEditState] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteQueue, setDeleteQueue] = useState([]);
  const [password, setPassword] = useState("");
  const [resetPasswordIndex, setResetPasswordIndex] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const accessRights = ["Trainee", "Admin"];
  
  // for filtering
  const [schemeFilter, setSchemeFilter] = useState("All");
  const [search, setSearch] = useState("");

  // for filtering
  useEffect(() => {
    if (schemeFilter === "All") {
      setDisplayMembers(allTeamMembers);
    } else {
      setDisplayMembers(
        allTeamMembers.filter((member) => member.schemes.includes(schemeFilter))
      );
    }

    if (search !== "") {
      setDisplayMembers((prevDisplayMembers) =>
        prevDisplayMembers.filter(
          (member) =>
            member.name.toLowerCase().includes(search) ||
            member.email.toLowerCase().includes(search)
        )
      );
    } else {
      setDisplayMembers((prevDisplayMembers) => prevDisplayMembers);
    }
  }, [schemeFilter, search]);

  const updateTeamMembers = async () => {
    // get all team members
    const res = await fetch("https://d17ygk7qno65io.cloudfront.net/user", { method: "GET" });

    const teamMembers = await res.json();

    setAllTeamMembers(teamMembers);
    setOriginalTeamMembers(teamMembers);
  };

  const handlePasswordReset = (index) => {
    setResetPasswordIndex(index);
  };

  // Function to generate a random password
  const generatePassword = () => {
    const length = 15; // Set the length of the generated password
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|<>?"; // Characters to include
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }
    return result;
  };

  // Function to handle generating a new password
  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    handleChange(resetPasswordIndex, "password", newPassword);
  };

  const handleDelete = (user_id) => {
    // Queue the user_id for deletion
    setDeleteQueue((prevQueue) => [...prevQueue, user_id]);
    // Update frontend state immediately
    setAllTeamMembers((prevMembers) =>
      prevMembers.filter((member) => member.uuid !== user_id)
    );
    setDisplayMembers((prevMembers) =>
      prevMembers.filter((member) => member.uuid !== user_id)
    );
    // Close modal
    setDeleteId("");
  };

  const handleNav = (id) => {
    router.push(`/${id}/profile`, undefined, { shallow: true });
  };

  const handleCancel = () => {
    setAllTeamMembers(originalTeamMembers);
    setDisplayMembers(originalTeamMembers);
    setEditState(false);
    setDeleteQueue([]); // Reset delete queue
    setResetPasswordIndex(null); // Reset password reset state
  };

  const handleChange = (index, field, value) => {
    setAllTeamMembers((prevMembers) =>
      prevMembers.map((member, idx) =>
        idx === index ? { ...member, [field]: value } : member
      )
    );
    setDisplayMembers((prevMembers) =>
      prevMembers.map((member, idx) =>
        idx === index ? { ...member, [field]: value } : member
      )
    );
  };

  const handleSchemeChange = (index, updatedSchemes) => {
    setAllTeamMembers((prevMembers) =>
      prevMembers.map((member, idx) =>
        idx === index ? { ...member, schemes: updatedSchemes } : member
      )
    );
    setDisplayMembers((prevMembers) =>
      prevMembers.map((member, idx) =>
        idx === index ? { ...member, schemes: updatedSchemes } : member
      )
    );
  };

  const handleSave = async () => {
    try {
      for (let i = 0; i < allTeamMembers.length; i++) {
        const member = allTeamMembers[i];
        const originalMember = originalTeamMembers[i];
  
        // Log values for debugging
        console.log(`Comparing member ${member.uuid}:`);
        console.log('Current:', member);
        console.log('Original:', originalMember);
  
        // Check if there are any changes
        if (
          member.email !== originalMember.email ||
          member.name !== originalMember.name ||
          member.access_rights !== originalMember.access_rights ||
          member.password !== originalMember.password ||
          JSON.stringify(member.schemes) !== JSON.stringify(originalMember.schemes)
        ) {
          console.log(`Changes detected for member ${member.uuid}, updating...`);
          
          // Update user details - name | email | access rights
          const userRes = await fetch(`https://d17ygk7qno65io.cloudfront.net/user/${member.uuid}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: member.email,
              name: member.name,
              access_rights: member.access_rights,
              schemes: member.schemes,
              password: member.password
            }),
          });
  
          if (!userRes.ok) {
            throw new Error("Failed to update member details");
          }

          // Update schemes
          const schemeRes = await fetch(`https://d17ygk7qno65io.cloudfront.net/scheme/${member.uuid}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ user_id: member.uuid, schemesList: member.schemes }),
          });

          if (!schemeRes.ok) {
            throw new Error("Failed to update member schemes");
          }
        }
      }

      // Update delete
      for (const user_id of deleteQueue) {
        const res = await fetch(`https://d17ygk7qno65io.cloudfront.net/user/${user_id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to delete user ${user_id}`);
        }
      }

      setOriginalTeamMembers(allTeamMembers);
      setEditState(false);
      setDeleteQueue([]);
      setResetPasswordIndex(null);
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  return (
    <div className="w-screen bg-light-green flex items-center justify-center p-4 relative">
      {deleteId && (
        <div className="w-full h-full flex justify-center items-center fixed -top-0.5 z-40">
          <DeleteModal
            id={deleteId}
            setId={setDeleteId}
            text={
              allTeamMembers
                .filter((member) => member.uuid === deleteId)
                .map((i) => i.name)[0]
            }
            handleDelete={handleDelete}
          />
          <div className="w-screen bg-gray-500/50 h-screen absolute z-30" />
        </div>
      )}

      <div className="bg-white min-w-full rounded-md p-6">
        <p className="font-bold">Team members</p>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row gap-3">
            <SearchBar setSearch={setSearch} />
            <SchemeFilter
              schemeFilter={schemeFilter}
              setSchemeFilter={setSchemeFilter}
              allSchemes={allSchemes}
            />
          </div>
          {editState ? (
            <div className="flex flex-row gap-2">
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
                onClick={() => router.push("/addprofile")}
              >
                Add new profile
              </button>
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
                onClick={handleSave}
              >
                Save
              </button>
              <button
                className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="text-white bg-dark-green hover:bg-darker-green px-4 rounded-md"
              onClick={() => setEditState(true)}
            >
              Edit
            </button>
          )}
        </div>

        <table className="w-full table-auto border border-collapse border-slate-200 mt-2">
          <thead>
            <tr>
              <th className={`${tableCellStyle} bg-dark-grey`}>Name</th>
              <th className={`${tableCellStyle} bg-dark-grey`}>Email</th>
              <th className={`${tableCellStyle} bg-dark-grey`}>Password</th>
              <th className={`${tableCellStyle} bg-dark-grey w-1/6`}>Access</th>
              <th className={`${tableCellStyle} bg-dark-grey w-1/3`}>Schemes</th>
              <th className="w-[0px] p-0" />
            </tr>
          </thead>
          <tbody>
            {displayMembers.map((i, idx) => (
              <tr className="hover:bg-light-gray hover:cursor-pointer" key={idx}>
                <td className={tableCellStyle}>
                  {editState ? (
                    <input
                      type="text"
                      value={i.name}
                      onChange={(e) => handleChange(idx, "name", e.target.value)}
                      className="border border-gray-300 p-1"
                    />
                  ) : (
                    <span
                      className="hover:underline hover:underline-offset-2"
                      onClick={() => handleNav(i.uuid)}
                    >
                      {i.name}
                    </span>
                  )}
                </td>
                <td className={tableCellStyle}>
                  {editState ? (
                    <input
                      type="email"
                      value={i.email}
                      onChange={(e) => handleChange(idx, "email", e.target.value)}
                      className="border border-gray-300 p-1"
                    />
                  ) : (
                    i.email
                  )}
                </td>
                <td className={tableCellStyle}>
                {editState && resetPasswordIndex === idx ? (
                  <>
                  <div className="flex items-center py-1 ml-2 w-full">
                    <input
                      type={isPasswordVisible ? "text" : "password"}
                      value={i.password}
                      onChange={(e) => handleChange(idx, "password", e.target.value)}
                      className="border border-gray-300 p-1"
                    />
                    <div className="flex justify-center items-center">
                      <Button
                        isIconOnly
                        className="ml-2"
                        onClick={handleGeneratePassword}
                        aria-label="Generate Password"
                      >
                        <BiRefresh />
                      </Button>
                      <Button
                        isIconOnly
                        className="ml-2"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                      >
                        {isPasswordVisible ? <AiFillEyeInvisible /> : <AiFillEye />}
                      </Button>
                    </div>
                    </div>
                  </>
                ) : editState ? (
                  <button
                    className="text-white bg-dark-green hover:bg-darker-green px-2 rounded-md"
                    onClick={() => handlePasswordReset(idx)}
                  >
                    Reset Password
                  </button>
                ) : (
                  "•••••••••••••••"
                )}
              </td>
                <td className={tableCellStyle}>
                {editState ? (
                  <div class="relative inline-block text-left">
                    <Dropdown>
                      <DropdownTrigger placement="bottom-end">
                        <Button className="flex justify-between items-center w-full border border-gray-300 p-1">
                          {i.access_rights} <AiFillCaretDown />
                        </Button>
                      </DropdownTrigger>
                      <DropdownMenu
                        disallowEmptySelection
                        aria-label="Select access right"
                        selectionMode="single"
                        selectedKeys={new Set([i.access_rights])}
                        onSelectionChange={(keys) => handleChange(idx, "access_rights", keys.anchorKey)}
                        className="w-full block bg-light-green "
                      >
                        {accessRights.map((right) => (
                          <DropdownItem 
                          className="hover:bg-lighter-green"
                          key={right}>{right}</DropdownItem>
                        ))}
                      </DropdownMenu>
                    </Dropdown>
                    </div>
                  ) : (
                    i.access_rights
                  )}
                </td>
                <td className={tableCellStyle}>
                  <SchemeTags
                    schemes={i.schemes}
                    allSchemes={allSchemes}
                    user_id={i.uuid}
                    updateTeamMembers={updateTeamMembers}
                    editState={editState}
                    onChangeSchemes={(updatedSchemes) =>
                      handleSchemeChange(idx, updatedSchemes)
                    }
                  />
                </td>
                <td> 
                  {editState && (
                    <button className="flex items-center">
                      <FaRegTrashCan
                        className="text-red-500 ml-0.5"
                        onClick={() => setDeleteId(i.uuid)}
                      />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default isAuth(MyTeam);
