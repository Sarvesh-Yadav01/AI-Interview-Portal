const OpenAI = require("openai");
const { hrTopics, aptitudeTopics } = require("./interviewConfig");




const fallbackAptitude = [
  {
    topic: "Quantitative Aptitude",
    question: "A product is sold at a 20% profit. If its cost price is 750, what is the selling price?",
    options: ["850", "875", "900", "925"],
    correctAnswer: "900",
    difficulty: "Easy"
  },
  {
    topic: "Quantitative Aptitude",
    question: "If 12 workers complete a task in 15 days, how many days will 20 workers take at the same rate?",
    options: ["6", "8", "9", "10"],
    correctAnswer: "9",
    difficulty: "Easy"
  },
  {
    topic: "Logical Reasoning",
    question: "Find the next term: 3, 6, 12, 24, ?",
    options: ["30", "36", "42", "48"],
    correctAnswer: "48",
    difficulty: "Easy"
  },
  {
    topic: "Logical Reasoning",
    question: "If all Bloops are Razzies and all Razzies are Lazzies, which statement must be true?",
    options: ["All Bloops are Lazzies", "All Lazzies are Bloops", "No Bloops are Lazzies", "Some Razzies are not Lazzies"],
    correctAnswer: "All Bloops are Lazzies",
    difficulty: "Easy"
  },
  {
    topic: "Verbal Ability",
    question: "Choose the closest meaning of 'meticulous'.",
    options: ["Careless", "Precise", "Fast", "Ordinary"],
    correctAnswer: "Precise",
    difficulty: "Moderate"
  },
  {
    topic: "Verbal Ability",
    question: "Choose the grammatically correct sentence.",
    options: ["He do not agree.", "He does not agrees.", "He does not agree.", "He did not agrees."],
    correctAnswer: "He does not agree.",
    difficulty: "Moderate"
  },
  {
    topic: "Puzzles",
    question: "A clock shows 3:15. What is the angle between the hour and minute hands?",
    options: ["0 degrees", "7.5 degrees", "15 degrees", "30 degrees"],
    correctAnswer: "7.5 degrees",
    difficulty: "Moderate"
  },
  {
    topic: "Puzzles",
    question: "Five people sit in a row. A is left of B, C is right of B, and D is left of A. Who is definitely not leftmost?",
    options: ["A", "B", "C", "D"],
    correctAnswer: "C",
    difficulty: "Moderate"
  },
  {
    topic: "Quantitative Aptitude",
    question: "What is the average of 14, 18, 22, 26, and 30?",
    options: ["20", "21", "22", "24"],
    correctAnswer: "22",
    difficulty: "Hard"
  },
  {
    topic: "Logical Reasoning",
    question: "Statements: Some APIs are services. All services need monitoring. Which conclusion follows?",
    options: ["Some APIs need monitoring", "All APIs need monitoring", "No API needs monitoring", "All monitoring is service"],
    correctAnswer: "Some APIs need monitoring",
    difficulty: "Hard"
  }
];

function fallbackHrQuestions() {
  return [
    "Tell me about yourself and the kind of role you are looking for.",
    "Why do you want to join this company?",
    "Describe one project or achievement you are proud of.",
    "Tell me about a time you worked in a team and handled disagreement.",
    "What are your biggest strengths and one area you are improving?",
    "How do you handle pressure or tight deadlines?",
    "Where do you see yourself in the next two years?",
    "Why should we move you to the next round?"
  ].map((question, index) =>
    normalizeQuestion(
      {
        type: "written",
        topic: hrTopics[index] || "HR & Behavioral",
        difficulty: "Moderate",
        question
      },
      index,
      "written"
    )
  );
}

