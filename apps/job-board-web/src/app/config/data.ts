import {
  MdDesignServices,
  MdDeveloperMode,
  MdOutlineChatBubbleOutline,
  MdOutlineMailOutline,
  MdOutlineVisibility,
} from 'react-icons/md';
import routePaths from './routePaths';
import { TbLockPassword, TbSpeakerphone } from 'react-icons/tb';
import { GiHealthNormal } from 'react-icons/gi';
import { LiaEditSolid, LiaFileAltSolid, LiaShieldAltSolid } from 'react-icons/lia';
import { BiMessageDetail, BiSolidMagicWand, BiSupport } from 'react-icons/bi';
import { HiOutlineQuestionMarkCircle } from 'react-icons/hi';
import { FaPeopleCarry, FaRegFileAlt, FaUsers } from 'react-icons/fa';
import { GoBookmark } from 'react-icons/go';
import { ActiveStatus, Roles, VideoResumeStatus } from '../types/enum';
import { IoBriefcase } from 'react-icons/io5';
import { AiFillFileText } from 'react-icons/ai';

export const headerMenus = {
  [Roles.candidate]: [
    {
      title: 'Home',
      href: routePaths.home,
      isAuth: false,
    },
    {
      title: 'Jobs',
      href: routePaths.jobs.search,
      isAuth: false,
    },
    {
      title: 'Companies',
      href: routePaths.companies.search,
      isAuth: false,
    },
    {
      title: 'Messages',
      href: routePaths.chat.list,
      isAuth: true,
    },
    {
      title: 'Applications',
      href: routePaths.applications.list,
      isAuth: true,
    },
    {
      title: 'Saved Jobs',
      href: routePaths.savedJobs.list,
      isAuth: true,
    },
  ],
  [Roles.employer]: [
    {
      title: 'Dashboard',
      href: routePaths.employee.dashboard,
      isAuth: true,
    },
    {
      title: 'Jobs',
      href: routePaths.employee.jobs.list,
      isAuth: true,
    },
    {
      title: 'Interviews',
      href: routePaths.employee.interviews.list,
      isAuth: true,
    },
    {
      title: 'Shortlisted',
      href: routePaths.employee.shortList,
      isAuth: true,
    },
    {
      title: 'Members',
      href: routePaths.employee.members.list,
      isAuth: true,
    },
    {
      title: 'Subscriptions',
      href: routePaths.employee.plans,
      isAuth: true,
    },
    {
      title: 'Messages',
      href: routePaths.chat.list,
      isAuth: true,
    },
  ],
};

export const footerLinks = [
  {
    title: 'Company',
    childs: [
      {
        title: 'About',
        href: routePaths.aboutUs,
      },
      {
        title: 'Testimonials',
        href: '',
      },
    ],
  },
  {
    title: 'Candidate',
    childs: [
      {
        title: 'Browse Jobs',
        href: routePaths.jobs.search,
      },
      {
        title: 'Browse Employers',
        href: routePaths.auth.login,
      },
      {
        title: 'Candidate Dashboard',
        href: routePaths.auth.login,
      },
      {
        title: 'Saved Jobs',
        href: routePaths.auth.login,
      },
    ],
  },
  {
    title: 'Employers',
    childs: [
      {
        title: 'Post a Job',
        href: routePaths.employee.auth.login,
      },
      {
        title: 'Browse Candidates',
        href: routePaths.employee.auth.login,
      },
      {
        title: 'Employers Dashboard',
        href: routePaths.employee.auth.login,
      },
      {
        title: 'Applications',
        href: routePaths.employee.auth.login,
      },
    ],
  },
  {
    title: 'Support',
    childs: [
      {
        title: 'Customer Support',
        href: '',
      },
      {
        title: 'Contact Us',
        href: routePaths.contactUs,
      },
      {
        title: 'Terms & Conditions',
        href: routePaths.cms('terms-conditions'),
      },
      {
        title: 'Privacy Policy',
        href: routePaths.cms('privacy-policy'),
      },
    ],
  },
];

export const companyData = [
  {
    src: '/assets/images/airbnb.png',
    alt: 'Airbnb',
  },
  {
    src: '/assets/images/slack.png',
    alt: 'Slack',
  },
  {
    src: '/assets/images/google.png',
    alt: 'Google',
  },
  {
    src: '/assets/images/microsoft.png',
    alt: 'Microsoft',
  },
];

export const trendingJobsData = [
  {
    icon: MdDesignServices,
    title: 'UI UX design',
    count: 126,
  },
  {
    icon: MdDeveloperMode,
    title: 'Developer',
    count: 260,
  },
  {
    icon: TbSpeakerphone,
    title: 'Marketing',
    count: 60,
  },
  {
    icon: GiHealthNormal,
    title: 'Healthcare',
    count: 270,
  },
];

export const popularJobsData = [
  {
    profile: '/assets/images/popular-job-3.png',
    companyName: 'SecureMind',
    location: 'Singapore',
    title: 'Cybersecurity Analyst',
    tags: ['Full Time', 'Urgent'],
    role: 'Permanent',
    salary: '$5,500–9,000/Month',
    description:
      'Monitor Network Activity, Detect Threats, And Respond To Incidents In Real Time. Experience With Firewalls And SIEM Tools Required.',
    postedDate: '2 days ago',
  },
  {
    profile: '/assets/images/popular-job-1.png',
    companyName: 'TechNova',
    location: 'San Francisco, USA',
    title: 'Front-End Developer',
    tags: ['Full Time'],
    role: 'Permanent',
    salary: '$6,500–10,000/Month',
    description:
      'Develop Responsive User Interfaces Using React. Collaborate With Designers And Backend Teams To Improve UX Across Platforms.',
    postedDate: '3 days ago',
  },
  {
    profile: '/assets/images/popular-job-2.png',
    companyName: 'PixelCraft',
    location: 'Remote',
    title: 'UI/UX Designer',
    tags: ['Full Time', 'Part Time'],
    role: 'Permanent',
    salary: '$3,000–7,000/Month',
    description:
      'Work Closely With Product Teams To Design Intuitive, User-Friendly Interfaces. Portfolio Required. Remote Work Available.',
    postedDate: '1 days ago',
  },
  {
    profile: '/assets/images/popular-job-3.png',
    companyName: 'SecureMind',
    location: 'Singapore',
    title: 'Cybersecurity Analyst',
    tags: ['Full Time', 'Urgent'],
    role: 'Permanent',
    salary: '$5,500–9,000/Month',
    description:
      'Monitor Network Activity, Detect Threats, And Respond To Incidents In Real Time. Experience With Firewalls And SIEM Tools Required.',
    postedDate: '2 days ago',
  },
];

