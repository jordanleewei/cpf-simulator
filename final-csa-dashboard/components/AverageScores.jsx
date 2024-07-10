import { useEffect, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import RadialGraph from "./PieGraph";

export default function AverageScores({ user }) {
  const [open, setOpen] = useState(false);
  const [averageScores, setAverageScores] = useState("");
  const [pieSelect, setPieSelect] = useState("All");
  const [pieContent, setPieContent] = useState([]);

  useEffect(() => {
    async function getAverageScores() {
      try {
        // retrive data
        const res = await fetch(
          `https://d17ygk7qno65io.cloudfront.net/attempt/average_scores/user/${user.uuid}`
        );

        const averageData = await res.json();

        if (!res.ok) {
          throw new Error("no data found");
        }

        // sort so that all is first
        averageData.sort((a, b) => {
          if (a.scheme_name === "All") return -1;
          if (b.scheme_name === "All") return 1;
          return 0;
        });

        // set all average scores
        setAverageScores(averageData);

        // set initial pie chart data
        const allAvg = averageData.filter((i) => i.scheme_name == "All")[0];

        const averageDataFormat = [
          {
            label: "Accuracy",
            value: allAvg.accuracy_score_avg,
            total: 5,
          },
          {
            label: "Comprehension",
            value: allAvg.precision_score_avg,
            total: 5,
          },
          { label: "Tone", value: allAvg.tone_score_avg, total: 5 },
        ];
        setPieContent(averageDataFormat);
      } catch (e) {
        console.log(e);
      }
    }

    if (user) {
      getAverageScores();
    }
  }, [user]);

  const handlePieChart = (scheme_name) => {
    setPieSelect(scheme_name);
    setOpen(false);

    const allAvg = averageScores.filter((i) => i.scheme_name == scheme_name)[0];

    const averageDataFormat = [
      {
        label: "Accuracy",
        value: allAvg.accuracy_score_avg,
        total: 5,
      },
      {
        label: "Comprehension",
        value: allAvg.precision_score_avg,
        total: 5,
      },
      { label: "Tone", value: allAvg.tone_score_avg, total: 5 },
    ];

    setPieContent(averageDataFormat);
  };

  return (
    <div className="bg-light-gray rounded-lg w-auto h-1/2 flex flex-col mt-4 p-5">
      {/* title + filter */}
      <div className="flex flex-row items-center gap-4">
        <h3 className="font-bold">Average Scores</h3>

        {averageScores == "" ? null : (
          <div className="relative">
            <button
              className={`flex justify-between items-center bg-dark-grey px-3 py-1 text-dark-blue rounded-t-lg gap-3 w-32 text-wrap ${
                open ? "rounded-b-none" : "rounded-b-lg"
              }`}
              onClick={() => setOpen(!open)}
            >
              {pieSelect}
              <FaChevronDown />
            </button>

            {/* dropdown options */}
            {open ? (
              <div className="z-10 bg-dark-grey absolute top-6 rounded-b-lg w-full px-1 py-2 ">
                <ul className="space-y-1">
                  {averageScores.map((scores) => (
                    <li
                      key={scores.scheme_name}
                      className={`flex h-4 items-center w-full py-3 rounded-lg pl-2 hover:cursor-pointer hover:bg-light-gray ${
                        pieSelect == scores.scheme_name
                          ? "bg-light-gray"
                          : "bg-dark-grey"
                      }`}
                      onClick={() => handlePieChart(scores.scheme_name)}
                    >
                      {scores.scheme_name}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* pie charts */}
      <div className=" w-full h-max-content flex justify-around items-center pt-6">
        {averageScores == "" ? (
          <div className="pb-2">No scores</div>
        ) : (
          pieContent.map((score, idx) => (
            <RadialGraph key={idx} data={score} label={score.label} />
          ))
        )}
      </div>
    </div>
  );
}
