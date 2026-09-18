/**
 * Answers assembled from the job row when the AI engine cannot be reached.
 *
 * The AI engine has its own fallback for the common case — engine up, model
 * down. This one covers the case that fallback cannot: the engine itself is
 * unreachable, redeploying, or timing out at the network edge. Without it the
 * chat window returns 503 and the candidate is told to come back later, even
 * though the answer to "what's the salary?" is one row away in a database this
 * service is already connected to.
 *
 * Deliberately narrow: it matches a topic and quotes the field. It does not try
 * to sound generated, and it never states anything the row does not contain.
 */

export interface FallbackJob {
  title: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  jobType: string[] | null;
  workMode: string[] | null;
  experienceLevel: string | null;
  experienceMin: number | null;
  experienceMax: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  showSalary: boolean | null;
  payRate: string | null;
  skills: string[] | null;
  qualification: string | null;
  certification: string | null;
  benefits: string | null;
  travelRequirements: string | null;
  deadline: Date | null;
  isActive: boolean | null;
  status: string | null;
  companyName: string | null;
  industry: string | null;
  companySize: string | null;
}

export interface FallbackAnswer {
  response: string;
  suggestions: string[];
}

const OUTAGE_NOTICE =
  "I can't reach my assistant right now, so here's the detail straight from the listing.";

const GREETING_RE = /^(hi|hii+|hey+|hello+|namaste|good\s*(morning|afternoon|evening))[\s!.,?]*$/i;
const APPLY_RE = /\b(how (do|can) i apply|where.{0,15}apply|apply for this)\b/i;

type TopicKey =
  | 'salary'
  | 'location'
  | 'workMode'
  | 'jobType'
  | 'experience'
  | 'skills'
  | 'qualification'
  | 'certification'
  | 'benefits'
  | 'travel'
  | 'deadline'
  | 'company';

// Stemmed alternatives carry an explicit `\w*`. A trailing `\b` after a stem
// silently never matches — `/\bskill\b/` does not match "skills", which is how
// candidates actually phrase the question.
const TOPIC_PATTERNS: Array<[TopicKey, RegExp]> = [
  ['salary', /\b(salar\w*|pay|ctc|compensation|package|stipend)\b/i],
  ['workMode', /\b(remote|hybrid|onsite|on-site|work from home|wfh|work mode)\b/i],
  ['location', /\b(location|where|city|based|offices?)\b/i],
  ['experience', /\b(experience|years?|seniority|fresher)\b/i],
  ['skills', /\b(skills?|tech stack|technolog\w*|tools?)\b/i],
  ['qualification', /\b(qualif\w*|degrees?|education\w*|graduat\w*)\b/i],
  ['certification', /\bcertif\w*/i],
  ['benefits', /\b(benefits?|perks?|insurance|leaves?)\b/i],
  ['travel', /\b(travel\w*|relocat\w*)\b/i],
  ['deadline', /\b(deadline|last date|closing|apply by)\b/i],
  // "internship", not "intern" — the shorter stem also matches "internal".
  ['jobType', /\b(full.?time|part.?time|contract\w*|internship|job type)\b/i],
  ['company', /\b(company|industry|about them|who are they)\b/i],
];

/** `full_time` -> `full time`, so a quoted enum does not read as broken. */
const humanize = (value: string): string =>
  /^[a-z0-9_]+$/.test(value) ? value.replace(/_/g, ' ') : value;

const listOf = (values: string[] | null | undefined): string => {
  const cleaned = [
    ...new Set((values || []).map((v) => humanize(String(v).trim())).filter(Boolean)),
  ];
  return cleaned.join(', ');
};

const ANNUAL_RATE_RE = /year|annual|annum|lpa|pa/i;

const formatSalary = (job: FallbackJob): string => {
  if (job.showSalary === false) return '';

  const annual = !job.payRate || ANNUAL_RATE_RE.test(job.payRate);
  const money = (amount: number | null): string => {
    if (!amount || amount <= 0) return '';
    if (annual && amount >= 100000) {
      return `${Number((amount / 100000).toFixed(2))} LPA`;
    }
    return amount.toLocaleString('en-IN');
  };

  const low = money(job.salaryMin);
  const high = money(job.salaryMax);
  if (!low && !high) return '';

  const range = low && high ? `₹${low} - ₹${high}` : low ? `From ₹${low}` : `Up to ₹${high}`;
  return annual ? range : `${range} ${job.payRate}`.trim();
};

const formatExperience = (job: FallbackJob): string => {
  const level = job.experienceLevel ? humanize(job.experienceLevel) : '';
  const { experienceMin: min, experienceMax: max } = job;

  let span = '';
  if (min != null && max != null) span = `${min}-${max} years`;
  else if (min != null) span = `${min}+ years`;
  else if (max != null) span = `up to ${max} years`;

  if (level && span) return `${level} (${span})`;
  return level || span;
};