export const degreeOptions = [
  "Bachelor's Degree",
  'Bachelor of Science (B.Sc)',
  'Bachelor of Arts (B.A)',
  'Bachelor of Commerce (B.Com)',
  'Bachelor of Technology (B.Tech)',
  'Bachelor of Engineering (B.E)',
  'Bachelor of Science in Statistics',
  "Master's Degree",
  'Master of Science (M.Sc)',
  'Master of Technology (M.Tech)',
  'Master of Business Administration (MBA)',
  'Master of Arts (M.A)',
  'Master of Commerce (M.Com)',
  'Post Graduate Diploma in Data Science',
  'PhD',
  'Diploma',
  'Certificate',
  'High School',
];

export const employmentTypes = [
  { label: 'Full-time', key: 'full_time' },
  { label: 'Part-time', key: 'part_time' },
  { label: 'Contract', key: 'contract' },
  { label: 'Internship', key: 'internship' },
  { label: 'Freelance', key: 'freelance' },
];

export const jobTypes = [
  { label: 'Full-time', value: 'full_time' },
  { label: 'Part-time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Internship', value: 'internship' },
];

export const filterIndustryOptions = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Design',
  'Marketing',
  'Sales',
];

export const companyTypeOptions = [
  { label: 'Startup', value: 'startup' },
  { label: 'SME', value: 'sme' },
  { label: 'MNC', value: 'mnc' },
  { label: 'Government', value: 'government' },
];

export const departmentOptions = [
  'Engineering',
  'Sales',
  'Marketing',
  'Design',
  'Product',
  'Operations',
  'HR',
];

export const locationTypeOptions = [
  { label: 'Remote', value: 'remote' },
  { label: 'Onsite', value: 'onsite' },
  { label: 'Hybrid', value: 'hybrid' },
];

export const payRateOptions = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export const postedWithinOptions = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Any time', value: 'any' },
];

export const workShiftOptions = [
  { label: 'Day', key: 'day' },
  { label: 'Night', key: 'night' },
  { label: 'Flexible', key: 'flexible' },
];

export const jobSearchStatusOptions = [
  { label: 'Actively Looking', key: 'actively_looking' },
  { label: 'Open to Opportunities', key: 'open_to_opportunities' },
  { label: 'Not Looking', key: 'not_looking' },
];

export const currencyData = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];

export const noticePeriodOptions = [
  { label: 'Immediate', key: '0' },
  { label: '15 days', key: '15' },
  { label: '1 month', key: '30' },
  { label: '2 months', key: '60' },
  { label: '3 months', key: '90' },
];

