import { companyProfiles, mockScan } from './mock';

/*
|--------------------------------------------------------------------------
| Shared local canonicalization
|--------------------------------------------------------------------------
| Kept for the existing JD Checker / Optimizer.
|--------------------------------------------------------------------------
*/

const CANONICAL = {
  reactjs: 'React',
  'react.js': 'React',
  react: 'React',

  nodejs: 'Node.js',
  'node.js': 'Node.js',
  node: 'Node.js',

  mongodb: 'MongoDB',
  mongo: 'MongoDB',

  fastapi: 'FastAPI',
  'fast api': 'FastAPI',

  python: 'Python',
  python3: 'Python',

  javascript: 'JavaScript',
  'java script': 'JavaScript',
  js: 'JavaScript',

  typescript: 'TypeScript',
  ts: 'TypeScript',

  java: 'Java',

  'c++': 'C++',
  cpp: 'C++',

  c: 'C',

  'c#': 'C#',
  'c sharp': 'C#',

  '.net': '.NET',
  dotnet: '.NET',

  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  'google cloud': 'Google Cloud',

  sql: 'SQL',
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',

  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',

  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',

  'machine learning': 'Machine Learning',
  ml: 'Machine Learning',

  'deep learning': 'Deep Learning',
  dl: 'Deep Learning',

  nlp: 'NLP',
  'natural language processing': 'NLP',

  html: 'HTML',
  css: 'CSS',

  tailwind: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',

  git: 'Git',
  github: 'GitHub',

  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  restful: 'REST APIs',
  'restful api': 'REST APIs',
  'restful apis': 'REST APIs',

  'system design': 'System Design',

  'cloud computing': 'Cloud',

  figma: 'Figma',
  sketch: 'Sketch',
  invision: 'InVision',
  photoshop: 'Adobe Photoshop',
  illustrator: 'Adobe Illustrator',
  'adobe xd': 'Adobe XD',
};

const SKILL_TERMS = Object.keys(CANONICAL);

function normalize(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s&/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractSkills(text = '') {
  const normalized = normalize(text);
  const found = new Set();

  for (const term of SKILL_TERMS) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const rx = new RegExp(
      `(^|\\s)${escaped}(?=\\s|$)`,
      'i',
    );

    if (rx.test(normalized)) {
      found.add(CANONICAL[term]);
    }
  }

  return [...found];
}

function scoreFrom(value, min = 0, max = 100) {
  return Math.max(
    min,
    Math.min(
      max,
      Math.round(Number(value) || 0),
    ),
  );
}

/*
|--------------------------------------------------------------------------
| Existing JD local analysis
|--------------------------------------------------------------------------
*/

export function analyzeJD(jd, resumeText) {
  const jdSkills = extractSkills(jd);
  const resumeSkills = extractSkills(resumeText);

  const matched = jdSkills.filter(
    (skill) => resumeSkills.includes(skill),
  );

  const missing = jdSkills.filter(
    (skill) => !resumeSkills.includes(skill),
  );

  const base = jdSkills.length
    ? (matched.length / jdSkills.length) * 100
    : 0;

  const score = jdSkills.length
    ? scoreFrom(base)
    : 0;

  const requirements = jdSkills.map(
    (skill) => [
      skill,
      matched.includes(skill)
        ? 'matched'
        : 'missing',
      matched.includes(skill)
        ? 'Evidence detected in the resume text.'
        : 'No direct evidence found in the current resume.',
    ],
  );

  if (!jdSkills.length) {
    requirements.push([
      'Role requirements',
      'weak',
      'No recognizable skill requirements were found. Add a fuller job description.',
    ]);
  }

  return {
    score,
    matched,
    missing,
    requirements,

    sections: [
      ['Skills', scoreFrom(score)],
      ['Projects', scoreFrom(score)],
      ['Experience', scoreFrom(score)],
      ['Education', scoreFrom(score)],
      ['Role fit', scoreFrom(score)],
    ],

    confidence:
      jdSkills.length >= 4
        ? 'High'
        : jdSkills.length
          ? 'Moderate'
          : 'Low',
  };
}

/*
|--------------------------------------------------------------------------
| Role intelligence
|--------------------------------------------------------------------------
| IMPORTANT:
| These are VeeBee role profiles, not vendor proprietary data.
|
| Every role belongs to a family. This prevents a technical resume from
| accidentally scoring highly for an unrelated role such as Designer.
|--------------------------------------------------------------------------
*/