function shuffle(items) {
  return items
    .map((item) => ({ item, rank: Math.random() }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

function shuffleMcqOptions(question) {
  if (question.type !== "mcq") return question;

  const options = shuffle(question.options || []);
  return {
    ...question,
    options,
    correctAnswer: options.includes(question.correctAnswer) ? question.correctAnswer : options[0] || ""
  };
}

function hasFourUniqueOptions(options) {
  if (!Array.isArray(options) || options.length !== 4) return false;
  const cleaned = options.map((option) => String(option || "").trim()).filter(Boolean);
  return cleaned.length === 4 && new Set(cleaned.map((option) => option.toLowerCase())).size === 4;
}

function getRawCorrectAnswer(item) {
  return item.correctAnswer || item.answer || item.correctOption || item.correct_option || item.correct || "";
}

function coerceMcqItem(item) {
  const options = Array.isArray(item.options)
    ? item.options.map((option) => String(option || "").replace(/^[A-D][).:-]\s*/i, "").trim()).filter(Boolean).slice(0, 4)
    : [];
  let correctAnswer = String(getRawCorrectAnswer(item)).trim();
  const letterMatch = correctAnswer.match(/^[A-D]$/i);
  const numberMatch = correctAnswer.match(/^[1-4]$/);

  if (letterMatch && options.length === 4) {
    correctAnswer = options[letterMatch[0].toUpperCase().charCodeAt(0) - 65];
  } else if (numberMatch && options.length === 4) {
    correctAnswer = options[Number(numberMatch[0]) - 1];
  } else {
    correctAnswer = correctAnswer.replace(/^[A-D][).:-]\s*/i, "").trim();
  }

  return {
    ...item,
    options,
    correctAnswer
  };
}

function hasValidMcq(item) {
  const normalized = coerceMcqItem(item || {});
  if (!normalized || normalized.type !== "mcq" || !hasFourUniqueOptions(normalized.options)) return false;
  const correctAnswer = String(normalized.correctAnswer || "").trim().toLowerCase();
  return Boolean(correctAnswer) && normalized.options.some((option) => String(option).trim().toLowerCase() === correctAnswer);
}

function matchCorrectAnswer(options, correctAnswer) {
  const normalized = String(correctAnswer || "").trim().toLowerCase();
  return options.find((option) => String(option).trim().toLowerCase() === normalized) || "";
}

function hasQuestionText(item) {
  return String(item && (item.question || item.prompt) || "").trim().length >= 12;
}

function isValidGeneratedSet(roundKey, items) {
  if (!Array.isArray(items)) return false;

  if (roundKey === "aptitude") {
    return items.length === 10 && items.every((item) => hasQuestionText(item) && hasValidMcq({ ...item, type: "mcq" }));
  }

  if (roundKey === "technical") {
    if (items.length !== 10) return false;
    return items.every((item, index) => {
      const shape = technicalShapeForIndex(index);
      return hasQuestionText(item) && (shape.type === "mcq" ? hasValidMcq({ ...item, type: "mcq" }) : true);
    });
  }

  if (roundKey === "voice") {
    return items.length === 5 && items.every(hasQuestionText);
  }

  return items.length > 0 && items.every(hasQuestionText);
}

function isConfiguredApiKey() {
  const key = process.env.OPENAI_API_KEY;
  return key && key !== "your_openai_api_key";
}

function parseJsonResponse(content) {
  const cleaned = String(content || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

function getClient() {
  if (!isConfiguredApiKey()) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function questionId(prefix, index) {
  return `${prefix}-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`;
}

function normalizeQuestion(item, index, fallbackType = "written") {
  const type = ["mcq", "written", "coding"].includes(item.type) ? item.type : fallbackType;
  const normalizedItem = type === "mcq" ? coerceMcqItem(item) : item;
  const options = Array.isArray(normalizedItem.options) ? normalizedItem.options.filter(Boolean).slice(0, 4) : [];
  const mcqOptions = hasFourUniqueOptions(options) ? options.map((option) => String(option).trim()) : [];
  const correctAnswer = type === "mcq" ? matchCorrectAnswer(mcqOptions, normalizedItem.correctAnswer) : item.correctAnswer || "";

  return {
    id: item.id || questionId(type, index),
    type,
    topic: item.topic || "General",
    difficulty: item.difficulty || "Moderate",
    question: item.question || item.prompt || String(item),
    options: type === "mcq" ? mcqOptions : [],
    correctAnswer,
    timeMinutes: Number(item.timeMinutes || 0)
  };
}



function fallbackAptitudeQuestions() {
  const ordered = [
    ...shuffle(fallbackAptitude.filter((item) => item.difficulty === "Easy")),
    ...shuffle(fallbackAptitude.filter((item) => item.difficulty === "Moderate")),
    ...shuffle(fallbackAptitude.filter((item) => item.difficulty === "Hard"))
  ];

  return ordered.map((item, index) =>
    shuffleMcqOptions(normalizeQuestion({ ...item, type: "mcq", difficulty: aptitudeDifficultyForIndex(index) }, index, "mcq"))
  );
}

function aptitudeDifficultyForIndex(index) {
  if (index < 4) return "Easy";
  if (index < 8) return "Moderate";
  return "Hard";
}

function technicalShapeForIndex(index) {
  if (index < 3) return { type: "mcq", difficulty: "Easy" };
  if (index < 6) return { type: "mcq", difficulty: "Moderate" };
  if (index < 7) return { type: "mcq", difficulty: "Hard" };
  return { type: "written", difficulty: ["Easy", "Moderate", "Hard"][index - 7] || "Moderate" };
}

function fallbackTechnicalQuestions(subcategory) {
  const mcqSpecs = [
    {
      difficulty: "Easy",
      question: `In ${subcategory}, which practice is the best first step before changing production code?`,
      options: ["Read requirements and current tests", "Edit production directly", "Skip local setup", "Disable validation"],
      correctAnswer: "Read requirements and current tests"
    },
    {
      difficulty: "Easy",
      question: `Which artifact helps a ${subcategory} developer understand an API contract quickly?`,
      options: ["OpenAPI documentation", "Random console output", "A color palette", "A deployment invoice"],
      correctAnswer: "OpenAPI documentation"
    },
    {
      difficulty: "Easy",
      question: `What is the main benefit of writing automated tests for ${subcategory} work?`,
      options: ["Catching regressions early", "Increasing bundle size", "Removing code reviews", "Hiding runtime errors"],
      correctAnswer: "Catching regressions early"
    },
    {
      difficulty: "Moderate",
      question: `Which option is the safest way to handle errors in a ${subcategory} project?`,
      options: ["Log context and return controlled responses", "Expose stack traces to users", "Ignore failed requests", "Retry forever without limits"],
      correctAnswer: "Log context and return controlled responses"
    },
    {
      difficulty: "Moderate",
      question: `What should be checked first when a ${subcategory} feature is slow in production?`,
      options: ["Metrics, traces, and recent changes", "Only the CSS file", "The company logo", "Unrelated user records"],
      correctAnswer: "Metrics, traces, and recent changes"
    },
    {
      difficulty: "Moderate",
      question: `Which metric best indicates whether a deployed ${subcategory} change is healthy?`,
      options: ["Error rate after deployment", "Number of comments in code", "Laptop battery level", "Meeting duration"],
      correctAnswer: "Error rate after deployment"
    },
    {
      difficulty: "Hard",
      question: `In ${subcategory}, which approach best reduces risk during a high-traffic release?`,
      options: ["Gradual rollout with monitoring", "Ship everything at once", "Delete old logs before release", "Turn off alerts"],
      correctAnswer: "Gradual rollout with monitoring"
    }
  ];

  const orderedMcqSpecs = [
    ...shuffle(mcqSpecs.filter((item) => item.difficulty === "Easy")),
    ...shuffle(mcqSpecs.filter((item) => item.difficulty === "Moderate")),
    ...shuffle(mcqSpecs.filter((item) => item.difficulty === "Hard"))
  ];

  const mcq = orderedMcqSpecs.map((item, index) =>
    shuffleMcqOptions(normalizeQuestion(
      {
        type: "mcq",
        topic: subcategory,
        difficulty: item.difficulty,
        question: item.question,
        options: item.options,
        correctAnswer: item.correctAnswer
      },
      index,
      "mcq"
    ))
  );

  const written = ["Easy", "Moderate", "Hard"].map((difficulty, index) =>
    normalizeQuestion(
      {
        type: "written",
        topic: subcategory,
        difficulty,
        question: `Explain a ${difficulty.toLowerCase()} level ${subcategory} concept with one real project example.`
      },
      index + 7,
      "written"
    )
  );

  return [...mcq, ...written];
}

function fallbackVoiceQuestions() {
  const followUps = shuffle([
    "Explain one project challenge you solved and the impact it created.",
    "Describe a situation where you received critical feedback and improved.",
    "How do you prioritize tasks when multiple deadlines are close?",
    "Why should this company move you to the next interview round?",
    "Tell me about a time you learned a new skill quickly.",
    "Describe how you communicate technical work to a non-technical person.",
    "What motivates you when work becomes repetitive or difficult?"
  ]).slice(0, 4);

  return ["Introduce yourself.", ...followUps].map((question, index) =>
    normalizeQuestion({ type: "written", topic: "Voice Communication", difficulty: "Moderate", question }, index, "written")
  );
}

async function generateJson(prompt, system) {
  const client = getClient();

  if (!client) {
    return null;
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 1.15,
    presence_penalty: 0.7,
    frequency_penalty: 0.6
  });

  return parseJsonResponse(response.choices[0].message.content);
}

async function safeGenerateJson(prompt, system, roundKey) {
  try {
    return await generateJson(prompt, system);
  } catch (error) {
    console.warn(`OpenAI question generation failed for ${roundKey}: ${error.status || error.code || error.message}`);
    return null;
  }
}

exports.generateRoundQuestions = async ({ roundKey, subcategory, previousQuestions = [], candidateId = "" }) => {
  const generationSeed = questionId(`${roundKey}-fresh-set`, Date.now());
  const avoidQuestions = previousQuestions.filter(Boolean).slice(0, 50);
  const freshnessContext = {
    generationSeed,
    candidateId,
    generatedAt: new Date().toISOString(),
    avoidQuestions,
    rule: "Do not repeat or lightly reword any avoidQuestions. Create a brand-new industry-realistic question set for this request."
  };

  try {
    if (roundKey === "hr") {
      const items = await safeGenerateJson(
        JSON.stringify({
          instruction:
            "Create 8 practical HR and behavioral interview questions for a fresher or early-career candidate. Cover self introduction, motivation, teamwork, conflict handling, strengths, goals, company fit, and communication. Return JSON array only.",
          topics: hrTopics,
          freshnessContext
        }),
        "Return only valid JSON. Each item must have type='written', topic, difficulty, question.",
        roundKey
      );

      return Array.isArray(items) && items.length === 8
        ? items.map((item, index) => normalizeQuestion({ ...item, type: "written" }, index, "written"))
        : fallbackHrQuestions();
    }

    if (roundKey === "aptitude") {

      const items = await safeGenerateJson(
        JSON.stringify({
          instruction:
            "Create 10 brand-new random industry/company online assessment MCQs from Quantitative Aptitude, Logical Reasoning, Verbal Ability, and Puzzles. Keep the same format every time: questions 1-4 Easy, questions 5-8 Moderate, questions 9-10 Hard. Each question must have 4 shuffled options and one correctAnswer. Questions must feel like real company screening questions and must be different for every login/start. Do not repeat common sample questions, prior questions, or lightly reworded versions. Return JSON array only.",
          topics: aptitudeTopics,
          freshnessContext
        }),
        "Return only valid JSON. Each item must have type='mcq', topic, difficulty, question, options array of 4 strings, correctAnswer.",
        roundKey
      );

      return isValidGeneratedSet("aptitude", items)
        ? items.map((item, index) =>
            shuffleMcqOptions(normalizeQuestion({ ...item, type: "mcq", difficulty: aptitudeDifficultyForIndex(index) }, index, "mcq"))
          )
        : fallbackAptitudeQuestions();
    }

    if (roundKey === "voice") {
      const items = await safeGenerateJson(
        JSON.stringify({
          instruction:
            "Create 5 concise spoken interview questions for round 3. Keep question 1 exactly 'Introduce yourself.' Questions 2-5 must be fresh, random, and different on each request. Avoid generic repeated questions and avoid reusing the same wording from previous generations. Test project explanation, feedback handling, prioritization, motivation, teamwork, communication, problem solving, ownership, learning speed, or workplace judgement. Return JSON array only.",
          freshnessContext
        }),
        "Return only valid JSON. Each item must have type='written', topic, difficulty, question.",
        roundKey
      );

      return isValidGeneratedSet("voice", items)
        ? items.map((item, index) =>
            normalizeQuestion(
              { ...item, type: "written", question: index === 0 ? "Introduce yourself." : item.question },
              index,
              "written"
            )
          )
        : fallbackVoiceQuestions();
    }

    const safeSubcategory = subcategory || "MERN Stack Developer";
    const items = await safeGenerateJson(
      JSON.stringify({
        instruction:
          "Create a strict brand-new random industry technical assessment for the selected subcategory. Keep the same format every time. Return exactly 10 questions: 7 MCQs with 4 shuffled options and correctAnswer where 3 are Easy, 3 are Moderate, and 1 is Hard, followed by 3 written questions with difficulties Easy, Moderate, and Hard. Questions must be practical and commonly asked in real interviews for this role. Make the set different for every login/start. Avoid repeating prior generic questions, prior questions, or lightly reworded versions.",
        subcategory: safeSubcategory,
        freshnessContext
      }),
      "Return only valid JSON array. Each item must have type mcq or written, topic, difficulty, question, options for MCQ, correctAnswer for MCQ.",
      roundKey
    );

    return isValidGeneratedSet("technical", items)
      ? items.map((item, index) => {
          const shape = technicalShapeForIndex(index);
          return shuffleMcqOptions(normalizeQuestion({ ...item, ...shape }, index, shape.type));
        })
      : fallbackTechnicalQuestions(safeSubcategory);
  } catch (error) {
    if (roundKey === "hr") return fallbackHrQuestions();
    if (roundKey === "aptitude") return fallbackAptitudeQuestions();
    if (roundKey === "voice") return fallbackVoiceQuestions();
    return fallbackTechnicalQuestions(subcategory || "MERN Stack Developer");
  }
};

exports.generateQualificationEmail = async ({ user, subcategory, results }) => {
  const client = getClient();
  const fallback = `Dear ${user.name},\n\nCongratulations for qualifying the exam. You successfully cleared the Aptitude, Technical, and Voice Interview rounds for ${subcategory}. Your performance shows readiness for the next hiring stage.\n\nRegards,\nAI Interview Portal`;

  if (!client) return fallback;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Write a concise professional congratulations email. Return plain text only."
        },
        {
          role: "user",
          content: JSON.stringify({
            candidateName: user.name,
            subcategory,
            message: "Congratulate the candidate for qualifying the complete exam.",
            scores: results.map((item) => ({ round: item.category, score: item.score }))
          })
        }
      ],
      temperature: 0.7
    });

    return response.choices[0].message.content || fallback;
  } catch (error) {
    return fallback;
  }
};


