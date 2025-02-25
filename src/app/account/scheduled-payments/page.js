"use client";

import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Edit,
  Users,
  Filter,
  ChevronDown,
  Plus,
  Search,
  MoreVertical,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { useActiveAccount } from "thirdweb/react";
import {
  auth,
  app,
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  updateDoc,
  getDoc,
} from "@/app/config/FirebaseConfig";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

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

const PAYMENT_INTERVALS = ["Weekly", "Monthly"];
const WEEKLY_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const OVERVIEW_FILTERS = ["All", "Regular Payroll", "Overtime", "Bonus"];

const Skeleton = () => (
  <div className="animate-pulse bg-gray-200 h-10 w-full rounded-lg"></div>
);

// --- Main Component ---

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const account = useActiveAccount();
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isLoadingAccount, setIsLoadingAccount] = useState(true);

  // --- State for Overview Tab ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState(OVERVIEW_FILTERS[0]);
  const [viewMode, setViewMode] = useState("list");
  const [filteredPayments, setFilteredPayments] = useState([]);
  const paymentId = Date.now().toString();

  // --- State for Edit Payroll Schedule Tab ---
  const [paymentInterval, setPaymentInterval] = useState("Monthly");
  const [paymentDay, setPaymentDay] = useState("Last working day");
  const [specificDate, setSpecificDate] = useState(1);
  const [selectedWeeklyDay, setSelectedWeeklyDay] = useState(WEEKLY_DAYS[0]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nextPaymentDate, setNextPaymentDate] = useState(null); // State for next payment date

  // --- State for Overtime & Bonus Tab ---
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [overtimeHours, setOvertimeHours] = useState("");
  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeNotes, setOvertimeNotes] = useState("");
  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const [bonusDate, setBonusDate] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [paymentHistory, setPaymentHistory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState([]);

  // --- State for Business Metrics (Overview) ---
  const [totalPayroll, setTotalPayroll] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [ytdPayroll, setYtdPayroll] = useState(0);

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
      if (user) {
        try {
        } catch (error) {
          console.error("Firebase Auth Error:", error);
          showErrorToast("Firebase Authentication Error");
        } finally {
          setIsLoadingAccount(false);
        }
      } else {
        setEmployees([]);
        setPaymentHistory([]);
        setIsLoadingAccount(false);
        router.push("/auth/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    let unsubscribeEmployees;
    let unsubscribePayments;

    if (firebaseUser && account && account.address) {
      const fetchBusinessData = async () => {
        const db = getFirestore(app);
        const businessDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const docSnap = await getDoc(businessDocRef);
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

            const employeesRef = collection(
              db,
              "businesses",
              account.address,
              "workers"
            );
            unsubscribeEmployees = onSnapshot(
              employeesRef,
              (snapshot) => {
                const employeeData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setEmployees(employeeData);
                // Calculate total payroll and employee count from employee data
                const newTotalPayroll = employeeData.reduce(
                  (acc, emp) => acc + (emp.worker_salary || 0),
                  0
                );
                const newEmployeeCount = employeeData.length;
                setTotalPayroll(newTotalPayroll);
                setEmployeeCount(newEmployeeCount);
              },
              (error) => {
                console.error("Error fetching employees:", error);
                showErrorToast(`Error fetching employees: ${error.message}`);
              }
            );

            const paymentsRef = collection(
              db,
              "businesses",
              account.address,
              "payments"
            );
            unsubscribePayments = onSnapshot(
              paymentsRef,
              (snapshot) => {
                const paymentsData = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                }));
                setPaymentHistory(paymentsData);

                // Calculate YTD payroll
                const currentYear = new Date().getFullYear();
                const newYtdPayroll = paymentsData
                  .filter(
                    (payment) =>
                      new Date(payment.date.seconds * 1000).getFullYear() ===
                        currentYear && payment.status === "Completed"
                  ) // Corrected date handling and status check
                  .reduce((acc, payment) => acc + payment.amount, 0); // Ensure amount exists
                setYtdPayroll(newYtdPayroll);
              },
              (error) => {
                console.error("Error fetching payments:", error);
                showErrorToast(`Error fetching payments: ${error.message}`);
              }
            );

            setPaymentInterval(
              businessData.settings?.paymentInterval || "Monthly"
            );
            setPaymentDay(
              businessData.settings?.paymentDay || "Last working day"
            );
            setSpecificDate(businessData.settings?.specificDate || 1);
            setSelectedWeeklyDay(
              businessData.settings?.selectedWeeklyDay || WEEKLY_DAYS[0]
            );
            setStartDate(businessData.settings?.startDate || "");

            // Fetch and set next payment date
            setNextPaymentDate(
              businessData.settings?.nextPaymentDate
                ? new Date(businessData.settings.nextPaymentDate.seconds * 1000)
                : null
            );

            // Fetch business metrics directly (if needed for initial display before onSnapshot fires)
            const businessMetricsRef = doc(db, "businesses", account.address);
            const businessMetricsSnap = await getDoc(businessMetricsRef);
            if (businessMetricsSnap.exists()) {
              const metrics = businessMetricsSnap.data();
              // Only set if not already set by onSnapshot (avoid race condition)
              setTotalPayroll((prev) =>
                prev === 0 ? metrics.totalPayroll || 0 : prev
              );
              setEmployeeCount((prev) =>
                prev === 0 ? metrics.employeeCount || 0 : prev
              );
            }
          } else {
            console.log("No such document!");
            showErrorToast("Business data not found.");
            router.push("/auth/login");
            return;
          }
        } catch (error) {
          console.error("Error fetching business data:", error);
          showErrorToast(`Error fetching business data: ${error.message}`);
          router.push("/auth/login");
        }
      };

      fetchBusinessData();
    } else {
      setEmployees([]);
      setPaymentHistory([]);
      setTotalPayroll(0);
      setEmployeeCount(0);
      setYtdPayroll(0);
    }

    return () => {
      if (unsubscribeEmployees) unsubscribeEmployees();
      if (unsubscribePayments) unsubscribePayments();
    };
  }, [firebaseUser, account, router]);

  useEffect(() => {
    const filtered = paymentHistory.filter((payment) => {
      const dateMatch = formatDate(payment.date)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const amountMatch = formatCurrency(payment.amount).includes(
        searchQuery.toLowerCase()
      );
      const typeMatch = payment.type
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const filterMatch =
        selectedFilter === "All" || payment.type === selectedFilter;
      return (dateMatch || amountMatch || typeMatch) && filterMatch;
    });
    setFilteredPayments(filtered);
  }, [searchQuery, selectedFilter, paymentHistory]);

  useEffect(() => {
    const lowerSearch = employeeSearch.toLowerCase();
    const results = employees.filter(
      (employee) =>
        employee.worker_name?.toLowerCase().includes(lowerSearch) ||
        employee.role?.toLowerCase().includes(lowerSearch)
    );
    setFilteredEmployees(results);
  }, [employeeSearch, employees]);

  const calculateNextPaymentDate = (interval, selectedDay, specificDate) => {
    const today = new Date();
    let nextPaymentDate = new Date();

    switch (interval) {
      case "Weekly":
        const weekdays = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const currentDay = today.getDay();
        const targetDay = weekdays.indexOf(selectedDay);
        let daysUntilTarget = targetDay - currentDay;

        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7;
        }
        nextPaymentDate.setDate(today.getDate() + daysUntilTarget);
        break;

      case "Monthly":
        nextPaymentDate.setMonth(today.getMonth() + 1);

        if (selectedDay === "Last working day") {
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1, 0);
          while (
            nextPaymentDate.getDay() === 0 ||
            nextPaymentDate.getDay() === 6
          ) {
            nextPaymentDate.setDate(nextPaymentDate.getDate() - 1);
          }
        } else {
          nextPaymentDate.setDate(specificDate);
          while (
            nextPaymentDate.getDay() === 0 ||
            nextPaymentDate.getDay() === 6
          ) {
            nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
          }
        }
        break;
    }

    while (
      nextPaymentDate.getDay() === 0 ||
      nextPaymentDate.getDay() === 6 ||
      nextPaymentDate < today
    ) {
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 1);
    }

    return nextPaymentDate;
  };

  const handlePayrollScheduleSave = async () => {
    if (!firebaseUser || !account?.address) {
      showErrorToast("Authentication required");
      return;
    }

    setIsUpdating(true);

    try {
      const db = getFirestore(app);
      const businessRef = doc(db, "businesses", account.address);
      const scheduleDocRef = doc(businessRef, "payroll_schedules", "current");

      const calculatedNextPaymentDate = calculateNextPaymentDate(
        paymentInterval,
        selectedWeeklyDay,
        specificDate
      ); //Calculate

      const scheduleData = {
        paymentInterval,
        paymentDay:
          paymentInterval === "Monthly" ? paymentDay : selectedWeeklyDay,
        specificDate: paymentInterval === "Monthly" ? specificDate : null,
        startDate: startDate || serverTimestamp(),
        nextPaymentDate: calculatedNextPaymentDate, // Save calculated date
        status: "active",
        lastUpdated: serverTimestamp(),
        updatedBy: firebaseUser.uid,
      };

      await setDoc(scheduleDocRef, scheduleData, { merge: true });

      await updateDoc(businessRef, {
        "settings.paymentInterval": paymentInterval,
        "settings.paymentDay": paymentDay,
        "settings.specificDate": specificDate,
        "settings.selectedWeeklyDay": selectedWeeklyDay,
        "settings.nextPaymentDate": calculatedNextPaymentDate, // AND HERE
        "settings.lastUpdated": serverTimestamp(),
      });

      // Update local state
      setNextPaymentDate(calculatedNextPaymentDate);

      showSuccessToast("Payroll schedule updated successfully!");
      setActiveTab("OVERVIEW");
    } catch (error) {
      console.error("Error updating payroll schedule:", error);
      showErrorToast(`Failed to update payroll schedule: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    const fetchCurrentSchedule = async () => {
      if (!firebaseUser || !account?.address) return;

      try {
        const db = getFirestore(app);
        const scheduleDocRef = doc(
          db,
          "businesses",
          account.address,
          "payroll_schedules",
          "current"
        );
        const scheduleDoc = await getDoc(scheduleDocRef);

        if (scheduleDoc.exists()) {
          const data = scheduleDoc.data();
          setPaymentInterval(data.paymentInterval || "Monthly");
          setPaymentDay(data.paymentDay || "Last working day");
          setSpecificDate(data.specificDate || 1);
          setSelectedWeeklyDay(data.selectedWeeklyDay || WEEKLY_DAYS[0]);

          // Correctly handle the startDate, checking for Timestamp
          if (data.startDate && data.startDate.seconds) {
            setStartDate(
              new Date(data.startDate.seconds * 1000)
                .toISOString()
                .split("T")[0]
            );
          } else {
            setStartDate(""); // Or some default value if startDate is not a timestamp
          }

          // Set next payment date from fetched data
          if (data.nextPaymentDate) {
            // Check if nextPaymentDate is a Firestore Timestamp
            if (
              data.nextPaymentDate.seconds &&
              data.nextPaymentDate.nanoseconds
            ) {
              setNextPaymentDate(new Date(data.nextPaymentDate.seconds * 1000));
            } else if (typeof data.nextPaymentDate === "string") {
              // Handle string date (e.g., ISO string)
              setNextPaymentDate(new Date(data.nextPaymentDate));
            } else {
              console.warn(
                "Unexpected nextPaymentDate format:",
                data.nextPaymentDate
              );
              setNextPaymentDate(null); // Or some default/error date
            }
          }
        }
      } catch (error) {
        console.error("Error fetching payroll schedule:", error);
        showErrorToast(`Error fetching schedule: ${error.message}`);
      }
    };

    fetchCurrentSchedule();
  }, [firebaseUser, account?.address]);

  const getOrdinalSuffix = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const handleBonuspayment = async (type) => {
    if (!firebaseUser || !account || !account.address) {
      showErrorToast("Failed to Authenticate User.");
      return;
    }
    if (!selectedEmployee) {
      showErrorToast("Please select an employee.");
      return;
    }
    if (type === "bonus" && (!bonusAmount || !bonusDate || !bonusReason)) {
      showErrorToast("Please fill in all Bonus details.");
      return;
    }

    const db = getFirestore(app);
    try {
      const newPayment = {
        date: serverTimestamp(),
        paymentId: paymentId,
        paymentHash: "",
        employeeId: selectedEmployee,
        status: "Pending",
        type: type,
        amount: parseFloat(bonusAmount),
        bonusAmount: parseFloat(bonusAmount),
        bonusReason: bonusReason,
      };
      const paymentsRef = collection(
        db,
        "businesses",
        account.address,
        "payments"
      );
      const bonuspaymentsRef = collection(
        db,
        "businesses",
        account.address,
        "BonusPayments"
      );
      await addDoc(paymentsRef, newPayment);
      await addDoc(bonuspaymentsRef, newPayment);
      showSuccessToast(`Bonus Payment in Progress.`);
    } catch (error) {
      console.error(`Bonus Payment Failed:`, error);
      showErrorToast(`Bonus Payment Failed: ${error.message}`);
    }
    setSelectedEmployee(null);
    setBonusAmount("");
    setBonusReason("");
    setBonusDate("");
    setHourlyRate("");
  };

  const handleOvertimepayment = async (type) => {
    if (!firebaseUser || !account || !account.address) {
      showErrorToast("Failed to Authenticate User.");
      return;
    }
    if (!selectedEmployee) {
      showErrorToast("Please select an employee.");
      return;
    }
    if (
      type === "overtime" &&
      (!overtimeHours || !overtimeDate || !hourlyRate)
    ) {
      showErrorToast("Please fill in all Overtime details.");
      return;
    }

    const db = getFirestore(app);
    try {
      const newPayment = {
        date: serverTimestamp(),
        amount: Overtime_amount,
        paymentId: paymentId,
        employeeId: selectedEmployee,
        status: "Pending",
        type: type,
        hourlyRate: parseFloat(hourlyRate),
        overtimeHours: parseFloat(overtimeHours),
        overtimeNotes: overtimeNotes,
      };
      if (type === "overtime") {
        newPayment.amount = parseFloat(hourlyRate) * parseFloat(overtimeHours);
      }
      const paymentsRef = collection(
        db,
        "businesses",
        account.address,
        "payments"
      );
      const overtimepaymentsRef = collection(
        db,
        "businesses",
        account.address,
        "BonusPayments"
      );
      await addDoc(paymentsRef, newPayment);
      await addDoc(overtimepaymentsRef, newPayment);
      showSuccessToast(`Overtime Payment in Progress.`);
    } catch (error) {
      console.error(`Overtime Payment Failed:`, error);
      showErrorToast(`Overtime Payment Failed: ${error.message}`);
    }
    setSelectedEmployee(null);
    setOvertimeHours("");
    setOvertimeDate("");
    setOvertimeNotes("");
    setHourlyRate("");
  };

  const FilterDropdown = ({ options, selected, onSelect }) => (
    <div className="relative group">
      <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
        <Filter size={16} className="text-gray-500" />
        <span>{selected}</span>
        <ChevronDown size={16} className="text-gray-500" />
      </div>
      <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10 hidden group-hover:block">
        {options.map((option) => (
          <div
            key={option}
            className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect(option)}
          >
            {option}
          </div>
        ))}
      </div>
    </div>
  );

  const RadioOption = ({ value, label, description, isSelected, onChange }) => (
    <div
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-blue-200 hover:bg-blue-50"
      }`}
      onClick={onChange}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center ${
            isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
          }`}
        >
          {isSelected && <Check size={12} className="text-white" />}
        </div>
        <div>
          <p className="font-medium text-gray-900">{label}</p>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );

  const EmployeeListItem = ({ employee, isSelected, onSelect }) => (
    <div
      key={employee.id}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-gray-50 border border-transparent"
      }`}
      onClick={() => onSelect(employee.id)}
    >
      <div className="flex items-start space-x-3">
        <div
          className={`h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600`}
        >
          {employee.worker_name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div>
          <p className="font-medium text-gray-900">{employee.worker_name}</p>
          <p className="text-sm text-gray-500">
            {employee.role} • {employee.status}
          </p>
          {hourlyRate && (
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(hourlyRate)}/hr
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formatCurrency(employee.worker_salary)}/mo
          </p>
        </div>
      </div>
    </div>
  );

  const Overtime_amount = parseFloat(hourlyRate) * parseFloat(overtimeHours);

  const resetOvertimeBonusForm = () => {
    setSelectedEmployee(null);
    setOvertimeHours("");
    setOvertimeDate("");
    setOvertimeNotes("");
    setBonusAmount("");
    setBonusReason("");
    setBonusDate("");
    setHourlyRate("");
  };

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <ToastContainer />
      {/* Header */}
      {isLoadingAccount ? (
        <Skeleton />
      ) : (
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Payroll Management</h1>
            <p className="text-sm text-gray-500">
              Manage employee compensation, benefits, and schedules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-50">
              <FileText size={16} />
              Export Report
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-8">
          {["OVERVIEW", "EDIT PAYROLL SCHEDULE", "OVERTIME & BONUS"].map(
            (tab) => (
              <button
                key={tab}
                className={`pb-2 transition-colors duration-200 ${
                  activeTab === tab
                    ? "text-blue-600 border-b-2 border-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                onClick={() => setActiveTab(tab)}
                disabled={isLoadingAccount}
              >
                {tab}
              </button>
            )
          )}
        </div>
      </div>

      {/* --- OVERVIEW TAB CONTENT --- */}
      {activeTab === "OVERVIEW" && (
        <div className="space-y-6">
          {/* Overview Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Next Payroll Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">
                  Next Payroll
                </h3>
                <span className="p-2 bg-blue-100 rounded-full">
                  <Calendar size={16} className="text-blue-600" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold">
                  {nextPaymentDate ? formatDate(nextPaymentDate) : "Loading..."}
                </p>
                <p className="text-sm text-gray-500">
                  {nextPaymentDate
                    ? (() => {
                        const today = new Date();
                        const diffTime =
                          nextPaymentDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(
                          diffTime / (1000 * 60 * 60 * 24)
                        );
                        return diffDays > 0
                          ? `${diffDays} days from now`
                          : "Today";
                      })()
                    : "No scheduled payroll"}
                </p>
              </div>
            </div>

            {/* Total Amount Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">
                  Total Payroll
                </h3>
                <span className="p-2 bg-green-100 rounded-full">
                  <DollarSign size={16} className="text-green-600" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold">
                  {formatCurrency(totalPayroll)}
                </p>
                <p className="text-sm text-gray-500">
                  For {employeeCount} employees
                </p>
              </div>
            </div>

            {/* Payment Schedule */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">
                  Payment Schedule
                </h3>
                <span className="p-2 bg-purple-100 rounded-full">
                  <Clock size={16} className="text-purple-600" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold">{paymentInterval}</p>
                <p className="text-sm text-gray-500">
                  {paymentInterval === "Monthly" &&
                    (paymentDay === "Last working day"
                      ? "Last working day"
                      : `On the ${specificDate}${getOrdinalSuffix(
                          specificDate
                        )}`)}
                  {paymentInterval === "Weekly" && `Every ${selectedWeeklyDay}`}
                  {/* Removed Bi-weekly display */}
                </p>
              </div>
            </div>

            {/* YTD Payroll Card */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-500 text-sm font-medium">
                  YTD Payroll
                </h3>
                <span className="p-2 bg-amber-100 rounded-full">
                  <DollarSign size={16} className="text-amber-600" />
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-semibold">Unavailable</p>
              </div>
            </div>
          </div>

          {/* Controls (Filter, View Mode, Search) */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <FilterDropdown
                options={OVERVIEW_FILTERS}
                selected={selectedFilter}
                onSelect={setSelectedFilter}
              />

              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className={`px-3 py-2 ${
                    viewMode === "list"
                      ? "bg-blue-50 text-blue-600"
                      : "bg-white text-gray-500"
                  }`}
                  onClick={() => setViewMode("list")}
                >
                  <FileText size={16} />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search payment history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Payment History Table */}
          <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
            {filteredPayments.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {payment.date && payment.date.seconds
                            ? formatDate(new Date(payment.date.seconds * 1000))
                            : "Invalid Date"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            payment.status === "Completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-indigo-600 hover:text-indigo-900 mr-3">
                          View
                        </button>
                        <button className="p-1 rounded-full hover:bg-gray-100">
                          <MoreVertical size={16} className="text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center p-8 text-gray-500">
                No payments history found
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-lg mt-4">
            <div className="flex flex-1 justify-between sm:hidden">
              <button className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Previous
              </button>
              <button className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">
                    {Math.min(5, filteredPayments.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{filteredPayments.length}</span>{" "}
                  results
                </p>
              </div>
              <div>
                <nav
                  className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                  aria-label="Pagination"
                >
                  <button className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                    <span className="sr-only">Previous</span>
                    <ChevronRight size={16} className="rotate-180" />
                  </button>
                  <button className="relative inline-flex items-center bg-blue-600 px-4 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
                    1
                  </button>
                  <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                    2
                  </button>
                  <button className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                    3
                  </button>
                  <button className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0">
                    <span className="sr-only">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PAYROLL SCHEDULE TAB CONTENT --- */}
      {activeTab === "EDIT PAYROLL SCHEDULE" && (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-100">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-6">
              Payment Schedule Settings
            </h2>

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Changes to the payment schedule will be applied starting
                    from the next payment cycle. Current scheduled payments will
                    not be affected.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Payment Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Interval
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  How frequently do you want to process payroll?
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PAYMENT_INTERVALS.map((interval) => (
                    <RadioOption
                      key={interval}
                      value={interval}
                      label={interval}
                      description={
                        interval === "Weekly"
                          ? "Every week on a specified day"
                          : interval === "Monthly" //Simplified condition
                          ? "Once a month on a specified date"
                          : "" // No description needed for removed options
                      }
                      isSelected={paymentInterval === interval}
                      onChange={() => setPaymentInterval(interval)}
                    />
                  ))}
                </div>
              </div>

              {/* Payment Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Day
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Which day should payments be processed?
                </p>

                {paymentInterval === "Monthly" && (
                  <div className="space-y-4">
                    <RadioOption
                      value="Last working day"
                      label="Last working day of the month"
                      isSelected={paymentDay === "Last working day"}
                      onChange={() => setPaymentDay("Last working day")}
                    />

                    <div className="flex items-center space-x-3">
                      <input
                        id="specific-date"
                        type="radio"
                        checked={paymentDay === "Specific date"}
                        onChange={() => setPaymentDay("Specific date")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="specific-date"
                        className="text-sm text-gray-700"
                      >
                        Specific date of month
                      </label>

                      {paymentDay === "Specific date" && (
                        <select
                          className="ml-2 rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                          value={specificDate}
                          onChange={(e) =>
                            setSpecificDate(parseInt(e.target.value))
                          } // Parse to integer
                        >
                          {[...Array(28)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {paymentInterval === "Weekly" && (
                  <select
                    className="rounded-md border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    value={selectedWeeklyDay}
                    onChange={(e) => setSelectedWeeklyDay(e.target.value)}
                  >
                    {WEEKLY_DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                )}

                {/* Removed Bi-weekly section */}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t">
                <button
                  className={`px-4 py-2 ${
                    isUpdating
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } rounded-md text-sm font-medium text-white`}
                  onClick={handlePayrollScheduleSave}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- OVERTIME & BONUS TAB CONTENT --- */}
      {activeTab === "OVERTIME & BONUS" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Employee selection */}
          <div className="col-span-1 bg-white rounded-lg p-6 shadow-sm border border-gray-100 h-fit">
            <h2 className="text-lg font-semibold mb-4">Select Employee</h2>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search employees..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <EmployeeListItem
                    key={employee.id}
                    employee={employee}
                    isSelected={selectedEmployee === employee.id}
                    onSelect={setSelectedEmployee}
                  />
                ))
              ) : (
                <div className="text-sm text-gray-500">No employees found.</div>
              )}
            </div>
          </div>

          {/* Right column - Overtime & Bonus form */}
          <div className="col-span-2 space-y-6">
            {/* Overtime section */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Overtime Payment</h2>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock size={14} /> Total Overtime Payment = $
                  {Overtime_amount}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Overtime Hours Worked
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <input
                        type="number"
                        className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={overtimeHours}
                        placeholder="0.00"
                        onChange={(e) => setOvertimeHours(e.target.value)}
                        disabled={!selectedEmployee}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">hours</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={overtimeDate}
                      onChange={(e) => setOvertimeDate(e.target.value)}
                      disabled={!selectedEmployee}
                    />
                  </div>
                </div>

                {/* Hourly rate of the worker input */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      disabled={!selectedEmployee}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Add any additional information about this overtime"
                    value={overtimeNotes}
                    onChange={(e) => setOvertimeNotes(e.target.value)}
                    disabled={!selectedEmployee}
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                    onClick={() => handleOvertimepayment("overtime")}
                    disabled={!selectedEmployee}
                  >
                    Make Payment
                  </button>
                </div>
              </div>
            </div>

            {/* Bonus section */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4">Bonus Payment</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="0.00"
                        value={bonusAmount}
                        onChange={(e) => setBonusAmount(e.target.value)}
                        disabled={!selectedEmployee}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      value={bonusDate}
                      onChange={(e) => setBonusDate(e.target.value)}
                      disabled={!selectedEmployee}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason
                  </label>
                  <textarea
                    rows={2}
                    className="mt-1 block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Explain the reason for this bonus payment"
                    value={bonusReason}
                    onChange={(e) => setBonusReason(e.target.value)}
                    disabled={!selectedEmployee}
                  />
                </div>
                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    onClick={resetOvertimeBonusForm}
                    disabled={!selectedEmployee}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700"
                    onClick={() => handleBonuspayment("bonus")}
                    disabled={!selectedEmployee}
                  >
                    Give Bonus
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
