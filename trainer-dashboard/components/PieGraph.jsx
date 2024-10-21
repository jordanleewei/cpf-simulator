import { Doughnut } from "react-chartjs-2";
import { Chart, CategoryScale, ArcElement } from "chart.js";

export default function RadialGraph({ data, label }) {
  Chart.register(CategoryScale, ArcElement);

  const piedata = {
    datasets: [
      {
        data: [data.value, data.total - data.value],
        backgroundColor: ["#0A6160", "#F5F5F5"],
      },
    ],
  };

  return (
    <div className="flex flex-col items-center w-auto">
      <p className="absolute mt-20 pt-20">
        {Math.floor((data.value / data.total) * 100)}%
      </p>
      <Doughnut data={piedata} />
      <p className="mt-5 font-medium">{label}</p>
    </div>
  );
}
