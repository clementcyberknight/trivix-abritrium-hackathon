"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  Shield,
  ArrowRight,
  Filter,
  Search,
  ChevronDown,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

const WalletManagement = () => {
  const [showBalance, setShowBalance] = useState(true);
  const [hideZeroBalance, setHideZeroBalance] = useState(false);
  const historyRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState(""); // State for search
  const [filteredTransactions, setFilteredTransactions] = useState([]); // For filtered transactions
  const [selectedTransactionFilter, setSelectedTransactionFilter] =
    useState("All");

  // --Dummy Data for Chart --
  const [chartData, setChartData] = useState([
    { name: "24H", value: 75000 },
    { name: "7D", value: 70000 },
    { name: "30D", value: 65000 },
    { name: "90D", value: 60000 },
    { name: "180D", value: 80000 },
    { name: "MAX", value: 85500 },
  ]);

  // Sample transaction data (replace with your actual data)
  const [transactions, setTransactions] = useState([
    {
      id: 1,
      date: "2024-01-01",
      amount: -500,
      description: "Payroll Payment",
      type: "Sent",
    },
    {
      id: 2,
      date: "2024-01-02",
      amount: -50,
      description: "Service Fee",
      type: "Sent",
    },
    {
      id: 3,
      date: "2024-01-03",
      amount: 1500,
      description: "Deposit",
      type: "Received",
    },
    {
      id: 4,
      date: "2024-01-04",
      amount: 7000,
      description: "Investment Return",
      type: "Received",
    },
    {
      id: 5,
      date: "2024-01-05",
      amount: -80,
      description: "Payroll Payment",
      type: "Sent",
    },
    {
      id: 6,
      date: "2024-01-06",
      amount: -200,
      description: "Subscription",
      type: "Sent",
    }, // Added for variety
    {
      id: 7,
      date: "2024-01-07",
      amount: 250,
      description: "Refund",
      type: "Received",
    }, // Added for variety
  ]);

  // Sample token data
  const [tokens, setTokens] = useState([
    {
      symbol: "ETH",
      amount: "10.02",
      price: "$200.33",
      change: "+2.91%",
      total: "$32,067.30",
      icon: "/icons/eth.png",
      changeColor: "text-green-500",
      balance: 10.02,
    },
    {
      symbol: "USDC",
      amount: "48,000.09",
      price: "1.0001",
      change: "+0.02%",
      total: "$48,004.89",
      icon: "/icons/usdc.png",
      changeColor: "text-green-500",
      balance: 48000.09,
    },
    {
      symbol: "USDT",
      amount: "5,427.81",
      price: "1.00",
      change: "+0.05%",
      total: "$5,427.81",
      icon: "/icons/usdt.png",
      changeColor: "text-green-500",
      balance: 5427.81,
    },
  ]);

  const filteredTokens = hideZeroBalance
    ? tokens.filter((token) => token.balance > 0)
    : tokens;

  const scrollToHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatCurrency = (amount) => {
    // Handle potential non-numeric input gracefully
    const numericAmount =
      typeof amount === "number"
        ? amount
        : parseFloat(amount?.replace(/[^0-9.-]+/g, ""));

    if (isNaN(numericAmount)) {
      return "Invalid Amount"; // Or some other placeholder
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numericAmount);
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

  //Total Balance
  const totalBalance = filteredTokens.reduce((acc, token) => {
    const tokenValue = parseFloat(token.total.replace(/[^0-9.-]+/g, "")); // Extract numeric value
    return acc + (isNaN(tokenValue) ? 0 : tokenValue); // Ensure we're adding a number
  }, 0);

  // --- Effects ---

  // Filtering Transactions
  useEffect(() => {
    const lowerSearch = searchQuery.toLowerCase();
    const results = transactions.filter(
      (transaction) =>
        (formatDate(transaction.date).toLowerCase().includes(lowerSearch) ||
          formatCurrency(transaction.amount).includes(lowerSearch) ||
          transaction.description.toLowerCase().includes(lowerSearch)) &&
        (selectedTransactionFilter === "All" ||
          transaction.type === selectedTransactionFilter)
    );
    setFilteredTransactions(results);
  }, [searchQuery, transactions, selectedTransactionFilter]);

  // --- Helper component
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

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Section */}
          <div className="lg:flex-1">
            <h1 className="text-3xl font-semibold text-gray-800 mb-2">
              Wallet
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              Manage company finances seamlessly and securely.
            </p>

            {/* Main Content Area */}
            <motion.div
              key="assets"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-3xl shadow-md p-6 mb-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                      <Shield size={16} />
                    </div>
                    <span className="text-gray-700 font-medium">
                      Available Balance
                    </span>
                    <button
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-gray-500 hover:text-blue-600 focus:outline-none transition-colors duration-200"
                      aria-label="Toggle Show Balance"
                    >
                      {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={scrollToHistory}
                    className="text-blue-600 hover:text-blue-800 focus:outline-none transition-colors duration-200 flex items-center space-x-1"
                    aria-label="View Transaction History"
                  >
                    <span>Transaction History</span>
                    <ArrowRight size={16} />
                  </button>
                </div>

                <div className="text-4xl font-bold text-blue-700 mb-4">
                  {showBalance ? formatCurrency(totalBalance) : "********"}
                </div>

                {/* Chart Area */}
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorValue"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#60A5FA"
                            stopOpacity={0.1}
                          />
                          <stop
                            offset="95%"
                            stopColor="#60A5FA"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#718096" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#60A5FA"
                        fill="url(#colorValue)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-200 transition-colors duration-200 font-medium border border-blue-200">
                  <ArrowUpRight size={18} />
                  <span>Send</span>
                </button>
                <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-200 transition-colors duration-200 font-medium border border-blue-200">
                  <ArrowDownLeft size={18} />
                  <span>Receive</span>
                </button>
                <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-200 transition-colors duration-200 font-medium border border-blue-200">
                  <ArrowLeftRight size={18} />
                  <span>Swap</span>
                </button>
                <button className="bg-blue-100 text-blue-700 py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-200 transition-colors duration-200 font-medium border border-blue-200">
                  <Plus size={18} />
                  <span>Stake</span>
                </button>
              </div>

              {/* Transaction History */}
              <div ref={historyRef}>
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                  Transaction History
                </h2>
                {/* Search and Filter */}
                <div className="flex justify-between items-center mb-4">
                  <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                      placeholder="Search transactions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <FilterDropdown
                    options={["All", "Sent", "Received"]}
                    selected={selectedTransactionFilter}
                    onSelect={setSelectedTransactionFilter}
                  />
                </div>

                {/* transaction list */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
                  {filteredTransactions.length > 0 ? (
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
                            Amount
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Description
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Type
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTransactions.map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatDate(transaction.date)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div
                                className={`text-sm font-medium ${
                                  transaction.amount > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transaction.amount > 0 ? "+" : ""}
                                {formatCurrency(transaction.amount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center p-8 text-gray-500">
                      No transactions found.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Section - Tokens */}
          <motion.div
            key="tokenSection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full lg:w-96 bg-white rounded-3xl p-6 mt-6 lg:mt-0 border border-gray-200 shadow-md"
          >
            {/* Heading & Toggle Switch */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Tokens</h2>
              <label className="inline-flex items-center space-x-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  className="hidden peer"
                  checked={hideZeroBalance}
                  onChange={(e) => setHideZeroBalance(e.target.checked)}
                  id="hideZeroBalance"
                />
                <span className="text-sm font-medium">Hide Zero Balance</span>
                <span className="relative">
                  <span className="block w-6 h-6 bg-gray-200 rounded-full transition-transform duration-300 transform peer-checked:translate-x-4"></span>
                </span>
              </label>
            </div>

            {/* Token List */}
            <div className="space-y-4">
              {filteredTokens.map((token, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <img
                        src={token.icon}
                        alt={token.symbol}
                        className="w-7 h-7 object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-lg font-medium text-gray-700">
                        {token.symbol}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-1">
                        <span>{token.price}</span>
                        <span className={token.changeColor}>
                          {token.change}
                          {token.change.includes("-") ? (
                            <TrendingDown
                              size={14}
                              className="inline-block ml-1"
                            />
                          ) : (
                            <TrendingUp
                              size={14}
                              className="inline-block ml-1"
                            />
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-800">
                      {token.amount}
                    </div>
                    <div className="text-sm text-gray-500">{token.total}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WalletManagement;
