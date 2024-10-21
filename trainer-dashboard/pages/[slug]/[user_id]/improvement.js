import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";
import ReactMarkdown from "react-markdown";
import RadialGraph from "../../../components/PieGraph.jsx";
import BackBar from "../../../components/BackBar.jsx";
import isAuth from "../../../components/isAuth.jsx";
import Download from "@mui/icons-material/SimCardDownloadOutlined";

function ImprovementPage({ user }) {
    const API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const router = useRouter();
    const { slug, user_id } = router.query;
    const [improvement, setImprovement] = useState(null); // Initialize as null
    const [userProfile, setUserProfile] = useState("");

    useEffect(() => {
        async function getImprovement() {
            if (router.isReady) {
                const question_id = slug;
                const finalUserId = user_id || user?.uuid;

                if (question_id && finalUserId) {
                    try {
                        const res = await fetch(`${API_URL}/ai-improvement/${question_id}/${finalUserId}`);
                        if (!res.ok) {
                            throw new Error(`Error: ${res.status} ${res.statusText}`);
                        }
                        const improvementData = await res.json();
                        setImprovement(improvementData);
                    } catch (error) {
                        console.error("Failed to fetch improvement data:", error);
                        setImprovement(null); // Set improvement to null in case of error
                    }
                }
            }
        }

        async function getUser() {
            if (router.isReady) {
                const finalUserId = user_id || user?.uuid;
                if (finalUserId) {
                    try {
                        const res = await fetch(`${API_URL}/user/${finalUserId}`);
                        const userInfo = await res.json();
                        setUserProfile(userInfo);
                    } catch (e) {
                        console.log("Error fetching user data:", e);
                    }
                }
            }
        }

        getImprovement();
        getUser();
    }, [router.isReady]);

    // Check if improvement data is available before rendering the feedbackData array
    const feedbackData = improvement ? [
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
      ] : [];

    const convertToCSV = (improvement) => {
        const headers = [
            "Improvement Feedback",
            "Last Updated",
        ];

        const rows = [
            [
                `"${improvement.improvement_feedback?.replace(/"/g, '""')}"`,
                `${improvement.last_updated}`,
            ]
        ];

        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))];

        return csvContent.join("\n");
    };

    const handleDownload = async () => {
        if (improvement) {
            const csvContent = convertToCSV(improvement);
            const csvBlob = new Blob([csvContent], { type: "text/csv" });
            saveAs(csvBlob, `${userProfile.name}_improvement_${improvement.last_updated}.csv`);
        }
    };

    return (
        <>
            <div className="bg-light-green p-4">
                <BackBar />
                <div className="bg-light-gray rounded-md px-6 pb-12 pt-6 m-5">
                    <div className="p-4 w-auto h-max-content flex justify-between items-center font-bold">
                        <div className="text-2xl">Improvement Feedback</div>
                        {improvement && (
                            <button type="button" className="button" onClick={handleDownload}>
                                <Download fontSize="medium" />
                                Download
                            </button>
                        )}
                    </div>
                    <div className="pl-4 pr-4 mb-4">
                        {improvement ? (
                            <ReactMarkdown>{improvement.improvement_feedback}</ReactMarkdown>
                        ) : (
                            <p>First attempt made. Improvement feedback will be available after subsequent attempts.</p>
                        )}
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
                        <p>{improvement?.last_updated || "N/A"}</p> {/* Add a fallback value */}
                    </div>
                </div>
            </div>
        </>
    );
}

export default isAuth(ImprovementPage);
