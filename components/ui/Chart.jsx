"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default function ChartComponent({ type = "line", series, categories, height = 300 }) {
  const { theme } = useTheme();

  const options = {
    chart: { toolbar: { show: false } },
    theme: { mode: theme === "dark" ? "dark" : "light" },
    xaxis: { categories },
    stroke: { curve: "smooth" },
    legend: { position: "bottom" },
    grid: { borderColor: theme === "dark" ? "#444" : "#eee" },
  };

  return <Chart options={options} series={series} type={type} height={height} />;
}
