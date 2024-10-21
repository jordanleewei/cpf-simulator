import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AiFillEye, AiFillEyeInvisible } from "react-icons/ai";

export default function Login({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [notification, setNotification] = useState("");

  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  useEffect(() => {
    const loggedUserToken = localStorage.getItem("loggedUserToken");
    if (loggedUserToken) {
      router.push("/myteam");
    }
  }, [router]);

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
      if (data.access_rights.toLowerCase() !== "admin" && data.access_rights.toLowerCase() !== "trainer") {
        handleNotification("User does not have access");
      } else {
        window.localStorage.setItem("loggedUser", JSON.stringify(data));
        window.localStorage.setItem("loggedUserToken", data.access_token); // Store the token separately
        setUser(data);
        router.push("/myteam");
      }
    } catch (e) {
      console.log(e);
      handleNotification("An error occurred. Please try again.");
    }
  }

  return (
    <div className="login-component">
      <div className="bg-light-green shadow rounded-md p-5 md:p-10 lg:p-20 md:max-w-lg lg:max-w-xl">
        <form onSubmit={onSubmit} className="flex justify-start flex-col w-full">
          <h1 className="flex pb-5 sm:text-2xl md:text-3xl font-bold">
            Trainer Module
          </h1>
          <div className="icon-input pt-2">
            <input
              type="text"
              id="email"
              name="email"
              placeholder="Enter your Email"
              onChange={({ target }) => setEmail(target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 sm:w-[300px] placeholder:text-xs md:placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="icon-input pt-2 flex items-center">
            <input
              type={isPasswordVisible ? "text" : "password"}
              id="password"
              name="password"
              placeholder="Enter your Password"
              onChange={({ target }) => setPassword(target.value)}
              className="px-3 py-2 rounded-md border border-gray-300 sm:w-[300px] placeholder:text-xs md:placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