const ROLE_PROFILES = {
  'Software Engineer': {
    family: 'software',
    skills: [
      'Python',
      'JavaScript',
      'Java',
      'C++',
      'Git',
      'REST APIs',
      'SQL',
      'System Design',
    ],
  },

  'Software Developer': {
    family: 'software',
    skills: [
      'Python',
      'Java',
      'JavaScript',
      'C++',
      'Git',
      'SQL',
      'REST APIs',
    ],
  },

  'Application Developer': {
    family: 'software',
    skills: [
      'Java',
      'Python',
      'JavaScript',
      'SQL',
      'REST APIs',
      'Git',
    ],
  },

  'Systems Software Engineer': {
    family: 'systems',
    skills: [
      'C++',
      'C',
      'Linux',
      'Git',
      'System Design',
    ],
  },

  'Platform Engineer': {
    family: 'platform',
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
      'System Design',
    ],
  },

  'Product Engineer': {
    family: 'software',
    skills: [
      'JavaScript',
      'TypeScript',
      'React',
      'REST APIs',
      'Git',
      'SQL',
      'System Design',
    ],
  },

  'Backend Engineer': {
    family: 'backend',
    skills: [
      'Python',
      'Node.js',
      'Java',
      'SQL',
      'REST APIs',
      'Docker',
      'Git',
    ],
  },

  'Frontend Engineer': {
    family: 'frontend',
    skills: [
      'React',
      'JavaScript',
      'TypeScript',
      'HTML',
      'CSS',
      'REST APIs',
      'Git',
    ],
  },

  'Frontend Developer': {
    family: 'frontend',
    skills: [
      'React',
      'JavaScript',
      'TypeScript',
      'HTML',
      'CSS',
      'Git',
    ],
  },

  'Full Stack Developer': {
    family: 'fullstack',
    skills: [
      'React',
      'JavaScript',
      'Node.js',
      'SQL',
      'REST APIs',
      'Git',
    ],
  },

  'Web Developer': {
    family: 'frontend',
    skills: [
      'HTML',
      'CSS',
      'JavaScript',
      'React',
      'Git',
    ],
  },

  'Mobile App Developer': {
    family: 'mobile',
    skills: [
      'Java',
      'JavaScript',
      'Git',
    ],
  },

  'Android Developer': {
    family: 'mobile',
    skills: [
      'Java',
      'Kotlin',
      'Git',
    ],
  },

  'iOS Developer': {
    family: 'mobile',
    skills: [
      'Swift',
      'Git',
    ],
  },

  'React Developer': {
    family: 'frontend',
    skills: [
      'React',
      'JavaScript',
      'TypeScript',
      'HTML',
      'CSS',
      'Git',
    ],
  },

  'Node.js Developer': {
    family: 'backend',
    skills: [
      'Node.js',
      'JavaScript',
      'REST APIs',
      'SQL',
      'MongoDB',
      'Git',
    ],
  },

  'Java Developer': {
    family: 'backend',
    skills: [
      'Java',
      'Spring',
      'Spring Boot',
      'SQL',
      'REST APIs',
      'Git',
    ],
  },

  'Python Developer': {
    family: 'backend',
    skills: [
      'Python',
      'FastAPI',
      'Django',
      'Flask',
      'SQL',
      'Git',
    ],
  },

  'C++ Developer': {
    family: 'systems',
    skills: [
      'C++',
      'C',
      'Git',
      'Linux',
      'System Design',
    ],
  },

  'Embedded Software Engineer': {
    family: 'embedded',
    skills: [
      'C',
      'C++',
      'Embedded Systems',
      'Linux',
      'Git',
    ],
  },

  'Firmware Engineer': {
    family: 'embedded',
    skills: [
      'C',
      'C++',
      'Embedded Systems',
      'Linux',
      'Git',
    ],
  },

  'Kernel Engineer': {
    family: 'systems',
    skills: [
      'C',
      'C++',
      'Linux',
      'Operating Systems',
      'Git',
    ],
  },

  'Site Reliability Engineer (SRE)': {
    family: 'sre',
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
      'System Design',
    ],
  },

  'Site Reliability Engineer': {
    family: 'sre',
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
      'System Design',
    ],
  },

  'DevOps Engineer': {
    family: 'devops',
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
    ],
  },

  'Cloud Engineer': {
    family: 'cloud',
    skills: [
      'AWS',
      'Azure',
      'GCP',
      'Docker',
      'Kubernetes',
      'Linux',
    ],
  },

  'Cloud Architect': {
    family: 'cloud',
    skills: [
      'AWS',
      'Azure',
      'GCP',
      'Docker',
      'Kubernetes',
      'System Design',
    ],
  },

  'Cloud Developer': {
    family: 'cloud',
    skills: [
      'AWS',
      'Azure',
      'GCP',
      'Python',
      'Docker',
      'Git',
    ],
  },

  'Security Engineer': {
    family: 'security',
    skills: [
      'Linux',
      'Python',
      'Git',
      'Cloud',
    ],
  },

  'Cybersecurity Engineer': {
    family: 'security',
    skills: [
      'Linux',
      'Python',
      'Cloud',
      'Git',
    ],
  },

  'Network Engineer': {
    family: 'network',
    skills: [
      'Linux',
      'Networking',
      'Cloud',
      'Git',
    ],
  },

  'Database Engineer': {
    family: 'data',
    skills: [
      'SQL',
      'MySQL',
      'PostgreSQL',
      'MongoDB',
      'Python',
    ],
  },

  'Database Administrator': {
    family: 'data',
    skills: [
      'SQL',
      'MySQL',
      'PostgreSQL',
      'MongoDB',
    ],
  },

  'QA Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'SQL',
      'Git',
    ],
  },

  'Test Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Git',
    ],
  },

  'Automation Test Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Selenium',
      'Git',
    ],
  },

  'SDET': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Java',
      'Python',
      'Git',
    ],
  },

  'Data Engineer': {
    family: 'data',
    skills: [
      'Python',
      'SQL',
      'ETL',
      'Docker',
      'AWS',
      'Git',
    ],
  },

  'Analytics Engineer': {
    family: 'data',
    skills: [
      'SQL',
      'Python',
      'Data Warehousing',
      'Git',
    ],
  },

  'Data Scientist': {
    family: 'data-science',
    skills: [
      'Python',
      'SQL',
      'Machine Learning',
      'Pandas',
      'NumPy',
      'Statistics',
    ],
  },

  'Machine Learning Engineer': {
    family: 'ml',
    skills: [
      'Python',
      'Machine Learning',
      'TensorFlow',
      'PyTorch',
      'Docker',
      'Git',
    ],
  },

  'AI Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'Machine Learning',
      'Deep Learning',
      'NLP',
      'Docker',
      'Git',
    ],
  },

  'Deep Learning Engineer': {
    family: 'ml',
    skills: [
      'Python',
      'Deep Learning',
      'TensorFlow',
      'PyTorch',
      'Git',
    ],
  },

  'NLP Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'NLP',
      'Machine Learning',
      'Deep Learning',
      'Git',
    ],
  },

  'Computer Vision Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'Machine Learning',
      'Deep Learning',
      'TensorFlow',
      'PyTorch',
    ],
  },

  'MLOps Engineer': {
    family: 'mlops',
    skills: [
      'Python',
      'Machine Learning',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
    ],
  },

  'AI/ML Platform Engineer': {
    family: 'mlops',
    skills: [
      'Python',
      'Machine Learning',
      'Docker',
      'Kubernetes',
      'AWS',
      'System Design',
    ],
  },

  'Research Engineer': {
    family: 'research',
    skills: [
      'Python',
      'Machine Learning',
      'Statistics',
      'Git',
    ],
  },

  'Research Scientist': {
    family: 'research',
    skills: [
      'Python',
      'Machine Learning',
      'Statistics',
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | Design roles
  |--------------------------------------------------------------------------
  | This is especially important for your test case.
  |
  | A backend / ML / software resume must NOT receive high role fit here
  | unless it actually contains design evidence.
  |--------------------------------------------------------------------------
  */

  Designer: {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
      'Adobe Illustrator',
    ],
    concepts: [
      'UI Design',
      'UX Design',
      'Visual Design',
      'Interaction Design',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'User Research',
      'Usability Testing',
      'Information Architecture',
    ],
  },

  'UI Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
      'Adobe Illustrator',
    ],
    concepts: [
      'UI Design',
      'Visual Design',
      'Interaction Design',
      'Design Systems',
      'Prototyping',
    ],
  },

  'UX Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'UX Design',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Usability Testing',
      'Information Architecture',
    ],
  },

  'Product Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'UX Design',
      'UI Design',
      'Product Design',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'Usability Testing',
    ],
  },

  'UX/UI Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
    ],
    concepts: [
      'UX Design',
      'UI Design',
      'Visual Design',
      'Interaction Design',
      'Wireframing',
      'Prototyping',
      'User Research',
    ],
  },

  'Interaction Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'Interaction Design',
      'Prototyping',
      'Wireframing',
      'Usability Testing',
      'Design Systems',
    ],
  },

  'Visual Designer': {
    family: 'design',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Figma',
      'Sketch',
    ],
    concepts: [
      'Visual Design',
      'Brand Design',
      'Typography',
      'Layout',
      'Illustration',
      'Design Systems',
    ],
  },

  'Graphic Designer': {
    family: 'design',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Figma',
      'InDesign',
    ],
    concepts: [
      'Graphic Design',
      'Visual Design',
      'Typography',
      'Brand Design',
      'Layout',
      'Illustration',
    ],
  },

  'Web Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Adobe XD',
      'HTML',
      'CSS',
      'JavaScript',
    ],
    concepts: [
      'Web Design',
      'UI Design',
      'UX Design',
      'Responsive Design',
      'Wireframing',
      'Prototyping',
    ],
  },

  'Design Lead': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'Design Systems',
      'UX Design',
      'UI Design',
      'Design Strategy',
      'User Research',
      'Design Leadership',
    ],
  },

  'Creative Designer': {
    family: 'design',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Figma',
    ],
    concepts: [
      'Visual Design',
      'Creative Direction',
      'Brand Design',
      'Typography',
      'Illustration',
    ],
  },

  'Service Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Miro',
      'Sketch',
    ],
    concepts: [
      'Service Design',
      'Journey Mapping',
      'User Research',
      'Customer Experience',
      'Prototyping',
      'Design Thinking',
    ],
  },

  'UX Researcher': {
    family: 'design',
    skills: [
      'Figma',
      'Miro',
    ],
    concepts: [
      'User Research',
      'Usability Testing',
      'User Interviews',
      'Journey Mapping',
      'Information Architecture',
      'Design Thinking',
    ],
  },

  'Design Researcher': {
    family: 'design',
    skills: [
      'Figma',
      'Miro',
    ],
    concepts: [
      'User Research',
      'Design Research',
      'Usability Testing',
      'User Interviews',
      'Design Thinking',
    ],
  },

  'Design Systems Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Storybook',
      'HTML',
      'CSS',
    ],
    concepts: [
      'Design Systems',
      'UI Design',
      'Component Libraries',
      'Accessibility',
      'Design Tokens',
    ],
  },

  'Motion Designer': {
    family: 'design',
    skills: [
      'After Effects',
      'Premiere Pro',
      'Illustrator',
      'Photoshop',
    ],
    concepts: [
      'Motion Design',
      'Animation',
      'Visual Design',
      'Storyboarding',
      'Video Editing',
    ],
  },

  'Brand Designer': {
    family: 'design',
    skills: [
      'Adobe Illustrator',
      'Adobe Photoshop',
      'Figma',
    ],
    concepts: [
      'Brand Design',
      'Visual Identity',
      'Typography',
      'Art Direction',
      'Graphic Design',
    ],
  },

  'Product Design Lead': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'Product Design',
      'UX Design',
      'UI Design',
      'Design Systems',
      'Design Strategy',
      'User Research',
      'Design Leadership',
    ],
  },

  'UX Lead': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
    ],
    concepts: [
      'UX Design',
      'User Research',
      'Design Systems',
      'Usability Testing',
      'Design Strategy',
      'Design Leadership',
    ],
  },

  'UI/UX Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'UI Design',
      'UX Design',
      'Wireframing',
      'Prototyping',
      'Interaction Design',
      'Design Systems',
    ],
  },

  'UX Engineer': {
    family: 'design-engineering',
    skills: [
      'Figma',
      'HTML',
      'CSS',
      'JavaScript',
      'React',
    ],
    concepts: [
      'UX Engineering',
      'UI Design',
      'Design Systems',
      'Accessibility',
      'Prototyping',
    ],
  },

  'Design Engineer': {
    family: 'design-engineering',
    skills: [
      'Figma',
      'HTML',
      'CSS',
      'JavaScript',
      'React',
    ],
    concepts: [
      'Design Systems',
      'UI Engineering',
      'Prototyping',
      'Accessibility',
      'Interaction Design',
    ],
  },  'DevOps Engineer': {
    family: 'devops',
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Linux',
      'Git',
    ],
  },

  'Cloud Engineer': {
    family: 'cloud',
    skills: [
      'AWS',
      'Azure',
      'Google Cloud',
      'Docker',
      'Kubernetes',
      'Linux',
    ],
  },

  'Cloud Architect': {
    family: 'cloud',
    skills: [
      'AWS',
      'Azure',
      'Google Cloud',
      'Kubernetes',
      'Docker',
      'System Design',
    ],
  },

  'Solutions Architect': {
    family: 'architecture',
    skills: [
      'AWS',
      'Azure',
      'System Design',
      'REST APIs',
      'Cloud',
    ],
  },

  'Infrastructure Engineer': {
    family: 'infrastructure',
    skills: [
      'Linux',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
    ],
  },

  'Cybersecurity Engineer': {
    family: 'security',
    skills: [
      'Linux',
      'Network Security',
      'Cloud Security',
      'Git',
    ],
  },

  'Application Security Engineer': {
    family: 'security',
    skills: [
      'Application Security',
      'Cybersecurity',
      'Git',
    ],
  },

  'Security Engineer': {
    family: 'security',
    skills: [
      'Cybersecurity',
      'Linux',
      'Network Security',
      'Cloud Security',
      'Git',
    ],
  },

  'DevSecOps Engineer': {
    family: 'security',
    skills: [
      'Docker',
      'Kubernetes',
      'AWS',
      'Linux',
      'Cybersecurity',
      'Git',
    ],
  },

  'QA Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'SQL',
      'Git',
    ],
  },

  'Test Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Git',
    ],
  },

  'Automation Test Engineer': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Selenium',
      'Git',
    ],
  },

  'SDET': {
    family: 'qa',
    skills: [
      'Testing',
      'Automation',
      'Java',
      'Python',
      'Git',
    ],
  },

  'Data Engineer': {
    family: 'data',
    skills: [
      'Python',
      'SQL',
      'ETL',
      'Docker',
      'AWS',
      'Git',
    ],
  },

  'Analytics Engineer': {
    family: 'data',
    skills: [
      'SQL',
      'Python',
      'Data Warehousing',
      'Git',
    ],
  },

  'Data Scientist': {
    family: 'data-science',
    skills: [
      'Python',
      'SQL',
      'Machine Learning',
      'Pandas',
      'NumPy',
      'Statistics',
    ],
  },

  'Machine Learning Engineer': {
    family: 'ml',
    skills: [
      'Python',
      'Machine Learning',
      'TensorFlow',
      'PyTorch',
      'Docker',
      'Git',
    ],
  },

  'AI Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'Machine Learning',
      'Deep Learning',
      'NLP',
      'Docker',
      'Git',
    ],
  },

  'Deep Learning Engineer': {
    family: 'ml',
    skills: [
      'Python',
      'Deep Learning',
      'TensorFlow',
      'PyTorch',
      'Git',
    ],
  },

  'NLP Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'NLP',
      'Machine Learning',
      'Deep Learning',
      'Git',
    ],
  },

  'Computer Vision Engineer': {
    family: 'ai',
    skills: [
      'Python',
      'Machine Learning',
      'Deep Learning',
      'TensorFlow',
      'PyTorch',
    ],
  },

  'MLOps Engineer': {
    family: 'mlops',
    skills: [
      'Python',
      'Machine Learning',
      'Docker',
      'Kubernetes',
      'AWS',
      'Git',
    ],
  },

  'AI/ML Platform Engineer': {
    family: 'mlops',
    skills: [
      'Python',
      'Machine Learning',
      'Docker',
      'Kubernetes',
      'AWS',
      'System Design',
    ],
  },

  'Research Engineer': {
    family: 'research',
    skills: [
      'Python',
      'Machine Learning',
      'Statistics',
      'Git',
    ],
  },

  'Research Scientist': {
    family: 'research',
    skills: [
      'Python',
      'Machine Learning',
      'Statistics',
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | Design roles
  |--------------------------------------------------------------------------
  | This is especially important for your test case.
  |
  | A backend / ML / software resume must NOT receive high role fit here
  | unless it actually contains design evidence.
  |--------------------------------------------------------------------------
  */

  Designer: {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
      'Adobe Illustrator',
    ],
    concepts: [
      'UI Design',
      'UX Design',
      'Visual Design',
      'Interaction Design',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'User Research',
      'Usability Testing',
      'Information Architecture',
    ],
  },

  'UI Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
      'Adobe Illustrator',
    ],
    concepts: [
      'UI Design',
      'Visual Design',
      'Interaction Design',
      'Design Systems',
      'Prototyping',
    ],
  },

  'UX Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'UX Design',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Usability Testing',
      'Information Architecture',
    ],
  },

  'Product Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'UX Design',
      'UI Design',
      'Product Design',
      'User Research',
      'Wireframing',
      'Prototyping',
      'Design Systems',
      'Usability Testing',
    ],
  },

  'UX/UI Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
      'Adobe Photoshop',
    ],
    concepts: [
      'UX Design',
      'UI Design',
      'Visual Design',
      'Interaction Design',
      'Wireframing',
      'Prototyping',
      'User Research',
    ],
  },

  'Interaction Designer': {
    family: 'design',
    skills: [
      'Figma',
      'Sketch',
      'Adobe XD',
    ],
    concepts: [
      'Interaction Design',
      'Prototyping',
      'Wireframing',
      'Usability Testing',
      'Design Systems',
    ],
  },

  'Visual Designer': {
    family: 'design',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Figma',
    ],
    concepts: [
      'Visual Design',
      'Brand Design',
      'Typography',
      'Layout',
      'Design Systems',
    ],
  },

  'Graphic Designer': {
    family: 'design',
    skills: [
      'Adobe Photoshop',
      'Adobe Illustrator',
      'Figma',
    ],
    concepts: [
      'Graphic Design',
      'Visual Design',
      'Typography',
      'Brand Design',
      'Layout',
    ],
  },

  'Product Manager (Technical)': {
    family: 'product',
    skills: [
      'SQL',
      'System Design',
      'REST APIs',
    ],
    concepts: [
      'Product Strategy',
      'Roadmapping',
      'Requirements',
      'Stakeholder Management',
    ],
  },

  'Technical Product Manager': {
    family: 'product',
    skills: [
      'SQL',
      'System Design',
      'REST APIs',
    ],
    concepts: [
      'Product Strategy',
      'Roadmapping',
      'Requirements',
      'Stakeholder Management',
    ],
  },

  'Technical Program Manager': {
    family: 'program',
    skills: [
      'SQL',
      'System Design',
    ],
    concepts: [
      'Program Management',
      'Project Management',
      'Stakeholder Management',
      'Risk Management',
    ],
  },

  'Engineering Manager': {
    family: 'management',
    skills: [
      'System Design',
      'Git',
    ],
    concepts: [
      'Technical Leadership',
      'People Management',
      'Project Management',
    ],
  },

  'Engineering Lead': {
    family: 'management',
    skills: [
      'System Design',
      'Git',
    ],
    concepts: [
      'Technical Leadership',
      'Team Leadership',
      'Project Management',
    ],
  },

  'Software Architect': {    family: 'architecture',
    skills: [
      'System Design',
      'REST APIs',
      'Git',
      'Cloud',
    ],
  },

  'Principal Software Engineer': {
    family: 'software',
    skills: [
      'System Design',
      'C++',
      'Java',
      'Python',
      'REST APIs',
      'Git',
    ],
  },

  'Staff Software Engineer': {
    family: 'software',
    skills: [
      'System Design',
      'Python',
      'Java',
      'C++',
      'REST APIs',
      'Git',
    ],
  },
};

