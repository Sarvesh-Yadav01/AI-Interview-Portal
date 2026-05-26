const rounds = {
  aptitude: {
    key: "aptitude",
    category: "Aptitude & Reasoning",
    title: "Aptitude & Reasoning",
    durationMinutes: 10,
    questionCount: 10,
    description: "Industry-style MCQ screening with 4 easy, 4 moderate, and 2 hard aptitude questions."
  },
  technical: {
    key: "technical",
    category: "Technical Round",
    title: "Technical Round",
    durationMinutes: 10,
    questionCount: 10,
    description: "Role-specific technical assessment with 7 MCQs and 3 written answers."
  },
  voice: {
    key: "voice",
    category: "Voice Interview",
    title: "Voice Interview",
    durationMinutes: 6,
    questionCount: 5,
    description: "Spoken interview simulation with browser speech capture and communication review."
  }
};

const hrTopics = [
  "Self Introduction",
  "Motivation",
  "Teamwork",
  "Conflict Handling",
  "Strengths & Weaknesses",
  "Career Goals",
  "Company Fit",
  "Communication"
];

const aptitudeTopics = [
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Verbal Ability",
  "Puzzles"
];

const technicalCategories = [
  {
    name: "Software Development",
    subcategories: [
      "Frontend Developer",
      "Backend Developer",
      "Full Stack Developer",
      "MERN Stack Developer",
      "MEAN Stack Developer",
      "React Developer",
      "Next.js Developer",
      "Node.js Developer",
      "Java Developer",
      "Python Developer"
    ]
  },
  {
    name: "Data Science & AI",
    subcategories: [
      "Data Analyst",
      "Data Scientist",
      "ML Engineer",
      "Deep Learning Engineer",
      "NLP Engineer",
      "Computer Vision Engineer",
      "GenAI Engineer",
      "Prompt Engineer",
      "AI Researcher"
    ]
  },
  {
    name: "Programming Languages",
    subcategories: ["JavaScript", "TypeScript", "Python", "Java", "C++", "Go", "Rust", "PHP"]
  },
  {
    name: "Core Computer Science",
    subcategories: [
      "DSA",
      "DBMS",
      "Operating System",
      "Computer Networks",
      "OOPs",
      "System Design",
      "Low-Level Design",
      "High-Level Design"
    ]
  },
  {
    name: "DevOps & Cloud",
    subcategories: ["Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Linux", "Jenkins", "Terraform"]
  },
  {
    name: "Mobile App Development",
    subcategories: ["Android Developer", "Flutter Developer", "React Native Developer", "iOS Developer"]
  },
  {
    name: "Cyber Security",
    subcategories: [
      "Ethical Hacking",
      "Penetration Testing",
      "Network Security",
      "SOC Analyst",
      "Security Engineer"
    ]
  }
];

const technicalSubcategories = technicalCategories.flatMap((category) => category.subcategories);

module.exports = {
  rounds,
  hrTopics,
  aptitudeTopics,
  technicalCategories,
  technicalSubcategories
};
