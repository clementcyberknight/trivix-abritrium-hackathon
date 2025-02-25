"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  CalendarClock,
  FileText,
  Users,
  User,
  Wallet,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { useActiveAccount } from "thirdweb/react"; // Import useActiveAccount
import {
  auth,
  app,
  getFirestore,
  doc,
  getDoc,
} from "@/app/config/FirebaseConfig"; // Adjust the path if needed
import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { lightTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

const SideMenu = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [companyData, setCompanyData] = useState(null);
  const account = useActiveAccount(); // Use the active account hook

  const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
  });

  const wallets = [
    inAppWallet({
      auth: {
        options: ["coinbase", "google", "github"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("io.zerion.wallet"),
    createWallet("com.trustwallet.app"),
  ];

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (account && account.address) {
        const db = getFirestore(app);
        const companyDocRef = doc(db, "businesses", account.address); // Assuming company ID is the document ID
        try {
          const docSnap = await getDoc(companyDocRef);
          if (docSnap.exists()) {
            setCompanyData(docSnap.data());
          } else {
            console.log("No such document!");
            setCompanyData(null);
          }
        } catch (error) {
          console.error("Error fetching company data:", error);
          setCompanyData(null); //reset to null in case of an error
        }
      } else {
        setCompanyData(null); // Reset if no account or address
      }
    };

    fetchCompanyData();
  }, [account]);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/account/dashboard",
    },
    {
      name: "Scheduled Payments",
      icon: CalendarClock,
      path: "/account/scheduled-payments",
    },
    { name: "Payroll", icon: FileText, path: "/account/payroll" },
    { name: "Workers", icon: Users, path: "/account/workers" },
    {
      name: "Contractors",
      icon: User,
      path: "/account/contractors",
    },
    {
      name: "Wallet",
      icon: Wallet,
      path: "/account/wallet",
    },
    {
      name: "Accounting",
      icon: BarChart3,
      path: "/account/booking", // Keep the path, but handle click
    },
    {
      name: "Reports & Analytics",
      icon: TrendingUp,
      path: "/account/reports",
    },
  ];

  const companyInitial = companyData?.name
    ? companyData.name.charAt(0).toUpperCase()
    : "T";
  const companyName = companyData?.name || "Trivix";
  const companyEmail = companyData?.email || "Trivix@gmail.com";

  return (
    <aside
      className={`relative h-screen sticky top-0 ${
        isCollapsed ? "w-20" : "w-64"
      } bg-white dark:bg-gray-800 shadow-lg flex flex-col  transition-all duration-300 ease-in-out`}
    >
      {/* Company Logo */}
      <div className="p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xl">
              {companyInitial}
            </span>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? "w-0" : "w-full"
            }`}
          >
            <div className="font-semibold dark:text-white whitespace-nowrap">
              {companyName}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-hidden">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => (
            <li key={item.name}>
              {item.name === "Accounting" ? (
                <div // Use a div instead of Link
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    pathname === item.path
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                  title={isCollapsed ? item.name : ""}
                >
                  <item.icon
                    size={20}
                    className="flex-shrink-0 text-gray-500 dark:text-gray-400"
                  />
                  <span
                    className={`whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"
                    }`}
                  >
                    {item.name}
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                      Soon
                    </span>
                  </span>
                </div>
              ) : (
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    pathname === item.path
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                  title={isCollapsed ? item.name : ""}
                >
                  <item.icon
                    size={20}
                    className="flex-shrink-0 text-gray-500 dark:text-gray-400"
                  />
                  <span
                    className={`whitespace-nowrap transition-all duration-300 ${
                      isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Button and Logout aligned */}
      <div className="p-4 border-t dark:border-gray-700 flex flex-col gap-1">
        <ConnectButton
          client={client}
          wallets={wallets}
          theme={lightTheme({
            colors: {
              primaryButtonText: "hsl(0, 0.00%, 0.00%)",
              primaryButtonBg: "hsla(0, 0.00%, 0.00%, 0.05)",
            },
          })}
          connectButton={{ label: "Connect Wallet" }}
          connectModal={{ size: "wide", title: "Choose a provider" }}
        />

        {/* Logout */}
        <Link
          href="/logout"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={isCollapsed ? "Logout" : ""}
        >
          <LogOut
            size={18}
            className="flex-shrink-0 text-gray-500 dark:text-gray-400"
          />
          <span
            className={`whitespace-nowrap transition-all duration-300 ${
              isCollapsed ? "w-0 opacity-0" : "w-full opacity-100"
            }`}
          >
            Logout
          </span>
        </Link>
      </div>
    </aside>
  );
};

export default SideMenu;