export const cmsData = {
  'terms-conditions': `
    <div class="tos-container">
      <h1>Terms of Service</h1>
      <p><strong>Effective Date:</strong> [Insert Date]</p>
      <p>Welcome to [App Name]! By accessing or using our services, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.</p>
      
      <hr />

      <section>
        <h2>1. Acceptance of Terms</h2>
        <p>By creating an account or using [App Name], you agree to comply with these Terms and all applicable laws. If you do not agree, you must not use our services.</p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <ul>
          <li>You must be at least 18 years old to use our services.</li>
          <li>By using the app, you represent that you are legally capable of entering into a binding agreement.</li>
        </ul>
      </section>

      <section>
        <h2>3. Services Provided</h2>
        <p>[App Name] offers:</p>
        <ul>
          <li>Online ordering and delivery of groceries and food.</li>
          <li>Access to restaurant and grocery store listings.</li>
          <li>Real-time tracking of orders.</li>
        </ul>
      </section>

      <section>
        <h2>4. Account Registration</h2>
        <ul>
          <li>You must register an account to use certain features.</li>
          <li>You are responsible for maintaining the confidentiality of your login information.</li>
          <li>Any unauthorized use of your account must be reported immediately.</li>
        </ul>
      </section>

      <section>
        <h2>5. Order and Delivery</h2>
        <ul>
          <li>Orders placed through the app are subject to availability.</li>
          <li>Estimated delivery times are provided for convenience and may vary.</li>
          <li>You must ensure someone is available to receive the order at the delivery address.</li>
        </ul>
      </section>

      <section>
        <h2>6. Payments</h2>
        <ul>
          <li>Payments can be made via credit card, debit card, digital wallets, or other accepted methods.</li>
          <li>All prices are displayed in [currency] and include applicable taxes and delivery fees unless stated otherwise.</li>
          <li>Payment processing may be subject to additional terms from your payment provider.</li>
        </ul>
      </section>

      <section>
        <h2>7. Refunds and Cancellations</h2>
        <ul>
          <li>Orders can be canceled before they are prepared or dispatched.</li>
          <li>Refunds are issued for cancellations as per our refund policy.</li>
          <li>If an item is unavailable, you will be notified and refunded if payment has already been made.</li>
        </ul>
      </section>

      <section>
        <h2>8. Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the app for any illegal purpose.</li>
          <li>Interfere with the app's security or operation.</li>
          <li>Provide false information during account registration or ordering.</li>
        </ul>
      </section>

      <section>
        <h2>9. Third-Party Content</h2>
        <p>Our app may include links to third-party websites or services. We are not responsible for the accuracy, content, or availability of these external sites.</p>
      </section>

      <section>
        <h2>10. Disclaimer of Warranties</h2>
        <ul>
          <li>The app and its services are provided "as is" without warranties of any kind.</li>
          <li>We do not guarantee uninterrupted or error-free operation of the app.</li>
        </ul>
      </section>

      <section>
        <h2>11. Limitation of Liability</h2>
        <ul>
          <li>We are not liable for any indirect, incidental, or consequential damages arising from your use of the app.</li>
          <li>Our total liability will not exceed the amount paid by you for the order in question.</li>
        </ul>
      </section>

      <section>
        <h2>12. Indemnification</h2>
        <p>You agree to indemnify and hold [App Name], its affiliates, and partners harmless from any claims or damages arising from your use of the app or violation of these Terms.</p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <ul>
          <li>We reserve the right to suspend or terminate your access to the app at any time, without prior notice, if you violate these Terms.</li>
        </ul>
      </section>

      <section>
        <h2>14. Changes to Terms</h2>
        <p>We may update these Terms from time to time. The updated version will be posted on the app with a new effective date. Continued use of the app constitutes your acceptance of the revised Terms.</p>
      </section>

      <section>
        <h2>15. Governing Law</h2>
        <p>These Terms are governed by the laws of [Jurisdiction]. Any disputes will be resolved exclusively in the courts of [Jurisdiction].</p>
      </section>

      <section>
        <h2>16. Contact Us</h2>
        <p>For questions or concerns, please contact us at:</p>
        <ul>
          <li>Email: [Insert Email Address]</li>
          <li>Phone: [Insert Phone Number]</li>
        </ul>
      </section>

      <footer style="margin-top: 2rem;">
        <p><em>Thank you for choosing [App Name]! Enjoy a seamless shopping and dining experience.</em></p>
      </footer>
    </div>
  `,
  'privacy-policy': `
    <div class="privacy-policy-container">
      <h1>Privacy Policy for Supraa</h1>
      <p><strong>Effective Date:</strong> [DD/MM/YYYY] | <strong>Last Updated:</strong> [DD/MM/YYYY]</p>
      <p>Welcome to [Your App Name] ("we," "our," or "us"). Your privacy is important to us, and we are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our food and grocery delivery services.</p>
      
      <hr />

      <section>
        <h2>1. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, email, phone number, delivery address, payment details, and account credentials.</li>
          <li><strong>Usage Data:</strong> Browsing history, search preferences, and interaction with our app.</li>
          <li><strong>Device Information:</strong> IP address, device type, operating system, and app version.</li>
          <li><strong>Location Data:</strong> Real-time location to provide delivery services.</li>
          <li><strong>Transaction Information:</strong> Order history, payment methods, and receipts.</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Process and deliver your orders efficiently.</li>
          <li>Improve and personalize your app experience.</li>
          <li>Provide customer support and resolve complaints.</li>
          <li>Send notifications regarding order status and promotions.</li>
          <li>Detect and prevent fraudulent activities.</li>
          <li>Comply with legal obligations.</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Share Your Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li><strong>Delivery Partners:</strong> To fulfill and deliver your orders.</li>
          <li><strong>Payment Providers:</strong> To process payments securely.</li>
          <li><strong>Service Providers:</strong> For analytics, marketing, and customer support.</li>
          <li><strong>Legal Authorities:</strong> If required by law or for fraud prevention.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Security</h2>
        <p>We take appropriate security measures to protect your personal data from unauthorized access, alteration, or disclosure. However, no method of data transmission is 100% secure.</p>
      </section>

      <section>
        <h2>5. Your Rights & Choices</h2>
        <ul>
          <li><strong>Access & Update:</strong> You can update your personal information through the app settings.</li>
          <li><strong>Opt-Out:</strong> You can opt out of promotional messages via app settings.</li>
          <li><strong>Delete Account:</strong> Request account deletion by contacting support.</li>
        </ul>
      </section>

      <section>
        <h2>6. Cookies & Tracking Technologies</h2>
        <p>We use cookies and similar technologies to improve user experience and analyze app performance.</p>
      </section>

      <section>
        <h2>7. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Any changes will be posted in the app, and continued use of our services indicates acceptance of the updated policy.</p>
      </section>

      <section>
        <h2>8. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
        <ul>
          <li><strong>Email:</strong> [support@yourapp.com]</li>
          <li><strong>Phone:</strong> [Customer Support Number]</li>
        </ul>
      </section>

      <footer style="margin-top: 2rem;">
        <p><em>By using our app, you agree to this Privacy Policy.</em></p>
      </footer>
    </div>
  `,
};

export const jobSearchExperiences = ['Fresher', '1', '2', '3', '4', '5+'];

export const searchJobDefaultValues = {
  query: '',
  company: '',
  industry: '',
  companyType: '',
  postedWithin: '',
  categoryId: '',
  workModes: [''],
  experienceLevels: [''],
  salaryMin: '',
  salaryMax: '',
  payRate: '',
  skillIds: '',
  locationType: '',
  jobType: [''],
  location: '',
};

export const mainDrawerData = [
  {
    title: 'Account Settings',
    child: [
      {
        title: 'Edit Profile',
        icon: LiaEditSolid,
        href: routePaths.profile,
      },
      {
        title: 'Change Theme',
        icon: BiSolidMagicWand,
        href: '',
      },
      {
        title: 'Change Password',
        icon: TbLockPassword,
        href: routePaths.employee.auth.changePassword,
      },
    ],
  },
  {
    title: 'Privacy & Visibility',
    child: [
      {
        title: 'Profile Visibility',
        icon: MdOutlineVisibility,
        href: '',
      },
    ],
  },
  {
    title: 'Notifications',
    child: [
      {
        title: 'Email Notifications',
        icon: MdOutlineMailOutline,
        type: 'switch',
        defaultChecked: false,
      },
      {
        title: 'Messages',
        icon: MdOutlineChatBubbleOutline,
        type: 'switch',
        defaultChecked: false,
      },
    ],
  },
  {
    title: 'App Preferences',
    child: [
      {
        title: 'Terms of Service',
        icon: LiaFileAltSolid,
        href: routePaths.cms('terms-conditions'),
      },
      {
        title: 'Privacy Policy',
        icon: LiaShieldAltSolid,
        href: routePaths.cms('privacy-policy'),
      },
    ],
  },
  {
    title: 'Support & Feedback',
    child: [
      {
        title: 'Help Center',
        icon: HiOutlineQuestionMarkCircle,
        href: '',
      },
      {
        title: 'Contact Support',
        icon: BiSupport,
        href: '',
      },
    ],
  },
];

export const dashboardNavigations = [
  {
    icon: BiMessageDetail,
    title: 'Messages',
    href: routePaths.chat.list,
  },
  {
    icon: FaRegFileAlt,
    title: 'Applications',
    href: routePaths.applications.list,
  },
  {
    icon: GoBookmark,
    title: 'Saved Jobs',
    href: routePaths.savedJobs.list,
  },
];

