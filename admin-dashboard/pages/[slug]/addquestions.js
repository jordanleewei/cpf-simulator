// framework
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Select from "react-select";
import { Input, Button, ButtonGroup } from "@nextui-org/react";
import { AiFillCaretDown } from "react-icons/ai";
import { IoIosArrowBack, IoMdAdd, IoMdRemove } from "react-icons/io";
import isAuth from '../../components/isAuth';

function AddQuestions() {
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [question_details, setDetails] = useState("");
  const [ideal, setIdeal] = useState("");
  const difficultyOptions = [
    { value: 0, label: "Easy" },
    { value: 1, label: "Intermediate" },
    { value: 2, label: "Complex" },
  ];
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyOptions[0]);
  const [scheme, setScheme] = useState("");
  const [idealSystems, setIdealSystems] = useState([{ name: "", url: "" }]);
  const [defaultSystemsList, setDefaultSystemsList] = useState([]);

  // Predefined system list for dropdown
  // const defaultSystemsList = [
  //   { label: "NICE 2.0", value: "https://cpfNICE 2.0.my.salesforce.com/" },
  //   { label: "BEACON", value: "https://beacon.cpf.gov.sg/" },
  //   { label: "CPF Super Admin Modules", value: "https://web-eservices.cpfb.gov.sg/admin/cseadmin" },
  //   { label: "CPF website", value: "https://www.cpf.gov.sg/" },
  //   { label: "ARISE Employer Portal", value: "https://ariseempr.cpf.gov.sg/prweb/PRWebLDAP1/app/default/LspSuipRFrhr76Wi-AjAJoda-RkmftRx*/!STANDARD" },
  //   { label: "ARISE Member Portal", value: "https://arisembr.cpf.gov.sg/prweb/PRWebLDAP1/app/default/LspSuipRFrhr76Wi-AjAJoda-RkmftRx*/!STANDARD" },
  //   { label: "CAYE Admin Portal", value: "https://intraprod-caye.cpf.gov.sg/caye/admin/web/" },
  //   { label: "ERT Admin (CPF EZPay Admin Portal)", value: "https://intraprod2.cpf.gov.sg/ertadmin/loginForm.jsp" },
  //   { label: "iQMS (eAppointment system)", value: "https://iqmsadmin.cpf.gov.sg/signin" },
  //   { label: "CareShield Life Biz Portal", value: "https://hc-cbp-prd.careshieldlife.gov.sg/cbp/web/CISFNC00001" },
  //   { label: "CareShield Life Website", value: "https://www.careshieldlife.gov.sg/" },
  //   { label: "E-Housing Portal", value: "https://hseintra.cpf.gov.sg/hseadmin/login.jsp" },
  //   { label: "DBC – Workfare Application", value: "Accessible via Start menu > All apps > DBC Application 7.3.6 > Workfare Applications" },
  //   { label: "NPHC", value: "https://intranet-nphc.moh.gov.sg/" },
  //   { label: "Mainframe/Mainframe WFH container", value: "https://cpfwiardsav05p.cpf.net/rdweb"},
  //   { label: "Finesse (IPCC)", value: "https://ipclafinav01p.ipcc.cpf.gov.sg/desktop/container/landing.jsp?locale=en_US"},
  // ];

  // const defaultSystems = async () => {
  //   try {
  //     const res = await fetch(`${API_URL}/default-systems`);
  //     if (!res.ok) {
  //       throw new Error("Failed to fetch default system names and urls");
  //     }
  //     const data = await res.json();
  //     setIdealSystems([
  //       { name: data.SYSTEM_1_NAME, url: data.SYSTEM_1_URL },
  //       { name: data.SYSTEM_2_NAME, url: data.SYSTEM_2_URL },
  //       { name: data.SYSTEM_3_NAME, url: data.SYSTEM_3_URL },
  //     ]);
  //   } catch (error) {
  //     console.error("Error fetching default system names and urls:", error);
  //   }
  // };

  // useEffect(() => {
  //   defaultSystems();
  // }, []);

  // Fetch systems from backend and set default systems list
  useEffect(() => {
    async function fetchSystems() {
      try {
        const res = await fetch(`${API_URL}/systems`);
        if (!res.ok) {
          throw new Error("Failed to fetch systems");
        }
        const data = await res.json();
        setDefaultSystemsList(data.map(sys => ({ label: sys.name, value: sys.url })));
      } catch (error) {
        console.error("Error fetching systems:", error);
      }
    }

    fetchSystems();
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
      const response = await fetch(`${API_URL}/question`, {
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
        selectedDifficulty.label,
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
    setSelectedDifficulty(difficultyOptions[0]);
    setIdealSystems([{ name: "", url: "" }]);
    router.push(`/${scheme.toLowerCase()}/exercises`);
  }

  function handleIdealSystemNameChange(index, selectedOption) {
    const newIdealSystems = [...idealSystems];
    newIdealSystems[index].name = selectedOption.label;
    newIdealSystems[index].url = selectedOption.value;
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
            <Select
              value={selectedDifficulty}
              onChange={setSelectedDifficulty}
              options={difficultyOptions}
              className="w-48"
            />
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

          {/* Updated Ideal System handling with react-select */}
          {idealSystems.map((idealSystem, index) => (
            <div key={index} className="flex justify-center w-full">
              <div className="w-full ml-3">
                <p className="text-red-500 inline">*</p>Verified System Name:
                <Select
                  options={defaultSystemsList}
                  onChange={(selectedOption) =>
                    handleIdealSystemNameChange(index, selectedOption)
                  }
                  value={
                    idealSystem.name
                      ? { label: idealSystem.name, value: idealSystem.url }
                      : null
                  }
                  placeholder="Select system name"
                  className="w-full"
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
                  placeholder="Verified system URL"
                  value={idealSystem.url}
                  readOnly // Make the URL field read-only so it cannot be edited
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
