"use client";
import React from "react";
import Link from "next/link";
import { Clock, FileText, Shield, UserCheck, DollarSign } from "lucide-react";
import { Mail } from "lucide-react";
import { useState, useEffect } from "react";
import Header from "./components/Header";

const FeatureSection = () => {
  const features = [
    {
      icon: <DollarSign className="w-8 h-8 text-white" />,
      title: "USDC Treasury Management",
      description:
        "Effortlessly manage your crypto treasury and track USDC balances in real-time.",
    },
    {
      icon: <Clock className="w-8 h-8 text-white" />,
      title: "Automated Crypto Payroll",
      description:
        "Simplify payroll for your web3 team with automated USDC payouts and compliance.",
    },
    {
      icon: <FileText className="w-8 h-8 text-white" />,
      title: "Transparent Financial Reporting",
      description:
        "Gain clear insights with detailed reports tailored for crypto businesses.",
    },
    {
      icon: <Shield className="w-8 h-8 text-white" />,
      title: "Blockchain-Based Security",
      description:
        "Leverage blockchain for secure and transparent financial operations.",
    },
    {
      icon: <UserCheck className="w-8 h-8 text-white" />,
      title: "Web3 Founder Focused",
      description:
        "Built with the unique needs of web3 founders and teams in mind.",
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* All-in-One Platform Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start mb-16">
          <h2 className="text-4xl sm:text-5xl font-medium text-gray-700  max-w-lg mb-4 sm:mb-0">
            Reclaim Your Time with <br />
            The All-in-One Web3 Back Office
          </h2>
          <div className="text-right max-w-lg">
            <p className="text-xl text-gray-600">
              Stop juggling multiple platforms. Trivix streamlines your web3
              business setup, from USDC banking and crypto payroll to automated
              bookkeeping and taxes – all in one unified platform.
            </p>
            <Link href="/product">
              <button className="mt-8 bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition duration-300 inline-block">
                Learn More
              </button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl text-gray-700 font-medium mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm hidden lg:block">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const TrackCostsSection = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* First Layout - USDC Banking */}
        <div className="flex flex-col lg:flex-row items-center mb-32">
          <div className="lg:w-1/2 lg:pr-12 mb-8 lg:mb-0">
            <img
              src="/card.svg" // Replace with actual banking image
              alt="USDC Banking Dashboard Preview"
              className="rounded-lg shadow-xl w-full"
            />
          </div>
          <div className="lg:w-1/2 lg:pl-12">
            <h2 className="text-3xl lg:text-4xl text-gray-700 font-medium mb-6">
              USDC Banking for Web3
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 leading-relaxed">
              Manage your crypto finances with ease. Open USDC wallets, issue
              crypto-enabled cards, and streamline payments all within Trivix.
              Designed for the speed of web3.
            </p>
          </div>
        </div>

        {/* Second Layout - Automated Bookkeeping */}
        <div className="flex flex-col-reverse lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12">
            <h2 className="text-3xl lg:text-4xl text-gray-700 font-medium mb-6">
              AI-Powered Bookkeeping
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 leading-relaxed">
              Say goodbye to manual crypto bookkeeping. Trivix automates your
              financial record-keeping, saving you time and reducing errors.
            </p>
          </div>
          <div className="lg:w-1/2 lg:pl-12 mb-8 lg:mb-0">
            <img
              src="/dose.png" // Replace with actual bookkeeping image
              alt="Automated Bookkeeping Dashboard Preview"
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>

        {/* Third Layout - Crypto Payroll & Benefits */}
        <div className="flex flex-col lg:flex-row items-center mb-32">
          <div className="lg:w-1/2 lg:pr-12 mb-8 lg:mb-0">
            <img
              src="/payroll.png"
              alt="Crypto Payroll Dashboard Preview"
              className="rounded-lg shadow-xl w-full"
            />
          </div>
          <div className="lg:w-1/2 lg:pl-12">
            <h2 className="text-3xl lg:text-4xl text-gray-700 font-medium mb-6">
              Web3 Payroll & Crypto Benefits
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 leading-relaxed">
              Pay your global web3 team in USDC effortlessly. Manage payroll,
              offer crypto-compatible benefits, and stay compliant, all within a
              crypto-native system.
            </p>
          </div>
        </div>
        {/* Fourth Layout - Unified Platform */}
        <div className="flex flex-col-reverse lg:flex-row items-center">
          <div className="lg:w-1/2 lg:pr-12">
            <h2 className="text-3xl lg:text-4xl text-gray-700 font-medium mb-6">
              Unified Platform, Seamless Operations
            </h2>
            <p className="text-2xl lg:text-3xl text-gray-600 leading-relaxed">
              Trivix brings all your essential back-office functions into one
              platform. Reduce complexity, improve efficiency, and focus on
              building your web3 vision.
            </p>
          </div>
          <div className="lg:w-1/2 lg:pl-12 mb-8 lg:mb-0">
            <img
              src="/dashboard1.png" // Replace with actual unified dashboard image
              alt="Unified Dashboard Preview"
              className="rounded-lg shadow-xl w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

const LandingPage = () => {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const texts = [
    "The Web3 Back Office,",
    "Grow Your Crypto Team with Ease,",
    "Manage Crypto Finances Smart,",
    "Automated Crypto Payroll Flow,",
  ];
  const typingSpeed = 100;
  const deletingSpeed = 50;
  const delayBetweenTexts = 1500;
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const calculateRotation = () => {
    const maxScroll = 5000; // Adjust this value based on when you want the flip to complete
    const scrollProgress = Math.min(scrollPosition, maxScroll) / maxScroll;
    const rotation = scrollProgress * 180;
    const scale = Math.max(0.01, 1 - scrollProgress); // Ensure scale doesn't go to 0
    return {
      transform: `perspective(1000px) rotateX(${rotation}deg) scaleY(${scale})`,
      transition: "transform 0.1s ease-out",
      transformOrigin: "center",
    };
  };

  useEffect(() => {
    const typeOrDelete = () => {
      const currentText = texts[textIndex];
      if (isDeleting) {
        setDisplayText(currentText.substring(0, displayText.length - 1));
      } else {
        setDisplayText(currentText.substring(0, displayText.length + 1));
      }

      if (!isDeleting && displayText === currentText) {
        setTimeout(() => setIsDeleting(true), delayBetweenTexts);
      } else if (isDeleting && displayText === "") {
        setIsDeleting(false);
        setTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
      }
    };

    const timer = setTimeout(
      typeOrDelete,
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, textIndex, texts]);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-medium text-gray-700 mb-6">
              {displayText} <br />
              <span className="text-gray-500">
                Built for Crypto-Native Businesses.
              </span>
            </h1>
            <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-600 mb-8">
              Launch and scale your web3 company faster with Trivix. Manage USDC
              banking, crypto payroll, automated bookkeeping, and taxes – all in
              one platform designed for the decentralized economy.
            </p>
            <Link href="/book-demo">
              <button className="bg-blue-600 text-white px-8 py-4 text-lg rounded-full hover:bg-blue-700 transition duration-300 inline-block">
                Contact Sales
              </button>
            </Link>
          </div>

          {/* Dashboard Preview Image */}
          <div
            className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden"
            style={calculateRotation()}
          >
            <img
              src="/dashboard.png"
              alt="Trivix Dashboard Preview - Web3 Back Office"
              className="w-full h-auto"
            />
          </div>
        </div>
      </main>
      <FeatureSection />
      <TrackCostsSection />
      <Footer />
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-blue-600 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Left Side - Contact Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Mail className="w-5 h-5" />
              <a
                href="mailto:sales@trivix.xyz" // Update with real email
                className="text-white hover:text-gray-200 transition-colors"
              >
                sales@trivix.xyz
              </a>
            </div>
            <div>
              <Link
                href="/auth/login"
                className="text-white hover:text-gray-200 transition-colors"
              >
                Login
              </Link>
            </div>
            <div>
              <Link
                href="/about"
                className="text-white hover:text-gray-200 transition-colors"
              >
                About Trivix
              </Link>
            </div>
          </div>

          {/* Right Side - Navigation */}
          <div className="flex justify-end space-x-8">
            <Link
              href="/about"
              className="text-white hover:text-gray-200 transition-colors"
            >
              About Us
            </Link>
            <Link
              href="mailto:sales@trivix.xyz"
              className="text-white hover:text-gray-200 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/pricing"
              className="text-white hover:text-gray-200 transition-colors"
            >
              Pricing
            </Link>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center pt-8 border-t border-blue-500">
          {/* Copyright */}
          <div className="mb-4 lg:mb-0">
            <p className="text-sm">
              © {new Date().getFullYear()} Trivix. All rights reserved.
            </p>
          </div>

          {/* Logo - Could be replaced with text "Trivix" for SEO */}
          <div>
            <Link href="/" className="text-white">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                T {/* Or use an actual logo character */}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingPage;