export const chatList = [
  {
    uid: 'u9821',
    name: 'Alex Rivera',
    profilePhoto: 'https://i.pravatar.cc/150?u=u9821',
    lastMessage: {
      message: "The presentation looks solid. Let's sync at 2.",
      createdAt: '2026-02-11T10:45:00Z',
    },
  },
  {
    uid: 'u1245',
    name: 'Sarah Chen',
    profilePhoto: 'https://i.pravatar.cc/150?u=u1245',
    lastMessage: {
      message: 'Did you catch the latest update on the API?',
      createdAt: '2026-02-11T09:30:15Z',
    },
  },
  {
    uid: 'u3342',
    name: 'Jordan Smith',
    profilePhoto: null,
    lastMessage: {
      message: 'Check out this screenshot.',
      createdAt: '2026-02-11T08:12:00Z',
    },
  },
  {
    uid: 'u7761',
    name: 'Maria Garcia',
    profilePhoto: 'https://i.pravatar.cc/150?u=u7761',
    lastMessage: {
      message: 'Happy Birthday! Have a great one! 🎂',
      createdAt: '2026-02-10T22:05:44Z',
    },
  },
  {
    uid: 'u0912',
    name: 'Liam Wilson',
    profilePhoto: 'https://i.pravatar.cc/150?u=u0912',
    lastMessage: {
      message: 'Can you review the PR #442?',
      createdAt: '2026-02-10T18:15:00Z',
    },
  },
  {
    uid: 'u5521',
    name: 'Chloe Nakamura',
    profilePhoto: 'https://i.pravatar.cc/150?u=u5521',
    lastMessage: {
      message: "Just landed! I'll be home in an hour.",
      createdAt: '2026-02-10T14:40:22Z',
    },
  },
  {
    uid: 'u8839',
    name: 'Marcus Thorne',
    profilePhoto: 'https://i.pravatar.cc/150?u=u8839',
    lastMessage: {
      message: 'Is the server still down for you?',
      createdAt: '2026-02-10T11:20:00Z',
    },
  },
  {
    uid: 'u2104',
    name: 'Aria Varma',
    profilePhoto: null,
    lastMessage: {
      message: 'The design assets are in the shared folder.',
      createdAt: '2026-02-09T16:55:10Z',
    },
  },
  {
    uid: 'u6654',
    name: 'David Boose',
    profilePhoto: 'https://i.pravatar.cc/150?u=u6654',
    lastMessage: {
      message: 'Thanks for the help earlier!',
      createdAt: '2026-02-09T13:10:00Z',
    },
  },
  {
    uid: 'u4409',
    name: 'Elena Rossi',
    profilePhoto: 'https://i.pravatar.cc/150?u=u4409',
    lastMessage: {
      message: "Let's grab coffee tomorrow morning.",
      createdAt: '2026-02-09T09:00:00Z',
    },
  },
];

export const chats = [
  {
    uid: 'msg_001',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Hey! Did you get a chance to look at the project brief?',
    createdAt: '2026-02-11T09:00:00Z',
  },
  {
    uid: 'msg_002',
    senderId: 'user_other_88',
    message: 'Just finishing it up now. Looks mostly good.',
    createdAt: '2026-02-11T09:05:22Z',
  },
  {
    uid: 'msg_003',
    senderId: 'user_other_88',
    message: "One question: what's the deadline for the final prototype?",
    createdAt: '2026-02-11T09:06:10Z',
  },
  {
    uid: 'msg_004',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'The client wants to see it by Friday afternoon.',
    createdAt: '2026-02-11T09:10:45Z',
  },
  {
    uid: 'msg_005',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Think we can make that happen?',
    createdAt: '2026-02-11T09:11:05Z',
  },
  {
    uid: 'msg_006',
    senderId: 'user_other_88',
    message: "It'll be tight, but I'll focus on the core features first.",
    createdAt: '2026-02-11T09:15:30Z',
  },
  {
    uid: 'msg_007',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Perfect. Let me know if you need help with the documentation.',
    createdAt: '2026-02-11T09:20:00Z',
  },
  {
    uid: 'msg_008',
    senderId: 'user_other_88',
    message: 'Will do. Btw, are we still meeting at 2 PM?',
    createdAt: '2026-02-11T09:25:00Z',
  },
  {
    uid: 'msg_009',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: "Yes, I'll send the link over in a minute.",
    createdAt: '2026-02-11T09:26:15Z',
  },
  {
    uid: 'msg_010',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Here it is: meet.google.com/abc-defg-hij',
    createdAt: '2026-02-11T09:27:00Z',
  },
  {
    uid: 'msg_011',
    senderId: 'user_other_88',
    message: 'Joined. See you there!',
    createdAt: '2026-02-11T14:00:05Z',
  },
  {
    uid: 'msg_012',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: "Great call. I've updated the task board based on our talk.",
    createdAt: '2026-02-11T15:10:00Z',
  },
  {
    uid: 'msg_013',
    senderId: 'user_other_88',
    message: "Saw that. I'm starting on the UI components now.",
    createdAt: '2026-02-11T15:45:30Z',
  },
  {
    uid: 'msg_014',
    senderId: 'user_other_88',
    message: 'Quick check: Dark mode or light mode first?',
    createdAt: '2026-02-11T15:46:12Z',
  },
  {
    uid: 'msg_015',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: "Let's go with Dark Mode as the default. It's the client's favorite.",
    createdAt: '2026-02-11T16:00:00Z',
  },
  {
    uid: 'msg_016',
    senderId: 'user_other_88',
    message: 'Agreed. Just pushed the first draft to GitHub.',
    createdAt: '2026-02-11T17:30:45Z',
  },
  {
    uid: 'msg_017',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Checking it out now... looks clean!',
    createdAt: '2026-02-11T17:45:00Z',
  },
  {
    uid: 'msg_018',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'One small tweak needed on the button padding.',
    createdAt: '2026-02-11T17:46:20Z',
  },
  {
    uid: 'msg_019',
    senderId: 'user_other_88',
    message: 'Ah, good catch. Fixing it right now.',
    createdAt: '2026-02-11T17:50:10Z',
  },
  {
    uid: 'msg_020',
    senderId: '71ed9c9a-a5d5-4330-b64c-d5af4e921395',
    message: 'Done. Thanks for the quick turnaround! 🚀',
    createdAt: '2026-02-11T18:05:00Z',
  },
];

