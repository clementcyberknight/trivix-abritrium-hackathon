"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Globe, Users, Briefcase, Loader2 } from "lucide-react"; // Import Loader2
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  app,
  getFirestore,
  doc,
  getDoc,
  auth,
  signInWithEmailAndPassword,
  getIdToken,
  sendEmailVerification,
  getAuth,
} from "@/app/config/FirebaseConfig";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { lightTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";

const SigninPage = () => {
  const router = useRouter();
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userData, setUserData] = useState(null);

  const account = useActiveAccount(); // Get the connected wallet.

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

  const validateForm = () => {
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

  const handleSignIn = async () => {
    if (!validateForm()) return;

    if (!account || !account.address) {
      showErrorToast("Please connect your wallet before signing in.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        showErrorToast(
          "Email not verified. Please verify your email address before signing in."
        );
        handleResendVerificationEmail();
        setIsLoading(false); // Stop loading state
        return; // Stop the sign-in process
      }

      const db = getFirestore(app);
      const businessDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(businessDocRef);

      if (docSnap.exists()) {
        const businessData = docSnap.data();
        // Wallet address check
        const registeredAddress = businessData.wallet_address.toLowerCase();
        const currentAddress = account?.address.toLowerCase();

        if (registeredAddress !== currentAddress) {
          showErrorToast(
            "Wallet address does not match the registered business account."
          );
          setIsLoading(false);
          return; // Stop if wallet addresses don't match
        }

        setUserData(businessData);
        showSuccessToast("Sign in successful! Proceeding...");
        router.push("/account/dashboard"); // Redirect on success
        console.log("Current user UID:", user.uid); // Log the UID
      } else {
        showErrorToast("User data not found in Firestore.");
      }
    } catch (firebaseError) {
      console.error("Firebase sign-in error:", firebaseError);
      showErrorToast(`Firebase sign-in failed: ${firebaseError.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    const lastSentTime = localStorage.getItem("email_verification_sent");
    if (lastSentTime) {
      const timeDiff = Date.now() - parseInt(lastSentTime, 10);
      const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      if (timeDiff < twoHours) {
        showErrorToast(
          "Verification email was sent recently. Please wait before resending."
        );
        return; // Don't resend if sent within 2 hours
      }
    }

    setIsLoading(true);
    try {
      const authInstance = getAuth();
      await sendEmailVerification(authInstance.currentUser);
      showSuccessToast(
        "Verification email resent. Please check your inbox and spam folder."
      );
      localStorage.setItem("email_verification_sent", Date.now().toString()); // Update timestamp
    } catch (error) {
      console.error("Error resending verification email:", error);
      showErrorToast(
        "Failed to resend verification email. Please try again later."
      );
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

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
            Welcome back to Trivix
          </h1>
          <p className="text-xl text-blue-700 mb-8">
            Sign in to access your business account
          </p>

          <div className="space-y-6">
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
                <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
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
            <div className="pt-4">
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
            </div>

            <button
              onClick={handleSignIn}
              disabled={isLoading || !email || !password || !account} // Disable if no wallet
              className={`w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors duration-200 text-white flex items-center justify-center mt-4 ${
                isLoading || !email || !password || !account
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-3" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="flex justify-between items-center mt-4">
              <Link
                href="/auth/signup"
                className="text-sm text-blue-600 hover:underline"
              >
                Create an account
              </Link>
              <Link
                href="/auth/forgot-password" // Replace with your actual forgot password page
                className="text-sm text-gray-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
      {/* Right Section - Feature Showcase (Reused from SignupPage for consistency) */}
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
export default SigninPage;
