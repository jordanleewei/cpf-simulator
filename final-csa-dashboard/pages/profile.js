// framework
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
// components
import CustomTable from "../components/CustomTable.jsx";
import isAuth from "../components/isAuth.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import AverageScores from "../components/AverageScores.jsx";
// icons
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function Profile({ user }) {
  const [attempts, setAttempts] = useState([]);
  const [subCat, setSubCat] = useState([]);
  const [userName, setUserName] = useState("");
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  const getAuthHeaders = () => {
    const loggedUser = JSON.parse(window.localStorage.getItem("loggedUser"));
    const token = loggedUser ? loggedUser.access_token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    async function fetchUserData() {
      try {
        const res = await fetch(`${API_URL}/user/${user.uuid}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const userData = await res.json();
          setUserName(userData.name);
        } else {
          console.error("Failed to fetch user data:", res.status);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    }

    if (user) {
      fetchUserData();
    }
  }, [user]);

  useEffect(() => {
    async function getAttempts() {
      try {
        const res = await fetch(`${API_URL}/attempt/user/${user.uuid}`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          let attemptRes = await res.json();
          if (Array.isArray(attemptRes)) {
            // Group attempts by question and add attempt number
            const attemptsWithAttemptNumber = attemptRes.reduce((acc, attempt) => {
              const key = attempt.question_id; // You can use question_title or question_id
              if (!acc[key]) {
                acc[key] = [];
              }
              acc[key].push(attempt);
              return acc;
            }, {});

            // Add attempt number and sort by date within each group
            const sortedAttempts = [];
            Object.keys(attemptsWithAttemptNumber).forEach((questionKey) => {
              const sortedGroup = attemptsWithAttemptNumber[questionKey].sort((a, b) => new Date(a.date) - new Date(b.date));
              sortedGroup.forEach((attempt, index) => {
                attempt.attemptNumber = index + 1; // Add attempt number (1st, 2nd, etc.)
                sortedAttempts.push(attempt);
              });
            });

            setAttempts(sortedAttempts.reverse()); // Display the latest first
          } else {
            console.error("Invalid attempts data:", attemptRes);
          }
        } else {
          console.error("Failed to fetch attempts:", res.status);
        }
      } catch (error) {
        console.error("Error fetching attempts:", error);
      }
    }

    async function getSubCat() {
      try {
        const res = await fetch(`${API_URL}/user/${user.uuid}/schemes`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const subCatData = await res.json();
          setSubCat(subCatData);
        } else {
          console.error("Failed to fetch subcategories:", res.status);
        }
      } catch (error) {
        console.error("Error fetching subcategories:", error);
      }
    }

    if (user) {
      getAttempts();
      getSubCat();
    }
  }, [user]);

  const convertToCSV = (attempts) => {
    const headers = [
      "Name",
      "Email",
      "Scheme",
      "Date",
      "Question Title",
      "Question",
      "Attempt Number",
      "Answer",
      "System Name",
      "System URL",
      "Accuracy Feedback",
      "Accuracy Score",
      "Precision Feedback",
      "Precision Score",
      "Tone Feedback",
      "Tone Score",
    ];

    const rows = attempts.map((attempt) => [
      userName,
      user.email,
      attempt.scheme_name,
      attempt.date,
      `"${attempt.question_title}"`,
      `"${attempt.question_details}"`,
      `"${attempt.attemptNumber}"`,
      `"${attempt.answer}"`,
      `"${attempt.system_name}"`,
      `"${attempt.system_url}"`,
      `"${attempt.accuracy_feedback}"`,
      `${(attempt.accuracy_score / 5) * 100}%`,
      `"${attempt.precision_feedback}"`,
      `${(attempt.precision_score / 5) * 100}%`,
      `"${attempt.tone_feedback}"`,
      `${(attempt.tone_score / 5) * 100}%`,
    ]);

    const csvContent = [headers.join(",")];
    rows.forEach((row) => {
      csvContent.push(row.join(","));
    });

    return csvContent.join("\n");
  };

  const handleDownload = async () => {
    const csvContent = convertToCSV(attempts);
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    saveAs(csvBlob, `${userName}_all_attempts.csv`);
  };

  return (
    <div className="profile-container">
      <div className="font-bold text-xl pl-2">Welcome, {userName}</div>
      <AverageScores className="mt-2 " user={user} />
      <div className="lower-half-profile-container">
        <div className="columns-container">
          <div className="column-left">
            <h3 className="pl-5 font-bold">Scheme Mastery</h3>
            <div className="rounded-lg p-5 flex flex-col justify-center items-center gap-5">
              {subCat.length === 0 ? (
                <div className="pt-2">No schemes assigned</div>
              ) : (
                subCat.map((cat, idx) => (
                  <ProgressBar
                    key={idx}
                    attemptedNum={cat.num_attempted_questions}
                    qnNum={cat.num_questions}
                    schemeName={cat.scheme_name}
                  />
                ))
              )}
            </div>
          </div>
          <div className="column-right">
            <h3 className="pl-5 font-bold">Practice Details</h3>
            {attempts.length > 0 ? (
              <div className="rounded-lg py-4 px-4 h-full flex relative">
                <CustomTable rows={attempts} />
                <button
                  type="button"
                  className="absolute -top-7 right-4 bg-dark-green hover:bg-darker-green text-white py-1 px-3 rounded flex items-center"
                  onClick={handleDownload}
                >
                  <Download />
                  Download All
                </button>
              </div>
            ) : (
              <div className="flex justify-center items-center py-8">
                No attempts
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default isAuth(Profile);