export const myApplications = [
  {
    id: 'app_1',
    jobId: 'job_001',
    jobSeekerId: 'user_001',
    status: 'interview',
    coverLetter: 'I am excited to apply for this position.',
    resumeUrl: '/resumes/john_doe.pdf',
    resumeSnapshot: {
      city: 'San Francisco',
      email: 'john.doe@example.com',
      phone: '+1 555-0123',
      state: 'CA',
      country: 'USA',
      headline: 'Senior Product Manager',
      lastName: 'Doe',
      firstName: 'John',
      resumeUrl: '/resumes/john_doe.pdf',
      snapshotAt: '2024-02-10T10:00:00Z',
      professionalSummary: 'Experienced PM with 5 years in tech.',
      totalExperienceYears: 5,
    },
    screeningAnswers: {},
    rating: 4,
    notes: 'Strong candidate',
    fitScore: 92,
    source: 'linkedin',
    agreeConsent: true,
    isOnHold: false,
    statusHistory: [
      {
        status: 'applied',
        changedBy: 'system',
        timestamp: '2024-02-08T09:00:00Z',
      },
      {
        status: 'interview',
        changedBy: 'recruiter_01',
        timestamp: '2024-02-09T14:30:00Z',
      },
    ],
    appliedAt: '2024-02-08T09:00:00Z',
    viewedAt: '2024-02-09T10:00:00Z',
    job: {
      id: 'job_001',
      title: 'Senior Product Manager',
      company: {
        id: 'comp_001',
        name: 'Tech Innovators Inc.',
        logoUrl: '/assets/images/google.png',
      },
      location: 'San Francisco, CA',
      experienceMin: 2,
      experienceMax: 4,
      workMode: ['Remote'],
      salaryMin: 400000,
      salaryMax: 600000,
      salaryCurrency: 'INR',
      jobType: ['Full-time'],
      description: 'Leading product development...',
      employerId: 'emp_001',
      companyId: 'comp_001',
      categoryId: 'cat_001',
      subCategoryId: 'sub_001',
      skills: ['Product Management', 'Agile', 'Roadmapping'],
      createdAt: '2024-02-01T00:00:00Z',
      updatedAt: '2024-02-01T00:00:00Z',
      deadline: '2024-03-01T00:00:00Z',
      isActive: true,
      status: 'published',
      isFeatured: true,
      isHighlighted: false,
      isUrgent: false,
      isCloned: false,
      renewalCount: 0,
      viewCount: 120,
      applicationCount: 45,
      payRate: 'yearly',
      showSalary: true,
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      employer: {
        id: 'emp_001',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@techinnovators.com',
      },
    },
  },
  {
    id: 'app_2',
    jobId: 'job_002',
    jobSeekerId: 'user_001',
    status: 'applied',
    coverLetter: null,
    resumeUrl: '/resumes/john_doe.pdf',
    resumeSnapshot: {
      city: 'New York',
      email: 'john.doe@example.com',
      phone: '+1 555-0123',
      state: 'NY',
      country: 'USA',
      headline: 'Product Owner',
      lastName: 'Doe',
      firstName: 'John',
      resumeUrl: '/resumes/john_doe.pdf',
      snapshotAt: '2024-02-11T09:00:00Z',
      professionalSummary: 'Product Owner focused on UX.',
      totalExperienceYears: 5,
    },
    screeningAnswers: {},
    rating: null,
    notes: null,
    fitScore: 88,
    source: 'website',
    agreeConsent: true,
    isOnHold: false,
    statusHistory: [
      {
        status: 'applied',
        changedBy: 'system',
        timestamp: '2024-02-11T09:00:00Z',
      },
    ],
    appliedAt: '2024-02-11T09:00:00Z',
    viewedAt: null,
    job: {
      id: 'job_002',
      title: 'Product Manager',
      company: {
        id: 'comp_002',
        name: 'Creative Solutions',
        logoUrl: '/assets/images/slack.png',
      },
      location: 'New York, NY',
      experienceMin: 3,
      experienceMax: 5,
      workMode: ['Hybrid'],
      salaryMin: 500000,
      salaryMax: 800000,
      salaryCurrency: 'INR',
      jobType: ['Full-time'],
      description: 'Standard PM role...',
      employerId: 'emp_002',
      companyId: 'comp_002',
      categoryId: 'cat_001',
      subCategoryId: 'sub_001',
      skills: ['Product Management', 'Scrum'],
      createdAt: '2024-02-05T00:00:00Z',
      updatedAt: '2024-02-05T00:00:00Z',
      deadline: '2024-03-05T00:00:00Z',
      isActive: true,
      status: 'published',
      isFeatured: false,
      isHighlighted: false,
      isUrgent: false,
      isCloned: false,
      renewalCount: 0,
      viewCount: 80,
      applicationCount: 20,
      payRate: 'yearly',
      showSalary: true,
      city: 'New York',
      state: 'NY',
      country: 'USA',
      employer: {
        id: 'emp_002',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob@creative.com',
      },
    },
  },
  {
    id: 'app_3',
    jobId: 'job_003',
    jobSeekerId: 'user_001',
    status: 'rejected',
    coverLetter: null,
    resumeUrl: '/resumes/john_doe.pdf',
    resumeSnapshot: {
      city: 'Austin',
      email: 'john.doe@example.com',
      phone: '+1 555-0123',
      state: 'TX',
      country: 'USA',
      headline: 'Product Analyst',
      lastName: 'Doe',
      firstName: 'John',
      resumeUrl: '/resumes/john_doe.pdf',
      snapshotAt: '2024-01-20T10:00:00Z',
      professionalSummary: 'Analyst...',
      totalExperienceYears: 5,
    },
    screeningAnswers: {},
    rating: 2,
    notes: 'Not enough technical depth.',
    fitScore: 60,
    source: 'referral',
    agreeConsent: true,
    isOnHold: false,
    statusHistory: [
      {
        status: 'applied',
        changedBy: 'system',
        timestamp: '2024-01-20T10:00:00Z',
      },
      {
        status: 'rejected',
        changedBy: 'recruiter_02',
        timestamp: '2024-01-25T11:00:00Z',
      },
    ],
    appliedAt: '2024-01-20T10:00:00Z',
    viewedAt: '2024-01-21T09:00:00Z',
    job: {
      id: 'job_003',
      title: 'Product Analyst',
      company: {
        id: 'comp_003',
        name: 'Data Corp',
        logoUrl: '/assets/images/microsoft.png',
      },
      location: 'Austin, TX',
      experienceMin: 1,
      experienceMax: 3,
      workMode: ['Onsite'],
      salaryMin: 300000,
      salaryMax: 500000,
      salaryCurrency: 'INR',
      jobType: ['Full-time'],
      description: 'Analyze product metrics...',
      employerId: 'emp_003',
      companyId: 'comp_003',
      categoryId: 'cat_002',
      subCategoryId: 'sub_002',
      skills: ['SQL', 'Tableau'],
      createdAt: '2024-01-10T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
      deadline: '2024-02-10T00:00:00Z',
      isActive: false,
      status: 'closed',
      isFeatured: false,
      isHighlighted: false,
      isUrgent: false,
      isCloned: false,
      renewalCount: 0,
      viewCount: 200,
      applicationCount: 60,
      payRate: 'yearly',
      showSalary: true,
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      employer: {
        id: 'emp_003',
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@datacorp.com',
      },
    },
  },
  {
    id: 'app_4',
    jobId: 'job_004',
    jobSeekerId: 'user_001',
    status: 'offered',
    coverLetter: null,
    resumeUrl: '/resumes/john_doe.pdf',
    resumeSnapshot: {
      city: 'Seattle',
      email: 'john.doe@example.com',
      phone: '+1 555-0123',
      state: 'WA',
      country: 'USA',
      headline: 'Lead PM',
      lastName: 'Doe',
      firstName: 'John',
      resumeUrl: '/resumes/john_doe.pdf',
      snapshotAt: '2024-02-01T10:00:00Z',
      professionalSummary: 'Leading product teams.',
      totalExperienceYears: 5,
    },
    screeningAnswers: {},
    rating: 5,
    notes: 'Perfect fit.',
    fitScore: 98,
    source: 'recruiter',
    agreeConsent: true,
    isOnHold: false,
    statusHistory: [
      {
        status: 'applied',
        changedBy: 'system',
        timestamp: '2024-02-01T10:00:00Z',
      },
      {
        status: 'offered',
        changedBy: 'recruiter_03',
        timestamp: '2024-02-12T15:00:00Z',
      },
    ],
    appliedAt: '2024-02-01T10:00:00Z',
    viewedAt: '2024-02-02T10:00:00Z',
    job: {
      id: 'job_004',
      title: 'Lead Product Manager',
      company: {
        id: 'comp_004',
        name: 'Amazonian',
        logoUrl: '/assets/images/airbnb.png',
      },
      location: 'Seattle, WA',
      experienceMin: 5,
      experienceMax: 8,
      workMode: ['Hybrid'],
      salaryMin: 800000,
      salaryMax: 1200000,
      salaryCurrency: 'INR',
      jobType: ['Full-time'],
      description: 'Leading aggressive growth...',
      employerId: 'emp_004',
      companyId: 'comp_004',
      categoryId: 'cat_001',
      subCategoryId: 'sub_001',
      skills: ['Leadership', 'Strategy'],
      createdAt: '2024-01-25T00:00:00Z',
      updatedAt: '2024-01-25T00:00:00Z',
      deadline: '2024-02-25T00:00:00Z',
      isActive: true,
      status: 'published',
      isFeatured: true,
      isHighlighted: true,
      isUrgent: true,
      isCloned: false,
      renewalCount: 0,
      viewCount: 500,
      applicationCount: 150,
      payRate: 'yearly',
      showSalary: true,
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      employer: {
        id: 'emp_004',
        firstName: 'Jeff',
        lastName: 'Bezos',
        email: 'jeff@amazonian.com',
      },
    },
  },
  {
    id: 'app_5',
    jobId: 'job_005',
    jobSeekerId: 'user_001',
    status: 'screening',
    coverLetter: null,
    resumeUrl: '/resumes/john_doe.pdf',
    resumeSnapshot: {
      city: 'Chicago',
      email: 'john.doe@example.com',
      phone: '+1 555-0123',
      state: 'IL',
      country: 'USA',
      headline: 'Product Manager',
      lastName: 'Doe',
      firstName: 'John',
      resumeUrl: '/resumes/john_doe.pdf',
      snapshotAt: '2024-02-12T08:00:00Z',
      professionalSummary: 'PM...',
      totalExperienceYears: 5,
    },
    screeningAnswers: {},
    rating: null,
    notes: null,
    fitScore: 75,
    source: 'indeed',
    agreeConsent: true,
    isOnHold: false,
    statusHistory: [
      {
        status: 'applied',
        changedBy: 'system',
        timestamp: '2024-02-12T08:00:00Z',
      },
    ],
    appliedAt: '2024-02-12T08:00:00Z',
    viewedAt: '2024-02-12T09:00:00Z',
    job: {
      id: 'job_005',
      title: 'Technical Product Manager',
      company: {
        id: 'comp_005',
        name: 'FinTech Solutions',
        logoUrl: '/assets/images/google.png',
      },
      location: 'Chicago, IL',
      experienceMin: 3,
      experienceMax: 6,
      workMode: ['Onsite'],
      salaryMin: 600000,
      salaryMax: 900000,
      salaryCurrency: 'INR',
      jobType: ['Full-time'],
      description: 'Handling backend product requirement...',
      employerId: 'emp_005',
      companyId: 'comp_005',
      categoryId: 'cat_003',
      subCategoryId: 'sub_003',
      skills: ['API', 'Finance'],
      createdAt: '2024-02-10T00:00:00Z',
      updatedAt: '2024-02-10T00:00:00Z',
      deadline: '2024-03-10T00:00:00Z',
      isActive: true,
      status: 'published',
      isFeatured: false,
      isHighlighted: false,
      isUrgent: false,
      isCloned: false,
      renewalCount: 0,
      viewCount: 40,
      applicationCount: 10,
      payRate: 'yearly',
      showSalary: true,
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      employer: {
        id: 'emp_005',
        firstName: 'Sarah',
        lastName: 'Connor',
        email: 'sarah@fintech.com',
      },
    },
  },
];