/*
|--------------------------------------------------------------------------
| Role aliases
|--------------------------------------------------------------------------
*/

const ROLE_ALIASES = {
  'frontend engineer': 'Frontend Engineer',
  'front end engineer': 'Frontend Engineer',
  'front-end engineer': 'Frontend Engineer',

  'backend engineer': 'Backend Engineer',
  'back end engineer': 'Backend Engineer',
  'back-end engineer': 'Backend Engineer',

  'full stack engineer': 'Full Stack Developer',
  'full-stack engineer': 'Full Stack Developer',
  'full stack developer': 'Full Stack Developer',

  'ui ux designer': 'UX/UI Designer',
  'ui/ux designer': 'UX/UI Designer',
  'ux ui designer': 'UX/UI Designer',
  'ux/ui designer': 'UX/UI Designer',

  'product designer': 'Product Designer',

  'ml engineer': 'Machine Learning Engineer',
  'ai/ml engineer': 'AI Engineer',

  'devops': 'DevOps Engineer',

  'sre': 'Site Reliability Engineer (SRE)',
};

/*
|--------------------------------------------------------------------------
| Role family keyword evidence
|--------------------------------------------------------------------------
*/

const FAMILY_EVIDENCE = {
  software: [
    'software',
    'developer',
    'programming',
    'coding',
    'application',
    'api',
    'backend',
    'frontend',
  ],

  backend: [
    'backend',
    'api',
    'server',
    'database',
    'microservice',
  ],

  frontend: [
    'frontend',
    'front end',
    'web',
    'react',
    'javascript',
    'ui',
  ],

  fullstack: [
    'full stack',
    'frontend',
    'backend',
    'web',
  ],

  systems: [
    'systems',
    'linux',
    'kernel',
    'embedded',
    'architecture',
  ],

  embedded: [
    'embedded',
    'firmware',
    'microcontroller',
    'hardware',
  ],

  platform: [
    'platform',
    'infrastructure',
    'cloud',
    'devops',
  ],

  devops: [
    'devops',
    'deployment',
    'ci/cd',
    'infrastructure',
    'container',
  ],

  cloud: [
    'cloud',
    'aws',
    'azure',
    'gcp',
    'infrastructure',
  ],

  security: [
    'security',
    'cybersecurity',
    'vulnerability',
    'penetration',
    'application security',
  ],

  qa: [
    'qa',
    'quality assurance',
    'testing',
    'test automation',
    'selenium',
  ],

  data: [
    'data engineering',
    'etl',
    'data pipeline',
    'data warehouse',
    'analytics engineering',
  ],

  'data-science': [
    'data science',
    'statistics',
    'machine learning',
    'analytics',
  ],

  ml: [
    'machine learning',
    'ml',
    'deep learning',
    'model',
  ],

  ai: [
    'artificial intelligence',
    'ai',
    'machine learning',
    'nlp',
    'computer vision',
  ],

  mlops: [
    'mlops',
    'machine learning',
    'model deployment',
    'kubernetes',
    'docker',
  ],

  research: [
    'research',
    'scientist',
    'experiments',
    'publication',
  ],

  design: [
    'designer',
    'design',
    'figma',
    'sketch',
    'wireframe',
    'prototype',
    'user experience',
    'ux',
    'ui design',
    'visual design',
    'interaction design',
    'design system',
    'user research',
    'usability',
  ],

  product: [
    'product',
    'roadmap',
    'requirements',
    'stakeholder',
    'user story',
  ],

  program: [
    'program',
    'project',
    'stakeholder',
    'delivery',
    'risk management',
  ],

  management: [
    'manager',
    'leadership',
    'team',
    'people management',
  ],

  architecture: [
    'architect',
    'architecture',
    'system design',
    'distributed systems',
    'cloud architecture',
  ],
};

