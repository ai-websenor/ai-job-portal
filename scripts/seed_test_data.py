"""Seed realistic test data for AI Engine testing.

Inserts:
- 1 employer user + employer record (reuses existing if found)
- 5 companies with full details
- 10 jobs with skills, varied experience/locations
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

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:xZsb3c91pZrJLmg@ai-job-portal-dev.czemc0204jzt.ap-south-1.rds.amazonaws.com:5432/ai_job_portal_dev?sslmode=require",
)

# ── Fixed UUIDs for deterministic seeding ───────

EMPLOYER_USER_ID = "a0000000-0000-0000-0000-000000000001"
EMPLOYER_ID = "a0000000-0000-0000-0000-000000000002"

COMPANY_IDS = [f"c0000000-0000-0000-0000-00000000000{i}" for i in range(1, 6)]
JOB_IDS = [f"b0000000-0000-0000-0000-0000000000{i:02d}" for i in range(1, 11)]
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
    "Node.js": None,  # Will lookup
    "Next.js": "eb09f942-8319-451d-baef-c01465727885",
    "Vue.js": "702709c1-54b4-4e0e-a461-8c263694e2dd",
    "Go": "22d74597-b714-405e-a012-a3720bea0404",
    "Rust": "65e5eba4-1671-41b8-8bfc-6f33202b8b81",
    "C++": "cca5e4fe-fd26-44cc-b5f9-ac9a1304dff7",
    "CSS": "36e5a3d4-4c1f-4c20-85e8-7a88b8445720",
    "HTML": "3ae98ebc-8bac-4589-803c-32f90bac8bc4",
    "Tailwind CSS": "1a91b105-af51-4188-a447-a4e226c05641",
    "Redux": "df3facca-e499-4d22-9181-3287c784ca25",
    "Kotlin": "b287a8fd-ac09-446a-a7f7-326cd23e5745",
    "Swift": "f8ef3b27-67e3-41a3-b082-3aab99b58dcd",
    "PHP": "baaa0342-7aa9-49b2-b636-21f0839028be",
    "Ruby": "a0af1c82-c4f3-4ecf-b16c-27ae3dc7192c",
}

# ── Data ────────────────────────────────────────

COMPANIES = [
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
]

JOBS = [
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
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Python", "TypeScript", "React"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[2], "company_id": COMPANY_IDS[1], "title": "Data Engineer",
        "description": "Build and maintain data pipelines using Apache Spark and Airflow. Design data warehouse schemas. Optimize query performance on large-scale datasets (10TB+).",
        "job_type": '{"full_time"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 1500000, "salary_max": 2800000, "skills": ["Python", "Java"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[3], "company_id": COMPANY_IDS[1], "title": "Frontend Developer (React)",
        "description": "Build responsive, accessible web interfaces using React and TypeScript. Work with design team on pixel-perfect UI. Experience with state management and testing frameworks required.",
        "job_type": '{"full_time","part_time"}', "experience_level": "Junior-Mid", "experience_min": 1, "experience_max": 3,
        "location": "Mumbai, Maharashtra", "city": "Mumbai", "state": "Maharashtra", "country": "India",
        "salary_min": 800000, "salary_max": 1500000, "skills": ["JavaScript", "React", "TypeScript", "CSS", "HTML", "Tailwind CSS"],
        "work_mode": ["remote"],
    },
    {
        "id": JOB_IDS[4], "company_id": COMPANY_IDS[2], "title": "DevOps Engineer",
        "description": "Manage CI/CD pipelines, Kubernetes clusters, and cloud infrastructure on AWS. Implement monitoring, alerting, and incident response. Terraform and IaC experience required.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 7,
        "location": "Hyderabad, Telangana", "city": "Hyderabad", "state": "Telangana", "country": "India",
        "salary_min": 2200000, "salary_max": 3800000, "skills": ["Python", "Go"],
        "work_mode": ["hybrid", "onsite"],
    },
    {
        "id": JOB_IDS[5], "company_id": COMPANY_IDS[2], "title": "Backend Developer (Go)",
        "description": "Build high-performance microservices in Go. Design REST and gRPC APIs. Work on distributed systems handling 100K+ requests/second. Strong CS fundamentals required.",
        "job_type": '{"full_time"}', "experience_level": "Mid-Senior", "experience_min": 3, "experience_max": 6,
        "location": "Hyderabad, Telangana", "city": "Hyderabad", "state": "Telangana", "country": "India",
        "salary_min": 2000000, "salary_max": 3500000, "skills": ["Go", "Python", "JavaScript"],
        "work_mode": ["onsite"],
    },
    {
        "id": JOB_IDS[6], "company_id": COMPANY_IDS[3], "title": "Java Backend Developer",
        "description": "Develop secure payment processing systems using Spring Boot. Ensure PCI-DSS compliance. Build RESTful APIs with high availability and fault tolerance.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 5, "experience_max": 10,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 2500000, "salary_max": 4500000, "skills": ["Java", "Python", "JavaScript"],
        "work_mode": ["hybrid"],
    },
    {
        "id": JOB_IDS[7], "company_id": COMPANY_IDS[3], "title": "Mobile Developer (React Native)",
        "description": "Build cross-platform mobile banking apps with React Native. Integrate biometric auth, push notifications, and offline capabilities. Published app experience preferred.",
        "job_type": '{"full_time","contract"}', "experience_level": "Mid", "experience_min": 2, "experience_max": 5,
        "location": "Pune, Maharashtra", "city": "Pune", "state": "Maharashtra", "country": "India",
        "salary_min": 1200000, "salary_max": 2200000, "skills": ["JavaScript", "React", "TypeScript"],
        "work_mode": ["hybrid", "remote"],
    },
    {
        "id": JOB_IDS[8], "company_id": COMPANY_IDS[4], "title": "AI Research Engineer",
        "description": "Research and implement novel AI approaches for agricultural yield prediction and climate modeling. Publish papers, build prototypes, and deploy to production.",
        "job_type": '{"full_time"}', "experience_level": "Senior", "experience_min": 4, "experience_max": 8,
        "location": "Delhi, NCR", "city": "Delhi", "state": "Delhi", "country": "India",
        "salary_min": 2800000, "salary_max": 5000000, "skills": ["Python", "C++"],
        "work_mode": ["remote"],
    },
    {
        "id": JOB_IDS[9], "company_id": COMPANY_IDS[4], "title": "Python Developer (Junior)",
        "description": "Assist in building data processing pipelines and REST APIs using FastAPI. Good opportunity for fresh graduates with strong Python fundamentals.",
        "job_type": '{"full_time"}', "experience_level": "Junior", "experience_min": 0, "experience_max": 2,
        "location": "Remote, India", "city": "Remote", "state": "", "country": "India",
        "salary_min": 500000, "salary_max": 900000, "skills": ["Python", "JavaScript", "HTML", "CSS"],
        "work_mode": ["remote"],
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
        "skills": [("Python", "advanced", 3), ("Java", "intermediate", 2), ("JavaScript", "beginner", 1)],
    },
    {
        "user_id": USER_IDS[2], "profile_id": PROFILE_IDS[2],
        "first_name": "Rahul", "last_name": "Kumar", "email": "rahul.test@example.com",
        "phone": "+919876543212", "city": "Hyderabad", "state": "Telangana",
        "headline": "DevOps & Cloud Engineer | AWS Certified",
        "professional_summary": "5 years in DevOps and cloud infrastructure. AWS Solutions Architect certified. Experience with Kubernetes, Terraform, and CI/CD at scale.",
        "total_experience_years": 5.0,
        "skills": [("Python", "intermediate", 3), ("Go", "advanced", 4), ("JavaScript", "intermediate", 2)],
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
        "skills": [("Python", "expert", 6), ("C++", "advanced", 3), ("JavaScript", "intermediate", 2)],
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
        print("\nSeed complete!")
        print(f"  Companies: {len(COMPANIES)}")
        print(f"  Jobs: {len(JOBS)}")
        print(f"  Candidates: {len(CANDIDATES)}")
        print(f"\nTest user IDs for /recommend:")
        for c in CANDIDATES:
            print(f"  {c['first_name']} {c['last_name']}: {c['user_id']}")
        print(f"\nTest job IDs for /chat:")
        for j in JOBS[:5]:
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
