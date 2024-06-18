// framework
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
// images and icons
import { ChevronLeft } from "@mui/icons-material";
import { FaRegTrashCan } from "react-icons/fa6";
// components
import isAuth from "../../components/isAuth";
import DeleteModal from "../../components/DeleteModal";

function Exercises() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [allQuestions, setAllQuestions] = useState([]);
  const [editState, setEditState] = useState(false);
  const [deleteId, setDeleteId] = useState("");

  useEffect(() => {
    async function getQuestions() {
      if (router.isReady) {
        const scheme_name = router.query.slug;
        window.localStorage.setItem("schemeName", scheme_name);
        const res = await fetch(
          `https://d17ygk7qno65io.cloudfront.net/questions/scheme/${scheme_name}`
        );
        const questions = await res.json();
        setAllQuestions(questions);
        setName(scheme_name.charAt(0).toUpperCase() + scheme_name.slice(1));
      }
    }

    getQuestions();
  }, [router.isReady]);

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
    var pagename = name.toLowerCase();
    router.push(`/${pagename}/addquestions`, undefined, { shallow: true });
  }

  const handleDelete = (question_id) => {
    try {
      const res = fetch(`https://d17ygk7qno65io.cloudfront.net/question/${question_id}`, {
        method: "DELETE",
      });
      setAllQuestions(allQuestions.filter((i) => i.question_id != question_id));
      setDeleteId("");
    } catch (e) {
      console.log(e);
    }
  };

  const tableCellStyle = `text-start py-6 border px-5`;
  const tableCenterCellStyle = `text-center py-6 border`;

  const getdifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-500";
      case "Medium":
        return "text-yellow-500";
      case "Hard":
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
      {deleteId == "" ? null : (
        <div className="w-full h-full flex justify-center items-center fixed -top-0.5">
          <DeleteModal
            id={deleteId}
            setId={setDeleteId}
            text={
              allQuestions
                .filter((q) => q.question_id == deleteId)
                .map((i) => i.title)[0]
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
                  Scheme
                </th>
                <th className="w-[0px] p-0" />
              </tr>
            </thead>

            <tbody>
              {allQuestions.map((question, index) => (
                <tr
                  key={index + 1}
                  className="hover:bg-light-gray hover:cursor-pointer"
                >
                  <td
                    className={`${tableCellStyle} hover:underline hover:underline-offset-2`}
                    onClick={() => handleQuestionNav(question.question_id)}
                  >{`${index + 1}. ${question.title}`}</td>
                  <td
                    className={`${tableCenterCellStyle} ${getdifficultyColor(
                      question.question_difficulty
                    )}`}
                  >
                    {question.question_difficulty}
                  </td>
                  <td className={`${tableCenterCellStyle}`}>
                    {question.scheme_name}
                  </td>
                  <td>
                    {editState ? (
                      <button className="flex items-center">
                        <FaRegTrashCan
                          className=" text-red-500 ml-0.5"
                          onClick={() => setDeleteId(question.question_id)}
                        />
                      </button>
                    ) : null}
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
