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
  const [currentUser, setCurrentUser] = useState(null); // To store current user details
  const router = useRouter();

  // Load current user and team members from the same department
  useEffect(() => {
    const fetchData = async () => {
      const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
      const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
      const token = loggedUser ? loggedUser.access_token : null;

      try {
        // Fetch current user details using the /user/me route
        const currentUserRes = await fetch(`${API_URL}/user/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (currentUserRes.ok) {
          const userDetails = await currentUserRes.json();
          setCurrentUser(userDetails);

          // Fetch team members
          const res = await fetch(`${API_URL}/user`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            let teamMembers = await res.json();

            // Filter team members to only include "Trainee" users from the same department
            teamMembers = teamMembers.filter(
              (member) =>
                member.access_rights === "Trainee" && member.dept === userDetails.dept
            );

            setAllTeamMembers(teamMembers);
            setOriginalTeamMembers(teamMembers);
            setDisplayMembers(teamMembers);

            // Fetch schemes
            const res2 = await fetch(`${API_URL}/distinct/scheme`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (res2.ok) {
              const schemes = await res2.json();
              setAllSchemes(schemes);
            }
          } else {
            console.error("Failed to fetch team members.");
          }
        } else {
          console.error("Failed to fetch current user details.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        router.push("/");
      }
    };

    fetchData();
  }, [router]);

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
          member.email.toLowerCase().includes(search.toLowerCase()) ||
          member.dept.toLowerCase().includes(search.toLowerCase())
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
          JSON.stringify(member.schemes) !== JSON.stringify(originalMember.schemes)
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
              password: member.password
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
              <th className="text-start py-2 px-3 border">Department</th>
              <th className="text-start py-2 px-3 border w-1/3">Schemes</th>
              <th className="text-start py-2 px-3 border w-1/3">Scheme Mastery</th>
              <th className="w-[0px] p-0" />
            </tr>
          </thead>
          <tbody>
            {displayMembers.map((i, idx) => (
              <tr className="hover:bg-light-gray hover:cursor-pointer" key={idx}>
                <td className="text-start py-2 px-3 border">
                  <span
                    className="hover:underline hover:underline-offset-2"
                    onClick={() => handleNav(i.uuid)}
                  >
                    {i.name}
                  </span>
                </td>
                <td className="text-start py-2 px-3 border">
                  {i.email}
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
                    <span>{i.access_rights}</span>
                  ) : (
                    i.access_rights
                  )}
                </td>
                <td className="text-start py-2 px-3 border">{i.dept}</td>
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
                <td className="text-start py-2 px-3 border">
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