/*
|--------------------------------------------------------------------------
| Role helper functions
|--------------------------------------------------------------------------
*/

function resolveRoleProfile(role = '') {
  const clean = String(role).trim();

  if (!clean) {
    return {
      name: '',
      family: 'unknown',
      skills: [],
      concepts: [],
      known: false,
    };
  }

  if (ROLE_PROFILES[clean]) {
    return {
      name: clean,
      ...ROLE_PROFILES[clean],
      concepts: ROLE_PROFILES[clean].concepts || [],
      known: true,
    };
  }

  const normalized = normalize(clean);

  const alias =
    ROLE_ALIASES[normalized] ||
    Object.keys(ROLE_ALIASES).find(
      (key) => normalize(key) === normalized,
    );

  if (alias && ROLE_PROFILES[ROLE_ALIASES[alias]]) {
    const resolved = ROLE_ALIASES[alias];

    return {
      name: resolved,
      ...ROLE_PROFILES[resolved],
      concepts: ROLE_PROFILES[resolved].concepts || [],
      known: true,
    };
  }

  const exactKey = Object.keys(ROLE_PROFILES).find(
    (key) => normalize(key) === normalized,
  );

  if (exactKey) {
    return {
      name: exactKey,
      ...ROLE_PROFILES[exactKey],
      concepts: ROLE_PROFILES[exactKey].concepts || [],
      known: true,
    };
  }

  return {
    name: clean,
    family: inferRoleFamily(clean),
    skills: [],
    concepts: [],
    known: false,
  };
}

function inferRoleFamily(role) {
  const text = normalize(role);

  if (
    /designer|design|ux|ui|visual/.test(text)
  ) {
    return 'design';
  }

  if (
    /data scientist/.test(text)
  ) {
    return 'data-science';
  }

  if (
    /machine learning|ml engineer|deep learning/.test(text)
  ) {
    return 'ml';
  }

  if (
    /\bai\b|artificial intelligence|nlp|computer vision/.test(text)
  ) {
    return 'ai';
  }

  if (
    /devops|sre|site reliability/.test(text)
  ) {
    return 'devops';
  }

  if (
    /cloud|infrastructure/.test(text)
  ) {
    return 'cloud';
  }

  if (
    /security|cyber/.test(text)
  ) {
    return 'security';
  }

  if (
    /qa|quality|test/.test(text)
  ) {
    return 'qa';
  }

  if (
    /data engineer|analytics engineer|etl/.test(text)
  ) {
    return 'data';
  }

  if (
    /backend|server|api/.test(text)
  ) {
    return 'backend';
  }

  if (
    /frontend|front end|web/.test(text)
  ) {
    return 'frontend';
  }

  if (
    /mobile|android|ios/.test(text)
  ) {
    return 'mobile';
  }

  if (
    /embedded|firmware|kernel/.test(text)
  ) {
    return 'systems';
  }

  if (
    /architect|architecture/.test(text)
  ) {
    return 'architecture';
  }

  if (
    /product/.test(text)
  ) {
    return 'product';
  }

  if (
    /program manager/.test(text)
  ) {
    return 'program';
  }

  if (
    /manager|lead/.test(text)
  ) {
    return 'management';
  }

  if (
    /software|developer|engineer/.test(text)
  ) {
    return 'software';
  }

  return 'unknown';
}

/*
|--------------------------------------------------------------------------
| Evidence helpers
|--------------------------------------------------------------------------
*/

function containsPhrase(text, phrase) {
  return normalize(text).includes(normalize(phrase));
}

function countFamilyEvidence(resumeText, family) {
  const patterns = FAMILY_EVIDENCE[family] || [];

  return patterns.reduce(
    (count, phrase) =>
      count + (containsPhrase(resumeText, phrase) ? 1 : 0),
    0,
  );
}

function countDesignEvidence(resumeText) {
  const patterns = [
    'figma',
    'sketch',
    'adobe xd',
    'photoshop',
    'illustrator',
    'wireframe',
    'wireframing',
    'prototype',
    'prototyping',
    'user research',
    'usability testing',
    'interaction design',
    'visual design',
    'design system',
    'information architecture',
    'ui design',
    'ux design',
    'product design',
  ];

  return patterns.reduce(
    (count, phrase) =>
      count + (containsPhrase(resumeText, phrase) ? 1 : 0),
    0,
  );
}

function countProfessionalFamilyEvidence(resumeText, family) {
  const normalized = normalize(resumeText);

  const titlePatterns = {
    design: [
      'designer',
      'ux designer',
      'ui designer',
      'product designer',
      'visual designer', 
      'graphic designer',
    ],
    software: [
      'software engineer',
      'software developer',
      'developer',
      'programmer',
    ],
    backend: [
      'backend engineer',
      'backend developer',
      'server engineer',
    ],
    frontend: [
      'frontend engineer',
      'frontend developer',
      'web developer',
      'react developer',
    ],
    data: [
      'data engineer',
      'analytics engineer',
    ],
    'data-science': [
      'data scientist',
    ],
    ml: [
      'machine learning engineer',
      'ml engineer',
    ],
    ai: [
      'ai engineer',
      'nlp engineer',
      'computer vision engineer',
    ],
  };

  const patterns = titlePatterns[family] || [];

  return patterns.reduce(
    (count, phrase) =>
      count + (normalized.includes(normalize(phrase)) ? 1 : 0),
    0,
  );
}

/*
|--------------------------------------------------------------------------
| Role compatibility
|--------------------------------------------------------------------------
*/

