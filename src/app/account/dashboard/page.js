"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  Filter,
  ChevronDown,
  Search,
  MoreVertical,
  Check,
  X,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
} from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import {
  auth,
  app,
  getFirestore,
  collection,
  doc,
  onSnapshot,
  getDoc,
} from "@/app/config/FirebaseConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useRouter } from "next/navigation";

const formatCurrency = (amount) => {
  const numericAmount =
    typeof amount === "number"
      ? amount
      : parseFloat(String(amount).replace(/[^0-9.-]+/g, "")); // Handle undefined and non-string

  if (isNaN(numericAmount)) {
    return "Invalid Amount";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount);
};

// Accepts a Firestore Timestamp and returns formatted date string
const formatDate = (timestamp) => {
  if (!timestamp) return "N/A"; // Most robust handling of missing date
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(timestamp.seconds * 1000));
  } catch (error) {
    console.error("Error formatting date:", error); // Log the error for debugging
    return "Invalid Date";
  }
};

// --- Main Component ---

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [timeRange, setTimeRange] = useState("All time"); // Time range filter
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]); // Holds fetched transactions
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [stats, setStats] = useState({
    workersInPayroll: 0,
    workersPercentageChange: 0, //  calculate this based on previous data
    nextPaymentDate: null, // Will be a Date object or null
    totalPaymentsThisMonth: 0,
    paymentsPercentageChange: 0, // Calculate based on previous data
  });

  const [nextPaymentDateDisplay, setNextPaymentDateDisplay] =
    useState("Loading..."); // Separate display state.
  const [daysFromNow, setDaysFromNow] = useState("");

  const account = useActiveAccount();
  const router = useRouter();
  const [firebaseUser, setFirebaseUser] = useState(null);

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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (!user) {
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    let unsubscribeTransactions;

    if (firebaseUser && account && account.address) {
      const db = getFirestore(app);
      const businessDocRef = doc(db, "users", firebaseUser.uid);

      getDoc(businessDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const businessData = docSnap.data();
            const registeredAddress = businessData.wallet_address.toLowerCase();
            const currentAddress = account?.address.toLowerCase();
            if (registeredAddress !== currentAddress) {
              showErrorToast(
                "Connected wallet does not match registered business account."
              );
              router.push("/auth/login");
              return;
            }

            const transactionsRef = collection(
              db,
              "businesses",
              account.address,
              "payments"
            );
            unsubscribeTransactions = onSnapshot(
              transactionsRef,
              (snapshot) => {
                const transactionsData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setTransactions(transactionsData);

                // Calculate total payments this month (Efficiently!)
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();
                // Use reduce for efficient calculation, handles missing amount
                const totalThisMonth = transactionsData.reduce(
                  (acc, transaction) => {
                    if (
                      transaction.date &&
                      transaction.date.seconds &&
                      transaction.status === "Completed"
                    ) {
                      const transactionDate = new Date(
                        transaction.date.seconds * 1000
                      );
                      if (
                        transactionDate.getMonth() === currentMonth &&
                        transactionDate.getFullYear() === currentYear
                      ) {
                        return acc + (transaction.amount || 0); // Handles missing amount
                      }
                    }
                    return acc;
                  },
                  0
                );

                setStats((prevStats) => ({
                  ...prevStats,
                  totalPaymentsThisMonth: totalThisMonth,
                }));

                setIsLoading(false);
              },
              (error) => {
                console.error("Error fetching transactions:", error);
                showErrorToast("Error fetching transactions");
                setIsLoading(false);
              }
            );
            // Fetch business data for stats (workers, next payment date)
            const businessRef = doc(db, "businesses", account.address);
            getDoc(businessRef)
              .then((businessSnap) => {
                //get the docs
                if (businessSnap.exists()) {
                  const data = businessSnap.data();

                  // Next Payment Date: Get and format immediately
                  let nextPaymentDate = null;
                  if (data.settings?.nextPaymentDate?.seconds) {
                    // Check for .seconds
                    nextPaymentDate = new Date(
                      data.settings.nextPaymentDate.seconds * 1000
                    );
                    setNextPaymentDateDisplay(
                      formatDate(data.settings.nextPaymentDate)
                    ); // Directly use formatDate

                    const today = new Date();
                    const diffTime =
                      nextPaymentDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(
                      diffTime / (1000 * 60 * 60 * 24)
                    );
                    setDaysFromNow(
                      diffDays > 0 ? `${diffDays} days from now` : "Today"
                    );
                  } else {
                    setNextPaymentDateDisplay("No scheduled payroll");
                    setDaysFromNow("");
                  }

                  setStats((prevStats) => ({
                    ...prevStats,
                    workersInPayroll: data.totalPayroll || 0,
                    nextPaymentDate: nextPaymentDate, // Store the Date object
                    //totalPaymentsThisMonth: 0, // Now calculated above
                    //paymentsPercentageChange: calculatePaymentsPercentageChange(data.payments), // Implement this
                  }));
                }
              })
              .catch((error) => {
                console.error("Error fetching business data for stats", error);
                showErrorToast("Error fetching business stat");
              });
          } else {
            showErrorToast("Business Data Not Found");
            return;
          }
        })
        .catch((error) => {
          console.error("Error fetching business data:", error);
          showErrorToast(`Error fetching business data: ${error.message}`);
          router.push("/auth/login");
        });
    } else {
      setTransactions([]);
      setIsLoading(false);
      setNextPaymentDateDisplay("Loading..."); // Or "N/A", as appropriate
      setDaysFromNow("");
    }

    return () => {
      if (unsubscribeTransactions) unsubscribeTransactions();
    };
  }, [firebaseUser, account, router]);

  useEffect(() => {
    // Apply time range filter
    let filtered = [...transactions];
    const today = new Date();

    if (timeRange !== "All time") {
      // Simplify the time range logic
      const rangeDays = {
        "Last 7 days": 7,
        "Last 30 days": 30,
        "Last 90 days": 90,
      }[timeRange];

      filtered = transactions.filter((transaction) => {
        const transactionDate = transaction.date
          ? new Date(transaction.date.seconds * 1000)
          : null; //handle correctly
        if (!transactionDate) return false;
        const diffTime = Math.abs(today - transactionDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= rangeDays;
      });
    }

    // Apply search query filter
    const lowerSearch = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (transaction) =>
        (transaction.workerName &&
          transaction.workerName.toLowerCase().includes(lowerSearch)) ||
        (transaction.transactionId &&
          transaction.transactionId.toLowerCase().includes(lowerSearch)) ||
        (transaction.workerId &&
          transaction.workerId.toLowerCase().includes(lowerSearch)) ||
        (transaction.type &&
          transaction.type.toLowerCase().includes(lowerSearch)) ||
        (transaction.amount &&
          formatCurrency(transaction.amount)
            .toLowerCase()
            .includes(lowerSearch)) ||
        (transaction.date &&
          formatDate(transaction.date).toLowerCase().includes(lowerSearch)) // Check if transaction.date exists
    );

    setFilteredTransactions(filtered);
  }, [searchQuery, timeRange, transactions]);

  // --- Handlers ---

  const handleShowMore = (transaction) => {
    setSelectedTransaction(transaction);
  };

  const handleCloseModal = () => {
    setSelectedTransaction(null);
  };

  const StatCard = ({
    title,
    value,
    percentageChange,
    icon: Icon,
    isPositiveChange,
    dateString, // Use a string for the displayed date
  }) => {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">{title}</span>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {typeof value === "number" ? formatCurrency(value) : value}
          </div>
          {percentageChange !== undefined && (
            <div
              className={`text-sm font-medium ${
                isPositiveChange ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositiveChange ? (
                <TrendingUp size={16} className="inline-block mr-1" />
              ) : (
                <TrendingDown size={16} className="inline-block mr-1" />
              )}
              {percentageChange}%
            </div>
          )}
          {dateString && (
            <div className="text-sm text-blue-600 mt-1">{dateString}</div>
          )}
        </div>
      </div>
    );
  };

  const TimeRangeDropdown = () => (
    <select
      className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
      value={timeRange}
      onChange={(e) => setTimeRange(e.target.value)}
    >
      <option>All time</option>
      <option>Last 7 days</option>
      <option>Last 30 days</option>
      <option>Last 90 days</option>
    </select>
  );

  // Main Return
  return (
    <div className="min-h-screen bg-white py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              Welcome, Here's a snapshot of your payroll activity.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search transactions..."
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 text-gray-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <TimeRangeDropdown />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Workers in Payroll"
            value={stats.workersInPayroll}
            percentageChange={stats.workersPercentageChange}
            icon={Users}
          />
          <StatCard
            title="Next Payment Date"
            value={nextPaymentDateDisplay}
            dateString={daysFromNow}
            icon={Calendar}
          />
          <StatCard
            title="Total Payments (This Month)"
            value={formatCurrency(stats.totalPaymentsThisMonth)}
            percentageChange={stats.paymentsPercentageChange}
            icon={DollarSign}
            isPositiveChange={false}
          />
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center p-8 text-gray-500">
                Loading transactions...
              </div>
            ) : filteredTransactions.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Transaction ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {" "}
                      Worker Name/ID
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Amount (USDC)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Type
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {" "}
                      Status
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Show more</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.date
                          ? formatDate(transaction.date)
                          : "No Date"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.transactionId || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.workerName || "N/A"}{" "}
                        {transaction.workerId
                          ? `(${transaction.workerId})`
                          : ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.amount
                          ? formatCurrency(transaction.amount)
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.status === "Completed" ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Completed
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleShowMore(transaction)}
                          className="text-blue-600 hover:text-blue-900 focus:outline-none transition-colors duration-200"
                        >
                          Show more
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center p-8 text-gray-500">
                No transactions found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Transaction Details
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              <p>
                <span className="font-medium text-gray-700">Date:</span>{" "}
                {selectedTransaction.date
                  ? formatDate(selectedTransaction.date)
                  : "No Date"}
              </p>
              <p>
                <span className="font-medium text-gray-700">
                  Transaction ID:
                </span>{" "}
                {selectedTransaction.transactionId || "N/A"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Worker ID:</span>{" "}
                {selectedTransaction.workerId || "N/A"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Worker Name:</span>{" "}
                {selectedTransaction.workerName || "N/A"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Amount:</span>{" "}
                {selectedTransaction.amount
                  ? formatCurrency(selectedTransaction.amount)
                  : "N/A"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Type:</span>{" "}
                {selectedTransaction.type || "N/A"}
              </p>
              <p>
                <span className="font-medium text-gray-700">Status:</span>{" "}
                {selectedTransaction.status || "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
