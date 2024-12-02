import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// images and icons
import tickimage from "../../public/tickimage.png";
import { ChevronLeft } from "@mui/icons-material";
// components
import isAuth from "../../components/isAuth";
import DifficultySearchBar from "../../components/DifficultySearchBar";
import StatusSearchBar from "../../components/StatusSearchBar";
import DateSearchBar from "../../components/DateSearchBar";
import TopicSearchBar from "../../components/TopicSearchBar";

function Exercises() { // Remove the 'user' parameter
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();
  const { submit } = router.query;
  const [name, setName] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);
  const [filteredQuestions, setFilteredQuestions] = useState([]);
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

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
      const userString = localStorage.getItem("loggedUser");

      if (!userString) {
        // If there's no user in localStorage, redirect to the login page
        router.push("/");
        return;
      }

      const user = JSON.parse(userString);

      if (!user || !user.uuid) {
        // If user or user.uuid is null/undefined, redirect to the login page
        router.push("/");
        return;
      }

      if (router.isReady) {
        const scheme_name = router.query.slug;
        window.localStorage.setItem("schemeName", scheme_name);

        const res = await fetch(
          `${API_URL}/table/${user.uuid}/${scheme_name}`
        );
        const questions = await res.json();

        // Sort questions by 'created' date in descending order
        const sortedQuestions = questions.sort((a, b) => 
          new Date(b.created) - new Date(a.created)
        );

        // Transform the scheme_name and set the sorted questions
        const transformedQuestions = sortedQuestions.map((question) => ({
          ...question,
          scheme_name: {
            ...question.scheme_name,
            scheme_name: question.scheme_name.scheme_name.charAt(0).toUpperCase() + question.scheme_name.scheme_name.slice(1).toLowerCase()
          }
        }));

        setAllQuestions(transformedQuestions);
        setName(scheme_name.charAt(0).toUpperCase() + scheme_name.slice(1).toLowerCase());
      }
    }

    getQuestions();
  }, [router.isReady]);

  useEffect(() => {
    const filterQuestions = () => {
      const filtered = allQuestions.filter((question) => {
        const matchesDifficulty = difficultyFilter
          ? question.question_difficulty === difficultyFilter
          : true;
        const matchesStatus = statusFilter
          ? question.status === statusFilter
          : true;
        const matchesDate = dateFilter
          ? formatDate(question.created).startsWith(dateFilter)
          : true;
        const matchesSearchTerm = searchTerm
          ? question.question_details
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
          : true;

        return (
          matchesDifficulty && matchesStatus && matchesDate && matchesSearchTerm
        );
      });
      setFilteredQuestions(filtered);
    };

    filterQuestions();
  }, [difficultyFilter, statusFilter, dateFilter, searchTerm, allQuestions]);

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

  function handleReviewNav(review_id) {
    router.push(
      {
        pathname: `/${review_id}/review`,
        query: {
          review: true,
          submit: false,
          profile: false,
        },
      },
      `/${review_id}/review`,
      {
        shallow: true,
      }
    );
  }

  // Change table height according to image height
  const imageHeight = tickimage.height;
  const tableCellStyle = `text-start py-6 border px-5`;
  const tableCenterCellStyle = `text-center py-6 border`;

  const getdifficultyColor = (difficulty) => {
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
    <div className="text-base bg-light-green">
      <button
        className="button-btm"
        onClick={(submit) => {
          submit ? router.push(`/schemes`) : router.back();
        }}
      >
        <div className="hover:text-gray-600 flex flex-row pl-5 pt-5">
          <ChevronLeft style={{ verticalAlign: "middle" }} />
          <span className="back-text">Back to Schemes - Overview</span>
        </div>
      </button>
      <div className="flex items-center justify-center p-4">
        <div className="bg-white min-w-full rounded-md p-6">
          <div className="font-bold text-3xl pt-6 pb-10">{name} Scheme</div>

          {/* Filters */}
          <div className="flex justify-between mb-4">
            <StatusSearchBar setFilter={setStatusFilter} />
            <TopicSearchBar setSearch={setSearchTerm} />
            <DifficultySearchBar setFilter={setDifficultyFilter} />
            <DateSearchBar setDateFilter={setDateFilter} />
          </div>

          {/* Table */}
          <table className="w-full table-fixed border border-collapse border-slate-200">
            <thead>
              <tr>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Status
                </th>
                <th className={`${tableCellStyle} w-1/3 bg-dark-grey`}>
                  Question
                </th>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Difficulty
                </th>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Date Created
                </th>
                <th className={`${tableCenterCellStyle} bg-dark-grey`}>
                  Review
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredQuestions.map((question, index) => (
                <tr
                  key={index + 1}
                  className="hover:bg-light-gray hover:cursor-pointer group relative"
                >
                  <td
                    className={`${tableCenterCellStyle}`}
                    style={{ height: `${imageHeight}px`, padding: `6px 8px` }}
                  >
                    {question.status === "completed" && (
                      <Image
                        src={tickimage}
                        alt="Status"
                        style={{ margin: "0 auto" }}
                      />
                    )}
                  </td>
                  <td
                    className={`${tableCellStyle} hover:underline hover:underline-offset-2`}
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
                    className={`${tableCenterCellStyle} ${getdifficultyColor(
                      question.question_difficulty
                    )}`}
                  >
                    {question.question_difficulty}
                  </td>
                  <td className={`${tableCenterCellStyle}`}>
                  {formatDate(question.created)}
                  </td>
                  <td
                    className={`${tableCenterCellStyle} hover:underline hover:underline-offset-2 `}
                    onClick={() => handleReviewNav(question.attempt)}
                  >
                    {question.attempt ? "Click to view latest attempt" : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default isAuth(Exercises);