function calculateRoleCompatibility(
  resumeText,
  roleProfile,
  roleSkills,
) {
  const family = roleProfile.family;

  /*
  |--------------------------------------------------------------------------
  | Unknown custom role
  |--------------------------------------------------------------------------
  */

  if (!roleProfile.known && family === 'unknown') {
    return {
      score: 35,
      status: 'unknown',
      matched: [],
      missing: [],
      evidenceCount: 0,
      reason:
        'The selected position is not in VeeBee’s role taxonomy. Add a job description for a stronger role-specific assessment.',
      hardMismatch: false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | DESIGN SPECIAL CASE
  |--------------------------------------------------------------------------
  | This deliberately prevents a generic technical resume from scoring
  | highly for Designer just because it has experience/education.
  |--------------------------------------------------------------------------
  */

  if (family === 'design') {
    const designEvidence = countDesignEvidence(resumeText);
    const designTitles = countProfessionalFamilyEvidence(
      resumeText,
      'design',
    );

    const expected = roleSkills.length || 1;

    const matchedSkills = roleSkills.filter(
      (skill) => extractSkills(resumeText).includes(skill),
    );

    const skillRatio = matchedSkills.length / expected;

    let score =
      skillRatio * 65 +
      Math.min(designEvidence, 8) * 3 +
      Math.min(designTitles, 2) * 8;

    /*
     * A resume with ZERO design evidence is an actual role mismatch.
     */
    if (designEvidence === 0 && designTitles === 0) {
      score = Math.min(score, 10);

      return {
        score: scoreFrom(score),
        status: 'major_mismatch',
        matched: matchedSkills,
        missing: roleSkills.filter(
          (skill) => !matchedSkills.includes(skill),
        ),
        evidenceCount: 0,
        reason:
          'No design-specific skills, projects, or professional design evidence were found in the resume.',
        hardMismatch: true,
      };
    }

    return {
      score: scoreFrom(score),
      status:
        score >= 75
          ? 'strong'
          : score >= 50
            ? 'partial'
            : 'weak',
      matched: matchedSkills,
      missing: roleSkills.filter(
        (skill) => !matchedSkills.includes(skill),
      ),
      evidenceCount: designEvidence + designTitles,
      reason:
        designEvidence > 0 || designTitles > 0
          ? 'Design-specific evidence was found in the resume.'
          : 'Limited design-specific evidence was found.',
      hardMismatch: false,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Normal technical/product roles
  |--------------------------------------------------------------------------
  */

  const resumeSkills = extractSkills(resumeText);

  const expectedSkills = roleSkills.length
    ? roleSkills
    : [];

  const matchedSkills = expectedSkills.filter(
    (skill) => resumeSkills.includes(skill),
  );

  const missingSkills = expectedSkills.filter(
    (skill) => !resumeSkills.includes(skill),
  );

  const skillRatio = expectedSkills.length
    ? matchedSkills.length / expectedSkills.length
    : 0;

  const familyEvidence = countFamilyEvidence(
    resumeText,
    family,
  );

  const professionalEvidence =
    countProfessionalFamilyEvidence(
      resumeText,
      family,
    );

  const roleEvidenceBonus = Math.min(
    20,
    familyEvidence * 3 + professionalEvidence * 7,
  );

  let score = skillRatio * 75 + roleEvidenceBonus;

  /*
  |--------------------------------------------------------------------------
  | Explicitly penalize unrelated technical resumes
  |--------------------------------------------------------------------------
  */

  if (
    family === 'design' &&
    countDesignEvidence(resumeText) === 0
  ) {
    score = Math.min(score, 10);
  }

  /*
  |--------------------------------------------------------------------------
  | Unknown role with no role-specific requirements
  |--------------------------------------------------------------------------
  */

  if (!expectedSkills.length && family !== 'unknown') {
    score =
      familyEvidence > 0
        ? 65 + Math.min(20, familyEvidence * 5)
        : 25;
  }

  return {
    score: scoreFrom(score),
    status:
      score >= 80
        ? 'strong'
        : score >= 60
          ? 'good'
          : score >= 35
            ? 'partial'
            : 'weak',
    matched: matchedSkills,
    missing: missingSkills,
    evidenceCount:
      familyEvidence + professionalEvidence,
    reason:
      matchedSkills.length > 0
        ? `Detected ${matchedSkills.length} role-relevant skill(s) with supporting resume evidence.`
        : `Little direct evidence was found for the ${roleProfile.name || family} role.`,
    hardMismatch: false,
  };
}

/*
|--------------------------------------------------------------------------
| Company skill extraction
|--------------------------------------------------------------------------
*/

const COMPANY_SKILL_ALIASES = {
  'C/C++': 'C++',
  Systems: 'System Design',
  ML: 'Machine Learning',
  APIs: 'REST APIs',
  Web: 'JavaScript',
  Architecture: 'System Design',
};

function getCompanySkills(company) {
  if (!company?.strengths) {
    return [];
  }

  return company.strengths
    .map(
      (skill) =>
        COMPANY_SKILL_ALIASES[skill] ||
        CANONICAL[normalize(skill)] ||
        skill,
    )
    .filter(Boolean);
}

/*
|--------------------------------------------------------------------------
| Experience / education / project signals
|--------------------------------------------------------------------------
*/

function countProjectSignals(resumeText) {
  const patterns = [
    /\bprojects?\b/i,
    /\b(built|developed|implemented|designed|deployed|created)\b/i,
    /\b(github|gitlab|portfolio)\b/i,
    /\b\d+(?:\.\d+)?%\b/i,
    /\b\d+[+,]?\s*(?:users|requests|records|ms|hours)\b/i,
  ];

  return patterns.reduce(
    (count, pattern) =>
      count + (pattern.test(resumeText) ? 1 : 0),
    0,
  );
}

function countExperienceSignals(resumeText) {
  const patterns = [
    /\b(experience|employment|work history|internship|intern|professional)\b/i,
    /\b(engineer|developer|analyst|researcher|consultant|designer)\b/i,
    /\b(led|owned|collaborated|delivered|improved|reduced|increased)\b/i,
    /\b(?:19|20)\d{2}\s*(?:-|–|to)\s*(?:present|(?:19|20)\d{2})\b/i,
  ];

  return patterns.reduce(
    (count, pattern) =>
      count + (pattern.test(resumeText) ? 1 : 0),
    0,
  );
}

function countEducationSignals(resumeText) {
  const patterns = [
    /\beducation\b/i,
    /\b(bachelor|master|b\.?tech|m\.?tech|b\.?s\.?|m\.?s\.?|degree)\b/i,
    /\b(university|college|institute|school)\b/i,
  ];

  return patterns.reduce(
    (count, pattern) =>
      count + (pattern.test(resumeText) ? 1 : 0),
    0,
  );
}

function calculateProjects(resumeText) {
  return Math.min(
    100,
    countProjectSignals(resumeText) * 20,
  );
}

function calculateExperience(resumeText) {
  return Math.min(
    100,
    countExperienceSignals(resumeText) * 25,
  );
}

function calculateEducation(resumeText) {
  return Math.min(
    100,
    countEducationSignals(resumeText) * 34,
  );
}

/*
|--------------------------------------------------------------------------
| Main Resume Screener
|--------------------------------------------------------------------------
*/

export function analyzeScreening(
  resumeText,
  companyName,
  role,
  jdText = '',
) {
  const company =
    companyProfiles.find(
      (item) => item.name === companyName,
    ) ||
    {
      name: companyName,
      match: 0,
      strengths: [],
      gap:
        'No curated company profile yet. Screening is based on the selected role and explicit resume evidence.',
    };

  const cleanResume = String(
    resumeText || '',
  ).trim();

  const cleanRole = String(
    role || '',
  ).trim();

  const cleanJd = String(
    jdText || '',
  ).trim();

  /*
  |--------------------------------------------------------------------------
  | Resolve role
  |--------------------------------------------------------------------------
  */

  const roleProfile =
    resolveRoleProfile(cleanRole);

  const roleExpectedSkills = [
    ...(roleProfile.skills || []),
  ];

  /*
  |--------------------------------------------------------------------------
  | JD skills
  |--------------------------------------------------------------------------
  */

  const jdSkills = extractSkills(cleanJd);

  /*
  |--------------------------------------------------------------------------
  | Company skills
  |--------------------------------------------------------------------------
  */

  const companySkills = getCompanySkills(
    company,
  );

  /*
  |--------------------------------------------------------------------------
  | Resume skills
  |--------------------------------------------------------------------------
  */

  const resumeSkills = extractSkills(
    cleanResume,
  );

  /*
  |--------------------------------------------------------------------------
  | Combined target requirements
  |--------------------------------------------------------------------------
  */

  const targetSkills = [
    ...new Set([
      ...roleExpectedSkills,
      ...companySkills,
      ...jdSkills,
    ]),
  ];

  const matchedTargetSkills =
    targetSkills.filter(
      (skill) =>
        resumeSkills.includes(skill),
    );

  const missingTargetSkills =
    targetSkills.filter(
      (skill) =>
        !resumeSkills.includes(skill),
    );

  const skillMatch = targetSkills.length
    ? Math.round(
        (matchedTargetSkills.length /
          targetSkills.length) *
          100,
      )
    : 0;

  /*
  |--------------------------------------------------------------------------
  | Role fit
  |--------------------------------------------------------------------------
  */

  const roleFit =
    calculateRoleCompatibility(
      cleanResume,
      roleProfile,
      roleExpectedSkills,
    );

  /*
  |--------------------------------------------------------------------------
  | JD-specific fit
  |--------------------------------------------------------------------------
  */

  const jdMatched =
    jdSkills.filter(
      (skill) =>
        resumeSkills.includes(skill),
    );

  const jdMissing =
    jdSkills.filter(
      (skill) =>
        !resumeSkills.includes(skill),
    );

  const jdMatchRate = jdSkills.length
    ? Math.round(
        (jdMatched.length /
          jdSkills.length) *
          100,
      )
    : null;

  /*
  |--------------------------------------------------------------------------
  | Company fit
  |--------------------------------------------------------------------------
  */

  const companyMatched =
    companySkills.filter(
      (skill) =>
        resumeSkills.includes(skill),
    );


const companyFit = companySkills.length
  ? Math.round(
      (companyMatched.length /
        companySkills.length) *
        100,
    )
  : null;

/*
|--------------------------------------------------------------------------
| Evidence signals
|--------------------------------------------------------------------------
*/

const project = calculateProjects(
  cleanResume,
);

const experience =
  calculateExperience(cleanResume);

const education =
  calculateEducation(cleanResume);

/*
|--------------------------------------------------------------------------
| Overall score
|--------------------------------------------------------------------------
|
| Role fit is deliberately more important than generic experience and
| education. This prevents unrelated candidates from scoring too highly.
|--------------------------------------------------------------------------
*/

const skillComponent = skillMatch * 0.32;
const roleComponent = roleFit.score * 0.38;
const projectComponent = project * 0.12;
const experienceComponent =
  experience * 0.10;
const educationComponent =
  education * 0.08;

let overall = Math.round(
  skillComponent +
    roleComponent +
    projectComponent +
    experienceComponent +
    educationComponent,
);

/*
|--------------------------------------------------------------------------
| Hard mismatch cap
|--------------------------------------------------------------------------
*/

if (roleFit.hardMismatch) {
  overall = Math.min(
    overall,
    25,
  );
}

/*
|--------------------------------------------------------------------------
| JD hard-gap protection
|--------------------------------------------------------------------------
*/

if (
  jdSkills.length >= 5 &&
  jdMatchRate !== null &&
  jdMatchRate < 20
) {
  overall = Math.min(
    overall,
    35,
  );
}

/*
|--------------------------------------------------------------------------
| Very strong direct role evidence can increase score
|--------------------------------------------------------------------------
*/

if (
  roleFit.score >= 85 &&
  skillMatch >= 70
) {
  overall = Math.max(
    overall,
    75,
  );
}

overall = scoreFrom(
  overall,
  0,
  100,
);

/*
|--------------------------------------------------------------------------
| Recommendation
|--------------------------------------------------------------------------
*/

let recommendation;

if (
  roleFit.hardMismatch ||
  overall < 35
) {
  recommendation = 'LOW MATCH';
} else if (overall < 55) {
  recommendation = 'REVIEW';
} else if (overall < 75) {
  recommendation = 'SHORTLIST';
} else {
  recommendation = 'STRONG MATCH';
}

/*
|--------------------------------------------------------------------------
| Confidence
|--------------------------------------------------------------------------
*/

const evidenceStrength =
  resumeSkills.length +
  countProjectSignals(cleanResume) +
  countExperienceSignals(cleanResume);

const confidence =
  evidenceStrength >= 12
    ? 'High'
    : evidenceStrength >= 6
      ? 'Moderate'
      : 'Low';

/*
|--------------------------------------------------------------------------
| Positive signals
|--------------------------------------------------------------------------
*/

const positive = [
  ...matchedTargetSkills.map(
    (skill) =>
      `Direct ${skill} evidence`,
  ),

  ...(roleFit.matched || [])
    .filter(
      (skill) =>
        !matchedTargetSkills.includes(
          skill,
        ),
    )
    .map(
      (skill) =>
        `Role-relevant ${skill} evidence`,
    ),

  ...(project >= 50
    ? ['Project delivery evidence']
    : []),

  ...(experience >= 50
    ? ['Professional experience evidence']
    : []),

  ...(roleFit.evidenceCount >= 3
    ? [
        `${roleProfile.name || cleanRole} family evidence`,
      ]
    : []),
];

/*
|--------------------------------------------------------------------------
| Gaps
|--------------------------------------------------------------------------
*/

const gaps = [
  ...missingTargetSkills,
];

if (
  roleFit.hardMismatch
) {
  gaps.unshift(
    'No evidence relevant to the selected role',
  );
}

if (
  jdMissing.length
) {
  gaps.push(
    ...jdMissing.filter(
      (skill) =>
        !gaps.includes(skill),
    ),
  );
}

if (
  project < 50
) {
  gaps.push(
    'Clear project ownership or outcomes',
  );
}

if (
  experience < 50
) {
  gaps.push(
    'Relevant professional experience evidence',
  );
}

const uniqueGaps = [
  ...new Set(gaps),
];

/*
|--------------------------------------------------------------------------
| Requirement breakdown
|--------------------------------------------------------------------------
*/

const requirements = targetSkills.map(
  (skill) => [
    skill,
    resumeSkills.includes(skill)
      ? 'matched'
      : 'missing',
    resumeSkills.includes(skill)
      ? 'Direct or normalized resume evidence detected.'
      : 'No direct evidence found in the current resume.',
  ],
);

/*
|--------------------------------------------------------------------------
| ATS platforms
|--------------------------------------------------------------------------
|
| The frontend will stop generating artificial scores here.
| When backend ATS data is available, analysis.ats will be populated
| by the backend.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| ATS CARD ENGINE
|--------------------------------------------------------------------------
|
| Each ATS gets its own scoring profile.
| The scores are deterministic and based on:
|
| - formatting
| - keyword coverage
| - required sections
| - experience quality
| - education
| - quantified impact
| - ATS-specific strictness
| - ATS-specific bonuses / penalties
|
| This replaces the old "overall +/- adjustment" approach.
|--------------------------------------------------------------------------
*/

const ATS_CARD_PROFILES = [
  {
    platform: 'Workday',
    vendor: 'Workday Inc.',
    keywordStrategy: 'exact',
    passingScore: 70,

    weights: {
      formatting: 0.25,
      keywords: 0.30,
      sections: 0.15,
      experience: 0.15,
      education: 0.10,
      quantification: 0.05,
    },

    strictness: 0.90,

    requiredSections: [
      'Experience',
      'Education',
      'Skills',
    ],

    quirks: {
      fewSkillsPenalty: 8,
      longResumePenalty: 5,
      missingSectionPenalty: 8,
    },
  },

  {
    platform: 'Oracle Taleo',
    vendor: 'Oracle',
    keywordStrategy: 'exact',
    passingScore: 65,

    weights: {
      formatting: 0.20,
      keywords: 0.35,
      sections: 0.15,
      experience: 0.15,
      education: 0.10,
      quantification: 0.05,
    },

    strictness: 0.85,

    requiredSections: [
      'Experience',
      'Education',
      'Skills',
    ],

    quirks: {
      fewSkillsPenalty: 10,
      longResumePenalty: 6,
      missingSectionPenalty: 10,
    },
  },

  {
    platform: 'iCIMS',
    vendor: 'iCIMS',
    keywordStrategy: 'fuzzy',
    passingScore: 60,

    weights: {
      formatting: 0.15,
      keywords: 0.30,
      sections: 0.15,
      experience: 0.20,
      education: 0.10,
      quantification: 0.10,
    },

    strictness: 0.60,

    requiredSections: [
      'Experience',
      'Education',
    ],

    quirks: {
      fewSkillsPenalty: 3,
      longResumePenalty: 2,
      missingSectionPenalty: 6,
    },
  },

  {
    platform: 'Greenhouse',
    vendor: 'Greenhouse Software',
    keywordStrategy: 'semantic',
    passingScore: 55,

    weights: {
      formatting: 0.10,
      keywords: 0.25,
      sections: 0.10,
      experience: 0.25,
      education: 0.10,
      quantification: 0.20,
    },

    strictness: 0.40,

    requiredSections: [
      'Experience',
      'Education',
    ],

    quirks: {
      fewSkillsPenalty: 0,
      longResumePenalty: 1,
      missingSectionPenalty: 4,
    },
  },

  {
    platform: 'Lever',
    vendor: 'Lever',
    keywordStrategy: 'semantic',
    passingScore: 50,

    weights: {
      formatting: 0.08,
      keywords: 0.22,
      sections: 0.10,
      experience: 0.30,
      education: 0.10,
      quantification: 0.20,
    },

    strictness: 0.35,

    requiredSections: [
      'Experience',
    ],

    quirks: {
      fewSkillsPenalty: 0,
      longResumePenalty: 0,
      missingSectionPenalty: 2,
    },
  },

  {
    platform: 'SuccessFactors',
    vendor: 'SAP',
    keywordStrategy: 'exact',
    passingScore: 65,

    weights: {
      formatting: 0.25,
      keywords: 0.25,
      sections: 0.20,
      experience: 0.15,
      education: 0.10,
      quantification: 0.05,
    },

    strictness: 0.85,

    requiredSections: [
      'Experience',
      'Education',
      'Skills',
    ],

    quirks: {
      fewSkillsPenalty: 6,
      longResumePenalty: 5,
      missingSectionPenalty: 10,
    },
  },
];

/*
|--------------------------------------------------------------------------
| Keyword matching for ATS cards
|--------------------------------------------------------------------------
*/

function atsKeywordMatch(
  resumeSkills,
  targetSkills,
  strategy,
) {
  const resume = new Set(
    resumeSkills.map((skill) =>
      normalize(skill),
    ),
  );

  const matched = [];
  const missing = [];
  const synonymMatched = [];

  for (const skill of targetSkills) {
    const normalizedSkill =
      normalize(skill);

    if (resume.has(normalizedSkill)) {
      matched.push(skill);
      continue;
    }

    if (
      strategy === 'fuzzy' ||
      strategy === 'semantic'
    ) {
      const canonical =
        CANONICAL[normalizedSkill] ||
        skill;

      const fuzzyMatch =
        resumeSkills.some(
          (resumeSkill) => {
            const resumeNormalized =
              normalize(resumeSkill);

            const resumeCanonical =
              CANONICAL[
                resumeNormalized
              ] ||
              resumeSkill;

            return (
              normalize(
                resumeCanonical,
              ) ===
                normalize(canonical) ||
              resumeNormalized.includes(
                normalizedSkill,
              ) ||
              normalizedSkill.includes(
                resumeNormalized,
              )
            );
          },
        );

      if (fuzzyMatch) {
        synonymMatched.push(skill);
        continue;
      }
    }

    missing.push(skill);
  }

  const total =
    targetSkills.length;

  if (!total) {
    return {
      score: 100,
      matched: [],
      missing: [],
      synonymMatched: [],
    };
  }

  const effectiveMatches =
    matched.length +
    synonymMatched.length *
      (strategy === 'semantic'
        ? 0.90
        : 0.80);

  return {
    score: scoreFrom(
      Math.round(
        (effectiveMatches / total) *
          100,
      ),
      0,
      100,
    ),
    matched,
    missing,
    synonymMatched,
  };
}

/*
|--------------------------------------------------------------------------
| Section detection
|--------------------------------------------------------------------------
*/

function detectResumeSections(
  resumeText,
) {
  const text =
    String(
      resumeText || '',
    ).toLowerCase();

  const sections = [];

  if (
    /(^|\n)\s*(summary|profile|objective)\s*[:\-]?\s*(\n|$)/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Summary',
    );
  }

  if (
    /(^|\n)\s*(experience|work experience|professional experience|employment)\s*[:\-]?\s*(\n|$)/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Experience',
    );
  } else if (
    /developer|engineer|designer|intern|worked at|employment/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Experience',
    );
  }

  if (
    /(^|\n)\s*(education|academic background|academics)\s*[:\-]?\s*(\n|$)/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Education',
    );
  } else if (
    /bachelor|master|b\.tech|m\.tech|bsc|msc|university|college|degree/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Education',
    );
  }

  if (
    /(^|\n)\s*(skills|technical skills|core skills|technologies)\s*[:\-]?\s*(\n|$)/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Skills',
    );
  } else if (
    extractSkills(
      resumeText,
    ).length >= 3
  ) {
    sections.push(
      'Skills',
    );
  }

  if (
    /(^|\n)\s*(projects|personal projects|academic projects)\s*[:\-]?\s*(\n|$)/i.test(
      resumeText,
    )
  ) {
    sections.push(
      'Projects',
    );
  }

  return [
    ...new Set(
      sections,
    ),
  ];
}

