import { useState } from "react";
import { useRouter } from "next/router";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

export default function Login({ setUser }) {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [notification, setNotification] = useState("");

  const router = useRouter();

  function handleNotification(noti) {
    setNotification(noti);
    setTimeout(() => setNotification(""), 3000);
  }

  async function onSubmit(event) {
    event.preventDefault();

    try {
      const res = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
      });

      if (!res.ok) {
        handleNotification("Invalid email or password");
        return;
      }

      const data = await res.json();
      window.localStorage.setItem("loggedUser", JSON.stringify(data));
      setUser(data);

      router.push("/profile");
    } catch (error) {
      console.error("Login error:", error);
      handleNotification("An error occurred. Please try again.");
    }
  }

  return (
    <div className="login-component">
      <div className="bg-light-green shadow rounded-md p-5 md:p-10 lg:p-20 md:max-w-lg lg:max-w-xl">
        <form onSubmit={onSubmit} className="flex justify-center flex-col w-full">
          <h1 className="flex pb-5 sm:text-2xl md:text-3xl font-bold">
            Trainee – Login
          </h1>
          <div className="icon-input pt-2">
            <input
              type="text"
              id="email"
              name="email"
              placeholder="Enter your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 sm:w-[300px] placeholder:text-xs md:placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="icon-input pt-2 flex items-center">
            <input
              type={isPasswordVisible ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Enter your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 sm:w-[300px] placeholder:text-xs md:placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <button
              type="button"
              className="ml-2"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              {isPasswordVisible ? <AiFillEyeInvisible /> : <AiFillEye />}
            </button>
          </div>
          <div className="text-red-600 text-sm">{notification}</div>
          <button
            type="submit"
            id="login"
            className="bg-dark-green hover:bg-darker-green text-white rounded-lg px-8 py-2 mt-5 sm:w-[300px] focus:outline-none focus:ring-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
