"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Globe, Users, Briefcase, Loader2 } from "lucide-react"; // Added Loader2
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  app,
  getFirestore,
  setDoc,
  doc,
  serverTimestamp,
  auth,
  sendEmailVerification,
  createUserWithEmailAndPassword,
} from "@/app/config/FirebaseConfig";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { lightTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { createThirdwebClient } from "thirdweb"; // Import createThirdwebClient

const SignupPage = () => {
  const router = useRouter();
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firebaseUser, setFirebaseUser] = useState(null); // No longer used for auto-signup
  const [companyDetails, setCompanyDetails] = useState({
    companyName: "",
    companyWebsite: "",
    companySize: "",
    industry: "",
  });
  const [payrollDetails, setPayrollDetails] = useState({
    payrollFrequency: "",
    monthlyTransactionVolume: "",
    featuresOfInterest: [],
  });

  const account = useActiveAccount();

  const client = createThirdwebClient({
    clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
  });

  const formRefs = {
    companyName: useRef(null),
    companyWebsite: useRef(null),
    companySize: useRef(null),
    industry: useRef(null),
  };

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

  const validateStep1 = () => {
    const errors = {};
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Email address is invalid";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    const fields = Object.keys(formRefs);

    fields.forEach((field) => {
      const value = formRefs[field].current?.value;
      if (!value || value.trim() === "") {
        errors[field] = `${
          field
            .replace(/([A-Z])/g, " $1")
            .charAt(0)
            .toUpperCase() +
          field
            .replace(/([A-Z])/g, " $1")
            .slice(1)
            .toLowerCase()
        } is required`;
      }
      // Special validation for companyWebsite
      if (field === "companyWebsite" && value) {
        try {
          new URL(value); // This will throw an error if the URL is invalid
        } catch (_) {
          errors.companyWebsite = "Invalid URL format";
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        setCompanyDetails({
          companyName: formRefs.companyName.current?.value,
          companyWebsite: formRefs.companyWebsite.current?.value,
          companySize: formRefs.companySize.current?.value,
          industry: formRefs.industry.current?.value,
        });
        setStep(3);
      }
    }
  };

  const handleFeatureChange = (feature) => {
    setPayrollDetails((prev) => {
      const features = prev.featuresOfInterest.includes(feature)
        ? prev.featuresOfInterest.filter((f) => f !== feature)
        : [...prev.featuresOfInterest, feature];
      return { ...prev, featuresOfInterest: features };
    });
  };

  const handleCreateAccount = async () => {
    // No need to check for step 3 here

    if (!validateStep1()) return; // Validate email/password
    if (!companyDetails.companyName) {
      // Check if we've collected company details
      showErrorToast("Company name is required");
      return;
    }
    if (!account || !account.address) {
      showErrorToast("Please connect your wallet.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Firebase Authentication (Sign Up)
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(auth.currentUser);

      // 2. Save User to Firestore (using wallet address as ID)
      const success = await saveUserToFirestore(account.address, user.uid); //Await the save.
      if (success) {
        showSuccessToast(
          "Account created successfully!  Email verification sent."
        );
        router.push("/auth/login"); // Redirect after successful signup
      } // else error is already handled.
    } catch (error) {
      console.error("Signup error:", error);
      showErrorToast(`Signup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUserToFirestore = async (address, uid) => {
    const db = getFirestore(app);
    try {
      const now = serverTimestamp();

      const businessData = {
        name: companyDetails.companyName,
        branding: { logoUrl: "", themeColor: "" },
        settings: {
          paymentSchedule: payrollDetails.payrollFrequency,
        },
        CompanyId: address,
        companyWalletAddress: address, // Use wallet address
        balance: 0,
        createdAt: now,
        updatedAt: now,
        companyWebsite: companyDetails.companyWebsite,
        companySize: companyDetails.companySize,
        industry: companyDetails.industry,
        monthlyTransactionVolume: payrollDetails.monthlyTransactionVolume,
        featuresOfInterest: payrollDetails.featuresOfInterest,
        email: email, // Store email
      };

      await setDoc(doc(db, "businesses", address), businessData);
      console.log("Business document written with ID: ", address);

      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        userId: uid,
        wallet_address: address,
      });
      console.log("User document written with ID: ", uid);
      return true; // Indicate success
    } catch (error) {
      console.error("Firestore error:", error);
      showErrorToast("Failed to create account. Please try again.");
      return false; // Indicate failure
    }
  };

  // Removed useEffect for firebaseUser (not needed for manual signup)
  // Removed useEffect for account (not needed for manual signup)

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-white to-blue-50">
      <ToastContainer />
      {/* Left Section - Form */}
      <div className="w-1/2 p-12 flex flex-col">
        <div className="mb-12">
          <Link href="/" className="flex items-center">
            <Image
              src="/triv.png"
              alt="Trivix Logo"
              width={48}
              height={48}
              className="mr-2"
            />
          </Link>
        </div>

        <div className="max-w-lg">
          <h1 className="text-4xl font-bold text-blue-900 mb-3">
            Welcome to Trivix
          </h1>
          <p className="text-xl text-blue-700 mb-8">
            Set up your business account in minutes
          </p>

          <div className="space-y-6">
            {step === 1 && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {formErrors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.password}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-lg bg-blue-500 text-white"
                >
                  Next
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      ref={formRefs.companyName}
                      type="text"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your company name"
                    />
                    {formErrors.companyName && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.companyName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Company Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      ref={formRefs.companyWebsite}
                      type="url"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://yourcompany.com"
                    />
                    {formErrors.companyWebsite && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.companyWebsite}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Company Size
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      ref={formRefs.companySize}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select company size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                    {formErrors.companySize && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.companySize}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Industry
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <select
                      ref={formRefs.industry}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    >
                      <option value="">Select industry</option>
                      <option value="defi">DeFi</option>
                      <option value="nft">NFT/Digital Assets</option>
                      <option value="gaming">Gaming</option>
                      <option value="dao">DAO</option>
                      <option value="depin">DePIN</option>
                      <option value="desci">DeSci</option>
                      <option value="technology">Technology</option>
                      <option value="finance">Finance</option>
                      <option value="other">Other</option>
                    </select>
                    {formErrors.industry && (
                      <p className="text-red-500 text-sm mt-1">
                        {formErrors.industry}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-lg bg-blue-500 text-white"
                >
                  Next
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Payroll Frequency
                  </label>
                  <select
                    className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={payrollDetails.payrollFrequency}
                    onChange={(e) =>
                      setPayrollDetails({
                        ...payrollDetails,
                        payrollFrequency: e.target.value,
                      })
                    }
                  >
                    <option value="">Select payroll frequency</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Monthly Transaction Volume
                  </label>
                  <select
                    className="w-full pl-3 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    value={payrollDetails.monthlyTransactionVolume}
                    onChange={(e) =>
                      setPayrollDetails({
                        ...payrollDetails,
                        monthlyTransactionVolume: e.target.value,
                      })
                    }
                  >
                    <option value="">Select monthly volume</option>
                    <option value="0-1000 dollars">0 - $1,000</option>
                    <option value="1000-10,000 dollars">
                      $1,000 - $10,000
                    </option>
                    <option value="10000-50000 dollars">
                      $10,000 - $50,000
                    </option>
                    <option value="50000-100000 dollars">
                      $50,000 - $100,000
                    </option>
                    <option value="100000+ dollars">$100,000+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Features of Interest
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={payrollDetails.featuresOfInterest.includes(
                          "usdcWallets"
                        )}
                        onChange={() => handleFeatureChange("usdcWallets")}
                      />
                      USDC Wallets and Banking
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={payrollDetails.featuresOfInterest.includes(
                          "automatedBookkeeping"
                        )}
                        onChange={() =>
                          handleFeatureChange("automatedBookkeeping")
                        }
                      />
                      Automated Bookkeeping & Tax
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={payrollDetails.featuresOfInterest.includes(
                          "payrollBenefits"
                        )}
                        onChange={() => handleFeatureChange("payrollBenefits")}
                      />
                      Payroll & Benefits
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={payrollDetails.featuresOfInterest.includes(
                          "treasuryManagement"
                        )}
                        onChange={() =>
                          handleFeatureChange("treasuryManagement")
                        }
                      />
                      Treasury Management
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={payrollDetails.featuresOfInterest.includes(
                          "reportingAnalytics"
                        )}
                        onChange={() =>
                          handleFeatureChange("reportingAnalytics")
                        }
                      />
                      Reporting & Analytics
                    </label>
                  </div>
                </div>

                <div className="pt-4">
                  <ConnectButton
                    client={client}
                    wallets={wallets}
                    theme={lightTheme({
                      colors: {
                        primaryButtonText: "hsl(0, 0%, 98%)",
                        primaryButtonBg: "#0051FF",
                      },
                    })}
                    connectButton={{ label: "Connect Wallet" }}
                    connectModal={{
                      size: "wide",
                      title: "Choose Wallet Provider",
                    }}
                  />
                </div>

                <button
                  onClick={handleCreateAccount}
                  disabled={isLoading || !account} // Disable if loading OR no wallet
                  className={`w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors duration-200 text-white flex items-center justify-center mt-4 ${
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-3" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Business Account"
                  )}
                </button>
              </>
            )}

            <p className="text-sm text-gray-600 mt-4">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
      {/* Right Section - Feature Showcase */}
      <div className="w-[45%] mt-2 bg-[#0051FF] rounded-3xl p-12 flex items-center h-[97vh] ml-12">
        <div className="text-white max-w-xl">
          <h2 className="text-4xl font-semibold mb-4">
            The simplest way to manage your workforce payroll
          </h2>
          <p className="text-xl mb-12">
            Seamlessly Pay your Remote Worker with just a click
          </p>

          <div className="relative ml-8">
            <Image
              src="/amount.png"
              alt="Performance Dashboard"
              width={295}
              height={195}
              className="transform rotate-[-15deg]"
            />
            <Image
              src="/paya.png"
              alt="Daily Sales Dashboard"
              width={295}
              height={195}
              className="absolute top-4 left-64 transform rotate-[10deg]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default SignupPage;