/*
|--------------------------------------------------------------------------
| Formatting score
|--------------------------------------------------------------------------
*/

function atsFormattingScore(
  resumeText,
  strictness,
) {
  const text =
    String(
      resumeText || '',
    );

  let score = 100;

  const wordCount =
    text
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length;

  if (wordCount < 150) {
    score -=
      10 * strictness;
  }

  if (wordCount > 1500) {
    score -=
      4 * strictness;
  }

  const unusualCharacters =
    (
      text.match(
        /[^\w\s.,;:!?@#$%&*()\-+=/\\'"]/g,
      ) || []
    ).length;

  const specialRatio =
    text.length
      ? unusualCharacters /
        text.length
      : 0;

  if (
    specialRatio > 0.05
  ) {
    score -=
      8 * strictness;
  }

  const lines =
    text.split('\n');

  const bulletLines =
    lines.filter(
      (line) =>
        /^\s*[-•*·▪►➤○●]\s/.test(
          line,
        ),
    );

  const bulletTypes =
    new Set(
      bulletLines.map(
        (line) =>
          line.match(
            /^\s*([-•*·▪►➤○●])/,
          )?.[1],
      ),
    );

  if (
    bulletTypes.size > 2
  ) {
    score -=
      2 * strictness;
  }

  const allCapsLines =
    lines.filter(
      (line) =>
        line.trim().length >
          30 &&
        line ===
          line.toUpperCase() &&
        /[A-Z]/.test(line),
    );

  if (
    allCapsLines.length > 3
  ) {
    score -=
      3 * strictness;
  }

  return scoreFrom(
    Math.round(score),
    0,
    100,
  );
}

/*
|--------------------------------------------------------------------------
| Quantification score
|--------------------------------------------------------------------------
*/

function atsQuantificationScore(
  resumeText,
) {
  const lines =
    String(
      resumeText || '',
    )
      .split('\n')
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean);

  const achievementLines =
    lines.filter(
      (line) =>
        line.length >= 25 &&
        (
          /[-•*]/.test(
            line,
          ) ||
          /developed|built|created|led|managed|improved|increased|reduced|designed|engineered|implemented/i.test(
            line,
          )
        ),
    );

  if (
    achievementLines.length ===
    0
  ) {
    return 0;
  }

  const quantified =
    achievementLines.filter(
      (line) =>
        /\d+%|\$[\d,]+|\d+\s*(?:x|times)|\d+\+?\s*(?:users?|customers?|clients?|projects?|applications?|systems?|years?|months?)/i.test(
          line,
        ),
    ).length;

  return scoreFrom(
    Math.round(
      (quantified /
        achievementLines.length) *
        100,
    ),
    0,
    100,
  );
}