export const companySearchFilters = [
  {
    category: 'Location',
    type: 'radio',
    options: [
      'Near me',
      'Remote job',
      'Exact location',
      'Within 15 km',
      'Within 30 km',
      'Within 50 km',
    ],
    defaultValue: 'Remote job',
  },
  {
    category: 'Salary',
    type: 'radio',
    options: ['Any', '> 30000k', '> 50000k', '> 80000k', '> 100000k'],
    defaultValue: 'Any',
  },
  {
    category: 'Date of posting',
    type: 'radio',
    options: ['All time', 'Last 24 hours', 'Last 3 days', 'Last 7 days'],
    defaultValue: 'All time',
  },
  {
    category: 'Work experience',
    type: 'radio',
    options: ['Any experience', 'Intership', 'Work remotely'],
    defaultValue: 'Any experience',
  },
  {
    category: 'Type of employment',
    type: 'checkbox',
    options: ['Full-time', 'Temporary', 'Part-time'],
    defaultValue: ['Full-time'],
  },
];

export const companiesData = [
  {
    name: 'Nomad',
    location: 'Paris, France',
    sales: '728,000',
    category: 'Business Service',
    jobs: 3,
    description: 'Nomad is located in Paris, France. Nomad has generated $728,000 in sales (USD).',
  },
  {
    name: 'Lumina Strategy',
    location: 'Paris, France',
    sales: '1,250,000',
    category: 'Business Service',
    jobs: 8,
    description:
      'Lumina Strategy is located in Paris, France. Lumina Strategy has generated $1,250,000 in sales (USD).',
  },
  {
    name: 'Vertex Consulting',
    location: 'Paris, France',
    sales: '890,000',
    category: 'Business Service',
    jobs: 5,
    description:
      'Vertex Consulting is located in Paris, France. Vertex Consulting has generated $890,000 in sales (USD).',
  },
  {
    name: 'Blue Quay Partners',
    location: 'Paris, France',
    sales: '2,100,000',
    category: 'Business Service',
    jobs: 12,
    description:
      'Blue Quay Partners is located in Paris, France. Blue Quay Partners has generated $2,100,000 in sales (USD).',
  },
  {
    name: 'Seine Solutions',
    location: 'Paris, France',
    sales: '450,000',
    category: 'Business Service',
    jobs: 2,
    description:
      'Seine Solutions is located in Paris, France. Seine Solutions has generated $450,000 in sales (USD).',
  },
  {
    name: 'Elysée Analytics',
    location: 'Paris, France',
    sales: '3,400,000',
    category: 'Business Service',
    jobs: 15,
    description:
      'Elysée Analytics is located in Paris, France. Elysée Analytics has generated $3,400,000 in sales (USD).',
  },
  {
    name: 'Bastille Creative',
    location: 'Paris, France',
    sales: '615,000',
    category: 'Business Service',
    jobs: 4,
    description:
      'Bastille Creative is located in Paris, France. Bastille Creative has generated $615,000 in sales (USD).',
  },
  {
    name: 'Marais Logistics',
    location: 'Paris, France',
    sales: '1,850,000',
    category: 'Business Service',
    jobs: 9,
    description:
      'Marais Logistics is located in Paris, France. Marais Logistics has generated $1,850,000 in sales (USD).',
  },
  {
    name: 'Apex HR France',
    location: 'Paris, France',
    sales: '920,000',
    category: 'Business Service',
    jobs: 6,
    description:
      'Apex HR France is located in Paris, France. Apex HR France has generated $920,000 in sales (USD).',
  },
  {
    name: 'Zenith Marketing',
    location: 'Paris, France',
    sales: '530,000',
    category: 'Business Service',
    jobs: 3,
    description:
      'Zenith Marketing is located in Paris, France. Zenith Marketing has generated $530,000 in sales (USD).',
  },
  {
    name: 'Nova Ventus',
    location: 'Paris, France',
    sales: '1,100,000',
    category: 'Business Service',
    jobs: 7,
    description:
      'Nova Ventus is located in Paris, France. Nova Ventus has generated $1,100,000 in sales (USD).',
  },
  {
    name: 'Orion Tech Services',
    location: 'Paris, France',
    sales: '2,750,000',
    category: 'Business Service',
    jobs: 10,
    description:
      'Orion Tech Services is located in Paris, France. Orion Tech Services has generated $2,750,000 in sales (USD).',
  },
];