const formatLocation = (job: FallbackJob): string => {
  const parts = [job.city, job.state, job.country].filter(Boolean);
  return parts.length ? parts.join(', ') : job.location || '';
};

const formatDeadline = (job: FallbackJob): string =>
  job.deadline
    ? new Date(job.deadline).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '';

/** Topic -> the sentence for it, or '' when the row has nothing to say. */
const answerFor = (job: FallbackJob, topic: TopicKey): string => {
  const company = job.companyName || 'the company';

  switch (topic) {
    case 'salary': {
      const salary = formatSalary(job);
      return salary ? `The listed salary is ${salary}.` : '';
    }
    case 'location': {
      const where = formatLocation(job);
      return where ? `This role is based in ${where}.` : '';
    }
    case 'workMode': {
      const mode = listOf(job.workMode);
      return mode ? `The work mode is ${mode}.` : '';
    }
    case 'jobType': {
      const type = listOf(job.jobType);
      return type ? `This is a ${type} position.` : '';
    }
    case 'experience': {
      const experience = formatExperience(job);
      return experience ? `The listing asks for ${experience} of experience.` : '';
    }
    case 'skills': {
      const skills = listOf(job.skills);
      return skills ? `The required skills are: ${skills}.` : '';
    }
    case 'qualification':
      return job.qualification ? `Qualifications required: ${job.qualification}` : '';
    case 'certification':
      return job.certification ? `On certifications: ${job.certification}` : '';
    case 'benefits':
      return job.benefits ? `Benefits listed: ${job.benefits}` : '';
    case 'travel':
      return job.travelRequirements ? `On travel: ${job.travelRequirements}` : '';
    case 'deadline': {
      const deadline = formatDeadline(job);
      return deadline ? `Applications close on ${deadline}.` : '';
    }
    case 'company': {
      const bits = [job.industry, job.companySize].filter(Boolean).join(', ');
      return bits
        ? `${company} works in ${bits}.`
        : job.companyName
          ? `This role is at ${company}.`
          : '';
    }
    default:
      return '';
  }
};

const SUGGESTION_FOR: Record<TopicKey, string> = {
  salary: 'What is the salary range?',
  location: 'Where is this job based?',
  workMode: 'Is remote work possible?',
  jobType: 'Is this a full-time role?',
  experience: 'How much experience is needed?',
  skills: 'What skills are required?',
  qualification: 'What qualifications are required?',
  certification: 'Are certifications required?',
  benefits: 'What benefits are offered?',
  travel: 'Is travel required?',
  deadline: 'When do applications close?',
  company: 'Tell me about the company',
};

/** Questions this row can actually answer, minus the one just asked. */
const suggestionsFor = (job: FallbackJob, answered: TopicKey | null): string[] =>
  (Object.keys(SUGGESTION_FOR) as TopicKey[])
    .filter((topic) => topic !== answered && answerFor(job, topic) !== '')
    .slice(0, 3)
    .map((topic) => SUGGESTION_FOR[topic]);

const isClosed = (job: FallbackJob): boolean =>
  job.isActive === false ||
  (job.status != null && job.status.toLowerCase() !== 'active') ||
  (job.deadline != null && new Date(job.deadline) < new Date());

export function buildFallbackAnswer(job: FallbackJob | null, message: string): FallbackAnswer {
  if (!job) {
    return {
      response:
        "I can't reach my assistant at the moment, so I can't answer that right now. " +
        'The full details are on this job page — please try me again shortly.',
      suggestions: [],
    };
  }

  const role = job.title || 'this role';

  if (GREETING_RE.test(message.trim())) {
    return {
      response: `Hi! I can help with the ${role} opening${job.companyName ? ` at ${job.companyName}` : ''}.`,
      suggestions: suggestionsFor(job, null),
    };
  }

  if (APPLY_RE.test(message)) {
    return {
      response: isClosed(job)
        ? 'This listing is closed, so applications are no longer being accepted.'
        : 'You can apply directly from this page using the Apply button.',
      suggestions: suggestionsFor(job, null),
    };
  }

  for (const [topic, pattern] of TOPIC_PATTERNS) {
    if (!pattern.test(message)) continue;
    const answer = answerFor(job, topic);
    if (answer) {
      return {
        response: `${OUTAGE_NOTICE} ${answer}`,
        suggestions: suggestionsFor(job, topic),
      };
    }
  }

  const offers = suggestionsFor(job, null);
  return {
    response:
      "I can't reach my assistant right now, so I can only read straight from the listing — " +
      (offers.length
        ? 'and it does not cover that. Try one of the questions below in the meantime.'
        : 'and it does not cover that. Please try again shortly.'),
    suggestions: offers,
  };
}