function scoreTextAnswer(answer, type) {
  const cleaned = String(answer || "").trim().replace(/\s+/g, " ");
  const wordCount = cleaned ? cleaned.split(" ").length : 0;

  if (!wordCount) return 0;
  if (type === "coding") {
    const hasCode = /function|class|const|let|def|public|return|for|while|if|\{|\}/.test(cleaned);
    return Math.min(90, 30 + Math.min(wordCount, 80) + (hasCode ? 20 : 0));
  }
  if (wordCount < 8) return 15;
  if (wordCount < 25) return 40;
  if (wordCount < 60) return 62;
  return 78;
}

function localEvaluate(questions, submittedAnswers) {
  const answers = questions.map((question, index) => {
    const answer = submittedAnswers[index] || "";
    const score =
      question.type === "mcq"
        ? answer === question.correctAnswer
          ? 100
          : 0
        : scoreTextAnswer(answer, question.type);

    return {
      question: question.question,
      type: question.type,
      topic: question.topic,
      difficulty: question.difficulty,
      options: question.options,
      correctAnswer: question.type === "mcq" ? question.correctAnswer : "",
      answer,
      feedback:
        question.type === "mcq"
          ? score === 100
            ? "Correct answer."
            : `Incorrect. Correct answer: ${question.correctAnswer}`
          : score >= 60
            ? "Acceptable answer. Add clearer examples, trade-offs, and measurable impact to improve."
            : "Answer is weak or too short. Give structured reasoning, practical details, and a concrete example.",
      score,
      tips: ["Be specific", "Use real project context", "Mention trade-offs and impact"]
    };
  });

  const score = answers.length
    ? Math.round(answers.reduce((sum, item) => sum + item.score, 0) / answers.length)
    : 0;

  return {
    score,
    summary: "Strict evaluation completed. Blank, generic, and incorrect answers are heavily penalized.",
    answers
  };
}

