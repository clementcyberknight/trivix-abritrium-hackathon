"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Users,
  Filter,
  ChevronDown,
  Plus,
  Search,
  MoreVertical,
  Check,
  X,
  Download,
  BarChart,
  LineChart,
  AreaChart,
  SlidersHorizontal,
} from "lucide-react";
import { useActiveAccount, useConnect } from "thirdweb/react";
import {
  auth,
  app,
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy, // Import orderBy
  where, // Import where
  doc,
  getDoc,
} from "@/app/config/FirebaseConfig";
import { Bar, Line } from "react-chartjs-2"; // Example - using react-chartjs-2, remove area
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, // Import Filler for Area Charts
} from "chart.js";
import { inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { getIdToken } from "firebase/auth";
import { ToastContainer, toast } from "react-toastify";
import "chart.js/auto"; // Import this!
import { useRouter } from "next/navigation";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler // Register Filler for area chart
);

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
});

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatCurrency = (amount) => {
  const numericAmount =
    typeof amount === "number"
      ? amount
      : parseFloat(amount?.replace(/[^0-9.-]+/g, ""));

  if (isNaN(numericAmount)) {
    return "Invalid Amount";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount);
};

// --- Component ---

export default function ReportsAnalyticsPage() {
  const [reportType, setReportType] = useState("Payroll Summary"); // Example: "Payroll Summary", "Expense Breakdown", etc.
  const [dateRange, setDateRange] = useState("Last 30 Days"); // Example: "Last 7 Days", "Custom Range"
  const [filterCriteria, setFilterCriteria] = useState({}); // Object to hold various filter selections
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [chartType, setChartType] = useState("bar"); //bar, line, area, pie
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const account = useActiveAccount();
  const [firebaseUser, setFirebaseUser] = useState(null);

  //Move the arcana auth to the use effect to initialize it
  // --- Handlers ---

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          showErrorToast("Firebase Authentication Error");
        } finally {
        }
      } else {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleFilterChange = (filterName, value) => {
    setFilterCriteria((prev) => ({ ...prev, [filterName]: value }));
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
  };

  const handleReportTypeChange = (type) => {
    setReportType(type);
  };

  const handleChartTypeChange = (type) => {
    setChartType(type);
  };

  const showSuccessToast = (message) => {
    toast.success(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  const showErrorToast = (message) => {
    toast.error(message, {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    });
  };

  useEffect(() => {
    let unsubscribeTransactions;

    if (firebaseUser && account && account.address) {
      const db = getFirestore(app);
      const businessDocRef = doc(db, "businesses", account.address);

      getDoc(businessDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const transactionsRef = collection(
              db,
              "businesses",
              account.address,
              "payments"
            );
            const q = query(transactionsRef, orderBy("date", "desc")); // Order by date, newest first

            unsubscribeTransactions = onSnapshot(
              q,
              (snapshot) => {
                const transactionsData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setTransactions(transactionsData);
                setIsLoading(false);
              },
              (error) => {
                console.error("Error fetching transactions:", error);
                showErrorToast(`Error fetching transactions: ${error.message}`);
                setIsLoading(false);
              }
            );
          } else {
            showErrorToast("No such business document!");
            setTransactions([]); // Clear data if no document found
          }
        })
        .catch((error) => {
          console.error("Error getting business document:", error);
          showErrorToast(`Error fetching data: ${error.message}`);
        });
    } else {
      setTransactions([]);
      if (unsubscribeTransactions) unsubscribeTransactions();
    }

    return () => {
      if (unsubscribeTransactions) {
        unsubscribeTransactions();
      }
    };
  }, [firebaseUser, account]);

  // Memoize the processed data for charting *and* filtering
  const processedChartData = useMemo(() => {
    if (!transactions) {
      return { labels: [], datasets: [] }; // Early return is important
    }

    // 1. FILTERING (before aggregation)
    const lowerSearch = searchQuery.toLowerCase();
    const filteredTransactions = transactions.filter((transaction) =>
      transaction.contractorName.toLowerCase().includes(lowerSearch)
    );

    // 2. AGGREGATION
    const aggregatedData = {};
    filteredTransactions.forEach((transaction) => {
      const date = formatDate(transaction.date.toDate()); // Correctly to Date, *then* format

      if (!aggregatedData[date]) {
        aggregatedData[date] = {
          totalAmount: 0,
        };
      }
      aggregatedData[date].totalAmount += transaction.amount;
    });

    // 3. CHART DATA PREPARATION
    const labels = Object.keys(aggregatedData);
    const data = Object.values(aggregatedData).map((item) => item.totalAmount);

    return {
      labels: labels,
      datasets: [
        {
          label: "Total Payments",
          data: data,
          backgroundColor: "rgba(54, 162, 235, 0.5)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 1,
          fill: chartType === "area" ? true : false, // For area chart
        },
      ],
    };
  }, [transactions, chartType, searchQuery]);

  // --- Helper Components ---

  const DateRangeDropdown = () => {
    const ranges = [
      "Last 7 Days",
      "Last 30 Days",
      "Last 90 Days",
      "This Month",
      "This Year",
      "Custom Range",
    ];

    return (
      <div className="relative group">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <span>{dateRange}</span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
          {ranges.map((range) => (
            <button
              key={range}
              className="block px-4 py-2 text-left w-full hover:bg-gray-50 cursor-pointer"
              onClick={() => handleDateRangeChange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const ReportTypeDropdown = () => {
    const types = [
      "Payroll Summary",
      "Expense Breakdown",
      "Tax Compliance",
      "Benefits Analysis",
    ];

    return (
      <div className="relative group">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <span>{reportType}</span>
          <ChevronDown size={16} className="text-gray-500" />
        </button>
        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
          {types.map((type) => (
            <button
              key={type}
              className="block px-4 py-2 text-left w-full hover:bg-gray-50 cursor-pointer"
              onClick={() => handleReportTypeChange(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const FilterSection = () => {
    //  Example - customize based on the selected report type
    const filterOptions = [
      {
        name: "Department",
        options: ["All", "Engineering", "Marketing", "Sales"],
      },
      {
        name: "Employee Type",
        options: ["All", "Full-time", "Part-time", "Contractor"],
      },
    ];

    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <h4 className="text-lg font-semibold text-gray-700 mb-3">Filters</h4>
        <div className="space-y-3">
          {filterOptions.map((filter) => (
            <div key={filter.name}>
              <label className="block text-sm font-medium text-gray-500">
                {filter.name}
              </label>
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                onChange={(e) =>
                  handleFilterChange(filter.name, e.target.value)
                }
              >
                {filter.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ChartDisplay = () => {
    const chartOptions = {
      scales: {
        y: { beginAtZero: true },
      },
    };
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex gap-4 mb-4">
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              chartType === "bar"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => handleChartTypeChange("bar")}
          >
            <BarChart size={16} className="inline-block mr-1" /> Bar Chart
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              chartType === "line"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => handleChartTypeChange("line")}
          >
            <LineChart size={16} className="inline-block mr-1" /> Line Chart
          </button>
          <button
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              chartType === "area"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            onClick={() => handleChartTypeChange("area")}
          >
            <AreaChart size={16} className="inline-block mr-1" /> Area Chart
          </button>
        </div>

        {/* Render the selected chart type */}
        {chartType === "bar" && (
          <div className="h-80">
            <Bar data={processedChartData} options={chartOptions} />
          </div>
        )}
        {chartType === "line" && (
          <div className="h-80">
            <Line data={processedChartData} options={chartOptions} />
          </div>
        )}
        {chartType === "area" && (
          <div className="h-80">
            <Line
              data={processedChartData}
              options={{ ...chartOptions, elements: { line: { fill: true } } }}
            />
          </div>
        )}
      </div>
    );
  };

  const TableDisplay = () => {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contractor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(transaction.date.toDate())}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {transaction.contractorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatCurrency(transaction.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // --- Main Return ---

  return (
    <div className="container mx-auto p-6">
      <ToastContainer />
      <h1 className="text-3xl font-semibold text-gray-800 mb-4">
        Reports & Analytics
      </h1>
      <p className="text-gray-500 mb-6">
        Gain insights into your payroll data with detailed reports and
        analytics.
      </p>

      {/* Top Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
        <div className="flex items-center gap-3">
          <ReportTypeDropdown />
          <DateRangeDropdown />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Section */}
        <div className="lg:col-span-1">
          <FilterSection />
        </div>

        {/* Chart and Table Display */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {isLoading ? ( // Conditional rendering based on isLoading
            <div className="text-center p-4">Loading...</div>
          ) : (
            <>
              <ChartDisplay />
              <TableDisplay />
            </>
          )}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button className="bg-blue-600 text-white rounded-lg py-2 px-4 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2">
          <Download size={16} /> Export Report
        </button>
      </div>
    </div>
  );
}
