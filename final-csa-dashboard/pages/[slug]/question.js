// framework
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoIosArrowBack, IoMdAdd, IoMdRemove } from "react-icons/io";
import { FaChevronDown } from "react-icons/fa";

import QuestionBar from "../../components/QuestionBar";
import isAuth from "../../components/isAuth";

function Question({ user }) {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();
  const { scheme_name } = router.query;
  const [question, setQuestion] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [submit, setSubmit] = useState(false);
  const [systems, setSystems] = useState([{ name: "", url: "" }]);
  const [dropdownOpen, setDropdownOpen] = useState([false]); // Initialize dropdown state

  // Predefined system names
  const systemOptions = [
    "NICE 2.0",
    "AskCPF",
    "BEACON",
    "CSHL Biz Portal",
    "CSHL Website",
    "PBS Admin Module",
    "CPF Website",
  ];

  useEffect(() => {
    async function getData() {
      if (router.isReady) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/question/${router.query.slug}`
          );
          if (!res.ok) {
            throw new Error("Failed to fetch data");
          } else {
            const data = await res.json();
            setQuestion(data);
          }
        } catch (e) {
          console.error("Error fetching question:", e);
        }
      }
    }
    getData();
  }, [router.isReady]);

  function handleReviewNav(review_id) {
    router.push(
      {
        pathname: `/${review_id}/review`,
        query: {
          review: false,
          submit: true,
          profile: false,
          scheme_name: scheme_name,
        },
      },
      `/${review_id}/review`,
      {
        shallow: true,
      }
    );
  }

  const handleSubmit = async () => {
    setLoading(true);
    setSubmit(true);
    const systemName = systems.map((system) => system.name).join(", ");
    const systemUrl = systems.map((system) => system.url).join(", ");
    const res = await fetch(`${API_URL}/attempt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: user.uuid,
        question_id: question.question_id,
        answer: answer,
        system_name: systemName,
        system_url: systemUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      handleReviewNav(data.attempt_id); // Ensure the correct attempt ID is passed
    }
    setLoading(false);
  };

  function handleSystemNameChange(index, value) {
    const newSystems = [...systems];
    newSystems[index].name = value;
    setSystems(newSystems);
  }

  function handleSystemUrlChange(index, value) {
    const newSystems = [...systems];
    newSystems[index].url = value;
    setSystems(newSystems);
  }

  function addSystemRow() {
    setSystems([...systems, { name: "", url: "" }]);
    setDropdownOpen([...dropdownOpen, false]); // Add new dropdown state for the new row
  }

  function removeSystemRow(index) {
    const newSystems = [...systems];
    const newDropdownOpen = [...dropdownOpen];
    newSystems.splice(index, 1);
    newDropdownOpen.splice(index, 1); // Remove corresponding dropdown state
    setSystems(newSystems);
    setDropdownOpen(newDropdownOpen);
  }

  // Toggle dropdown open/close for a specific index
  function toggleDropdown(index) {
    const newDropdownOpen = [...dropdownOpen];
    newDropdownOpen[index] = !newDropdownOpen[index];
    setDropdownOpen(newDropdownOpen);
  }

  return (
    <>
      <div className="bg-light-green p-4 scheme-card">
        <QuestionBar
          review={false}
          submit={false}
          profile={false}
          scheme_name={question.scheme_name}
        />
        <div className="bg-light-gray rounded-md p-6 m-5">
          <div className="ml-20 mb-3 font-bold text-xl">Practice Question</div>
          <div className="border-4 border-solid border-dark-green rounded-lg p-10 h-max-content flex items-start justify-center text-black mt-30 flex-col ml-20 mr-20 mb-5">
            <div className="w-auto h-max-content flex justify-between items-center font-bold mb-5">
              {question.title}
            </div>
            <p id="question-content">{question.question_details}</p>
          </div>
          <div className="ml-20 mb-3 font-bold text-xl">Your Answer</div>
          <div
            className="border-4 border-solid border-dark-green rounded-lg p-5 mt-30 flex-col ml-20 mr-20 overflow-auto"
            style={{ height: 300 }}
          >
            <textarea
              placeholder="Please enter your reply here"
              className="w-full h-full bg-transparent"
              name="user-response"
              id="user-response"
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          {systems.map((system, index) => (
            <div key={index} className="flex justify-between ml-20 mr-20 mb-3 mt-5">
              <div className="w-1/2">
                <div className="font-bold">System Name</div>

                {/* System Name Dropdown */}
                <div className="relative">
                  <button
                    className={`flex justify-between items-center bg-dark-grey px-3 py-2 text-dark-blue rounded-t-lg gap-3 w-full ${
                      dropdownOpen[index] ? "rounded-b-none" : "rounded-b-lg"
                    }`}
                    onClick={() => toggleDropdown(index)}
                  >
                    {system.name || "Select System"}
                    <FaChevronDown />
                  </button>

                  {dropdownOpen[index] && (
                    <div className="z-10 bg-dark-grey absolute top-10 rounded-b-lg w-full px-2 py-2 max-h-40 overflow-y-scroll">
                      <ul className="space-y-1">
                        {systemOptions.map((option, idx) => (
                          <li
                            key={idx}
                            className={`flex items-center py-2 pl-2 rounded-lg cursor-pointer hover:bg-light-gray ${
                              system.name === option ? "bg-light-gray" : ""
                            }`}
                            onClick={() => {
                              handleSystemNameChange(index, option);
                              toggleDropdown(index); // Close dropdown after selection
                            }}
                          >
                            {option}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 ml-3">
                <div className="font-bold">System URL</div>
                <textarea
                  required={true}
                  id={`system-url-${index}`}
                  rows="1"
                  className="w-full bg-transparent border-4 border-solid border-dark-green rounded-lg p-2"
                  placeholder="Enter system URL"
                  value={system.url}
                  onChange={(e) => handleSystemUrlChange(index, e.target.value)}
                />
              </div>

              {index === systems.length - 1 && (
                <div className="relative">
                  <div className="absolute flex items-center py-10 px-8">
                    <button
                      className="bg-light-green rounded-md p-1 mr-2"
                      onClick={addSystemRow}
                    >
                      <IoMdAdd />
                    </button>
                    {index !== 0 && (
                      <button
                        className="bg-red-500 rounded-md p-1"
                        onClick={() => removeSystemRow(index)}
                      >
                        <IoMdRemove />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <hr className="mt-5 border-grey" />
        <div className="p-5 flex flex-row justify-center">
          <button
            className="border-4 border-solid border-transparent rounded-lg bg-dark-green pl-3 pr-3 pt-1 pb-1 text-white transition duration-300 hover:bg-light-green hover:text-gray-600"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>

      {loading && (
        <div className="full-screen-overlay">
          <div className="overlay-content">
            <div className="loading-circle"></div>
            <div className="loading-text">Submitting...</div>
          </div>
        </div>
      )}
    </>
  );
}

export default isAuth(Question);