export const employeeDashboardAnalyticsData = [
  {
    value: '3',
    title: 'Jobs Active',
    icon: IoBriefcase,
  },
  {
    value: '120',
    title: 'Applications',
    icon: AiFillFileText,
  },
  {
    value: '3',
    title: 'Shortlisted Candidates',
    icon: FaUsers,
  },
  {
    value: '4',
    title: 'Upcoming Interviews',
    icon: FaPeopleCarry,
  },
];

export const applicantChartData = [
  { month: 'Jan', value: 12 },
  { month: 'Feb', value: 15 },
  { month: 'Mar', value: 30 },
  { month: 'Apr', value: 28 },
  { month: 'May', value: 26 },
  { month: 'Jun', value: 38 },
  { month: 'Jul', value: 38 },
  { month: 'Aug', value: 50 },
  { month: 'Sep', value: 48 },
  { month: 'Oct', value: 55 },
  { month: 'Nov', value: 60 },
  { month: 'Dec', value: 62 },
];

export const topJobsData = [
  {
    title: 'UI/UX Designer',
    type: 'Full-Time',
    applications: 798,
  },
  {
    title: 'UI/UX Designer',
    type: 'Full-Time',
    applications: 798,
  },
  {
    title: 'UI/UX Designer',
    type: 'Full-Time',
    applications: 798,
  },
  {
    title: 'UI/UX Designer',
    type: 'Full-Time',
    applications: 798,
  },
];

export const employeeJobs = [
  {
    title: 'UI/UX Designer',
    remaining: '27 days remaining',
    jobType: 'Full-Time',
    applications: 798,
    status: ActiveStatus.active,
    createdAt: '2026-01-20T10:15:00Z',
  },
  {
    title: 'Social Media Assistant',
    remaining: '17 days remaining',
    jobType: 'Full-Time',
    applications: 185,
    status: ActiveStatus.inactive,
    createdAt: '2026-01-30T08:30:00Z',
  },
  {
    title: 'Junior Graphic Designer',
    remaining: '20 days remaining',
    jobType: 'Full-Time',
    applications: 556,
    status: ActiveStatus.active,
    createdAt: '2026-01-27T14:45:00Z',
  },
  {
    title: 'Front End Developer',
    remaining: '1 months remaining',
    jobType: 'Full-Time',
    applications: 583,
    status: ActiveStatus.active,
    createdAt: '2026-01-15T09:00:00Z',
  },
];