function normalizeEvaluation(evaluation, questions, submittedAnswers) {
  const local = localEvaluate(questions, submittedAnswers);
  const answers = local.answers.map((item, index) => {
    if (item.type === "mcq") return item;

    const aiItem = evaluation.answers && evaluation.answers[index] ? evaluation.answers[index] : {};
    const score = item.answer.trim()
      ? Math.max(0, Math.min(100, Math.round(Number(aiItem.score) || item.score)))
      : 0;

    return {
      ...item,
      score,
      feedback: aiItem.feedback || item.feedback,
      tips: Array.isArray(aiItem.tips) && aiItem.tips.length ? aiItem.tips.slice(0, 4) : item.tips
    };
  });

  const score = answers.length
    ? Math.round(answers.reduce((sum, item) => sum + item.score, 0) / answers.length)
    : 0;

  return {
    score,
    summary: evaluation.summary || local.summary,
    answers
  };
}

exports.evaluateRound = async ({ round, questions, submittedAnswers, subcategory }) => {
  const client = getClient();

  if (!client) {
    return localEvaluate(questions, submittedAnswers);
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a strict professional interviewer. Return valid JSON with score, summary, answers. Evaluate written/coding answers strictly. Do not give friendly praise. Blank answers score 0. Generic answers below 25. MCQ scoring is already deterministic, but include feedback if present."
        },
        {
          role: "user",
          content: JSON.stringify({
            round,
            subcategory,
            questions,
            submittedAnswers
          })
        }
      ],
      temperature: 0.3
    });

    return normalizeEvaluation(parseJsonResponse(response.choices[0].message.content), questions, submittedAnswers);
  } catch (error) {
    return localEvaluate(questions, submittedAnswers);
  }
};

