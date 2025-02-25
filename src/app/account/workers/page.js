"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  MoreVertical,
  FileText,
} from "lucide-react";
import { useActiveAccount, useConnect } from "thirdweb/react";
import {
  auth,
  app,
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
} from "@/app/config/FirebaseConfig";
import { inAppWallet } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse";
import { useRouter } from "next/navigation"; // Import useRouter

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
});

export default function WorkersPage() {
  const router = useRouter(); // Initialize router
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state
  const [isExporting, setIsExporting] = useState(false);

  const account = useActiveAccount();
  const { connect } = useConnect(); // Corrected: import and use useConnect
  const [firebaseUser, setFirebaseUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        // User is signed in to Firebase
        console.log(account.address, "logged in");
        try {
          // No JWT needed, rely on Firebase and thirdweb
        } catch (error) {
          console.error("Error with Firebase Auth:", error);
          showErrorToast("Error with Firebase Authentication.");
        } finally {
          setIsLoading(false); // Ensure loading is set to false after attempt
        }
      } else {
        // User is signed out
        setWorkers([]);
        setIsLoading(false); // Set loading to false
        router.push("/auth/login"); // Redirect to login
      }
    });

    return () => unsubscribe();
  }, [router]); // Add router here

  useEffect(() => {
    const db = getFirestore(app);
    let unsubscribe;

    if (firebaseUser && account && account.address) {
      // Fetch user data from Firestore using the user's UID.
      const businessDocRef = doc(db, "users", firebaseUser.uid);
      getDoc(businessDocRef)
        .then((docSnap) => {
          if (docSnap.exists()) {
            const businessData = docSnap.data();
            // Wallet address check
            const registeredAddress = businessData.wallet_address.toLowerCase();
            const currentAddress = account?.address.toLowerCase();
            // Verify the wallet address.
            if (registeredAddress !== currentAddress) {
              showErrorToast(
                "Connected wallet does not match the registered business account."
              );
              router.push("/auth/login"); // Redirect to login
              return; // Stop further execution.
            }

            const workersRef = collection(
              db,
              "businesses",
              account.address, // Use the connected account address
              "workers"
            );
            unsubscribe = onSnapshot(
              workersRef,
              (snapshot) => {
                const workersData = [];
                snapshot.forEach((doc) => {
                  workersData.push({ worker_id: doc.id, ...doc.data() });
                });
                setWorkers(workersData);
              },
              (error) => {
                console.error("Error fetching workers:", error);
                showErrorToast(`Error fetching workers: ${error.message}`);
              }
            );
          } else {
            showErrorToast("Business data not found.");
            return;
          }
        })
        .catch((error) => {
          console.error("Error fetching business data:", error);
          showErrorToast(`Error fetching business data: ${error.message}`);
          router.push("/auth/login"); // redirect
        });
    } else {
      setWorkers([]);
      if (unsubscribe) unsubscribe();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [firebaseUser, account, router]); // Include router in dependencies

  useEffect(() => {
    const lowerSearch = searchQuery.toLowerCase();
    const results = workers.filter(
      (worker) =>
        (worker.worker_name?.toLowerCase().includes(lowerSearch) || // Use optional chaining
          worker.worker_email?.toLowerCase().includes(lowerSearch) ||
          worker.role?.toLowerCase().includes(lowerSearch) ||
          worker.worker_wallet?.toLowerCase().includes(lowerSearch) ||
          formatCurrency(worker.worker_salary).includes(lowerSearch)) &&
        (selectedRoleFilter === "All" || worker.role === selectedRoleFilter)
    );
    setFilteredWorkers(results);
  }, [searchQuery, workers, selectedRoleFilter]);

  const WORKER_ROLES = [
    "Developer",
    "Manager",
    "Admin",
    "Designer",
    "Marketing",
    "Support",
  ];

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

  const handleExportList = async () => {
    setIsExporting(true);
    try {
      // Prepare data for CSV export
      const csvData = workers.map((worker) => ({
        Name: worker.worker_name,
        Email: worker.worker_email,
        Role: worker.role,
        Salary: worker.worker_salary,
        Status: worker.status,
        Wallet: worker.worker_wallet || "", // Handle potential undefined value
      }));

      // Convert data to CSV format
      const csv = Papa.unparse(csvData, {
        header: true, // Include header row
      });

      // Create a Blob from the CSV data
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

      // Create a download link
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "worker_list.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link); // Clean up

      showSuccessToast("Worker list exported successfully!");
    } catch (error) {
      console.error("Error exporting worker list:", error);
      showErrorToast(`Error exporting worker list: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const FilterDropdown = ({ options, selected, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
      const handleClickOutside = (event) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);
    return (
      <div className="relative" ref={dropdownRef}>
        <div
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter size={16} className="text-gray-500" />
          <span>{selected}</span>
          <ChevronDown size={16} className="text-gray-500" />
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            {options.map((option) => (
              <div
                key={option}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </div>
            ))}
          </div>
        )}
      </div>
    );
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

  // Skeleton component
  const Skeleton = () => (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-48 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-40 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-32 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="animate-pulse bg-gray-200 h-4 w-24 rounded-md"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded-md"></div>
      </td>
    </tr>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4">
      <ToastContainer />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-1">Worker List</h1>
        <p className="text-sm text-gray-500">Manage worker list</p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {/* Role Filter */}
          <FilterDropdown
            options={["All", ...WORKER_ROLES]}
            selected={selectedRoleFilter}
            onSelect={setSelectedRoleFilter}
          />
        </div>
        {/* Action button could be added if needed */}
      </div>

      {/* Search and Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search workers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportList}
            disabled={isLoading || isExporting}
          >
            <FileText size={16} />
            {isExporting ? "Exporting..." : "Export List"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Wallet Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Salary (USDC)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading
              ? // Show skeleton rows while loading
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} />
                ))
              : filteredWorkers.length > 0
              ? filteredWorkers.map((worker) => (
                  <tr key={worker.worker_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {worker.worker_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {worker.worker_wallet}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {worker.worker_email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm ${
                          worker.role === "Developer"
                            ? "text-red-600"
                            : worker.role === "Manager"
                            ? "text-green-600"
                            : "text-blue-600"
                        }`}
                      >
                        {worker.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(worker.worker_salary)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          worker.status === "invited"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="p-1 rounded-full hover:bg-gray-100">
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))
              : !isLoading && (
                  <tr>
                    <td colSpan="7" className="text-center p-8 text-gray-500">
                      No workers found matching your criteria.
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
