"""Seed realistic test data for AI Engine testing.

Inserts:
- 1 employer user + employer record (reuses existing if found)
- 15 companies across diverse domains
- 50 jobs with skills, varied experience/locations
- 5 candidate users + profiles + skills

Idempotent: checks before inserting, safe to re-run.
"""

import os
import sys
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    from dotenv import load_dotenv
    load_dotenv()
    DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    print("ERROR: Set DATABASE_URL env var or add it to .env")
    sys.exit(1)

# ── Fixed UUIDs for deterministic seeding ───────

EMPLOYER_USER_ID = "a0000000-0000-0000-0000-000000000001"
EMPLOYER_ID = "a0000000-0000-0000-0000-000000000002"

COMPANY_IDS = [f"c0000000-0000-0000-0000-0000000000{i:02d}" for i in range(1, 16)]
JOB_IDS = [f"b0000000-0000-0000-0000-0000000000{i:02d}" for i in range(1, 51)]
USER_IDS = [f"d0000000-0000-0000-0000-00000000000{i}" for i in range(1, 6)]
PROFILE_IDS = [f"e0000000-0000-0000-0000-00000000000{i}" for i in range(1, 6)]

# ── Skill IDs from existing DB ──────────────────

SKILL_MAP = {
    "JavaScript": "67486405-c6e1-4d69-b944-868f756f88a4",
    "TypeScript": "02e61b0c-b4cf-4fde-8cb6-f2de0e2d2e51",
    "Python": "b4564c87-9201-443a-9cba-08f3aefdacf0",
    "Java": "33055225-d36e-46e8-b1e5-b219dab091d8",
    "React": "74ef9d05-8bfd-4146-b81b-6a3adc0afac9",
    "Angular": "69777b06-a9a4-41a8-ba4a-ea4c73e6b862",
    "Node.js": "b45f202a-23a6-4c15-a19f-952c21f7c856",
    "Next.js": "eb09f942-8319-451d-baef-c01465727885",
    "Vue.js": "702709c1-54b4-4e0e-a461-8c263694e2dd",
    "Go": "22d74597-b714-405e-a012-a3720bea0404",
    "Rust": "65e5eba4-1671-41b8-8bfc-6f33202b8b81",
    "C++": "cca5e4fe-fd26-44cc-b5f9-ac9a1304dff7",
    "C#": "409c3d2f-e1ed-469d-9cc2-1318e900a4b0",
    "CSS": "36e5a3d4-4c1f-4c20-85e8-7a88b8445720",
    "HTML": "3ae98ebc-8bac-4589-803c-32f90bac8bc4",
    "Tailwind CSS": "1a91b105-af51-4188-a447-a4e226c05641",
    "Redux": "df3facca-e499-4d22-9181-3287c784ca25",
    "Kotlin": "b287a8fd-ac09-446a-a7f7-326cd23e5745",
    "Swift": "f8ef3b27-67e3-41a3-b082-3aab99b58dcd",
    "PHP": "baaa0342-7aa9-49b2-b636-21f0839028be",
    "Ruby": "a0af1c82-c4f3-4ecf-b16c-27ae3dc7192c",
    "Scala": "ac2d9e31-0be6-4421-8ba2-aab1828cc086",
    "Dart": "c43a9c13-82ed-43a4-9769-beebcb13a891",
    "Docker": "064c8bf8-b8f7-421f-b2c3-467ebddcc3bd",
    "Kubernetes": "6bd9af8c-b70e-4c35-bc68-e44fdb372788",
    "AWS": "4c6b3ef0-42e7-4cc3-9613-a94fda423fc9",
    "Azure": "94e28b1d-0d0e-47e0-8cd6-e90dd678f73f",
    "GCP": "01820a86-c4f5-433c-9a9b-8264f9483f35",
    "Terraform": "32e95f58-462d-46a3-b85c-f788fc362fab",
    "Jenkins": "a4a7053e-0ea0-4ed4-854b-2ec1175a20c0",
    "MongoDB": "5893d63a-e311-4194-b545-029bd3928205",
    "PostgreSQL": "e122bd8b-5072-400f-a526-1b3d82ec07f5",
    "MySQL": "4390b6ac-099c-4f19-8d45-1c05f2ec6dc4",
    "Redis": "773c6bf2-4113-4df8-a6b2-3321408feef2",
    "Kafka": "1ab4a25a-4627-4e6e-8bb2-f6b73a69e437",
    "Elasticsearch": "99614f2b-cb15-4464-b6d3-07da99526486",
    "GraphQL": "490e9879-de84-4054-bf90-d8e6257a9c8d",
    "Spring Boot": "13708ebb-dea4-48dc-b4bb-03d4862f0e4e",
    "Django": "c14673ff-c17d-4e6f-8012-f64fbbb0fb8a",
    "Flask": "a966ff39-c332-4956-ac73-ba6a2677be9f",
    "FastAPI": "b133ca17-c242-442d-b137-e6e04497b51d",
    "NestJS": "4c7feb2f-e949-486c-ab56-d72e75fa5abe",
    "Laravel": "7d02ce50-8e0b-4329-a729-bc49d398af80",
    "Flutter": "7750f294-cad2-490d-b68d-4dfff4dfabb9",
    "React Native": "0777e910-eec0-4ab1-88bc-c88ff309dda0",
    "TensorFlow": "71713307-352e-4846-a473-ed7fc2768399",
    "PyTorch": "aa47f359-aadb-45f5-b1b2-49306a1dd170",
    "Machine Learning": "f585c41b-c3b7-4c8f-904b-22039d9294ba",
    "Deep Learning": "a5ed6fb4-ba5f-4994-bc64-4e9bee30b371",
    "Selenium": "52002bc0-02af-4187-9954-d07d1611ae5e",
    "Cypress": "32881886-da2f-45b9-93b0-7b9705fbf01e",
    "Jest": "e2aace62-2acb-4ecf-b2ca-397c03f5ce84",
    "Git": "3d9fd1cc-9540-4f18-9884-565b37c0ff4d",
    "Linux": "bf2fae4d-944c-4fe4-9255-28cd1e869840",
    "Nginx": "021dc9e0-82d1-4ac1-870d-5b42ad756095",
    "SQL": "8dd87b23-d2bf-4ee0-a411-49f150bafe24",
    "Hadoop": "291dd827-2ddc-40e7-9ad2-f8c6203bdce3",
    "Apache Spark": "548f9f21-6804-455a-8ca6-4e52d0af1e45",
    "Tableau": "3fa3520d-deee-4cbd-aad6-7529a2d291af",
    "Power BI": "4b3330cb-6f91-425f-9cb5-b03acd7f566f",
    "Figma": None,  # Will lookup
    "Storybook": None,
    "Blockchain": "1f5ed8ab-81dc-4e49-9965-e8b069be707f",
    "Salesforce": "e762656b-b276-4c3f-9f93-a82b17d7b9b5",
    "SAP": "85259dd2-afc0-4955-951d-7ce3efd51926",
    ".NET Core": "3d084a48-4c9c-4f2a-8bdf-e2ae732214b9",
    "Ansible": "905f3d33-3563-4f9a-b3fb-ae836899003c",
    "RabbitMQ": "d3a24e2b-2784-4f4e-89f2-ce99d5741044",
    "DynamoDB": "f474aeee-5973-45dc-8fbd-7f8c2d5de555",
    "Cassandra": "94d2bcac-5f39-4869-8395-b5379e161fcc",
    "Firebase": "40926f22-cec0-40da-99a5-c23d33a5483b",
    "Scikit-learn": "0fbd620a-4bb6-4b6a-b24f-ff3d61cea74a",
    "Pandas": "720f0005-753a-43c6-af5e-927c97235979",
    "NumPy": "604e2c65-eebd-4456-a5ec-a1b30923f424",
    "gRPC": "f0673147-63b4-4ae8-92f3-d6e9b0708ee0",
    "Webpack": "88bbe987-02b6-450f-858a-d55fc2194eae",
    "CI/CD": "317b8bc0-24fc-4299-afc2-a48e55efd7ad",
    "Microservices": "c8392624-47e8-4a2c-b0ad-86dec3091c18",
    "Agile": "ae5b87d2-d9a7-443c-8af9-d9145cd791d6",
    "Scrum": "55bad31b-2498-49fd-848e-80e44c21d3dc",
    "Ruby on Rails": "830fd396-6fc6-4ce4-8efd-9eb2df7ed0cf",
    "Express.js": "effc0961-b893-41dc-a34b-d2760959b98c",
    "Oracle": "b7428f65-5e28-4376-96af-59c5a6211fb2",
    "Playwright": "0e2228d3-47fe-43e7-82e9-5928b8a82724",
    "WebSockets": "4fa63428-a51b-4146-896a-148549eaf786",
    "SASS": "15025402-a926-48d8-88c4-dbb0b14b5403",
    "Bootstrap": "5058227f-018e-4ce9-af3a-bb9fb93d6781",
    "Material-UI": "b28a494f-b104-41ae-8956-41affa28db20",
    "Supabase": "2ca75a05-c92a-4a9d-a5b0-294d1b15a647",
}

