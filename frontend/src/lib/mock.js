export const companyProfiles = [
  { name: 'NVIDIA', match: 92, role: 'Software Engineer', location: 'Santa Clara / Remote', why: 'Python, C/C++, systems and ML project evidence align strongly with the software-engineering role family.', strengths: ['Python', 'C/C++', 'Systems', 'ML'], gap: 'Production cloud evidence' },
  { name: 'Qualcomm', match: 88, role: 'Embedded / Software Engineer', location: 'San Diego / Hybrid', why: 'Embedded, C and computer-architecture signals match the company profile for early-career systems roles.', strengths: ['C', 'Embedded', 'Architecture'], gap: 'Large-scale backend evidence' },
  { name: 'Microsoft', match: 84, role: 'Software Engineer', location: 'Redmond / Hybrid', why: 'Programming, cloud and full-stack coverage create a solid role-aligned profile.', strengths: ['Python', 'Web', 'APIs'], gap: 'Cloud depth' },
  { name: 'Adobe', match: 81, role: 'Frontend / Software Engineer', location: 'San Jose / Hybrid', why: 'React, API and frontend project signals line up with common engineering requirements.', strengths: ['React', 'JavaScript', 'APIs'], gap: 'Production scale evidence' },
  { name: 'Salesforce', match: 78, role: 'Software Engineer', location: 'Multiple locations', why: 'Web-stack breadth and project-based delivery create a credible early-career engineering fit.', strengths: ['React', 'Node.js', 'MongoDB'], gap: 'Role-specific platform evidence' },
  { name: 'Google', match: 76, role: 'Software Engineer', location: 'Multiple locations', why: 'Strong software fundamentals and project breadth are promising, with room to strengthen large-scale systems signals.', strengths: ['Python', 'APIs', 'ML'], gap: 'Distributed systems depth' },
];

export const mockScan = {
  score: 84,
  shortlistFit: 82,
  matched: ['Python', 'React', 'FastAPI', 'MongoDB', 'Machine Learning', 'REST APIs', 'Git'],
  missing: ['Docker', 'AWS', 'System Design'],
  sections: [['Skills', 91], ['Projects', 88], ['Experience', 79], ['Education', 86], ['Role fit', 82]],
  requirements: [
    ['Python', 'matched', 'Strong evidence in skills and projects'],
    ['REST APIs', 'matched', 'FastAPI project evidence supports this'],
    ['SQL', 'weak', 'Database experience exists, SQL is not prominent'],
    ['Docker', 'missing', 'No direct evidence found'],
    ['Cloud', 'missing', 'No strong production cloud evidence found'],
    ['React', 'matched', 'Project evidence directly supports frontend work'],
  ],
};

export const optimizationCards = [
  { title: 'Skills', score: 91, desc: 'Prioritize high-signal skills for the target role and reduce low-value noise.', tags: ['Python', 'React', 'FastAPI', 'MongoDB'] },
  { title: 'Projects', score: 88, desc: 'Lead with outcomes, architecture, ownership, and measurable results when evidence exists.', tags: ['Architecture', 'APIs', 'Impact', 'Ownership'] },
  { title: 'Experience', score: 79, desc: 'Rewrite bullets around action + technology + result so ownership is immediately visible.', tags: ['Action', 'Tech', 'Result'] },
  { title: 'Role fit', score: 82, desc: 'Mirror truthful role vocabulary and reorder evidence around the job you actually target.', tags: ['Software', 'Backend', 'ML'] },
  { title: 'Formatting', score: 94, desc: 'Keep section headings, spacing, bullets, dates and structure consistent for ATS parsing.', tags: ['Readable', 'Consistent', 'ATS-safe'] },
  { title: 'Summary', score: 76, desc: 'Make the opening summary role-specific without adding claims not present in the source resume.', tags: ['Relevant', 'Specific', 'Evidence'] },
];

