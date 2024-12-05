// framework
import DOMPurify from "dompurify";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
// components
import RadialGraph from "../../../components/PieGraph.jsx";
import BackBar from "../../../components/BackBar.jsx";
import isAuth from "../../../components/isAuth.jsx";
// icons
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function ReviewPage() {
  // Get API URL from environment variables
  const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
  const router = useRouter();
  const { review, submit, profile, scheme_name } = router.query;
  const [attempt, setAttempt] = useState({
    system_name: [],
    system_url: []
  });
  const [userProfile, setUserProfile] = useState("");

  useEffect(() => {
    async function getAttempt() {
      if (router.isReady) {
        const attempt_id = router.query.slug;
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}/attempt/${attempt_id}`);

        const attemptData = await res.json();
        
        attemptData.system_name = attemptData.system_name
            ? attemptData.system_name.split(',').map(item => item.trim())
            : [];
  
          attemptData.system_url = attemptData.system_url
            ? attemptData.system_url.split(',').map(item => item.trim())
            : [];

        setAttempt(attemptData);
      }
    }
    async function getUser() {
      if (router.isReady) {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_API_URL}/user/${router.query.user_id}`
          );

          const userInfo = await res.json();
          setUserProfile(userInfo);
        } catch (e) {
          console.log(e);
        }
      }
    }
    getAttempt();
    getUser();
  }, [router.isReady]);

  // Sanitize HTML content to prevent XSS
  const createSafeHTML = (html) => {
    if (typeof window !== "undefined") {
      const sanitizedHtml = DOMPurify.sanitize(html);
  
      // Add styling for hyperlinks
      const styledHtml = sanitizedHtml.replace(
        /<a /g,
        `<a style="color: blue; text-decoration: underline;" `
      );
  
      return { __html: styledHtml };
    }
    return { __html: html }; // Fallback for SSR
  };

  const feedbackData = [
    {
      label: "Accuracy",
      value: attempt.accuracy_score,
      total: 5,
      feedback: attempt.accuracy_feedback,
    },
    {
      label: "Comprehension",
      value: attempt.precision_score,
      total: 5,
      feedback: attempt.precision_feedback,
    },
    {
      label: "Tone",
      value: attempt.tone_score,
      total: 5,
      feedback: attempt.tone_feedback,
    },
  ];

  const convertToCSV = (attempt) => {
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
      "Comprehension Feedback",
      "Comprehension Score",
      "Tone Feedback",
      "Tone Score",
    ];

    // Add 8 hours to the UTC date
    const adjustedDate = attempt.date
    ? new Date(new Date(attempt.date).getTime() + 8 * 60 * 60 * 1000).toLocaleString("en-SG", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : "N/A";

    // Generate rows
    const row = [
      userProfile.name,
      userProfile.email,
      attempt.scheme_name,
      `"${adjustedDate}"`,
      `"${attempt.title}"`,
      `"${attempt.question_details}"`,
      `"${attempt.answer}"`,
      `"${attempt.accuracy_feedback}"`,
      `${(attempt.accuracy_score / 5) * 100}%`,
      `"${attempt.precision_feedback}"`,
      `${(attempt.precision_score / 5) * 100}%`,
      `"${attempt.tone_feedback}"`,
      `${(attempt.tone_score / 5) * 100}%`,
    ];

    // Combine headers and row
    const csvContent = [headers];
    csvContent.push(row);

    return csvContent.map((row) => row.join(",")).join("\n");
  };

  const handleDownload = async () => {
    const csvContent = convertToCSV(attempt);
    const csvBlob = new Blob([csvContent], { type: "text/csv" });
    saveAs(
      csvBlob,
      `${userProfile.name}_${attempt.scheme_name} scheme_${attempt.title}_transcript.csv`
    );
  };

  return (
    <>
      <div className="bg-light-green p-4">
        <BackBar />
        <div className="bg-light-gray rounded-md px-6 pb-12 pt-6 m-5 ">
          <div className="p-4 w-auto h-max-content flex justify-between items-center font-bold">
            <div className="text-2xl">Feedback</div>
            <button type="button" className="button" onClick={handleDownload}>
              <Download fontSize="medium" />
              Download
            </button>
          </div>
          <div className="pl-4 pr-4 mb-4">
            <h3 className="font-bold">Question:</h3>
            <p>{attempt.question_details}</p>
          </div>
          <div className="pl-4 pr-4 mb-4">
            <h3 className="font-bold">Your Answer:</h3>
            {/* Render the answer as sanitized HTML */}
            <div
              style={{ whiteSpace: "pre-wrap" }}
              dangerouslySetInnerHTML={createSafeHTML(attempt.answer)}
            />
          </div>
          <div className="pl-4 pr-4 mb-4">
            <h3 className="font-bold">Your System Name Answer:</h3>
            <ul>
              {attempt.system_name.map((name, index) => (
                <li key={index}>{name}</li>
              ))}
            </ul>
          </div>
          <div className="pl-4 pr-4 mb-4">
            <h3 className="font-bold">Your System URL Answer:</h3>
            <ul>
              {attempt.system_url.map((url, index) => (
                <li key={index}>{url}</li>
              ))}
            </ul>
          </div>
          <h3 className="px-4 py-2 w-auto h-max-content flex justify-between items-center font-bold">
            Overall Scores
          </h3>
          <div className="pb-4 w-full w-max-screen flex justify-between items-center gap-10 px-5">
            {feedbackData.map((i, idx) => (
              <div
                className="flex flex-col justify-center w-1/3 h-auto"
                key={idx}
              >
                <div className="p-4">
                  <RadialGraph data={i} label={i.label} />
                </div>
                {/* Make the feedback scrollable */}
                <div
                  className="h-30 text-base text-justify overflow-y-scroll p-2 bg-light-grey rounded-md"
                >
                  {i.feedback}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default isAuth(ReviewPage);
