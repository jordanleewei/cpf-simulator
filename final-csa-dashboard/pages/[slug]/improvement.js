// framework
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
// components
import RadialGraph from "../../components/PieGraph.jsx";
import QuestionBar from "../../components/QuestionBar.jsx";
import isAuth from "../../components/isAuth.jsx";
// icons
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function ImprovementPage({ user }) {
    // Get API URL from environment variables
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const router = useRouter();
    const review = router.query.review === "true";
    const submit = router.query.submit === "true";
    const profile = router.query.profile === "true";
    const [improvement, setImprovement] = useState({});
    const loginDetails = user;

    useEffect(() => {
        async function getImprovement() {
            if (router.isReady) {
                const question_id = router.query.slug;

                if (question_id) {
                    try {
                        const res = await fetch(`${API_URL}/ai-improvement/${question_id}`, {
                            headers: {
                                Authorization: `Bearer ${user?.token}`,
                            },
                        });

                        if (!res.ok) {
                            throw new Error(`Error: ${res.status} ${res.statusText}`);
                        }

                        const improvementData = await res.json();
                        console.log("improvement", improvementData);
                        setImprovement(improvementData);
                    } catch (error) {
                        console.error("Failed to fetch improvement data:", error);
                    }
                } else {
                    console.error("No question_id found in URL");
                }
            }
        }
        getImprovement();
    }, [router.isReady]);

    const feedbackData = [
        {
          label: "Accuracy Improvement",
          value: improvement.accuracy_improvement,
          total: 5,
        },
        {
          label: "Comprehension Improvement",
          value: improvement.precision_improvement,
          total: 5,
        },
        {
          label: "Tone Improvement",
          value: improvement.tone_improvement,
          total: 5,
        },
      ];

    const convertToCSV = (improvement) => {
        const headers = [
            "Feedback",
            "Improvement Feedback",
            "Accuracy Improvement",
            "Precision Improvement",
            "Tone Improvement",
            "Last Updated",
        ];

        // Ensure the feedback and improvement feedback are properly enclosed in quotes
        const rows = [
            [
                `"${improvement.feedback.replace(/"/g, '""')}"`, // Replace any internal quotes with double quotes for CSV
                `"${improvement.improvement_feedback.replace(/"/g, '""')}"`,
                `${(improvement.accuracy_improvement / 5) * 100}%`,
                `${(improvement.precision_improvement / 5) * 100}%`,
                `${(improvement.tone_improvement / 5) * 100}%`,
                `${improvement.last_updated}`,
            ]
        ];

        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))];

        return csvContent.join("\n");
    };

    const handleDownload = async () => {
        const csvContent = convertToCSV(improvement);
        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        saveAs(csvBlob, `${loginDetails.name}_improvement_${improvement.last_updated}.csv`);
    };

    return (
        <>
            <div className="bg-light-green p-4">
                <QuestionBar
                    currentidx={improvement.id}
                    review={review}
                    submit={submit}
                    profile={profile}
                    scheme_name={improvement.scheme_name}
                />
                <div className="bg-light-gray rounded-md px-6 pb-12 pt-6 m-5">
                    <div className="p-4 w-auto h-max-content flex justify-between items-center font-bold">
                        <div className="text-2xl">Improvement Feedback</div>
                        <button type="button" className="button" onClick={handleDownload}>
                            <Download fontSize="medium" />
                            Download
                        </button>
                    </div>
                    <div className="pl-4 pr-4 mb-4">
                        <h3 className="font-bold">Score Feedback:</h3>
                        <p>{improvement.feedback}</p>
                    </div>
                    <div className="pl-4 pr-4 mb-4">
                        <h3 className="font-bold">Overall Feedback:</h3>
                        <ReactMarkdown>{improvement.improvement_feedback}</ReactMarkdown>
                    </div>
                    {/* Commenting out the Improvement Scores graph */}
                    {/*
                    <h3 className="px-4 py-2 w-auto h-max-content flex justify-between items-center font-bold">
                        Improvement Scores
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
                            </div>
                        ))}
                    </div>
                    */}
                    <div className="pl-4 pr-4 mb-4">
                        <h3 className="font-bold">Last Updated:</h3>
                        <p>{improvement.last_updated}</p>
                    </div>
                </div>
            </div>
        </>
    );
}

export default isAuth(ImprovementPage);