exports.generateRoleQuestions = async (category, role) => {
  const questions = await exports.generateRoundQuestions({
    roundKey: "technical",
    subcategory: role || category
  });

  return questions.map((item) => item.question).slice(0, 5);
};


exports.evaluateInterview = async (category, answers, role) => {
  const questions = answers.map((item, index) =>
    normalizeQuestion({ type: "written", topic: category, question: item.question }, index, "written")
  );
  return exports.evaluateRound({
    round: category,
    questions,
    submittedAnswers: answers.map((item) => item.answer || ""),
    subcategory: role
  });
};

function fallbackResumeAnalysis(text, filename) {
  const normalized = text.toLowerCase();
  const checks = [
    /\b(project|projects)\b/.test(normalized),
    /\b(skill|skills|technologies|tech stack)\b/.test(normalized),
    /\b(experience|internship|work)\b/.test(normalized),
    /\b(education|degree|university|college)\b/.test(normalized),
    /\b(github|linkedin|portfolio)\b/.test(normalized),
    /\b(api|database|node|react|javascript|python|mongodb|sql)\b/.test(normalized)
  ];
  const atsScore = Math.max(20, Math.round((checks.filter(Boolean).length / checks.length) * 100));

  return {
    atsScore,
    feedback: `Resume ${filename} analyzed. Score is based on visible sections, skills, projects, links, and role keywords.`,
    strengths: [
      checks[0] ? "Project details are present." : "Resume text was readable from the PDF.",
      checks[1] ? "Skills or technology section is present." : "Basic resume structure is available.",
      checks[4] ? "Professional links are included." : "Candidate information is available."
    ],
    improvements: [
      checks[2] ? "Add measurable impact for each experience." : "Add internship, work, or practical project experience.",
      checks[5] ? "Group skills by category for easier ATS matching." : "Add role-specific technical keywords.",
      "Use bullet points with action, technology, and result."
    ]
  };
}

