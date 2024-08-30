// framework
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import { useRouter } from "next/router";
// components
import CustomTable from "../../components/CustomTable.jsx";
import isAuth from "../../components/isAuth.jsx";
import ProgressBar from "../../components/ProgressBar.jsx";
import AverageScores from "../../components/AverageScores.jsx";
// icons
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function Profile() {
  const router = useRouter();
  const [attempts, setAttempts] = useState("");
  const [subCat, setSubCat] = useState("");
  const [userProfile, setUserProfile] = useState("");
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

  useEffect(() => {
    async function getUser() {
      if (router.isReady) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/${router.query.slug}`
          );

          const userInfo = await res.json();
          setUserProfile(userInfo);
        } catch (e) {
          console.log(e);
        }
      }
    }
    getUser();
  }, [router.isReady]);

  useEffect(() => {
    async function getAttempts() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/attempt/user/${userProfile.uuid}`
        );
        const attemptRes = await res.json();
        if (res.ok) {
          setAttempts(attemptRes.reverse());
        }
      } catch (e) {
        console.log(e);
      }
    }

    async function getSubCat() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/${userProfile.uuid}/schemes`
        );
        const subCatData = await res.json();
        if (res.ok) {
          setSubCat(subCatData);
        }
      } catch (e) {
        console.log(e);
      }
    }

    if (userProfile != "") {
      getAttempts();
      getSubCat();
    }
  }, [userProfile]);

  const convertToCSV = (attempts) => {
    const headers = [
      "Name",
      "Email",
      "Scheme",
      "Date",
      "Question Title",
      "Question",
      "Answer",
      "Accuracy Feedback",
      "Accuracy Score",
      "Precision Feedback",
      "Precision Score",
      "Tone Feedback",
      "Tone Score",
    ];

    // Generate rows for each attempt
    const rows = attempts.map((attempt) => [
      userProfile.name,
      userProfile.email,
      attempt.scheme_name,
      attempt.date,
      `"${attempt.question_title}"`,
      `"${attempt.question_details}"`,
      `"${attempt.answer}"`,
      `"${attempt.accuracy_feedback}"`,
      `${(attempt.accuracy_score / 5) * 100}%`,
      `"${attempt.precision_feedback}"`,
      `${(attempt.precision_score / 5) * 100}%`,
      `"${attempt.tone_feedback}"`,
      `${(attempt.tone_score / 5) * 100}%`,
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(",")];
    rows.forEach((row) => {
      csvContent.push(row.join(","));
    });

    return csvContent.join("\n");
  };

  const handleDownload = async () => {
    const csvContent = convertToCSV(attempts);
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    saveAs(csvBlob, `${userProfile.name}_all_attempts.csv`);
  };

  return (
    <div className="profile-container">
      <div className="font-bold text-xl pl-2">{userProfile.name}'s Profile</div>
      <AverageScores className="mt-2" user={userProfile} />
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
                <CustomTable rows={attempts} user_id={userProfile.uuid} />
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