export const membersData = [
  {
    id: '1',
    name: 'Alex Thompson',
    email: 'alex.t@company.com',
    designation: 'Product Manager',
    status: 'active',
  },
  {
    id: '2',
    name: 'Sarah Jenkins',
    email: 'sarah.j@company.com',
    designation: 'UI/UX Designer',
    status: 'inactive',
  },
  {
    id: '3',
    name: 'Marcus Wright',
    email: 'marcus.w@company.com',
    designation: 'Frontend Developer',
    status: 'active',
  },
  {
    id: '4',
    name: 'Elena Rodriguez',
    email: 'elena.r@company.com',
    designation: 'Backend Engineer',
    status: 'active',
  },
];

export const memberPermissions = [
  {
    title: 'Job',
    permissions: [
      {
        value: 'create_job',
        title: 'Create',
        description: 'Create job postings',
      },
      {
        value: 'moderate_job',
        title: 'Moderate',
        description: 'Moderate job postings',
      },
      {
        value: 'read_job',
        title: 'Read',
        description: 'View job details',
      },
      {
        value: 'publish_job',
        title: 'Publish',
        description: 'Publish job postings',
      },
      {
        value: 'unpublish_job',
        title: 'Unpublish',
        description: 'Unpublish job postings',
      },
      {
        value: 'delete_job',
        title: 'Delete',
        description: 'Delete job postings',
      },
      {
        value: 'list_job',
        title: 'List',
        description: 'List all jobs',
      },
      {
        value: 'update_job',
        title: 'Update',
        description: 'Update job postings',
      },
    ],
  },
  {
    title: 'Application',
    permissions: [
      {
        value: 'create_application',
        title: 'Create',
        description: 'Submit Job Application',
      },
      {
        value: 'list_application',
        title: 'List',
        description: 'List all application',
      },
      {
        value: 'read_application',
        title: 'Read',
        description: 'View application details',
      },
      {
        value: 'delete_application',
        title: 'Delete',
        description: 'Delete Job Application',
      },
      {
        value: 'review_application',
        title: 'Review',
        description: 'Review & Shortlist application',
      },
      {
        value: 'update_application',
        title: 'Update',
        description: 'Update application status',
      },
    ],
  },
];

export const jobApplicantsData = [
  {
    id: 'c1a1e8b0-1a01-4c21-a001-001',
    profilePhoto: 'https://i.pravatar.cc/150?img=1',
    name: 'Payal Verma',
    createdAt: '2026-02-15T10:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-002',
    profilePhoto: 'https://i.pravatar.cc/150?img=2',
    name: 'Payal Verma',
    createdAt: '2026-02-15T11:00:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-003',
    profilePhoto: 'https://i.pravatar.cc/150?img=3',
    name: 'Payal Verma',
    createdAt: '2026-02-15T11:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-004',
    profilePhoto: 'https://i.pravatar.cc/150?img=4',
    name: 'Payal Verma',
    createdAt: '2026-02-15T12:00:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-005',
    profilePhoto: 'https://i.pravatar.cc/150?img=5',
    name: 'Payal Verma',
    createdAt: '2026-02-15T12:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-006',
    profilePhoto: 'https://i.pravatar.cc/150?img=6',
    name: 'Payal Verma',
    createdAt: '2026-02-15T13:00:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-007',
    profilePhoto: 'https://i.pravatar.cc/150?img=7',
    name: 'Payal Verma',
    createdAt: '2026-02-15T13:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-008',
    profilePhoto: 'https://i.pravatar.cc/150?img=8',
    name: 'Payal Verma',
    createdAt: '2026-02-15T14:00:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-009',
    profilePhoto: 'https://i.pravatar.cc/150?img=9',
    name: 'Payal Verma',
    createdAt: '2026-02-15T14:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-010',
    profilePhoto: 'https://i.pravatar.cc/150?img=10',
    name: 'Payal Verma',
    createdAt: '2026-02-15T15:00:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-011',
    profilePhoto: 'https://i.pravatar.cc/150?img=11',
    name: 'Payal Verma',
    createdAt: '2026-02-15T15:30:00.000Z',
  },
  {
    id: 'c1a1e8b0-1a01-4c21-a001-012',
    profilePhoto: 'https://i.pravatar.cc/150?img=12',
    name: 'Payal Verma',
    createdAt: '2026-02-15T16:00:00.000Z',
  },
];

export const applicantProfile = {
  id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  firstName: 'Rahul',
  lastName: 'Verma',
  profilePhoto: 'https://i.pravatar.cc/150?img=12',
  headline:
    'Creative UI/UX Designer with 2+ years of experience in creating user-centered digital experiences',
  educations: [
    {
      institution: 'Stanford University',
      degree: 'MBA',
      startYear: '2014',
      endYear: '2016',
    },
    {
      institution: 'St Xavier',
      degree: '12th',
      startYear: '2014',
      endYear: '2016',
    },
  ],
  workExperience: [
    {
      company: 'Tech Innovators Inc.',
      position: 'UI/UX Designer',
      startDate: '2020',
      endDate: 'Present',
      isCurrent: true,
    },
  ],
  skills: ['Product Strategy', 'Market Research', 'Agile Development', 'Team Leadership'],
  resumeUrl: 'https://example.com/resumes/Payalresume.pdf',
};

export const shortlistedProfiles = [
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.pending,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.pending,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.rejected,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.pending,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.rejected,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.pending,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.rejected,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.pending,
  },
  {
    name: 'Kajal Sharma',
    role: 'Senior Product Designer',
    company: 'Websenor Private Limited',
    salary: 'Up to ₹30 LPA',
    experience: '2+ Years Experience',
    status: VideoResumeStatus.rejected,
  },
];

export const plansData = [
  {
    id: '1',
    name: 'Basic',
    price: 0,
    priceLabel: 'Free',
    isCurrentPlan: true,
    features: ['1 job posting', 'Basic analytics', 'Community support'],
  },
  {
    id: '2',
    name: 'Standard',
    price: 29,
    priceLabel: '29',
    isMostPopular: true,
    features: ['5 job postings', 'Advanced analytics', 'Priority support', 'Featured job listings'],
  },
  {
    id: '3',
    name: 'Premium',
    price: 99,
    priceLabel: '99',
    isMostPopular: false,
    features: [
      'Unlimited job postings',
      'Full analytics suite',
      '24/7 support',
      'Exclusive job listing placement',
    ],
  },
];