exports.analyzeResume = async (name, filename, resumeText = "") => {
  const preview = resumeText.trim().slice(0, 3500);
  const client = getClient();

  if (!preview) {
    return {
      atsScore: 0,
      feedback: "Resume uploaded, but readable text could not be extracted from this PDF.",
      strengths: ["PDF file was uploaded successfully."],
      improvements: ["Upload a text-based PDF instead of a scanned image PDF.", "Keep headings clear: Skills, Projects, Experience, Education."],
      extractedTextPreview: ""
    };
  }

  if (!client) {
    return {
      ...fallbackResumeAnalysis(preview, filename),
      extractedTextPreview: preview.slice(0, 800)
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an ATS and technical recruiter. Return only valid JSON with atsScore number 0-100, feedback string, strengths array, improvements array. Be practical and concise."
        },
        {
          role: "user",
          content: JSON.stringify({
            candidateName: name,
            filename,
            resumeText: preview
          })
        }
      ]
    });

    const analysis = parseJsonResponse(response.choices[0].message.content);

    return {
      atsScore: Math.max(0, Math.min(100, Math.round(Number(analysis.atsScore) || 0))),
      feedback: analysis.feedback || "Resume analyzed successfully.",
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths.slice(0, 5) : [],
      improvements: Array.isArray(analysis.improvements) ? analysis.improvements.slice(0, 5) : [],
      extractedTextPreview: preview.slice(0, 800)
    };
  } catch (error) {
    return {
      ...fallbackResumeAnalysis(preview, filename),
      extractedTextPreview: preview.slice(0, 800)
    };
  }
};