// ---------------------------------------------------------------------------
// Resume Screener catalogs
// ---------------------------------------------------------------------------
export const companyCatalog = [
  ['Adobe','A'],['Airbnb','A'],['Albertsons','A'],['Alphabet','A'],['Amazon','a'],['American Airlines Group','AA'],['American Express','AE'],['Apple','A'],['Archer Daniels Midland','ADM'],['AT&T','AT'],['Bank of America','B'],['Berkshire Hathaway','BH'],['Best Buy','BB'],['Boeing','B'],['Booking Holdings','BK'],['Broadcom','B'],['Capital One Financial','C1'],['Caterpillar','CAT'],['Cencora','C'],['Centene','C'],['Chevron','C'],['Cigna Group','CG'],['Cisco Systems','C'],['Citigroup','C'],['Coca-Cola','CC'],['Comcast','C'],['ConocoPhillips','CP'],['Costco Wholesale','CW'],['Dell Technologies','D'],['Delta Air Lines','Δ'],['Dollar General','DG'],['Dollar Tree','DT'],['Energy Transfer','ET'],['Exxon Mobil','X'],['Fannie Mae','FM'],['FedEx','FD'],['Ford Motor','F'],['General Electric','GE'],['General Motors','GM'],['Goldman Sachs','GS'],['Google','G'],['Home Depot','HD'],['Humana','H'],['IBM','IBM'],['Intel','I'],['Intuit','I'],['Johnson & Johnson','J&J'],['Johnson Controls','JC'],['JPMorgan Chase','JP'],['Kroger','K'],['Liberty Mutual','LM'],['Lockheed Martin','LM'],["Lowe's",'L'],['Marathon Petroleum','MP'],['MassMutual','MM'],["McDonald's",'M'],['McKesson','MK'],['Merck','MK'],['Meta Platforms','∞'],['Microsoft','⊞'],['Morgan Stanley','MS'],['Nationwide','NW'],['Netflix','N'],['New York Life Insurance','NYL'],['Nike','✓'],['NVIDIA','N'],['Oracle','O'],['PayPal','P'],['PepsiCo','P'],['Pfizer','P'],['Phillips 66','66'],['PNC Financial Services','PNC'],['Procter & Gamble','P&G'],['Progressive','P'],['Prudential Financial','P'],['Qualcomm','Q'],['RTX','RTX'],['Salesforce','SF'],['Starbucks','S'],['State Farm','SF'],['Sysco','SY'],['Target','T'],['Tesla','T'],['TIAA','T'],['TJX Companies','TJX'],['Truist Financial','TF'],['U.S. Bancorp','USB'],['Uber Technologies','U'],['UnitedHealth Group','UH'],['United Airlines Holdings','UA'],['UPS','UPS'],['Valero Energy','V'],['Verizon Communications','VZ'],['Walgreens Boots Alliance','WBA'],['Walmart','W'],['Walt Disney','D'],['Wells Fargo','WF'],['Accenture','A'],['SAP','SAP'],['ServiceNow','SN']
].map(([name, symbol]) => ({ name, symbol }));

export const softwareRoles = [
  'Software Engineer','Software Developer','Application Developer','Systems Software Engineer','Platform Engineer','Product Engineer','Backend Engineer','Frontend Engineer','Full Stack Developer','Web Developer','Mobile App Developer','Android Developer','iOS Developer','React Developer','Node.js Developer','Java Developer','Python Developer','C++ Developer','C# Developer','.NET Developer','Go Developer','Rust Developer','Embedded Software Engineer','Firmware Engineer','Kernel Engineer','Systems Engineer','Site Reliability Engineer (SRE)','DevOps Engineer','Cloud Engineer','Cloud Architect','Solutions Architect','Infrastructure Engineer','Network Engineer','Network Security Engineer','Cybersecurity Engineer','Application Security Engineer','Security Engineer','DevSecOps Engineer','QA Engineer','Test Engineer','Automation Test Engineer','SDET','Performance Test Engineer','Data Engineer','Analytics Engineer','Data Scientist','Machine Learning Engineer','AI Engineer','Deep Learning Engineer','NLP Engineer','Computer Vision Engineer','MLOps Engineer','AI/ML Platform Engineer','Research Engineer','Research Scientist','Data Analyst','Business Intelligence Engineer','Database Administrator (DBA)','Database Engineer','ETL Developer','Integration Engineer','API Developer','Distributed Systems Engineer','Site Reliability Engineer','Release Engineer','Build Engineer','Cloud Security Engineer','Blockchain Developer','AR/VR Engineer','Game Developer','Technical Support Engineer','Solutions Engineer','Technical Program Manager','Engineering Manager','Engineering Lead','Software Architect','Principal Software Engineer','Staff Software Engineer','QA Lead','Product Manager (Technical)','Technical Product Manager','IT Engineer','IT Systems Administrator'
];
