import { useEffect, useState } from "react";
import isAuth from "../components/isAuth.jsx"; // Adjust the import path according to your project structure
import { useRouter } from "next/navigation";
import SchemeTags from "../components/SchemeTags";
import SchemeFilter from "../components/SchemeFilter";
import SearchBar from "../components/SearchBar";
import { AiFillCaretDown, AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { FaRegTrashCan } from "react-icons/fa6";
import DeleteModal from "../components/DeleteModal";
import { BiRefresh } from "react-icons/bi";
import { Dropdown, DropdownMenu, DropdownTrigger, DropdownItem, Button } from "@nextui-org/react";

function MyTeam() {
  const [allTeamMembers, setAllTeamMembers] = useState([]);
  const [originalTeamMembers, setOriginalTeamMembers] = useState([]);
  const [displayMembers, setDisplayMembers] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]);
  const [editState, setEditState] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteQueue, setDeleteQueue] = useState([]);
  const [password, setPassword] = useState("");
  const [resetPasswordIndex, setResetPasswordIndex] = useState(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [schemeFilter, setSchemeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const router = useRouter();
  const accessRights = ["Admin", "Trainer", "Trainee"]; 

  // Load team members without scheme mastery first
  useEffect(() => {
    const fetchData = async () => {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      
      // Retrieve the token from localStorage
      const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
      const token = loggedUser ? loggedUser.access_token : null;

      try {
        // Fetch team members
        const res = await fetch(`${API_URL}/user`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.ok) {
          let teamMembers = await res.json();

          // Sort team members immediately after fetching
          teamMembers = teamMembers.sort((a, b) => {
            const accessOrder = ["Admin", "Trainer", "Trainee"];
            if (accessOrder.indexOf(a.access_rights) < accessOrder.indexOf(b.access_rights)) {
              return -1;
            } else if (accessOrder.indexOf(a.access_rights) > accessOrder.indexOf(b.access_rights)) {
              return 1;
            } else {
              return a.name.localeCompare(b.name);
            }
          });

          setAllTeamMembers(teamMembers);
          setOriginalTeamMembers(teamMembers);
          setDisplayMembers(teamMembers);

          // Lazy load scheme mastery data after the team members are displayed
          teamMembers.forEach(member => loadSchemeMasteryForMember(member, token));
        } else {
          console.log("Authorization failed:", res.status);
          router.push('/');
          return;
        }

        // Fetch schemes
        const res2 = await fetch(`${API_URL}/distinct/scheme`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res2.ok) {
          const schemes = await res2.json();
          const formattedSchemes = Array.isArray(schemes)
            ? schemes.map(
                (scheme) =>
                  scheme.charAt(0).toUpperCase() + scheme.slice(1).toLowerCase()
              )
            : [];
          setAllSchemes(formattedSchemes);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [router]);

  // Function to load scheme mastery for each member lazily
  const loadSchemeMasteryForMember = async (member, token) => {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

    try {
      const res = await fetch(`${API_URL}/user/${member.uuid}/schemes`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const schemeMasteryRes = await res.json();
        setAllTeamMembers((prev) => 
          prev.map((tm) => tm.uuid === member.uuid 
            ? { ...tm, schemeMastery: schemeMasteryRes } 
            : tm)
        );
      }
    } catch (error) {
      console.error("Error fetching scheme mastery:", error);
    }
  };

  useEffect(() => {
    let filteredMembers = allTeamMembers;

    if (schemeFilter !== "All") {
      filteredMembers = filteredMembers.filter((member) =>
        member.schemes.includes(schemeFilter)
      );
    }

    if (search !== "") {
      filteredMembers = filteredMembers.filter(
        (member) =>
          member.name.toLowerCase().includes(search.toLowerCase()) ||
          member.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    setDisplayMembers(filteredMembers);
  }, [schemeFilter, search, allTeamMembers]);

  const handlePasswordReset = (index) => {
    setResetPasswordIndex(index);
  };

  const generatePassword = () => {
    const length = 15;
    const charset =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|<>?";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      result += charset[randomIndex];
    }
    return result;
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
    handleChange(resetPasswordIndex, "password", newPassword);
  };

  const handleDelete = (user_id) => {
    setDeleteQueue((prevQueue) => [...prevQueue, user_id]);
    setAllTeamMembers((prevMembers) =>
      prevMembers.filter((member) => member.uuid !== user_id)
    );
    setDisplayMembers((prevMembers) =>
      prevMembers.filter((member) => member.uuid !== user_id)
    );
    setDeleteId("");
  };

  const handleNav = (id) => {
    router.push(`/${id}/profile`, undefined, { shallow: true });
  };

  const handleCancel = () => {
    setAllTeamMembers(originalTeamMembers);
    setDisplayMembers(originalTeamMembers);
    // Reload scheme mastery data for all original team members
    const token = JSON.parse(window.localStorage.getItem("loggedUser")).access_token;
    originalTeamMembers.forEach(member => loadSchemeMasteryForMember(member, token));
    setEditState(false);
    setDeleteQueue([]);
    setResetPasswordIndex(null);
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
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

    try {
      for (let i = 0; i < allTeamMembers.length; i++) {
        const member = allTeamMembers[i];
        const originalMember = originalTeamMembers[i];

        if (
          member.email !== originalMember.email ||
          member.name !== originalMember.name ||
          member.access_rights !== originalMember.access_rights ||
          member.password !== originalMember.password ||
          JSON.stringify(member.schemes) !== JSON.stringify(originalMember.schemes) ||
          member.dept !== originalMember.dept // Check if department is changed
        ) {
          const userRes = await fetch(`${API_URL}/user/${member.uuid}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: member.email,
              name: member.name,
              access_rights: member.access_rights,
              schemes: member.schemes,
              password: member.password,
              dept: member.dept // Send department as well
            }),
          });

          if (!userRes.ok) {
            throw new Error("Failed to update member details");
          }

          const schemeRes = await fetch(`${API_URL}/scheme/${member.uuid}`, {
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

      for (const user_id of deleteQueue) {
        const res = await fetch(`${API_URL}/user/${user_id}`, {
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
    <div className="profile-card">
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
              <th className="text-start py-2 px-3 border">Name</th>
              <th className="text-start py-2 px-3 border">Email</th>
              <th className="text-start py-2 px-3 border">Password</th>
              <th className="text-start py-2 px-3 border w-1/6">Access</th>
              <th className="text-start py-2 px-3 border w-1/6">Department</th> {/* New Department Column */}
              <th className="text-start py-2 px-3 border w-1/3">Schemes</th>
              <th className="text-start py-2 px-3 border w-1/3">Scheme Mastery</th>
              <th className="w-[0px] p-0" />
            </tr>
          </thead>
          <tbody>
            {displayMembers.map((i, idx) => (
              <tr className="hover:bg-light-gray hover:cursor-pointer" key={idx}>
                <td className="text-start py-2 px-3 border">
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
                <td className="text-start py-2 px-3 border">
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
                <td className="text-start py-2 px-3 border">
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
                <td className="text-start py-2 px-3 border">
                  {editState ? (
                    <div className="relative inline-block text-left">
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
                          className="w-full block bg-light-green"
                        >
                          {accessRights.map((right) => (
                            <DropdownItem
                              className="hover:bg-lighter-green"
                              key={right}
                            >
                              {right}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  ) : (
                    i.access_rights
                  )}
                </td>
                <td className="text-start py-2 px-3 border"> {/* New Department Column */}
                  {editState ? (
                    <input
                      type="text"
                      value={i.dept || "N.A"} // Handle null department case
                      onChange={(e) => handleChange(idx, "dept", e.target.value)}
                      className="border border-gray-300 p-1"
                    />
                  ) : (
                    i.dept || "N.A"
                  )}
                </td>
                <td className="text-start py-2 px-3 border">
                  <SchemeTags
                    schemes={i.schemes}
                    allSchemes={allSchemes}
                    user_id={i.uuid}
                    updateTeamMembers={() => {}}
                    editState={editState}
                    onChangeSchemes={(updatedSchemes) =>
                      handleSchemeChange(idx, updatedSchemes)
                    }
                  />
                </td>
                <td className="text-start py-2 px-3 border"> {/* Scheme Mastery Column */}
                  <div className="rounded-lg p-5 flex flex-col justify-center items-center gap-5">
                    {Array.isArray(i.schemeMastery) && i.schemeMastery.length > 0 ? (
                      i.schemeMastery.map((cat, idx) => (
                        <div key={idx}>
                          <span><strong>Scheme:</strong> {cat.scheme_name}</span>
                          <span> - {cat.num_attempted_questions}/{cat.num_questions} questions attempted</span>
                        </div>
                      ))
                    ) : (
                      <div className="pt-2">No schemes assigned</div>
                    )}
                  </div>
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
