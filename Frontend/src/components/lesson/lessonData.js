export const lessonMeta = {
  course: "Physics 301: Thermodynamics",
  module: "Module 2: The First Law & Enthalpy",
  lesson: "Intro to Entropy",
  lessonId: 203,
  duration: 2520, // 42 min in seconds
  instructor: "Dr. Alan Davis",
  progress: 35,
};

export const transcriptSegments = [
  { id: 1, start: 0,   end: 32,  text: "Welcome to our deep dive into entropy — one of the most important and often misunderstood concepts in all of thermodynamics." },
  { id: 2, start: 33,  end: 78,  text: "At its core, entropy is a measure of disorder or randomness in a system. But that description, while common, is actually a simplification." },
  { id: 3, start: 79,  end: 140, text: "The Second Law of Thermodynamics tells us that in any spontaneous process, the total entropy of an isolated system always increases or remains constant." },
  { id: 4, start: 141, end: 210, text: "Let's think about this carefully. Consider a drop of ink falling into a glass of water. It spreads out — that is entropy increasing." },
  { id: 5, start: 211, end: 285, text: "Now, here is the critical question: why can't the ink spontaneously re-gather? The answer lies in probability, and this is where Boltzmann's statistical interpretation becomes essential." },
  { id: 6, start: 286, end: 360, text: "Ludwig Boltzmann defined entropy as S = k · ln(Ω), where Ω is the number of microstates corresponding to the macrostate, and k is Boltzmann's constant." },
  { id: 7, start: 361, end: 440, text: "A microstate is a specific arrangement of particles. A macrostate is what we observe — temperature, pressure, volume. The more microstates a macrostate has, the higher its entropy." },
  { id: 8, start: 441, end: 520, text: "This statistical view unifies thermodynamics with mechanics. Entropy is not mysterious — it's simply probability at scale." },
  { id: 9, start: 521, end: 600, text: "In engineering applications, we deal with entropy changes, not absolute entropy values. The Clausius inequality gives us a way to calculate this: dS ≥ δQ / T." },
  { id: 10, start: 601, end: 680, text: "For a reversible process, dS equals δQ/T exactly. For an irreversible process, entropy generation is always positive — this is irreversibility in action." },
];

export const conceptMarkers = [
  { id: 1, time: 0,   label: "Introduction",         type: "checkpoint" },
  { id: 2, time: 79,  label: "Second Law",            type: "key-concept" },
  { id: 3, time: 211, label: "Statistical View",      type: "key-concept" },
  { id: 4, time: 286, label: "Boltzmann's Formula",   type: "struggle",    struggleDetected: true },
  { id: 5, time: 441, label: "Microstates",           type: "checkpoint" },
  { id: 6, start: 521, label: "Clausius Inequality",  type: "key-concept" },
];

export const mentorHints = [
  {
    level: 1,
    question: "What does Boltzmann's formula S = k·ln(Ω) actually mean?",
    hint: "Try thinking about Ω not as a physical thing, but as a count. If you have 4 gas molecules in a box, how many ways can they be arranged on the left side vs. spread across the whole box?",
  },
  {
    level: 2,
    question: "Why does ln(Ω) appear in the formula?",
    hint: "Boltzmann needed entropy to be additive — if you combine two systems, their entropies should add. But the number of microstates multiply. What mathematical function converts multiplication into addition?",
  },
  {
    level: 3,
    question: "What does this tell us about the direction of time?",
    hint: "The state with the most microstates is the one we observe because it is overwhelmingly more probable. Systems evolve toward higher entropy because there are astronomically more ways to be 'disordered' than ordered.",
  },
];
