// Import useState, useEffect, and useRouter from React
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Import components and icons
import {
  Input,
  Button,
} from "@nextui-org/react";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";
import { IoIosArrowBack } from "react-icons/io";
import { BiRefresh } from "react-icons/bi";
import isAuth from "../components/isAuth";

function AddProfile() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();

  // State variables
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dept, setDept] = useState(""); // This will be populated with the current user's department
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const accessRight = "Trainee"; // Static value for Access Rights

  // Fetch the current user's details and set the department
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
      const token = loggedUser ? loggedUser.access_token : null;

      try {
        const res = await fetch(`${API_URL}/user/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const currentUser = await res.json();
          setDept(currentUser.dept); // Set the department to the current user's department
        } else {
          console.error("Failed to fetch current user details");
        }
      } catch (error) {
        console.error("Error fetching current user details:", error);
      }
    };

    fetchCurrentUser();
  }, []);

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

  // Function to add a new user
  async function addUser(name, email, password, dept) {
    try {
      const response = await fetch(
        `${API_URL}/user`, {
        method: "POST",
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
          access_rights: accessRight,
          dept: dept,
        }),
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create user");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  // Function to handle saving the profile
  function handleSaveProfile() {
    addUser(name, email, password, dept)
      .then(() => {
        router.push("/myteam");
      })
      .catch((error) => {
        console.error("Failed to save profile:", error);
        alert("Failed to save profile. Please try again.");
      });
  }

  // Function to handle generating a new password
  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setPassword(newPassword);
  };

  return (
    <div className="add-profile-container">
      {/* Back button */}
      <div className="items-start p-3">
        <Button
          startContent={<IoIosArrowBack />}
          className="flex items-center m-1 mx-3"
          onClick={() => router.push("/myteam")}
        >
          Back
        </Button>
      </div>

      {/* Actual page content */}
      <div className="add-profile-card">
      <div className="flex flex-col justify-center items-center gap-4 place-self-center py-2 px-4">
        <span className="text-2xl font-bold m-3 place-self-start">
          Add Profile
        </span>
        <div className="flex flex-col justify-between	items-center gap-4 place-self-center py-2 px-4">
        {/* Name input */}
        <div className="flex flex-row justify-center items-center">
          <span className="flex w-1/4">
            <p className="text-red-500">*</p>Name:
          </span>
          <Input
            isRequired
            placeholder="Enter your Name"
            defaultValue=""
            onValueChange={(value) => setName(value)}
            className="flex border border-sage-green outline-2 py-1 w-48"
          />
        </div>

        {/* Email input */}
        <div className="flex flex-row justify-center items-center">
          <span className="flex w-1/4">
            <p className="text-red-500">*</p>Email:
          </span>
          <Input
            isRequired
            type="email"
            placeholder="Enter your Email"
            defaultValue=""
            onValueChange={(value) => setEmail(value)}
            className="flex border border-sage-green outline-2 py-1 w-48"
          />
        </div>

        {/* Password input */}
        <div className="flex flex-row justify-center items-center pl-6">
          <span className="flex w-1/4">
            <p className="text-red-500">*</p>Password:
          </span>
          <div className="flex items-center py-1 ml-2 w-full">
            <Input
              isRequired
              type={isPasswordVisible ? "text" : "password"}
              placeholder="Enter your Password"
              value={password}
              onValueChange={(value) => setPassword(value)}
              className="flex border border-sage-green outline-2 py-1 w-48"
            />
              {/* Generate password button */}
              <div className="flex justify-center items-center">
              <Button
                    isIconOnly
                    className="ml-2"
                    onClick={handleGeneratePassword}
                    aria-label="Generate Password"
                  >
                    <BiRefresh />
                  </Button>
              </div>
            <Button
              isIconOnly
              className="ml-2"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? <AiFillEyeInvisible /> : <AiFillEye />}
            </Button>
          </div>
        </div>

        {/* Access Rights display */}
        <div className="flex flex-row justify-center items-center">
          <span className="flex w-1/4">
            <p className="text-red-500">*</p>Access Rights:
          </span>
          <Input
            value={accessRight} // Display the access right
            isDisabled // Disable the input to prevent editing
            className="flex border border-sage-green outline-2 py-1 w-48"
          />
        </div>

        {/* Dept input */}
        <div className="flex flex-row justify-center items-center">
          <span className="flex w-28">
            <p className="text-red-500">*</p>Department:
          </span>
          <Input
            isRequired
            value={dept} // Use the current user's department
            isDisabled // Disable the department input to prevent changes
            className="flex border border-sage-green outline-2 py-1 w-48"
          />
        </div>

        {/* Buttons for cancel and save */}
        <div className="flex justify-center items-end">
          <Button
            className="bg-dark-green hover:bg-darker-green p-1 px-9 rounded-md text-white m-4"
            onClick={() => router.push("/myteam")}
          >
            Cancel
          </Button>
          <Button
            className="bg-dark-green hover:bg-darker-green p-1 px-10 rounded-md text-white m-4"
            onClick={handleSaveProfile}
          >
            Save
          </Button>
        </div>
      </div>
      </div>
    </div>
  </div>
  );
}

export default isAuth(AddProfile);