/*
|--------------------------------------------------------------------------
| Experience quality
|--------------------------------------------------------------------------
*/

function atsExperienceScore(
  resumeText,
) {
  const text =
    String(
      resumeText || '',
    );

  const experience =
    calculateExperience(
      text,
    );

  return scoreFrom(
    Number.isFinite(
      experience,
    )
      ? experience
      : 0,
    0,
    100,
  );
}

/*
|--------------------------------------------------------------------------
| Education score
|--------------------------------------------------------------------------
*/

function atsEducationScore(
  resumeText,
) {
  const education =
    calculateEducation(
      String(
        resumeText || '',
      ),
    );

  return scoreFrom(
    Number.isFinite(
      education,
    )
      ? education
      : 0,
    0,
    100,
  );
}

/*
|--------------------------------------------------------------------------
| ATS-specific card scorer
|--------------------------------------------------------------------------
*/

function calculateAtsCard(
  profile,
  {
    resumeText,
    targetSkills,
  },
) {
  const cleanResume =
    String(
      resumeText || '',
    ).trim();

  const resumeSkills =
    extractSkills(
      cleanResume,
    );

  const sections =
    detectResumeSections(
      cleanResume,
    );

  const keywordResult =
    atsKeywordMatch(
      resumeSkills,
      targetSkills,
      profile.keywordStrategy,
    );

  const formatting =
    atsFormattingScore(
      cleanResume,
      profile.strictness,
    );

  const experience =
    atsExperienceScore(
      cleanResume,
    );

  const education =
    atsEducationScore(
      cleanResume,
    );

  const quantification =
    atsQuantificationScore(
      cleanResume,
    );

  const missingSections =
    profile.requiredSections.filter(
      (required) =>
        !sections.includes(
          required,
        ),
    );

  let sectionScore =
    profile.requiredSections.length
      ? Math.round(
          (
            (
              profile.requiredSections
                .length -
              missingSections.length
            ) /
              profile
                .requiredSections
                .length
          ) *
            100,
        )
      : 100;

  /*
  |--------------------------------------------------------------------------
  | ATS-specific adjustments
  |--------------------------------------------------------------------------
  */

  let quirkAdjustment = 0;

  if (
    profile.quirks.fewSkillsPenalty >
      0 &&
    resumeSkills.length < 5
  ) {
    quirkAdjustment -=
      profile.quirks
        .fewSkillsPenalty;
  }

  if (
    profile.quirks.longResumePenalty >
      0
  ) {
    const wordCount =
      cleanResume
        .split(/\s+/)
        .filter(Boolean)
        .length;

    if (
      wordCount > 1200
    ) {
      quirkAdjustment -=
        profile.quirks
          .longResumePenalty;
    }
  }

  if (
    missingSections.length >
      0
  ) {
    quirkAdjustment -=
      Math.min(
        12,
        missingSections.length *
          profile.quirks
            .missingSectionPenalty,
      );
  }

  /*
  |--------------------------------------------------------------------------
  | Role relevance
  |--------------------------------------------------------------------------
  */

  const roleScore =
    roleFit.score;

  /*
  |--------------------------------------------------------------------------
  | Weighted ATS score
  |--------------------------------------------------------------------------
  */

  const weighted =
    formatting *
      profile.weights
        .formatting +
    keywordResult.score *
      profile.weights
        .keywords +
    sectionScore *
      profile.weights
        .sections +
    experience *
      profile.weights
        .experience +
    education *
      profile.weights
        .education +
    quantification *
      profile.weights
        .quantification;

  /*
  |--------------------------------------------------------------------------
  | Role-aware adjustment
  |--------------------------------------------------------------------------
  */

  const roleAdjustment =
    roleScore >= 85
      ? 4
      : roleScore >= 70
        ? 2
        : roleScore < 40
          ? -8
          : 0;

  const finalScore =
    scoreFrom(
      Math.round(
        weighted +
          roleAdjustment +
          quirkAdjustment,
      ),
      0,
      100,
    );

  /*
  |--------------------------------------------------------------------------
  | Status
  |--------------------------------------------------------------------------
  */

  let status;

  if (
    finalScore <
    40
  ) {
    status =
      'MAY BE FILTERED';
  } else if (
    finalScore <
    profile.passingScore
  ) {
    status =
      'NEEDS REVIEW';
  } else {
    status =
      'LIKELY TO PASS';
  }

  return {
    platform:
      profile.platform,

    vendor:
      profile.vendor,

    score:
      finalScore,

    formatting,

    keywords:
      keywordResult.score,

    sections:
      sectionScore,

    experience,

    education,

    quantification,

    matched:
      keywordResult.matched,

    missing:
      keywordResult.missing,

    synonymMatched:
      keywordResult.synonymMatched,

    missingSections,

    status,

    passingScore:
      profile.passingScore,

    source:
      'local_ats_profile',

    profile: {
      keywordStrategy:
        profile.keywordStrategy,

      strictness:
        profile.strictness,

      weights:
        profile.weights,
    },
  };
}

