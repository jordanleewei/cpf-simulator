import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Input,
  Dropdown,
  DropdownMenu,
  DropdownTrigger,
  Button,
  ButtonGroup,
  DropdownItem,
} from "@nextui-org/react";
import { AiFillCaretDown } from "react-icons/ai";
import { IoIosArrowBack, IoMdAdd, IoMdRemove } from "react-icons/io";
import isAuth from '../../components/isAuth';

function AddQuestions() {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [question_details, setDetails] = useState("");
  const [ideal, setIdeal] = useState("");
  const difficulty = ["Easy", "Intermediate", "Complex"];
  const [selectedDifficulty, setSelectedDifficulty] = useState(0);
  const [scheme, setScheme] = useState("");
  const [idealSystems, setIdealSystems] = useState([{ name: "", url: "" }]);
  const [dropdownOpen, setDropdownOpen] = useState(false);


  const defaultSystems = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/default-systems`);
      if (!res.ok) {
        throw new Error("Failed to fetch default system names and urls");
      }
      const data = await res.json();
      setIdealSystems([
        { name: data.SYSTEM_1_NAME, url: data.SYSTEM_1_URL },
        { name: data.SYSTEM_2_NAME, url: data.SYSTEM_2_URL },
        { name: data.SYSTEM_3_NAME, url: data.SYSTEM_3_URL },
      ]);
    } catch (error) {
      console.error("Error fetching default system names and urls:", error);
    }
  };

  useEffect(() => {
    defaultSystems();
  }, []);

  useEffect(() => {
    if (router.isReady) {
      const scheme_name = router.query.slug;
      setScheme(scheme_name.charAt(0).toUpperCase() + scheme_name.slice(1));
    }
  }, [router.isReady]);

  async function addquestions(
    title,
    question_difficulty,
    question_details,
    ideal,
    scheme,
    idealSystemNames,
    idealSystemUrls
  ) {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/question`, {
        method: "POST",
        body: JSON.stringify({
          title: title,
          question_difficulty: question_difficulty,
          question_details: question_details,
          ideal: ideal,
          scheme_name: scheme,
          ideal_system_name: idealSystemNames,
          ideal_system_url: idealSystemUrls,
        }),
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to add question");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error adding question:", error);
      throw error;
    }
  }

  async function handleSaveQuestion() {
    try {
      const idealSystemNames = idealSystems.map(system => system.name).join(", ");
      const idealSystemUrls = idealSystems.map(system => system.url).join(", ");
      await addquestions(
        title,
        difficulty[selectedDifficulty],
        question_details,
        ideal,
        scheme,
        idealSystemNames,
        idealSystemUrls
      );
      router.push(`/${scheme.toLowerCase()}/exercises`);
    } catch (error) {
      console.error("Error adding question:", error);

      setTimeout(() => {
        router.push(`/${scheme.toLowerCase()}/exercises`);
      }, 5000);
    }
  }

  function handleCancel() {
    setTitle("");
    setDetails("");
    setIdeal("");
    setSelectedDifficulty(0);
    setIdealSystems([
      { name: "", url: "" }
    ]);
    router.push(`/${scheme.toLowerCase()}/exercises`);
  }

  function handleIdealSystemNameChange(index, value) {
    const newIdealSystems = [...idealSystems];
    newIdealSystems[index].name = value;
    setIdealSystems(newIdealSystems);
  }

  function handleIdealSystemUrlChange(index, value) {
    const newIdealSystems = [...idealSystems];
    newIdealSystems[index].url = value;
    setIdealSystems(newIdealSystems);
  }

  function addIdealSystemRow() {
    setIdealSystems([...idealSystems, { name: "", url: "" }]);
  }

  function removeIdealSystemRow(index) {
    const newIdealSystems = [...idealSystems];
    newIdealSystems.splice(index, 1);
    setIdealSystems(newIdealSystems);
  }

  return (
    <div className="add-question-container">
      <div className="items-start p-3">
        <Button
          startContent={<IoIosArrowBack />}
          className="flex items-center m-1 mx-3"
          onClick={handleCancel}
        >
          Back
        </Button>
      </div>

      {/* Actual page content */}
      <div className="add-question-card">
        <div className="w-3/4 flex flex-col justify-center items-center gap-4 place-self-center py-2 px-4">
          <span className="text-2xl font-bold m-3 place-self-start">
            Add Question to {scheme} Scheme
          </span>

          <div className="flex flex-row md:flex-nowrap items-center gap-2 ">
            <span className="flex">
              <p className=" text-red-500">*</p>Question Title:{" "}
            </span>
            <Input
              isRequired
              placeholder="Enter your title"
              defaultValue=""
              onValueChange={(value) => setTitle(value)}
              className="flex border border-sage-green outline-2 py-1 w-48"
            />
          </div>

          <ButtonGroup
            variant="flat"
            className="flex flex-row md:flex-nowrap items-center gap-3 pl-9"
          >
            <span className="flex">
              <p className=" text-red-500">*</p>Difficulty:{" "}
            </span>
            <div className="flex border border-sage-green p-1 w-48 justify-between ">
              <span className="flex w-1/4">{difficulty[selectedDifficulty]}</span>
              <Dropdown isOpen={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownTrigger placement="bottom-end">
                  <Button isIconOnly className="px-2">
                    <AiFillCaretDown />
                  </Button>
                </DropdownTrigger>

                <DropdownMenu
                  disallowEmptySelection
                  aria-label={difficulty[selectedDifficulty]}
                  selectedKey={[selectedDifficulty]}
                  selectionMode="single"
                  className="place-items-center block bg-light-green"
                >
                  {difficulty.map((difficulty, index) => (
                    <DropdownItem
                      className="p-1 hover:bg-white/50 outline-none rounded w-full"
                      key={index}
                      onAction={() => {
                        setSelectedDifficulty(index);
                        setDropdownOpen(false);
                        console.log("Selected option:", difficulty);
                      }}
                    >
                      {difficulty}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            </div>
          </ButtonGroup>

          <div className="flex flex-row md:flex-nowrap gap-0.5 px-1 m-2 w-full justify-center">
            <span className="flex items-start w-18">
              <p className=" text-red-500">*</p>Question:{" "}
            </span>
            <textarea
              required={true}
              id="ideal-question"
              rows="4"
              className="block p-2.5  ml-5 text-sm text-gray-900 text-wrap h-[150px] w-[185px] md:w-[600px]
                        bg-gray-50 rounded-lg border border-sage-green focus:ring-blue-500 
                        focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                        dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter your question"
              onChange={(e) => setDetails(e.target.value)}
            ></textarea>
          </div>

          <div className="flex flex-row md:flex-nowrap gap-0.5 px-1 m-2 w-full justify-center">
            <span className="flex items-start text-wrap ml-2 w-20">
              <p className=" text-red-500">*</p>Ideal Answer:
            </span>

            <textarea
              required={true}
              id="ideal-answer"
              rows="4"
              className="block p-2.5  ml-5 text-sm text-gray-900 text-wrap h-[200px] w-[185px] md:w-[600px]
                        bg-gray-50 rounded-lg border border-sage-green focus:ring-blue-500 
                        focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                        dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Enter your ideal answer"
              onChange={(e) => setIdeal(e.target.value)}
            ></textarea>
          </div>
          {idealSystems.map((idealSystem, index) => (
            <div key={index} className="flex justify-center w-5/6">
              <div className="w-full ml-3">
                <p className="text-red-500 inline">*</p>Verified System Name:
                <textarea
                  required={true}
                  id={`ideal-system-name-${index}`}
                  rows="1"
                  className="block p-2.5 text-sm text-gray-900 text-wrap h-[50px] w-full
                  bg-gray-50 rounded-lg border border-sage-green focus:ring-blue-500 
                  focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                  dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Enter the verified system name"
                  value={idealSystem.name}
                  onChange={(e) => handleIdealSystemNameChange(index, e.target.value)}
                />
              </div>
              <div className="w-full ml-3">
                <p className="text-red-500 inline">*</p>Verified System URL:
                <textarea
                  required={true}
                  id={`ideal-system-url-${index}`}
                  rows="1"
                  className="block p-2.5 text-sm text-gray-900 text-wrap h-[50px] w-full
                  bg-gray-50 rounded-lg border border-sage-green focus:ring-blue-500 
                  focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                  dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                  placeholder="Enter the verified system URL"
                  value={idealSystem.url}
                  onChange={(e) => handleIdealSystemUrlChange(index, e.target.value)}
                />
              </div>
              <div className="relative flex items-center py-10 px-8">
                <button
                  className="bg-light-green rounded-md p-1 mr-2"
                  onClick={addIdealSystemRow}
                >
                  <IoMdAdd />
                </button>
                <button
                  className="bg-red-500 rounded-md p-1"
                  onClick={() => removeIdealSystemRow(index)}
                >
                  <IoMdRemove />
                </button>
              </div>
            </div>
          ))}


          <div className="flex justify-center items-end">
            <Button
              className="bg-dark-green hover:bg-darker-green p-1 px-9 rounded-md text-white m-4"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              className="bg-dark-green hover:bg-darker-green p-1 px-10 rounded-md text-white m-4"
              onClick={handleSaveQuestion}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default isAuth(AddQuestions);
