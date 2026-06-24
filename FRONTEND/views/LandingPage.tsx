"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleCheck,
  Cpu,
  FileText,
  GitBranch,
  ListOrdered,
  Moon,
  Sun,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppContext } from "@/store/appStore";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: "easeOut" as const },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const stepFlow = [
  {
    icon: FileText,
    title: "Job Description",
    desc: "Upload your JD. Redrob extracts the true requirements beneath the standard corporate language.",
  },
  {
    icon: Cpu,
    title: "AI Understanding Engine",
    desc: "We build a semantic model of the role, mapping required skills, seniority, and desired behaviors.",
  },
  {
    icon: GitBranch,
    title: "Candidate Intelligence",
    desc: "Every candidate profile is analyzed holistically - past roles, tenure, tech stack depth, and trajectory.",
  },
  {
    icon: ListOrdered,
    title: "Ranked Shortlist",
    desc: "Receive a prioritized list of candidates with transparent explanations of exactly why they fit.",
  },
];

const featureCards = [
  { title: "Semantic Matching", desc: "Understand candidate fit beyond keywords" },
  { title: "Career Analysis", desc: "Automatic career trajectory evaluation" },
  { title: "Signal Detection", desc: "Behavioral and skill signal intelligence" },
  { title: "Honeypot Detection", desc: "Identify potential red flags" },
  { title: "Explainable AI", desc: "Understand every ranking decision" },
  { title: "Recruiter Insights", desc: "Actionable intelligence for teams" },
];

