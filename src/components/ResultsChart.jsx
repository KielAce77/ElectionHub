import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

/**
 * ResultsChart component visualizations voting distributions.
 * It uses Chart.js to render a professional bar chart of candidates and their vote counts.
 */
const ResultsChart = ({ results }) => {
    const data = {
        labels: results.map((item) => item.name),
        datasets: [
            {
                label: "Votes Cast",
                data: results.map((item) => item.votes),
                backgroundColor: [
                    "rgba(37, 99, 235, 0.8)",  // blue-600
                    "rgba(79, 70, 229, 0.8)",  // indigo-600
                    "rgba(124, 58, 237, 0.8)", // violet-600
                    "rgba(147, 51, 234, 0.8)", // purple-600
                    "rgba(192, 38, 211, 0.8)", // fuchsia-600
                ],
                borderRadius: 8,
                borderWidth: 0,
                hoverBackgroundColor: "rgba(29, 78, 216, 1)", // blue-700
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false, // Cleaner look for a single dataset
            },
            tooltip: {
                backgroundColor: "#0f172a", // slate-900
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                displayColors: false,
                callbacks: {
                    label: (context) => `Total Votes: ${context.parsed.y}`,
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        weight: '600',
                        size: 11,
                    },
                    color: '#64748b', // slate-500
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(241, 245, 249, 1)", // slate-100
                },
                ticks: {
                    stepSize: 1,
                    font: {
                        weight: '600',
                        size: 11,
                    },
                    color: '#64748b', // slate-500
                },
            },
        },
    };

    return (
        <div className="h-[300px] w-full">
            <Bar data={data} options={options} />
        </div>
    );
};

export default ResultsChart;