# ── Data ────────────────────────────────────────

COMPANIES = [
    # 1-5: Original companies
    {
        "id": COMPANY_IDS[0], "name": "TechVista Solutions", "slug": "techvista-solutions-seed",
        "industry": "Information Technology", "company_size": "51-200",
        "description": "TechVista Solutions is a leading software development company specializing in AI/ML solutions, cloud computing, and enterprise software. Founded in 2015, we serve Fortune 500 clients globally.",
        "culture": "Innovation-driven culture with flat hierarchy. Weekly hackathons, flexible hours, and strong emphasis on continuous learning. Remote-first with quarterly team meetups.",
        "benefits": "Health insurance, stock options, learning budget of $2000/year, gym membership, 30 days PTO, work from anywhere policy",
        "headquarters": "Bangalore, Karnataka", "website": "https://techvista.example.com",
    },
    {
        "id": COMPANY_IDS[1], "name": "DataDrive Analytics", "slug": "datadrive-analytics-seed",
        "industry": "Data Analytics", "company_size": "11-50",
        "description": "DataDrive Analytics helps businesses make data-driven decisions through advanced analytics, ML pipelines, and real-time dashboards. Series B startup with 80 employees.",
        "culture": "Fast-paced startup culture. Small teams, high ownership. Bi-weekly demos, monthly town halls. Strong engineering culture with code reviews and pair programming.",
        "benefits": "Comprehensive health coverage, ESOPs, flexible work hours, home office setup allowance, annual retreat",
        "headquarters": "Mumbai, Maharashtra", "website": "https://datadrive.example.com",
    },
    {
        "id": COMPANY_IDS[2], "name": "CloudScale Infra", "slug": "cloudscale-infra-seed",
        "industry": "Cloud Infrastructure", "company_size": "500+",
        "description": "CloudScale Infra provides multi-cloud infrastructure management, DevOps automation, and serverless platform solutions. 500+ engineers across 3 countries.",
        "culture": "Engineering excellence and reliability are core values. Blameless postmortems, SRE practices, 20% time for innovation projects.",
        "benefits": "Premium health insurance, RSUs, relocation support, 5 days/week WFH, conference sponsorship, sabbatical after 4 years",
        "headquarters": "Hyderabad, Telangana", "website": "https://cloudscale.example.com",
    },
    {
        "id": COMPANY_IDS[3], "name": "FinEdge Technologies", "slug": "finedge-technologies-seed",
        "industry": "FinTech", "company_size": "201-500",
        "description": "FinEdge builds next-generation payment processing, digital banking, and financial compliance platforms. PCI-DSS certified, processing $2B+ monthly.",
        "culture": "Security-first mindset. Rigorous code review process, comprehensive testing culture. Cross-functional teams with product, design, and engineering working closely.",
        "benefits": "Health + dental, performance bonus up to 20%, stock options, meal allowance, transport allowance, parental leave",
        "headquarters": "Pune, Maharashtra", "website": "https://finedge.example.com",
    },
    {
        "id": COMPANY_IDS[4], "name": "GreenByte AI", "slug": "greenbyte-ai-seed",
        "industry": "Artificial Intelligence", "company_size": "11-50",
        "description": "GreenByte AI builds sustainable AI solutions for agriculture, climate monitoring, and energy optimization. Y Combinator backed, 40 employees, growing fast.",
        "culture": "Mission-driven team passionate about sustainability. Flat org, weekly all-hands, open-source contributions encouraged. Dog-friendly office.",
        "benefits": "Health insurance, equity, unlimited PTO, remote-first, learning stipend, carbon offset program",
        "headquarters": "Delhi, NCR", "website": "https://greenbyte.example.com",
    },
    # 6-15: New companies across diverse domains
    {
        "id": COMPANY_IDS[5], "name": "MediCare Digital", "slug": "medicare-digital-seed",
        "industry": "Healthcare", "company_size": "51-200",
        "description": "MediCare Digital builds telemedicine platforms, EHR systems, and AI-powered diagnostic tools. HIPAA compliant. Partnered with 200+ hospitals across India.",
        "culture": "Patient-first engineering. Strong QA culture, pair programming, monthly health-tech meetups. Hybrid work with 3 days in office.",
        "benefits": "Health insurance for family, wellness allowance, flexible timings, learning budget, annual health checkup",
        "headquarters": "Chennai, Tamil Nadu", "website": "https://medicaredigital.example.com",
    },
    {
        "id": COMPANY_IDS[6], "name": "EduNova Learning", "slug": "edunova-learning-seed",
        "industry": "EdTech", "company_size": "51-200",
        "description": "EduNova builds adaptive learning platforms serving 5M+ students in India. AI-driven personalized curriculum, live classes, and gamified assessments.",
        "culture": "Learner-obsessed culture. Agile sprints, weekly demos to stakeholders, open-door policy. Fun Fridays and hackathon Saturdays once a month.",
        "benefits": "Health insurance, free courses for family, stock options, work from home Wednesdays, annual retreat to Goa",
        "headquarters": "Bangalore, Karnataka", "website": "https://edunova.example.com",
    },
    {
        "id": COMPANY_IDS[7], "name": "ShipFast Logistics", "slug": "shipfast-logistics-seed",
        "industry": "Logistics & Supply Chain", "company_size": "201-500",
        "description": "ShipFast provides last-mile delivery tech, warehouse management systems, and real-time fleet tracking. Processing 500K+ shipments daily across 28 states.",
        "culture": "Move fast, ship faster. Data-driven decisions, OKR framework. Engineering and ops work closely. On-call rotations for platform reliability.",
        "benefits": "Health insurance, performance bonus, ESOPs, gym membership, Swiggy food credits, team dinners monthly",
        "headquarters": "Gurugram, Haryana", "website": "https://shipfast.example.com",
    },
    {
        "id": COMPANY_IDS[8], "name": "GameForge Studios", "slug": "gameforge-studios-seed",
        "industry": "Gaming", "company_size": "11-50",
        "description": "GameForge builds mobile and PC games with 10M+ downloads. Specializes in multiplayer real-time strategy and RPG games. Unity and Unreal Engine expertise.",
        "culture": "Creative chaos. Game jams every quarter, play-test Fridays, unlimited snacks. Small team, big ambitions. Remote-friendly.",
        "benefits": "Health insurance, gaming setup allowance, flexible hours, free games, quarterly team trips, conference sponsorship",
        "headquarters": "Pune, Maharashtra", "website": "https://gameforge.example.com",
    },
    {
        "id": COMPANY_IDS[9], "name": "SecureNet Cyber", "slug": "securenet-cyber-seed",
        "industry": "Cybersecurity", "company_size": "51-200",
        "description": "SecureNet provides enterprise cybersecurity solutions — SIEM, threat detection, penetration testing, and compliance automation. ISO 27001 certified, serving banks and government.",
        "culture": "Security is not a feature, it's a mindset. Red team/blue team exercises, CTF competitions, knowledge sharing sessions. High trust, high accountability.",
        "benefits": "Top-tier health insurance, certification sponsorship, performance bonus, flexible hours, security conference travel budget",
        "headquarters": "Noida, Uttar Pradesh", "website": "https://securenet.example.com",
    },
    {
        "id": COMPANY_IDS[10], "name": "RetailBox Commerce", "slug": "retailbox-commerce-seed",
        "industry": "E-Commerce", "company_size": "201-500",
        "description": "RetailBox powers D2C brands with headless commerce, inventory management, and omnichannel retail solutions. 500+ brands use our platform processing ₹100Cr+ GMV monthly.",
        "culture": "Customer obsession. Sprint-based development, weekly releases. Strong A/B testing culture. Cross-functional squads with PM, design, and engineering.",
        "benefits": "Health insurance, ESOPs, shopping credits, gym membership, mental health support, learning budget",
        "headquarters": "Bangalore, Karnataka", "website": "https://retailbox.example.com",
    },
    {
        "id": COMPANY_IDS[11], "name": "PropTech Homes", "slug": "proptech-homes-seed",
        "industry": "Real Estate Tech", "company_size": "51-200",
        "description": "PropTech Homes digitizes real estate with virtual tours, AI property valuation, and smart contract-based transactions. Operating in 15 Indian cities.",
        "culture": "Builder mentality. Move fast with purpose. Weekly sprint reviews, monthly retrospectives. Cross-team collaboration between realty experts and engineers.",
        "benefits": "Health insurance, home loan assistance, flexible hours, quarterly team outings, learning allowance",
        "headquarters": "Mumbai, Maharashtra", "website": "https://proptechhomes.example.com",
    },
    {
        "id": COMPANY_IDS[12], "name": "AgriTech Harvest", "slug": "agritech-harvest-seed",
        "industry": "Agriculture Technology", "company_size": "11-50",
        "description": "AgriTech Harvest connects farmers to markets via mobile app, provides crop advisory using satellite imagery and ML, and offers micro-loans. 2M+ farmers onboarded.",
        "culture": "Impact-first. Field visits mandatory for all engineers. Frugal innovation. Strong mobile-first engineering team. Bilingual codebase (Hindi + English docs).",
        "benefits": "Health insurance, rural travel allowance, ESOPs, flexible work, annual farmer meet, learning budget",
        "headquarters": "Jaipur, Rajasthan", "website": "https://agritechharvest.example.com",
    },
    {
        "id": COMPANY_IDS[13], "name": "MediaStream Digital", "slug": "mediastream-digital-seed",
        "industry": "Media & Entertainment", "company_size": "51-200",
        "description": "MediaStream builds OTT streaming infrastructure, content management, and recommendation engines. Powers 8 regional OTT platforms with 20M+ monthly active users.",
        "culture": "Content meets code. Close collaboration with content teams. A/B test everything. Binge-watching is research. Creative engineering encouraged.",
        "benefits": "Health insurance, free OTT subscriptions, flexible hours, movie tickets, annual content summit, learning budget",
        "headquarters": "Mumbai, Maharashtra", "website": "https://mediastream.example.com",
    },
    {
        "id": COMPANY_IDS[14], "name": "AutoDrive Mobility", "slug": "autodrive-mobility-seed",
        "industry": "Automotive / EV Tech", "company_size": "201-500",
        "description": "AutoDrive builds connected vehicle platforms, EV charging networks, and autonomous driving software. Partnered with 3 major Indian OEMs. 50K+ connected vehicles on platform.",
        "culture": "Engineering-heavy culture. Hardware meets software. Simulation-first development. Safety-critical code reviews. Monthly tech talks from auto industry experts.",
        "benefits": "Health insurance, EV subsidy for employees, RSUs, relocation support, patent bonus, conference sponsorship",
        "headquarters": "Chennai, Tamil Nadu", "website": "https://autodrive.example.com",
    },
]

