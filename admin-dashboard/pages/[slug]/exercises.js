import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// icons
import { ChevronLeft } from "@mui/icons-material";
import { FaRegTrashCan } from "react-icons/fa6";
// components
import isAuth from "../../components/isAuth";
import DeleteModal from "../../components/DeleteModal";
import DateSearchBar from "../../components/DateSearchBar";
import DifficultySearchBar from "../../components/DifficultySearchBar";
import TopicSearchBar from "../../components/TopicSearchBar";

function Exercises() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);
  const [editState, setEditState] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 8); // Add 8 hours to the original time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  useEffect(() => {
    async function getQuestions() {
      if (router.isReady) {
        const scheme_name = router.query.slug;
        window.localStorage.setItem("schemeName", scheme_name);

        try {
          const res = await fetch(`${API_URL}/questions/scheme/${scheme_name}`);
          let questions = await res.json();
  
          // Ensure questions is always an array, then sort by created date
          if (Array.isArray(questions)) {
            questions.sort((a, b) => new Date(b.created) - new Date(a.created));
          } else {
            questions = [];
          }
  
          setAllQuestions(questions);
          setFilteredQuestions(questions); // Initialize filteredQuestions with all questions
          setName(scheme_name.charAt(0).toUpperCase() + scheme_name.slice(1));
        } catch (error) {
          console.error("Failed to fetch questions:", error);
          setAllQuestions([]); // Fallback to empty array
        }
      }
    }

    getQuestions();
  }, [router.isReady]);

  // Filter questions based on date and difficulty
  useEffect(() => {
    const filtered = allQuestions.filter((question) => {
      const matchesDifficulty = difficultyFilter ? question.question_difficulty === difficultyFilter : true;
      const matchesDate = dateFilter ? formatDate(question.created).startsWith(dateFilter) : true;
      const matchesSearchTerm = !searchTerm || question.question_details?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDifficulty && matchesDate && matchesSearchTerm;
    });
    setFilteredQuestions(filtered);
  }, [difficultyFilter, dateFilter, searchTerm, allQuestions]);

  function handleQuestionNav(question_id) {
    router.push(
      {
        pathname: `/${question_id}/question`,
        query: {
          scheme_name: name,
        },
      },
      `/${question_id}/question`,
      {
        shallow: true,
      }
    );
  }

  function handleAddQuestion() {
    const pagename = name.toLowerCase();
    router.push(`/${pagename}/addquestions`, undefined, { shallow: true });
  }

  const handleDelete = async (question_id) => {
    try {
      await fetch(`${API_URL}/question/${question_id}`, {
        method: "DELETE",
      });
      setAllQuestions(allQuestions.filter((i) => i.question_id !== question_id));
      setDeleteId("");
    } catch (e) {
      console.log(e);
    }
  };

  const tableCellStyle = `text-start py-6 border px-5`;
  const tableCenterCellStyle = `text-center py-6 border`;

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-500";
      case "Intermediate":
        return "text-yellow-500";
      case "Complex":
        return "text-red-500";
      default:
        return "";
    }
  };

  return (
    <div className="text-base bg-light-green flex flex-col">
      <button
        className="button-btm"
        onClick={(submit) => {
          submit ? router.push(`/schemes`) : router.back();
        }}
      >
        <div className="hover:text-gray-600 flex flex-row pl-5 pt-5">
          <ChevronLeft style={{ verticalAlign: "middle" }} />
          <span className="back-text">Back to Schemes</span>
        </div>
      </button>
      {/* for delete modal */}
      {deleteId && (
        <div className="w-full h-full flex justify-center items-center fixed -top-0.5 z-50">
          <DeleteModal
            id={deleteId}
            setId={setDeleteId}
            text={
              allQuestions.find((q) => q.question_id === deleteId)?.title || "Question"
            }
            handleDelete={handleDelete}
            className=" justify-self-center place-items-center"
          />
          <div className="w-screen bg-gray-500/50 h-screen absolute z-30" />
        </div>
      )}

      <div className="w-screen flex items-center justify-center p-4">
        <div className="bg-white min-w-full rounded-md p-6">
          <div className=" flex flex-row justify-between items-center pt-6 pb-8">
            <div className="font-bold text-3xl ">{name} Scheme</div>
            {editState ? (
              <div className="flex justify-end gap-3">
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md hover:bg-dark-green-700 text-white py-2 px-4"
                  onClick={handleAddQuestion}
                >
                  Add Question
                </button>
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md hover:bg-dark-green-700 text-white py-2 px-4"
                  onClick={() => setEditState(false)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex justify-end gap-3">
                <button
                  className="bg-dark-green hover:bg-darker-green rounded-md hover:bg-dark-green-700 text-white py-2 px-4"
                  onClick={() => setEditState(true)}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="flex space-x-4 mb-4">
            <TopicSearchBar setSearch={setSearchTerm} />
            <DifficultySearchBar setFilter={setDifficultyFilter} />
            <DateSearchBar setDateFilter={setDateFilter} />
          </div>

          {/* Table */}
          <table className="w-full table-fixed border border-collapse border-slate-200">
            <thead>
              <tr>
                <th className={`${tableCellStyle} w-1/3 bg-dark-grey`}>
                  Question
                </th>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Difficulty
                </th>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Date Created
                </th>
                <th className="w-[0px] p-0" />
              </tr>
            </thead>

            <tbody>
              {filteredQuestions.length > 0 ? (
                filteredQuestions.map((question, index) => (
                  <tr
                    key={index + 1}
                    className="hover:bg-light-gray hover:cursor-pointer group" // Added group class here
                  >
                    <td
                      className={`${tableCellStyle} hover:underline hover:underline-offset-2 relative`}
                      onClick={() => handleQuestionNav(question.question_id)}
                    >
                      {`${index + 1}. ${question.title}`}

                      {/* Tooltip for question preview */}
                      <div
                        className="absolute left-0 top-full mt-1 w-64 p-2 text-sm bg-gray-700 text-white rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                        style={{ whiteSpace: "normal" }} // Ensures multi-line preview if content is long
                      >
                        {question.question_details
                          ? question.question_details.substring(0, 100) + "..."
                          : "No preview available"}
                      </div>
                    </td>
                    <td
                      className={`${tableCenterCellStyle} ${getDifficultyColor(
                        question.question_difficulty
                      )}`}
                    >
                      {question.question_difficulty}
                    </td>
                    <td className={`${tableCenterCellStyle}`}>
                      {formatDate(question.created)}
                    </td>
                    <td>
                      {editState && (
                        <button className="flex items-center">
                          <FaRegTrashCan
                            className=" text-red-500 ml-0.5"
                            onClick={() => setDeleteId(question.question_id)}
                          />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    No questions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default isAuth(Exercises);