/*
|--------------------------------------------------------------------------
| Generate six independent ATS cards
|--------------------------------------------------------------------------
*/

const atsPlatforms =
  ATS_CARD_PROFILES.map(
    (profile) =>
      calculateAtsCard(
        profile,
        {
          resumeText:
            cleanResume,

          targetSkills:
            targetSkills.length
              ? targetSkills
              : roleExpectedSkills,
        },
      ),
  );
/*
|--------------------------------------------------------------------------
| Summary
|--------------------------------------------------------------------------
*/

let summary;

if (roleFit.hardMismatch) {
  summary =
    `The candidate does not show direct evidence for the selected ${cleanRole} role. ` +
    `The resume may contain strong experience in other areas, but those signals are not treated as role-fit evidence.`;
} else if (cleanJd && jdMatchRate !== null) {
  summary =
    `The score combines ${cleanRole} role requirements, the supplied job description, ` +
    `${company.name} company signals, and explicit resume evidence. ` +
    `JD skill coverage is ${jdMatchRate}%.`;
} else {
  summary =
    `The score combines ${cleanRole} role requirements, ${company.name} company signals, ` +
    `and explicit evidence in the resume.`;
}

return {
  company,
  role: cleanRole,

  score: overall,

  recommendation,

  summary,

  confidence,

  roleProfile: {
    family: roleProfile.family,
    known: roleProfile.known,
    expectedSkills: roleExpectedSkills,
    concepts: roleProfile.concepts || [],
    matched: roleFit.matched,
    missing: roleFit.missing,
    score: roleFit.score,
    status: roleFit.status,
    reason: roleFit.reason,
    hardMismatch: roleFit.hardMismatch,
  },

  jd: {
    provided: Boolean(cleanJd),
    matchRate: jdMatchRate,
    matched: jdMatched,
    missing: jdMissing,
    skills: jdSkills,
  },

  companyFit: {
    expected: companySkills,
    matched: companyMatched,
    missing: companySkills.filter(
      (skill) =>
        !companyMatched.includes(skill),
    ),
    score: companyFit,
  },

  skills: {
    matched: matchedTargetSkills,
    missing: missingTargetSkills,
    score: skillMatch,
  },

  sections: [
    ['Skills', skillMatch],
    ['Projects', project],
    ['Experience', experience],
    ['Education', education],
    ['Role fit', roleFit.score],
  ],

  positive: [
    ...new Set(positive),
  ].slice(0, 12),

  gaps:
    uniqueGaps.length
      ? uniqueGaps.slice(0, 12)
      : [company.gap],

  requirements,

  evidence: {
    resumeSkills,
    projectSignals: countProjectSignals(
      cleanResume,
    ),
    experienceSignals:
      countExperienceSignals(
        cleanResume,
      ),
    educationSignals:
      countEducationSignals(
        cleanResume,
      ),
  },

  /*
  * Temporary client-side fallback.
  * Once backend ATS scoring is connected, this is replaced by:
  * result.ats.platforms
  */
  atsPlatforms,

  ats: null,

  metadata: {
    scoringVersion: 'role-aware-v2',
    roleTaxonomy: 'VeeBee software-industry role profiles',
    scoreBasis:
      'Role-specific evidence + skills + projects + experience + education',
  },
};
}

/*
|--------------------------------------------------------------------------
| Existing Resume Optimizer
|--------------------------------------------------------------------------
*/

export function analyzeOptimizer(
resumeText,
mode = 'balanced',
) {
const skills =
  extractSkills(resumeText);

const hasProjects =
  /project/i.test(
    resumeText,
  );

const hasExperience =
  /experience|intern|developer|engineer|designer/i.test(
    resumeText,
  );

const hasSummary =
  /summary|profile|objective/i.test(
    resumeText,
  );

const base = skills.length
  ? Math.min(
      95,
      60 +
        skills.length * 3,
    )
  : 50;

const adjustment =
  mode === 'minimal'
    ? 0
    : mode === 'aggressive'
      ? 7
      : 3;

return {
  current: scoreFrom(
    base - 8,
  ),

  optimized: scoreFrom(
    base + adjustment,
  ),

  cards: [
    {
      title: 'Skills',
      score: scoreFrom(
        base + 5,
      ),
      desc:
        'Prioritize detected skills by target-role relevance.',
      tags:
        skills.slice(0, 5),
    },

    {
      title: 'Projects',
      score: scoreFrom(
        hasProjects
          ? base + 1
          : base - 8,
      ),
      desc:
        hasProjects
          ? 'Lead project bullets with ownership, architecture, and verified outcomes.'
          : 'Add project evidence only when it genuinely exists in the source resume.',
      tags: [
        'Architecture',
        'Impact',
        'Ownership',
      ],
    },

    {
      title: 'Experience',
      score: scoreFrom(
        hasExperience
          ? base - 1            : base - 10,
        ),
        desc:
          hasExperience
            ? 'Rewrite bullets as action + technology + result.'
            : 'Make existing internships or experience easier to scan.',
        tags: [
          'Action',
          'Tech',
          'Result',
        ],
      },

      {
        title: 'Role fit',
        score: scoreFrom(
          base,
        ),
        desc:
          'Reorder evidence around the target role without adding unsupported claims.',
        tags: [
          'Relevant',
          'Specific',
          'Evidence',
        ],
      },

      {
        title: 'Formatting',
        score: 94,
        desc:
          'Keep sections, dates, bullets, and spacing consistent for machine readability.',
        tags: [
          'Readable',
          'Consistent',
          'ATS-safe',
        ],
      },

      {
        title: 'Summary',
        score: scoreFrom(
          hasSummary
            ? base
            : base - 5,
        ),
        desc:
          'Make the opening section specific to the target role using source evidence only.',
        tags: [
          'Relevant',
          'Specific',
          'Evidence',
        ],
      },
    ],

    bestEdit:
      hasProjects
        ? 'Rewrite the strongest project bullets around ownership and outcomes.'
        : 'Improve section hierarchy first, then optimize existing evidence.',

    skills,
  };
}

/*
|--------------------------------------------------------------------------
| AI Suggester
|--------------------------------------------------------------------------
*/

export function analyzeSuggestions(
  resumeText,
  min = 70,
  query = '',
) {
  const resumeSkills =
    extractSkills(resumeText);

  const ranked =
    companyProfiles
      .map((company) => {
        const relevant =
          company.strengths.map(
            (x) =>
              COMPANY_SKILL_ALIASES[x] ||
              CANONICAL[
                normalize(x)
              ] ||
              x,
          );

        const overlap =
          relevant.filter(
            (x) =>
              resumeSkills.includes(
                x,
              ),
          ).length;

        const score = scoreFrom(
          60 +
            overlap * 8 +
            Math.min(
              12,
              resumeSkills.length,
            ),
          0,
          97,
        );

        return {
          ...company,
          match: score,
        };
      })
      .sort(
        (a, b) =>
          b.match - a.match,
      );

  return ranked.filter(
    (company) =>
      company.match >= min &&
      company.name
        .toLowerCase()
        .includes(
          query.toLowerCase(),
        ),
  );
}

/*
|--------------------------------------------------------------------------
| Existing mock scan
|--------------------------------------------------------------------------
*/

export const fallbackScan =
  mockScan;

/*
|--------------------------------------------------------------------------
| REAL JD CHECKER API
|--------------------------------------------------------------------------
*/

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://127.0.0.1:8000';

export async function analyzeJDWithAPI({
  resumeText,
  jdText,
  engine = 'nlp',
}) {
  if (!resumeText?.trim()) {
    throw new Error(
      'Resume text is required.',
    );
  }

  if (!jdText?.trim()) {
    throw new Error(
      'Job description text is required.',
    );
  }

  if (
    !['nlp', 'llm'].includes(engine)
  ) {
    throw new Error(
      'Invalid analysis engine.',
    );
  }

  const response =
    await fetch(
      `${API_BASE_URL}/jd-checker/analyze`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Accept:
            'application/json',
        },

        body: JSON.stringify({
          resume_text:
            resumeText,

          jd_text:
            jdText,

          engine,
        }),
      },
    );

  let payload;

  try {
    payload =
      await response.json();
  } catch {
    throw new Error(
      'The backend returned an invalid response.',
    );
  }

  if (!response.ok) {
    throw new Error(
      payload?.detail ||
        payload?.error ||
        `Request failed with status ${response.status}.`,
    );
  }

  if (!payload?.success) {
    throw new Error(
      payload?.error ||
        'JD analysis could not be completed.',
    );
  }

  return payload;
}
export async function analyzeScreeningWithAPI({
  resumeText,
  companyName,
  role,
  jdText = '',
}) {
  return analyzeScreening(
    resumeText,
    companyName,
    role,
    jdText,
  );
}