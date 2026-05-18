export type BacbTask = {
  id: string;
  text: string;
};

export type BacbDomain = {
  id: string;
  title: string;
  questionCount: number;
  examPercent: number;
  tasks: BacbTask[];
};

export const BACB_OUTLINE_SOURCE = {
  label: "Behavior Analyst Certification Board. (2022). BCBA test content outline (6th ed.). Updated 09/2024.",
  url: "https://www.bacb.com/wp-content/bcba-outline-6thEd/",
};

export const BACB_6TH_EDITION_DOMAINS: BacbDomain[] = [
  {
    id: "A",
    title: "Behaviorism and Philosophical Foundations",
    questionCount: 8,
    examPercent: 5,
    tasks: [
      { id: "A.1", text: "Identify the goals of behavior analysis as a science (i.e., description, prediction, control)." },
      { id: "A.2", text: "Explain the philosophical assumptions underlying the science of behavior analysis (e.g., selectionism, determinism, empiricism, parsimony, pragmatism)." },
      { id: "A.3", text: "Explain behavior from the perspective of radical behaviorism." },
      { id: "A.4", text: "Distinguish among behaviorism, the experimental analysis of behavior, applied behavior analysis, and professional practice guided by the science of behavior analysis." },
      { id: "A.5", text: "Identify and describe dimensions of applied behavior analysis." },
    ],
  },
  {
    id: "B",
    title: "Concepts and Principles",
    questionCount: 24,
    examPercent: 14,
    tasks: [
      { id: "B.1", text: "Identify and distinguish among behavior, response, and response class." },
      { id: "B.2", text: "Identify and distinguish between stimulus and stimulus class." },
      { id: "B.3", text: "Identify and distinguish between respondent and operant conditioning." },
      { id: "B.4", text: "Identify and distinguish between positive and negative reinforcement contingencies." },
      { id: "B.5", text: "Identify and distinguish between positive and negative punishment contingencies." },
      { id: "B.6", text: "Identify and distinguish between automatic and socially mediated contingencies." },
      { id: "B.7", text: "Identify and distinguish among unconditioned, conditioned, and generalized reinforcers." },
      { id: "B.8", text: "Identify and distinguish among unconditioned, conditioned, and generalized punishers." },
      { id: "B.9", text: "Identify and distinguish among simple schedules of reinforcement." },
      { id: "B.10", text: "Identify and distinguish among concurrent, multiple, mixed, and chained schedules of reinforcement." },
      { id: "B.11", text: "Identify and distinguish between operant and respondent extinction as operations and processes." },
      { id: "B.12", text: "Identify examples of stimulus control." },
      { id: "B.13", text: "Identify examples of stimulus discrimination." },
      { id: "B.14", text: "Identify and distinguish between stimulus and response generalization." },
      { id: "B.15", text: "Identify examples of response maintenance." },
      { id: "B.16", text: "Identify examples of motivating operations." },
      { id: "B.17", text: "Distinguish between motivating operations and stimulus control." },
      { id: "B.18", text: "Identify and distinguish between rule-governed and contingency-shaped behavior." },
      { id: "B.19", text: "Identify and distinguish among verbal operants." },
      { id: "B.20", text: "Identify the role of multiple control in verbal behavior." },
      { id: "B.21", text: "Identify examples of processes that promote emergent relations and generative performance." },
      { id: "B.22", text: "Identify ways behavioral momentum can be used to understand response persistence." },
      { id: "B.23", text: "Identify ways the matching law can be used to interpret response allocation." },
      { id: "B.24", text: "Identify and distinguish between imitation and observational learning." },
    ],
  },
  {
    id: "C",
    title: "Measurement, Data Display, and Interpretation",
    questionCount: 21,
    examPercent: 12,
    tasks: [
      { id: "C.1", text: "Create operational definitions of behavior." },
      { id: "C.2", text: "Distinguish among direct, indirect, and product measures of behavior." },
      { id: "C.3", text: "Measure occurrence." },
      { id: "C.4", text: "Measure temporal dimensions of behavior (e.g., duration, latency, interresponse time)." },
      { id: "C.5", text: "Distinguish between continuous and discontinuous measurement procedures." },
      { id: "C.6", text: "Design and apply discontinuous measurement procedures (e.g., interval recording, time sampling)." },
      { id: "C.7", text: "Measure efficiency (e.g., trials to criterion, cost-benefit analysis, training duration)." },
      { id: "C.8", text: "Evaluate the validity and reliability of measurement procedures." },
      { id: "C.9", text: "Select a measurement procedure to obtain representative data that accounts for the critical dimension of the behavior and environmental constraints." },
      { id: "C.10", text: "Graph data to communicate relevant quantitative relations (e.g., equal-interval graphs, bar graphs, cumulative records)." },
      { id: "C.11", text: "Interpret graphed data." },
      { id: "C.12", text: "Select a measurement procedure to obtain representative procedural integrity data that accounts for relevant dimensions (e.g., accuracy, dosage) and environmental constraints." },
    ],
  },
  {
    id: "D",
    title: "Experimental Design",
    questionCount: 13,
    examPercent: 7,
    tasks: [
      { id: "D.1", text: "Distinguish between dependent and independent variables." },
      { id: "D.2", text: "Distinguish between internal and external validity." },
      { id: "D.3", text: "Identify threats to internal validity (e.g., history, maturation)." },
      { id: "D.4", text: "Identify the defining features of single-case experimental designs (e.g., individuals serve as their own controls, repeated measures, prediction, verification, replication)." },
      { id: "D.5", text: "Identify the relative strengths of single-case experimental designs and group designs." },
      { id: "D.6", text: "Critique and interpret data from single-case experimental designs." },
      { id: "D.7", text: "Distinguish among reversal, multiple-baseline, multielement, and changing-criterion designs." },
      { id: "D.8", text: "Identify rationales for conducting comparative, component, and parametric analyses." },
      { id: "D.9", text: "Apply single-case experimental designs." },
    ],
  },
  {
    id: "E",
    title: "Ethical and Professional Issues",
    questionCount: 22,
    examPercent: 13,
    tasks: [
      { id: "E.1", text: "Identify and apply core principles underlying the ethics codes for BACB certificants (e.g., benefit others; treat others with compassion, dignity, and respect; behave with integrity)." },
      { id: "E.2", text: "Identify the risks to oneself, others, and the profession as a result of engaging in unethical behavior." },
      { id: "E.3", text: "Develop and maintain competence by engaging in professional development activities (e.g., read literature, seek consultation, establish mentors)." },
      { id: "E.4", text: "Identify and comply with requirements for collecting, using, protecting, and disclosing confidential information." },
      { id: "E.5", text: "Identify and comply with requirements for making public statements about professional activities (e.g., social media activity; misrepresentation of professional credentials, behavior analysis, and service outcomes)." },
      { id: "E.6", text: "Identify the conditions under which services or supervision should be discontinued and apply steps that should be taken when transitioning clients and supervisees to another professional." },
      { id: "E.7", text: "Identify types of and risks associated with multiple relationships, and how to mitigate those risks when they are unavoidable." },
      { id: "E.8", text: "Identify and apply interpersonal and other skills (e.g., accepting feedback, listening actively, seeking input, collaborating) to establish and maintain professional relationships." },
      { id: "E.9", text: "Engage in cultural humility in service delivery and professional relationships." },
      { id: "E.10", text: "Apply culturally responsive and inclusive service and supervision activities." },
      { id: "E.11", text: "Identify personal biases and how they might interfere with professional activity." },
      { id: "E.12", text: "Identify and apply the legal, regulatory, and practice requirements (e.g., licensure, jurisprudence, funding, certification) relevant to the delivery of behavior-analytic services." },
    ],
  },
  {
    id: "F",
    title: "Behavior Assessment",
    questionCount: 23,
    examPercent: 13,
    tasks: [
      { id: "F.1", text: "Identify relevant sources of information in records (e.g., educational, medical, historical) at the outset of the case." },
      { id: "F.2", text: "Identify and integrate relevant cultural variables in the assessment process." },
      { id: "F.3", text: "Design and evaluate assessments of relevant skill strengths and areas of need." },
      { id: "F.4", text: "Design and evaluate preference assessments." },
      { id: "F.5", text: "Design and evaluate descriptive assessments." },
      { id: "F.6", text: "Design and evaluate functional analyses." },
      { id: "F.7", text: "Interpret assessment data to determine the need for behavior-analytic services and/or referral to others." },
      { id: "F.8", text: "Interpret assessment data to identify and prioritize socially significant, client-informed, and culturally responsive behavior-change procedures and goals." },
    ],
  },
  {
    id: "G",
    title: "Behavior-Change Procedures",
    questionCount: 25,
    examPercent: 14,
    tasks: [
      { id: "G.1", text: "Design and evaluate positive and negative reinforcement procedures." },
      { id: "G.2", text: "Design and evaluate differential reinforcement (e.g., DRA, DRO, DRL, DRH) procedures with and without extinction." },
      { id: "G.3", text: "Design and evaluate time-based reinforcement (e.g., fixed-time) schedules." },
      { id: "G.4", text: "Identify procedures to establish and use conditioned reinforcers (e.g., token economies)." },
      { id: "G.5", text: "Incorporate motivating operations and discriminative stimuli into behavior-change procedures." },
      { id: "G.6", text: "Design and evaluate procedures to produce simple and conditional discriminations." },
      { id: "G.7", text: "Select and evaluate stimulus and response prompting procedures (e.g., errorless, most-to-least, least-to-most)." },
      { id: "G.8", text: "Design and implement procedures to fade stimulus and response prompts (e.g., prompt delay, stimulus fading)." },
      { id: "G.9", text: "Design and evaluate modeling procedures." },
      { id: "G.10", text: "Design and evaluate instructions and rules." },
      { id: "G.11", text: "Shape dimensions of behavior." },
      { id: "G.12", text: "Select and implement chaining procedures." },
      { id: "G.13", text: "Design and evaluate trial-based and free-operant procedures." },
      { id: "G.14", text: "Design and evaluate group contingencies." },
      { id: "G.15", text: "Design and evaluate procedures to promote stimulus and response generalization." },
      { id: "G.16", text: "Design and evaluate procedures to maintain desired behavior change following intervention (e.g., schedule thinning, transferring to naturally occurring reinforcers)." },
      { id: "G.17", text: "Design and evaluate positive and negative punishment (e.g., time-out, response cost, overcorrection)." },
      { id: "G.18", text: "Evaluate emotional and elicited effects of behavior-change procedures." },
      { id: "G.19", text: "Design and evaluate procedures to promote emergent relations and generative performance." },
    ],
  },
  {
    id: "H",
    title: "Selecting and Implementing Interventions",
    questionCount: 20,
    examPercent: 11,
    tasks: [
      { id: "H.1", text: "Develop intervention goals in observable and measurable terms." },
      { id: "H.2", text: "Identify and recommend interventions based on assessment results, scientific evidence, client preferences, and contextual fit (e.g., expertise required for implementation, cultural variables, environmental resources)." },
      { id: "H.3", text: "Select socially valid alternative behavior to be established or increased when a target behavior is to be decreased." },
      { id: "H.4", text: "Plan for and attempt to mitigate possible unwanted effects when using reinforcement, extinction, and punishment procedures." },
      { id: "H.5", text: "Plan for and attempt to mitigate possible relapse of the target behavior." },
      { id: "H.6", text: "Make data-based decisions about procedural integrity." },
      { id: "H.7", text: "Make data-based decisions about the effectiveness of the intervention and the need for modification." },
      { id: "H.8", text: "Collaborate with others to support and enhance client services." },
    ],
  },
  {
    id: "I",
    title: "Personnel Supervision and Management",
    questionCount: 19,
    examPercent: 11,
    tasks: [
      { id: "I.1", text: "Identify the benefits of using behavior-analytic supervision (e.g., improved client outcomes, improved staff performance and retention)." },
      { id: "I.2", text: "Identify and apply strategies for establishing effective supervisory relationships (e.g., executing supervisor-supervisee contracts, establishing clear expectations, giving and accepting feedback)." },
      { id: "I.3", text: "Identify and implement methods that promote equity in supervision practices." },
      { id: "I.4", text: "Select supervision goals based on an assessment of the supervisee's skills, cultural variables, and the environment." },
      { id: "I.5", text: "Identify and apply empirically validated and culturally responsive performance management procedures (e.g., modeling, practice, feedback, reinforcement, task clarification, manipulation of response effort)." },
      { id: "I.6", text: "Apply a function-based approach (e.g., performance diagnostics) to assess and improve supervisee behavior." },
      { id: "I.7", text: "Make data-based decisions about the efficacy of supervisory practices." },
    ],
  },
];

export const BACB_TOTAL_QUESTIONS = BACB_6TH_EDITION_DOMAINS.reduce(
  (total, domain) => total + domain.questionCount,
  0,
);

export const BACB_TOTAL_TASKS = BACB_6TH_EDITION_DOMAINS.reduce(
  (total, domain) => total + domain.tasks.length,
  0,
);
