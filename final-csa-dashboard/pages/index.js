// user-dashboard/pages/index.js
// framework
import Image from "next/image";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/router';

// icons and images
import landingpage from "../public/landingpage.png";
import feedbackpage from "../public/feedbackpage.png";

// components
import SchemeCard from "../components/SchemeCard";

export default function Home() {
  const [schemes, setSchemes] = useState([]);
  const router = useRouter();
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  useEffect(() => {
    async function getSchemes() {
      try {
        const res = await fetch(`${API_URL}/scheme`);
        const schemeData = await res.json();
        // Ensure schemeData is an array before setting the state
        setSchemes(Array.isArray(schemeData) ? schemeData : []);
      } catch (e) {
        console.log(e);
      }
    }

    getSchemes();
  }, []);

  const loginUser = async (email, password) => {
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
        throw new Error("Login failed");
      }

      const data = await res.json();
      // Save user data and token to localStorage
      window.localStorage.setItem("loggedUser", JSON.stringify(data));
      router.push('/dashboard'); // Redirect to dashboard after successful login
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <div className="text-base pb-10">
      {/* Intro Page */}
      <div className="flex flex-row items-center justify-center pl-20 gap-8 py-10 bg-light-green">
        <div className=" w-2/5 flex flex-col gap-8">
          <div className="font-bold text-3xl">
            Start training with CPF simulator
          </div>
          <div>
            We are excited to introduce a new training simulator powered by GenAI, designed to enhance the proficiency of CCU officers in handling written enquiries.
          </div>
          <div>
            <Link href="/login">
              <button className="bg-dark-green hover:bg-darker-green text-white py-3 px-8 rounded-lg">
                Let's Start
              </button>
            </Link>
          </div>
        </div>
        <div className="drop-shadow-2xl">
          <Image
            height={500}
            src={landingpage}
            priority
            alt="Trainee email simulator"
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Feature Highlights */}
      <div
        className="py-10 flex flex-col gap-16 bg-scroll bg-center bg-no-repeat bg-contain"
        style={{
          backgroundImage: `url('/backgroundRectangle.png')`,
        }}
      >
        <div className="flex flex-row justify-center items-center gap-20">
          <div className="w-2/5 flex flex-col gap-8 border-4 px-8 py-12 text-center drop-shadow-m rounded-lg">
            <div className="text-3xl font-bold text-sage-green">
              Practice and refine your skills
            </div>
            <div>
              The practice cases within the simulator are adapted from real enquiries received by the Customer Correspondence Unit,
              ensuring you are exposed to authentic scenarios.
            </div>
          </div>

          <div className="w-2/5 flex flex-col gap-8">
            <Image
              src={feedbackpage}
              alt="feedback page"
              className="drop-shadow-xl rounded-2xl"
            />
            <div>
              <div className="text-3xl font-bold pb-2">
                Gain valuable feedback on your performance
              </div>
              <div>
                Through this immersive training experience,
                you can identify areas of strength and opportunities for improvement,
                ultimately enhancing your ability to provide effective and efficient responses to customer enquiries.
              </div>
            </div>
          </div>
        </div>

        {/* Schemes */}
        <div className="index-schemes-container">
          {schemes.length > 0 ? (
            schemes.map((i) => (
              <SchemeCard
                key={i.scheme_name}
                scheme_name={i.scheme_name}
                scheme_img={i.scheme_admin_img_path}
                questions={i.questions.length}
                scheme_button={false}
                className="flex flex-col items-center"
              />
            ))
          ) : (
            <p>No schemes available.</p>
          )}
        </div>
      </div>
      <div className="flex justify-center">
        <Link href="/login">
          <button className="py-2 px-16 border-2 border-dark-green bg-dark-green rounded-lg hover:bg-darker-green text-white">
            Log in to start!
          </button>
        </Link>
      </div>
    </div>
  );
}
