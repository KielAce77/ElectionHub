import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend
);

/**
 * ResultsChart component visualizations voting distributions.
 * Enhanced for maximum visibility and premium aesthetics.
 */
const ResultsChart = ({ results }) => {
    const isMobile = window.innerWidth < 640;

    const barData = {
        labels: results.map((item) => item.name),
        datasets: [
            {
                label: "Votes",
                data: results.map((item) => item.votes),
                backgroundColor: [
                    "rgba(37, 99, 235, 0.8)",   // blue-600
                    "rgba(99, 102, 241, 0.8)",  // indigo-500
                    "rgba(16, 185, 129, 0.8)",  // emerald-500
                    "rgba(245, 158, 11, 0.8)",  // amber-500
                    "rgba(239, 68, 68, 0.8)",   // red-500
                    "rgba(139, 92, 246, 0.8)",  // violet-500
                ],
                borderColor: [
                    "rgb(37, 99, 235)",
                    "rgb(99, 102, 241)",
                    "rgb(16, 185, 129)",
                    "rgb(245, 158, 11)",
                    "rgb(239, 68, 68)",
                    "rgb(139, 92, 246)",
                ],
                borderWidth: 2,
                borderRadius: 8,
                barThickness: isMobile ? 25 : 45,
                hoverBackgroundColor: [
                    "rgba(37, 99, 235, 1)",
                    "rgba(99, 102, 241, 1)",
                    "rgba(16, 185, 129, 1)",
                    "rgba(245, 158, 11, 1)",
                    "rgba(239, 68, 68, 1)",
                    "rgba(139, 92, 246, 1)",
                ],
            },
        ],
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: isMobile ? 'y' : 'x',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                titleFont: { size: 13, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 12,
                displayColors: true,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    font: { weight: '800', size: 10 },
                    color: '#64748b',
                    padding: 10,
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: "rgba(226, 232, 240, 0.5)",
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 h-auto w-full">
            <div className="md:col-span-3 h-[300px] md:h-[400px]">
                <Bar data={barData} options={barOptions} />
            </div>
            <div className="md:col-span-2 h-[250px] md:h-[350px] flex items-center justify-center p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
                <Doughnut
                    data={barData}
                    options={{
                        ...barOptions,
                        indexAxis: 'x',
                        plugins: {
                            ...barOptions.plugins,
                            legend: {
                                display: true,
                                position: 'bottom',
                                labels: {
                                    boxWidth: 8,
                                    usePointStyle: true,
                                    font: { size: 9, weight: '800' },
                                    color: '#64748b'
                                }
                            }
                        },
                        scales: {
                            x: { display: false },
                            y: { display: false }
                        }
                    }}
                />
            </div>
        </div>
    );
};

export default ResultsChart;
