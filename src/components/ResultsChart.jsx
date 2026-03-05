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
                    "rgba(37, 99, 235, 0.85)",  // blue-600
                    "rgba(79, 70, 229, 0.85)",  // indigo-600
                    "rgba(16, 185, 129, 0.85)", // emerald-500
                    "rgba(245, 158, 11, 0.85)", // amber-500
                    "rgba(239, 68, 68, 0.85)",  // red-500
                ],
                borderRadius: 12,
                borderWidth: 0,
                barThickness: 'flex',
                maxBarThickness: 40,
                hoverBackgroundColor: "rgba(37, 99, 235, 1)",
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: window.innerWidth < 640 ? 'y' : 'x', // Horizontal bars on mobile for better relaxation
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "#0f172a",
                padding: 12,
                titleFont: { size: 14, weight: '900' },
                bodyFont: { size: 13, weight: '600' },
                displayColors: false,
                callbacks: {
                    label: (context) => ` Votes: ${context.parsed.y || context.parsed.x}`,
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    font: { weight: '700', size: 10 },
                    color: '#94a3b8',
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(241, 245, 249, 1)",
                    drawBorder: false,
                },
                ticks: {
                    stepSize: 1,
                    font: { weight: '700', size: 10 },
                    color: '#94a3b8',
                },
            },
        },
    };

    return (
        <div className="h-[300px] sm:h-[400px] w-full mobile-chart-relaxed">
            <Bar data={data} options={options} />
        </div>
    );
};


export default ResultsChart;