JOBS = [
    # ── TechVista Solutions (IT) — Jobs 1-4 ──
    {
        "id": JOB_IDS[0], "company_id": COMPANY_IDS[0], "title": "Senior Full Stack Developer",
        "description": "Build and maintain scalable web applications using React and Node.js. Lead a team of 3 developers. Work on AI-powered features for enterprise clients. Strong problem-solving skills required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2500000, "salary_max": 4000000, "skills": ["JavaScript", "React", "Node.js", "TypeScript", "Python", "Redux"],
        "work_mode": ["hybrid", "remote"],
    },
    {
        "id": JOB_IDS[1], "company_id": COMPANY_IDS[0], "title": "Machine Learning Engineer",
        "description": "Design and deploy ML models for NLP and computer vision. Work with PyTorch, TensorFlow, and AWS SageMaker. Experience with LLMs and transformer architectures preferred.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Python", "TensorFlow", "PyTorch", "Machine Learning", "AWS"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[2], "company_id": COMPANY_IDS[0], "title": "DevOps Engineer",
        "description": "Manage CI/CD pipelines, Docker/Kubernetes infrastructure, and AWS cloud resources. Implement monitoring and alerting. Terraform and IaC experience required.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 3, "experience_max": 5,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 1800000, "salary_max": 3000000, "skills": ["AWS", "Docker", "Kubernetes", "Terraform", "Jenkins", "Linux"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[3], "company_id": COMPANY_IDS[0], "title": "QA Automation Engineer",
        "description": "Design and maintain automated test suites using Selenium and Cypress. Write integration and E2E tests. Work with CI/CD pipelines for continuous testing.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["JavaScript", "Selenium", "Cypress", "Jest", "Python", "CI/CD"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── DataDrive Analytics — Jobs 5-7 ──
    {
        "id": JOB_IDS[4], "company_id": COMPANY_IDS[1], "title": "Data Engineer",
        "description": "Build and maintain data pipelines using Apache Spark and Airflow. Design data warehouse schemas. Optimize query performance on large-scale datasets (10TB+).",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["Python", "SQL", "Apache Spark", "Hadoop", "AWS", "PostgreSQL"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[5], "company_id": COMPANY_IDS[1], "title": "Data Scientist",
        "description": "Build predictive models for customer churn, demand forecasting, and anomaly detection. Strong statistics and ML background. Experience with Pandas, Scikit-learn, and visualization tools.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1800000, "salary_max": 3200000, "skills": ["Python", "Machine Learning", "Scikit-learn", "Pandas", "NumPy", "SQL", "Tableau"],
        "work_mode": ["hybrid", "remote"],
    },
    {
        "id": JOB_IDS[6], "company_id": COMPANY_IDS[1], "title": "BI Analyst",
        "description": "Create dashboards and reports using Tableau and Power BI. Analyze business metrics, design KPIs, and present insights to stakeholders. SQL expertise required.",
        "job_type": '{"full_time"}', "experience_level": "Junior-Mid", "experience_min": 1, "experience_max": 3,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 800000, "salary_max": 1500000, "skills": ["SQL", "Tableau", "Power BI", "Python"],
        "work_mode": ["onsite"],
    },
    # ── CloudScale Infra — Jobs 8-10 ──
    {
        "id": JOB_IDS[7], "company_id": COMPANY_IDS[2], "title": "Senior DevOps Engineer",
        "description": "Architect and manage multi-cloud infrastructure (AWS + GCP). Lead SRE practices, incident response, and capacity planning for 500+ microservices.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Hyderabad, Telangana", "city": "Hyderabad", "state": "Telangana", "country": "India",
        "salary_min": 2500000, "salary_max": 4200000, "skills": ["AWS", "GCP", "Kubernetes", "Terraform", "Docker", "Linux", "Python", "Go"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[8], "company_id": COMPANY_IDS[2], "title": "Backend Developer (Go)",
        "description": "Build high-performance microservices in Go. Design REST and gRPC APIs. Work on distributed systems handling 100K+ requests/second.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Hyderabad, Telangana", "city": "Hyderabad", "state": "Telangana", "country": "India",
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Go", "gRPC", "Docker", "Kubernetes", "PostgreSQL", "Redis", "Kafka"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[9], "company_id": COMPANY_IDS[2], "title": "Cloud Architect",
        "description": "Design cloud-native architectures for enterprise clients. Multi-cloud strategy (AWS, GCP, Azure). Cost optimization and security best practices.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 8, "experience_max": 12,
        "location": "Hyderabad, Telangana", "city": "Hyderabad", "state": "Telangana", "country": "India",
        "salary_min": 3500000, "salary_max": 6000000, "skills": ["AWS", "GCP", "Azure", "Terraform", "Kubernetes", "Microservices"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── FinEdge Technologies (FinTech) — Jobs 11-14 ──
    {
        "id": JOB_IDS[10], "company_id": COMPANY_IDS[3], "title": "Java Backend Developer",
        "description": "Develop secure payment processing systems using Spring Boot. Ensure PCI-DSS compliance. Build RESTful APIs with high availability and fault tolerance.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 10,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "Microservices"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[11], "company_id": COMPANY_IDS[3], "title": "Mobile Developer (React Native)",
        "description": "Build cross-platform mobile banking apps with React Native. Integrate biometric auth, push notifications, and offline capabilities.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["JavaScript", "React Native", "TypeScript", "Redux", "Firebase"],
        "work_mode": ["hybrid", "remote"],
    },
    {
        "id": JOB_IDS[12], "company_id": COMPANY_IDS[3], "title": "Blockchain Developer",
        "description": "Build DeFi protocols and smart contracts on Ethereum/Polygon. Integrate with payment rails. Experience with Solidity and Web3.js required.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 2200000, "salary_max": 4000000, "skills": ["JavaScript", "TypeScript", "Blockchain", "Python", "PostgreSQL"],
        "work_mode": ["remote"],
    },
    {
        "id": JOB_IDS[13], "company_id": COMPANY_IDS[3], "title": "Security Engineer",
        "description": "Application security for payment systems. Conduct security audits, penetration testing, and vulnerability assessments. OWASP expertise required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 4000000, "skills": ["Python", "Linux", "AWS", "Docker"],
        "work_mode": ["onsite"],
    },
    # ── GreenByte AI — Jobs 15-17 ──
    {
        "id": JOB_IDS[14], "company_id": COMPANY_IDS[4], "title": "AI Research Engineer",
        "description": "Research and implement novel AI approaches for agricultural yield prediction and climate modeling. Publish papers, build prototypes, and deploy to production.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 8,
        "location": "Delhi, NCR", "city": "Delhi", "state": "Delhi", "country": "India",
        "salary_min": 2800000, "salary_max": 5000000, "skills": ["Python", "TensorFlow", "PyTorch", "Deep Learning", "Machine Learning", "C++"],
        "work_mode": ["remote"],
    },
    {
        "id": JOB_IDS[15], "company_id": COMPANY_IDS[4], "title": "Python Developer (Junior)",
        "description": "Assist in building data processing pipelines and REST APIs using FastAPI. Good opportunity for fresh graduates with strong Python fundamentals.",
        "job_type": '{"full_time"}', "experience_level": "Junior", "experience_min": 0, "experience_max": 2,
        "location": "Remote, India", "city": "Remote", "state": "", "country": "India",
        "salary_min": 500000, "salary_max": 900000, "skills": ["Python", "FastAPI", "SQL", "Git", "Linux"],
        "work_mode": ["remote"],
    },
    {
        "id": JOB_IDS[16], "company_id": COMPANY_IDS[4], "title": "Full Stack Developer (Django + React)",
        "description": "Build internal dashboards and data visualization tools for climate monitoring. Django backend, React frontend, PostgreSQL database.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 4,
        "location": "Delhi, NCR", "city": "Delhi", "state": "Delhi", "country": "India",
        "salary_min": 1400000, "salary_max": 2400000, "skills": ["Python", "Django", "React", "JavaScript", "PostgreSQL", "TypeScript"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── MediCare Digital (Healthcare) — Jobs 18-21 ──
    {
        "id": JOB_IDS[17], "company_id": COMPANY_IDS[5], "title": "Backend Developer (Python/Django)",
        "description": "Build HIPAA-compliant telemedicine platform APIs. Handle patient data securely, integrate with EHR systems, build appointment scheduling and video call backends.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 1800000, "salary_max": 3000000, "skills": ["Python", "Django", "PostgreSQL", "Redis", "Docker", "AWS"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[18], "company_id": COMPANY_IDS[5], "title": "React Frontend Developer",
        "description": "Build doctor and patient dashboards for telemedicine platform. Focus on accessibility, responsive design, and real-time features using WebSockets.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 4,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["React", "TypeScript", "JavaScript", "CSS", "Redux", "WebSockets"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[19], "company_id": COMPANY_IDS[5], "title": "ML Engineer (Healthcare AI)",
        "description": "Build AI diagnostic tools for medical imaging. Train and deploy CNN models for X-ray and MRI analysis. TensorFlow/PyTorch with DICOM data experience preferred.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 2500000, "salary_max": 4200000, "skills": ["Python", "TensorFlow", "PyTorch", "Deep Learning", "Machine Learning", "AWS"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[20], "company_id": COMPANY_IDS[5], "title": "Android Developer (Kotlin)",
        "description": "Build patient-facing mobile app for telemedicine. Video calling, prescription management, health tracking features. Kotlin with Jetpack Compose.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 1400000, "salary_max": 2500000, "skills": ["Kotlin", "Java", "Firebase", "Git"],
        "work_mode": ["hybrid"],
    },
    # ── EduNova Learning (EdTech) — Jobs 22-24 ──
    {
        "id": JOB_IDS[21], "company_id": COMPANY_IDS[6], "title": "Full Stack Developer (MERN)",
        "description": "Build adaptive learning platform features. React frontend with Node.js/Express backend. MongoDB for flexible content storage. Real-time quiz and assessment engine.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["JavaScript", "React", "Node.js", "MongoDB", "Express.js", "TypeScript"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[22], "company_id": COMPANY_IDS[6], "title": "iOS Developer (Swift)",
        "description": "Build and maintain the student learning app for iOS. SwiftUI, offline content sync, push notifications, and in-app purchase integration.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 1800000, "salary_max": 3200000, "skills": ["Swift", "Git", "Firebase"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[23], "company_id": COMPANY_IDS[6], "title": "Content Recommendation ML Engineer",
        "description": "Build recommendation engine for personalized learning paths. Collaborative filtering, content-based filtering, and reinforcement learning for adaptive assessments.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2200000, "salary_max": 3800000, "skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "AWS"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── ShipFast Logistics — Jobs 25-28 ──
    {
        "id": JOB_IDS[24], "company_id": COMPANY_IDS[7], "title": "Backend Developer (Node.js)",
        "description": "Build real-time shipment tracking APIs and order management system. High-throughput event processing with Kafka. Node.js with TypeScript.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Gurugram, Haryana", "city": "Gurugram", "state": "Haryana", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["Node.js", "TypeScript", "JavaScript", "Kafka", "PostgreSQL", "Redis", "Docker"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[25], "company_id": COMPANY_IDS[7], "title": "Flutter Mobile Developer",
        "description": "Build delivery partner app and customer tracking app in Flutter. Real-time location tracking, route optimization display, and push notifications.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 4,
        "location": "Gurugram, Haryana", "city": "Gurugram", "state": "Haryana", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["Dart", "Flutter", "Firebase", "Git"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[26], "company_id": COMPANY_IDS[7], "title": "Data Analyst (Logistics)",
        "description": "Analyze delivery performance, route efficiency, and warehouse utilization. Build dashboards for operations team. SQL, Python, and Tableau required.",
        "job_type": '{"full_time"}', "experience_level": "Junior-Mid", "experience_min": 1, "experience_max": 3,
        "location": "Gurugram, Haryana", "city": "Gurugram", "state": "Haryana", "country": "India",
        "salary_min": 800000, "salary_max": 1500000, "skills": ["SQL", "Python", "Tableau", "Pandas"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[27], "company_id": COMPANY_IDS[7], "title": "SRE / Platform Engineer",
        "description": "Ensure 99.95% uptime for delivery tracking platform. Kubernetes cluster management, monitoring with Prometheus/Grafana, incident response.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Gurugram, Haryana", "city": "Gurugram", "state": "Haryana", "country": "India",
        "salary_min": 2200000, "salary_max": 3800000, "skills": ["Kubernetes", "Docker", "AWS", "Terraform", "Python", "Linux", "Jenkins"],
        "work_mode": ["hybrid"],
    },
    # ── GameForge Studios (Gaming) — Jobs 29-31 ──
    {
        "id": JOB_IDS[28], "company_id": COMPANY_IDS[8], "title": "Game Backend Developer (Go)",
        "description": "Build real-time multiplayer game servers in Go. Handle 50K concurrent connections, matchmaking, leaderboards, and anti-cheat systems.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 1800000, "salary_max": 3200000, "skills": ["Go", "Redis", "PostgreSQL", "Docker", "WebSockets", "Linux"],
        "work_mode": ["hybrid", "remote"],
    },
    {
        "id": JOB_IDS[29], "company_id": COMPANY_IDS[8], "title": "C++ Game Engine Developer",
        "description": "Work on custom game engine components — physics, rendering pipeline, and asset management. Unreal Engine experience preferred. Low-level optimization skills required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 10,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 5000000, "skills": ["C++", "Python", "Git", "Linux"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[30], "company_id": COMPANY_IDS[8], "title": "Junior Game Developer",
        "description": "Assist in developing mobile games. Scripting gameplay mechanics, UI implementation, and bug fixing. Fresh graduates with passion for gaming welcome.",
        "job_type": '{"full_time"}', "experience_level": "Junior", "experience_min": 0, "experience_max": 2,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 500000, "salary_max": 1000000, "skills": ["C++", "Python", "JavaScript", "Git"],
        "work_mode": ["onsite"],
    },
    # ── SecureNet Cyber (Cybersecurity) — Jobs 32-34 ──
    {
        "id": JOB_IDS[31], "company_id": COMPANY_IDS[9], "title": "Cybersecurity Analyst",
        "description": "Monitor SIEM alerts, investigate security incidents, and perform threat hunting. Experience with Splunk, CrowdStrike, or similar tools. SOC experience preferred.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Noida, Uttar Pradesh", "city": "Noida", "state": "Uttar Pradesh", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["Python", "Linux", "AWS", "SQL"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[32], "company_id": COMPANY_IDS[9], "title": "Security Engineer (AppSec)",
        "description": "Conduct application security assessments, code reviews, and penetration testing. Build security automation tools. OWASP Top 10 expertise required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Noida, Uttar Pradesh", "city": "Noida", "state": "Uttar Pradesh", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Python", "Java", "Docker", "Kubernetes", "Linux", "AWS"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[33], "company_id": COMPANY_IDS[9], "title": "Python Backend Developer (Security Products)",
        "description": "Build threat intelligence platform and compliance automation tools. FastAPI backend, Elasticsearch for log analysis, PostgreSQL for structured data.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Noida, Uttar Pradesh", "city": "Noida", "state": "Uttar Pradesh", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["Python", "FastAPI", "PostgreSQL", "Elasticsearch", "Docker", "Linux", "Redis"],
        "work_mode": ["hybrid"],
    },
    # ── RetailBox Commerce (E-Commerce) — Jobs 35-38 ──
    {
        "id": JOB_IDS[34], "company_id": COMPANY_IDS[10], "title": "Senior React Developer",
        "description": "Build headless commerce storefront with Next.js. Server-side rendering, performance optimization, and A/B testing framework. 95+ Lighthouse scores required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2500000, "salary_max": 4200000, "skills": ["React", "Next.js", "TypeScript", "JavaScript", "CSS", "Tailwind CSS", "GraphQL"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[35], "company_id": COMPANY_IDS[10], "title": "Backend Developer (Java/Spring Boot)",
        "description": "Build order management, inventory sync, and payment integration microservices. Handle Black Friday scale (10x traffic spikes). Java 17 + Spring Boot 3.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Java", "Spring Boot", "PostgreSQL", "Redis", "Kafka", "Docker", "Microservices"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[36], "company_id": COMPANY_IDS[10], "title": "Product Analyst",
        "description": "Analyze user behavior on e-commerce platform. Funnel analysis, cohort analysis, A/B test evaluation. SQL + Python for data analysis, Tableau for visualization.",
        "job_type": '{"full_time"}', "experience_level": "Junior-Mid", "experience_min": 1, "experience_max": 3,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 900000, "salary_max": 1600000, "skills": ["SQL", "Python", "Tableau", "Pandas"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[37], "company_id": COMPANY_IDS[10], "title": "Search & Recommendation Engineer",
        "description": "Build product search using Elasticsearch and recommendation engine using collaborative filtering. Handle 1M+ product catalog with real-time indexing.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Bangalore, Karnataka", "city": "Bangalore", "state": "Karnataka", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Python", "Elasticsearch", "Machine Learning", "Java", "Redis", "Kafka"],
        "work_mode": ["hybrid"],
    },
    # ── PropTech Homes (Real Estate) — Jobs 39-41 ──
    {
        "id": JOB_IDS[38], "company_id": COMPANY_IDS[11], "title": "Full Stack Developer (Vue.js + Python)",
        "description": "Build property listing platform with virtual tour integration. Vue.js frontend, Flask/FastAPI backend, PostgreSQL database. Maps and geolocation features.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1400000, "salary_max": 2600000, "skills": ["Vue.js", "Python", "Flask", "PostgreSQL", "JavaScript", "CSS"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[39], "company_id": COMPANY_IDS[11], "title": "React Native Developer",
        "description": "Build property search and buyer/seller mobile app. AR-based virtual tours, chat with agents, document upload, and EMI calculator features.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 4,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["React Native", "JavaScript", "TypeScript", "Redux", "Firebase"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[40], "company_id": COMPANY_IDS[11], "title": "AI/ML Engineer (Property Valuation)",
        "description": "Build AI models for automated property valuation using satellite imagery, neighborhood data, and market trends. Python, computer vision, and geospatial analysis.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Python", "TensorFlow", "Machine Learning", "Deep Learning", "SQL", "AWS"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── AgriTech Harvest — Jobs 42-44 ──
    {
        "id": JOB_IDS[41], "company_id": COMPANY_IDS[12], "title": "Mobile Developer (React Native)",
        "description": "Build farmer-facing app with offline-first architecture. Crop advisory, market prices, loan application. Must work on 2G networks. Hindi/regional language support.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 4,
        "location": "Jaipur, Rajasthan", "city": "Jaipur", "state": "Rajasthan", "country": "India",
        "salary_min": 1000000, "salary_max": 1800000, "skills": ["React Native", "JavaScript", "TypeScript", "Firebase", "Redux"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[42], "company_id": COMPANY_IDS[12], "title": "Backend Developer (Python/FastAPI)",
        "description": "Build APIs for crop advisory, weather integration, and market price feeds. FastAPI backend, PostgreSQL, integration with government agriculture APIs.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Jaipur, Rajasthan", "city": "Jaipur", "state": "Rajasthan", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS", "Redis"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[43], "company_id": COMPANY_IDS[12], "title": "ML Engineer (Satellite Imagery)",
        "description": "Analyze satellite and drone imagery for crop health assessment, pest detection, and yield prediction. TensorFlow, OpenCV, geospatial data processing.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Remote, India", "city": "Remote", "state": "", "country": "India",
        "salary_min": 1800000, "salary_max": 3200000, "skills": ["Python", "TensorFlow", "Machine Learning", "Deep Learning", "NumPy", "Pandas"],
        "work_mode": ["remote"],
    },
    # ── MediaStream Digital (Media) — Jobs 45-47 ──
    {
        "id": JOB_IDS[44], "company_id": COMPANY_IDS[13], "title": "Video Streaming Backend Engineer",
        "description": "Build adaptive bitrate streaming, DRM, and CDN integration. Handle 20M+ concurrent viewers during live events. Go or Java with low-latency systems experience.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 8,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 2800000, "salary_max": 5000000, "skills": ["Go", "Java", "Redis", "Kafka", "Docker", "Kubernetes", "AWS"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[45], "company_id": COMPANY_IDS[13], "title": "Frontend Developer (React + Next.js)",
        "description": "Build OTT platform UI — video player, content browse, user profiles, and watchlist. Next.js SSR for SEO, performance optimization for Smart TVs.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["React", "Next.js", "TypeScript", "JavaScript", "CSS", "Redux", "Webpack"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[46], "company_id": COMPANY_IDS[13], "title": "Recommendation Engine Engineer",
        "description": "Build content recommendation system for OTT platforms. Collaborative filtering, content-based approaches, and deep learning models. Handle cold-start problem.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "SQL", "Redis", "Kafka"],
        "work_mode": ["hybrid", "remote"],
    },
    # ── AutoDrive Mobility (Automotive/EV) — Jobs 48-50 ──
    {
        "id": JOB_IDS[47], "company_id": COMPANY_IDS[14], "title": "Embedded Systems Engineer (C++)",
        "description": "Develop embedded software for EV battery management and motor control systems. C++ on ARM microcontrollers. Safety-critical MISRA C++ standards.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 10,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["C++", "Python", "Linux", "Git"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[48], "company_id": COMPANY_IDS[14], "title": "Connected Vehicle Platform Developer",
        "description": "Build cloud platform for vehicle telematics — real-time GPS, diagnostics, OTA updates. Handle 50K+ connected vehicles. Java/Kotlin microservices on AWS.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Java", "Kotlin", "Spring Boot", "Kafka", "AWS", "Docker", "Kubernetes", "PostgreSQL"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[49], "company_id": COMPANY_IDS[14], "title": "Full Stack Developer (EV Charging)",
        "description": "Build EV charging network management platform. React frontend for station operators, Node.js backend for charger communication (OCPP protocol), real-time monitoring.",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Chennai, Tamil Nadu", "city": "Chennai", "state": "Tamil Nadu", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["React", "Node.js", "TypeScript", "JavaScript", "PostgreSQL", "Redis", "Docker"],
        "work_mode": ["hybrid"],
    },
]

CANDIDATES = [
    {
        "user_id": USER_IDS[0], "profile_id": PROFILE_IDS[0],
        "first_name": "Arjun", "last_name": "Sharma", "email": "arjun.test@example.com",
        "phone": "+919876543210", "city": "Bangalore", "state": "Karnataka",
        "headline": "Senior Full Stack Developer | React & Node.js Expert",
        "professional_summary": "8 years of experience building scalable web apps with React, Node.js, and Python. Led teams of 5+ developers. Passionate about clean code and performance optimization.",
        "total_experience_years": 8.0,
        "skills": [("JavaScript", "expert", 8), ("React", "expert", 6), ("Python", "advanced", 4), ("TypeScript", "advanced", 5), ("Redux", "advanced", 4)],
    },
    {
        "user_id": USER_IDS[1], "profile_id": PROFILE_IDS[1],
        "first_name": "Priya", "last_name": "Patel", "email": "priya.test@example.com",
        "phone": "+919876543211", "city": "Mumbai", "state": "Maharashtra",
        "headline": "Data Engineer | Python & Big Data",
        "professional_summary": "3 years experience in data engineering. Skilled in Python, Spark, and cloud platforms. Built ETL pipelines processing 5TB daily at previous role.",
        "total_experience_years": 3.0,
        "skills": [("Python", "advanced", 3), ("Java", "intermediate", 2), ("JavaScript", "beginner", 1), ("SQL", "advanced", 3)],
    },
    {
        "user_id": USER_IDS[2], "profile_id": PROFILE_IDS[2],
        "first_name": "Rahul", "last_name": "Kumar", "email": "rahul.test@example.com",
        "phone": "+919876543212", "city": "Hyderabad", "state": "Telangana",
        "headline": "DevOps & Cloud Engineer | AWS Certified",
        "professional_summary": "5 years in DevOps and cloud infrastructure. AWS Solutions Architect certified. Experience with Kubernetes, Terraform, and CI/CD at scale.",
        "total_experience_years": 5.0,
        "skills": [("Python", "intermediate", 3), ("Go", "advanced", 4), ("JavaScript", "intermediate", 2), ("AWS", "expert", 5), ("Docker", "advanced", 4), ("Kubernetes", "advanced", 4), ("Terraform", "advanced", 3)],
    },
    {
        "user_id": USER_IDS[3], "profile_id": PROFILE_IDS[3],
        "first_name": "Sneha", "last_name": "Reddy", "email": "sneha.test@example.com",
        "phone": "+919876543213", "city": "Pune", "state": "Maharashtra",
        "headline": "Frontend Developer | React & UI/UX",
        "professional_summary": "2 years building beautiful, accessible web interfaces with React and TypeScript. Strong eye for design. Experience with Figma, Storybook, and testing.",
        "total_experience_years": 2.0,
        "skills": [("JavaScript", "advanced", 2), ("React", "advanced", 2), ("TypeScript", "intermediate", 1), ("CSS", "expert", 2), ("HTML", "expert", 2), ("Tailwind CSS", "advanced", 1)],
    },
    {
        "user_id": USER_IDS[4], "profile_id": PROFILE_IDS[4],
        "first_name": "Vikram", "last_name": "Singh", "email": "vikram.test@example.com",
        "phone": "+919876543214", "city": "Delhi", "state": "Delhi",
        "headline": "Python ML Engineer | NLP & Computer Vision",
        "professional_summary": "6 years in machine learning and AI. Published researcher with expertise in NLP, transformer models, and deployment on AWS SageMaker.",
        "total_experience_years": 6.0,
        "skills": [("Python", "expert", 6), ("C++", "advanced", 3), ("JavaScript", "intermediate", 2), ("TensorFlow", "expert", 5), ("PyTorch", "advanced", 4), ("Machine Learning", "expert", 6)],
    },
]


def seed():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # ── 1. Employer user + employer record ──────
        cur.execute("SELECT id FROM users WHERE id = %s", (EMPLOYER_USER_ID,))
        if not cur.fetchone():
            print("Creating employer user...")
            cur.execute("""
                INSERT INTO users (id, first_name, last_name, email, password, mobile, role, is_verified, is_active)
                VALUES (%s, 'Test', 'Employer', 'employer.seed@example.com', 'notreal', '+910000000000', 'employer', true, true)
            """, (EMPLOYER_USER_ID,))

        cur.execute("SELECT id FROM employers WHERE id = %s", (EMPLOYER_ID,))
        if not cur.fetchone():
            print("Creating employer record...")
            cur.execute("""
                INSERT INTO employers (id, user_id, is_verified) VALUES (%s, %s, true)
            """, (EMPLOYER_ID, EMPLOYER_USER_ID))

        # ── 2. Companies ────────────────────────────
        for c in COMPANIES:
            cur.execute("SELECT id FROM companies WHERE id = %s", (c["id"],))
            if cur.fetchone():
                print(f"  Company '{c['name']}' exists, skipping")
                continue
            print(f"  Inserting company: {c['name']}")
            cur.execute("""
                INSERT INTO companies (id, user_id, name, slug, industry, company_size, description, culture, benefits, headquarters, website, is_verified, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, true)
            """, (c["id"], EMPLOYER_USER_ID, c["name"], c["slug"], c["industry"], c["company_size"],
                  c["description"], c["culture"], c["benefits"], c["headquarters"], c["website"]))

        # ── 3. Jobs ─────────────────────────────────
        for j in JOBS:
            cur.execute("SELECT id FROM jobs WHERE id = %s", (j["id"],))
            if cur.fetchone():
                print(f"  Job '{j['title']}' exists, skipping")
                continue
            print(f"  Inserting job: {j['title']}")
            skills_arr = "{" + ",".join(f'"{s}"' for s in j["skills"]) + "}"
            work_mode_arr = "{" + ",".join(f'"{m}"' for m in j["work_mode"]) + "}"
            cur.execute("""
                INSERT INTO jobs (id, employer_id, company_id, title, description, job_type, experience_level,
                    experience_min, experience_max, location, city, state, country,
                    salary_min, salary_max, skills, work_mode, is_active, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, true, 'active')
            """, (j["id"], EMPLOYER_ID, j["company_id"], j["title"], j["description"],
                  j["job_type"], j["experience_level"], j["experience_min"], j["experience_max"],
                  j["location"], j["city"], j["state"], j["country"],
                  j["salary_min"], j["salary_max"], skills_arr, work_mode_arr))

        # ── 4. Candidate users + profiles + skills ──
        for c in CANDIDATES:
            cur.execute("SELECT id FROM users WHERE id = %s", (c["user_id"],))
            if cur.fetchone():
                print(f"  User '{c['first_name']}' exists, skipping")
            else:
                print(f"  Inserting user: {c['first_name']} {c['last_name']}")
                cur.execute("""
                    INSERT INTO users (id, first_name, last_name, email, password, mobile, role, is_verified, is_active)
                    VALUES (%s, %s, %s, %s, 'notreal', %s, 'candidate', true, true)
                """, (c["user_id"], c["first_name"], c["last_name"], c["email"], c["phone"]))

            cur.execute("SELECT id FROM profiles WHERE id = %s", (c["profile_id"],))
            if cur.fetchone():
                print(f"  Profile '{c['first_name']}' exists, skipping")
            else:
                print(f"  Inserting profile: {c['first_name']}")
                cur.execute("""
                    INSERT INTO profiles (id, user_id, first_name, last_name, email, phone, city, state, country,
                        headline, professional_summary, total_experience_years, is_profile_complete, completion_percentage)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'India', %s, %s, %s, true, 80)
                """, (c["profile_id"], c["user_id"], c["first_name"], c["last_name"],
                      c["email"], c["phone"], c["city"], c["state"],
                      c["headline"], c["professional_summary"], c["total_experience_years"]))

            # Skills
            for skill_name, proficiency, years in c["skills"]:
                skill_id = SKILL_MAP.get(skill_name)
                if not skill_id:
                    cur.execute("SELECT id FROM skills WHERE name = %s", (skill_name,))
                    row = cur.fetchone()
                    if row:
                        skill_id = str(row["id"])
                        SKILL_MAP[skill_name] = skill_id
                    else:
                        continue

                cur.execute("""
                    SELECT id FROM profile_skills WHERE profile_id = %s AND skill_id = %s
                """, (c["profile_id"], skill_id))
                if not cur.fetchone():
                    cur.execute("""
                        INSERT INTO profile_skills (profile_id, skill_id, proficiency_level, years_of_experience)
                        VALUES (%s, %s, %s, %s)
                    """, (c["profile_id"], skill_id, proficiency, years))

        conn.commit()
        print("\n✅ Seed complete!")
        print(f"  Companies: {len(COMPANIES)}")
        print(f"  Jobs: {len(JOBS)}")
        print(f"  Candidates: {len(CANDIDATES)}")
        print(f"\nTest user IDs for /recommend:")
        for c in CANDIDATES:
            print(f"  {c['first_name']} {c['last_name']}: {c['user_id']}")
        print(f"\nTest job IDs for /chat (first 10):")
        for j in JOBS[:10]:
            print(f"  {j['title']}: {j['id']}")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed()