export default function LandingPage() {
  const router = useRouter();
  const { state, dispatch } = useAppContext();
  const [activeFeature, setActiveFeature] = useState(0);

  const openProject = () => router.push("/home");
  const toggleTheme = () => {
    dispatch({ type: "SET_THEME", payload: state.theme === "light" ? "dark" : "light" });
  };
  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full bg-white text-black transition-colors duration-300 dark:bg-black dark:text-white">
      <motion.header
        className="sticky top-0 z-40 border-b border-gray-200 bg-white/85 backdrop-blur-sm dark:border-[#1f1f1f] dark:bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45 }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image src="/redrob-icon.png" alt="Redrob" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-semibold tracking-tight">Redrob AI</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#how-it-works"
              className="text-sm font-medium transition hover:text-gray-600 dark:hover:text-gray-300"
            >
              How it works
            </a>
            <a
              href="#features"
              className="text-sm font-medium transition hover:text-gray-600 dark:hover:text-gray-300"
            >
              Features
            </a>
            <a
              href="#showcase"
              className="text-sm font-medium transition hover:text-gray-600 dark:hover:text-gray-300"
            >
              Showcase
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={state.theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-black transition hover:bg-gray-50 dark:border-[#2c2c2c] dark:bg-[#111111] dark:text-white dark:hover:bg-[#181818]"
            >
              {state.theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              type="button"
              onClick={openProject}
              className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:shadow-lg dark:bg-white dark:text-black"
            >
              Get Started
            </button>
          </div>
        </div>
      </motion.header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32">
          <motion.div
            className="grid items-center gap-12 md:grid-cols-2"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div variants={fadeInUp}>
              <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                Hire the Right Candidate.{" "}
                <span className="text-red-600 dark:text-red-500">Not the Best Keyword Match.</span>
              </h1>
              <p className="mb-8 text-xl leading-relaxed text-gray-600 dark:text-gray-400">
                Redrob AI analyzes skills, career history, behavioral signals, and professional experience to identify
                the candidates who truly fit the role.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  onClick={openProject}
                  className="flex items-center justify-center gap-2 rounded-full bg-black px-8 py-3 font-semibold text-white transition hover:shadow-xl dark:bg-white dark:text-black"
                >
                  Get Started <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={scrollToHowItWorks}
                  className="rounded-full border border-gray-300 px-8 py-3 font-semibold transition hover:bg-gray-50 dark:border-[#343434] dark:hover:bg-[#111111]"
                >
                  See How It Works
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="relative h-96 md:h-full">
              <motion.div
                className="absolute inset-0 flex flex-col rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-50 p-6 dark:border-[#262626] dark:from-[#161616] dark:to-[#0c0c0c]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    AI Rankings
                  </span>
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-600 dark:bg-red-500" />
                </div>
                <div className="flex-1 space-y-3">
                  {[90, 85, 78, 72].map((score, index) => (
                    <div key={score} className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold dark:bg-[#2b2b2b]">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-[#2b2b2b]">
                          <motion.div
                            className="h-full bg-red-600 dark:bg-red-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${score}%` }}
                            transition={{ duration: 1, delay: index * 0.2 }}
                          />
                        </div>
                      </div>
                      <span className="w-10 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {score}%
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-gray-200 py-24 dark:border-[#1f1f1f] md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16 text-center"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">The Hiring Problem</h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-400">
              Traditional ATS systems miss exceptional candidates because they rely on keyword matching instead of
              understanding
            </p>
          </motion.div>

          <motion.div
            className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-8 dark:border-[#2c2c2c] dark:bg-[#101010]"
            >
              <h3 className="mb-6 text-lg font-bold tracking-tight">Traditional ATS</h3>
              <ul className="space-y-4">
                {["Keyword Matching Only", "Resume Stuffing Wins", "Misses Great Candidates"].map((item) => (
                  <li key={item} className="flex gap-3">
                    <X size={24} className="text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="rounded-2xl border border-gray-800 bg-black p-8 text-white dark:border-[#d8d8d8] dark:bg-[#faf8f4] dark:text-black"
            >
              <h3 className="mb-6 text-lg font-bold tracking-tight">Redrob AI</h3>
              <ul className="space-y-4">
                {["Semantic Understanding", "Career Intelligence", "Explainable Ranking"].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check size={24} className="text-red-600 dark:text-red-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-gray-200 py-24 dark:border-[#1f1f1f] md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-20 text-center md:mb-24"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="mb-6 text-4xl font-bold tracking-tight md:text-5xl">
              Intelligence at every step.
            </h2>
            <p className="mx-auto max-w-4xl text-[17px] leading-8 text-gray-500 dark:text-gray-400 md:text-[20px]">
              A seamless pipeline that transforms raw talent data into actionable recruitment signal.
            </p>
          </motion.div>

          <motion.div
            className="mx-auto grid max-w-7xl gap-16 md:grid-cols-4 md:gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {stepFlow.map((step, index) => (
              <motion.div
                key={step.title}
                variants={fadeInUp}
                className="relative text-center"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <div className="relative mx-auto mb-9 w-fit">
                  <motion.div
                    className="flex h-28 w-28 items-center justify-center rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 text-gray-900 shadow-[0_14px_35px_rgba(15,23,42,0.08)] dark:border-[#323232] dark:bg-gradient-to-b dark:from-[#171717] dark:to-[#0f0f0f] dark:text-white dark:shadow-[0_18px_45px_rgba(0,0,0,0.34)]"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 3.8, repeat: Infinity, delay: index * 0.15, ease: "easeInOut" }}
                  >
                    <step.icon size={25} strokeWidth={2.1} />
                  </motion.div>
                  {index < stepFlow.length - 1 && (
                    <motion.div
                      className="absolute left-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 items-center md:flex"
                      initial={{ opacity: 0.45, x: -6 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.1 * index }}
                    >
                      <div className="h-px w-10 bg-gradient-to-r from-gray-300 to-gray-400 dark:from-[#454545] dark:to-[#6d6d6d]" />
                      <ArrowRight className="ml-1 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                  )}
                  {index < stepFlow.length - 1 && (
                    <div className="absolute left-1/2 top-[calc(100%+14px)] flex -translate-x-1/2 items-center md:hidden">
                      <div className="h-8 w-px bg-gradient-to-b from-gray-300 to-gray-400 dark:from-[#454545] dark:to-[#6d6d6d]" />
                    </div>
                  )}
                  <div className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-gray-900 text-sm font-bold text-white dark:border-black dark:bg-white dark:text-black">
                    {index + 1}
                  </div>
                </div>
                <h3 className="mb-4 text-[24px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mx-auto max-w-[19rem] text-[16px] leading-9 text-gray-500 dark:text-gray-400 md:text-[17px] md:leading-10">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="border-t border-gray-200 py-24 dark:border-[#1f1f1f] md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mb-16 text-center"
            variants={fadeInUp}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Enterprise Features</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">Everything you need to hire better</p>
          </motion.div>

          <motion.div
            className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
          >
            {featureCards.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                onClick={() => setActiveFeature(index)}
                whileHover={{ y: -4 }}
                className={`cursor-pointer rounded-2xl border p-6 transition ${
                  activeFeature === index
                    ? "border-red-300 bg-red-50 shadow-[0_12px_30px_rgba(239,68,68,0.08)] dark:border-[#6b2f2a] dark:bg-[#221211]"
                    : "border-gray-200 bg-gray-50 dark:border-[#2b2b2b] dark:bg-[#101010]"
                }`}
              >
                <h3 className="mb-2 text-[18px] font-bold tracking-tight">{feature.title}</h3>
                <p
                  className={`text-[15px] leading-7 ${
                    activeFeature === index ? "text-gray-700 dark:text-[#d9cfc1]" : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section
        id="showcase"
        className="border-t border-gray-200 bg-[#f6f5f2] py-20 text-gray-950 dark:border-[#2a2a2a] dark:bg-[#23211f] dark:text-white md:py-28"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.95fr_1.15fr] lg:items-center">
          <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
            <h2 className="mb-8 max-w-xl text-[56px] font-bold leading-[0.94] tracking-tight md:text-[72px]">
              Candidate Intelligence Dashboard
            </h2>
            <p className="mb-12 max-w-xl text-[20px] leading-[1.58] text-gray-600 dark:text-[#bdb3a1] md:text-[22px]">
              Get comprehensive insights about every candidate. From career timelines to behavioral signals, everything
              you need to make informed decisions.
            </p>

            <div className="space-y-7">
              {[
                {
                  icon: CircleCheck,
                  title: "AI Fit Score",
                  desc: "Real-time ranking with confidence metrics",
                },
                {
                  icon: Zap,
                  title: "Skills Intelligence",
                  desc: "Semantic analysis of technical capabilities",
                },
                {
                  icon: TrendingUp,
                  title: "Career Timeline",
                  desc: "Growth trajectory and experience mapping",
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  className="flex items-start gap-4"
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.1 }}
                >
                  <item.icon className="mt-1 h-7 w-7 flex-none text-gray-900 dark:text-[#f3efe8]" />
                  <div>
                    <h3 className="text-[18px] font-bold md:text-[19px]">{item.title}</h3>
                    <p className="mt-1 text-[16px] leading-8 text-gray-600 dark:text-[#bdb3a1] md:text-[17px]">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <button
              type="button"
              onClick={openProject}
              className="mt-10 rounded-full bg-gray-950 px-10 py-4 text-[17px] font-bold text-white transition hover:bg-gray-800 dark:bg-[#f2ede3] dark:text-[#161412] dark:hover:bg-[#fff8ef]"
            >
              Explore Dashboard
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ y: -4 }}
            className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-[0_28px_60px_rgba(15,23,42,0.12)] dark:border-[#3b342f] dark:bg-[linear-gradient(180deg,#171513_0%,#121110_100%)] dark:shadow-[0_30px_65px_rgba(0,0,0,0.42)]"
          >
            <div className="mb-12 flex items-start justify-between gap-8">
              <div>
                <h3 className="text-[22px] font-bold tracking-tight md:text-[24px]">Sarah Chen</h3>
                <p className="mt-1 text-[16px] text-gray-600 dark:text-[#b7ad9b] md:text-[17px]">
                  Senior Product Designer
                </p>
              </div>
              <div className="text-right">
                <div className="text-[44px] font-bold leading-none md:text-[52px]">98%</div>
                <p className="text-[15px] text-gray-600 dark:text-[#b7ad9b]">AI Fit Score</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-8 dark:border-[#2b2622]">
              <h4 className="mb-4 text-[17px] font-bold text-gray-700 dark:text-[#d9cfbe]">Key Skills</h4>
              <div className="flex flex-wrap gap-3">
                {["UI/UX Design", "Figma", "Leadership", "Analytics", "Product Strategy"].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-gray-100 px-4 py-2 text-[14px] font-bold text-gray-950 dark:border dark:border-[#39322b] dark:bg-[#2c2622] dark:text-[#f5efe5]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <h4 className="mb-5 text-[17px] font-bold text-gray-700 dark:text-[#d9cfbe]">Experience</h4>
              <div className="space-y-5">
                {[
                  { title: "Senior Designer", meta: "Tech Corp - 2021 - Present" },
                  { title: "Product Designer", meta: "Design Studio - 2019 - 2021" },
                ].map((role, index) => (
                  <motion.div
                    key={role.title}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: 14 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.12 * index }}
                  >
                    <div className="mt-2 h-2.5 w-2.5 rounded-full bg-gray-950 dark:bg-[#f5efe5]" />
                    <div>
                      <div className="text-[18px] font-bold">{role.title}</div>
                      <div className="text-[16px] text-gray-600 dark:text-[#b7ad9b]">{role.meta}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6 dark:border-[#2b2622]">
              <h4 className="mb-4 text-[17px] font-bold text-gray-700 dark:text-[#d9cfbe]">Why ranked #1</h4>
              <div className="space-y-2">
                {["100% skills alignment", "10+ years experience", "Leadership experience matches"].map((reason, index) => (
                  <motion.div
                    key={reason}
                    className="flex items-center gap-2 text-[16px] font-semibold"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: 0.1 * index }}
                  >
                    <Check className="h-4 w-4 dark:text-[#f5efe5]" />
                    <span>{reason}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-t border-gray-200 bg-black py-24 text-white dark:border-[#1f1f1f] dark:bg-white dark:text-black md:py-32">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <motion.div variants={fadeInUp} initial="initial" whileInView="animate" viewport={{ once: true }}>
            <h2 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              The Future of Hiring Starts Here
            </h2>
            <p className="mb-10 text-xl leading-relaxed opacity-90">
              Join forward-thinking companies that are hiring smarter with Redrob AI
            </p>
            <button
              type="button"
              onClick={openProject}
              className="rounded-full bg-red-600 px-10 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-red-700 hover:shadow-xl dark:bg-red-500 dark:hover:bg-red-600"
            >
              Start Ranking Candidates
            </button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
