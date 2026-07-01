// GuamJobListings — Job data model & seed data
// NOTE: This is temporary mock data. It will be replaced by Supabase later.
//
// ⚠️ SAMPLE DATA: Every job in JOBS below is placeholder seed data, flagged with
// `isSample: true` and using `*.example.com` contact emails. Per owner decision,
// these must be DELETED (not hidden) as soon as real employer jobs go live.
// To remove them all at once, empty the JOBS array (or filter on `!isSample`).

export type JobCategory =
  | "Hospitality & Hotels"
  | "Food & Beverage"
  | "Water Sports & Tours"
  | "Retail & Shopping"
  | "General & Other";

export type JobType = "Full-time" | "Part-time" | "Contract" | "Seasonal";

export interface Job {
  id: string;
  title: string;
  company: string;
  contactEmail: string; // employer address that applications are sent to
  location: string;
  category: JobCategory;
  jobType: JobType;
  salary: string;
  postedAt: string; // ISO date
  featured: boolean;
  description: string;
  responsibilities: string[];
  requirements: string[];
  isSample?: boolean; // true = placeholder seed data, delete once real jobs go live
}

export const CATEGORIES: JobCategory[] = [
  "Hospitality & Hotels",
  "Food & Beverage",
  "Water Sports & Tours",
  "Retail & Shopping",
  "General & Other",
];

export const JOBS: Job[] = [
  {
    id: "1",
    isSample: true,
    title: "Front Desk Agent",
    company: "Tumon Bay Resort & Spa",
    contactEmail: "hr@tumonbayresort.example.com",
    location: "Tumon, Guam",
    category: "Hospitality & Hotels",
    jobType: "Full-time",
    salary: "$14 - $17 / hour",
    postedAt: "2026-06-26",
    featured: true,
    description:
      "Join our oceanfront resort as a Front Desk Agent and be the welcoming face for guests from around the world. We are looking for friendly, service-oriented team members who love creating memorable stays.",
    responsibilities: [
      "Check guests in and out efficiently and warmly",
      "Answer phone calls and respond to guest inquiries",
      "Coordinate with housekeeping and concierge teams",
      "Handle reservations and billing accurately",
    ],
    requirements: [
      "Excellent English communication skills",
      "Customer service experience preferred",
      "Availability to work weekends and holidays",
      "Positive, professional attitude",
    ],
  },
  {
    id: "2",
    isSample: true,
    title: "Line Cook",
    company: "Marianas Grill House",
    contactEmail: "jobs@marianasgrill.example.com",
    location: "Tamuning, Guam",
    category: "Food & Beverage",
    jobType: "Full-time",
    salary: "$15 - $19 / hour",
    postedAt: "2026-06-25",
    featured: true,
    description:
      "Busy island grill house seeks an experienced Line Cook to prepare high-quality dishes in a fast-paced kitchen. Great team, steady hours, and room to grow.",
    responsibilities: [
      "Prepare menu items to recipe and quality standards",
      "Maintain a clean and organized kitchen station",
      "Follow all food safety and sanitation guidelines",
      "Support prep and inventory as needed",
    ],
    requirements: [
      "1+ year of kitchen experience preferred",
      "Ability to work in a fast-paced environment",
      "Reliable and punctual",
      "Food handler's card a plus",
    ],
  },
  {
    id: "3",
    isSample: true,
    title: "Jet Ski Tour Guide",
    company: "Blue Lagoon Watersports",
    contactEmail: "crew@bluelagoonguam.example.com",
    location: "Piti, Guam",
    category: "Water Sports & Tours",
    jobType: "Seasonal",
    salary: "$13 - $16 / hour + tips",
    postedAt: "2026-06-27",
    featured: true,
    description:
      "Love the ocean? Lead exciting jet ski and banana boat tours for visitors exploring Guam's beautiful waters. Training provided for the right energetic candidate.",
    responsibilities: [
      "Guide guests safely on jet ski and watercraft tours",
      "Conduct safety briefings and equipment checks",
      "Provide a fun, memorable experience for tourists",
      "Maintain and clean watercraft equipment",
    ],
    requirements: [
      "Strong swimmer and comfortable on the water",
      "Friendly, energetic, and safety-conscious",
      "English communication (Japanese a plus)",
      "Must be 18 or older",
    ],
  },
  {
    id: "4",
    isSample: true,
    title: "Housekeeping Attendant",
    company: "Tumon Bay Resort & Spa",
    contactEmail: "hr@tumonbayresort.example.com",
    location: "Tumon, Guam",
    category: "Hospitality & Hotels",
    jobType: "Part-time",
    salary: "$13 - $15 / hour",
    postedAt: "2026-06-24",
    featured: false,
    description:
      "Help us keep our resort spotless and guest-ready. Flexible part-time hours available, perfect for dependable team members.",
    responsibilities: [
      "Clean and prepare guest rooms to resort standards",
      "Restock amenities and linens",
      "Report maintenance issues promptly",
    ],
    requirements: [
      "Attention to detail",
      "Ability to work independently",
      "Reliable and punctual",
    ],
  },
  {
    id: "5",
    isSample: true,
    title: "Server / Waitstaff",
    company: "Marianas Grill House",
    contactEmail: "jobs@marianasgrill.example.com",
    location: "Tamuning, Guam",
    category: "Food & Beverage",
    jobType: "Part-time",
    salary: "$11 / hour + tips",
    postedAt: "2026-06-23",
    featured: false,
    description:
      "Outgoing servers wanted for our popular island restaurant. Great tips and a fun team environment await.",
    responsibilities: [
      "Greet and serve guests with a smile",
      "Take orders and deliver food and drinks",
      "Maintain clean dining areas",
    ],
    requirements: [
      "Friendly and outgoing personality",
      "Customer service experience a plus",
      "Evening and weekend availability",
    ],
  },
  {
    id: "6",
    isSample: true,
    title: "Retail Sales Associate",
    company: "Island Style Boutique",
    contactEmail: "hello@islandstyleguam.example.com",
    location: "Tumon, Guam",
    category: "Retail & Shopping",
    jobType: "Full-time",
    salary: "$12 - $14 / hour",
    postedAt: "2026-06-22",
    featured: false,
    description:
      "Fashion-forward boutique seeks a sales associate who loves helping customers find the perfect island look.",
    responsibilities: [
      "Assist customers and provide styling advice",
      "Operate the point-of-sale system",
      "Keep the store clean and well-stocked",
    ],
    requirements: [
      "Friendly and approachable",
      "Basic math and POS skills",
      "Interest in fashion and retail",
    ],
  },
  {
    id: "7",
    isSample: true,
    title: "Duty Free Sales Associate",
    company: "Micronesia Mall Duty Free",
    contactEmail: "careers@micronesiamall.example.com",
    location: "Dededo, Guam",
    category: "Retail & Shopping",
    jobType: "Full-time",
    salary: "$13 - $15 / hour + commission",
    postedAt: "2026-06-28",
    featured: true,
    description:
      "Our busy duty free store is looking for energetic sales associates to assist international shoppers with cosmetics, fragrance and gift purchases. Bilingual applicants are highly encouraged to apply.",
    responsibilities: [
      "Welcome and assist shoppers on the sales floor",
      "Recommend products and process purchases accurately",
      "Keep displays clean, stocked and attractive",
      "Support seasonal promotions and inventory counts",
    ],
    requirements: [
      "Friendly, outgoing customer-service attitude",
      "English required; Japanese, Korean or Chinese a strong plus",
      "Comfortable standing during shifts",
      "Retail experience preferred but not required",
    ],
  },
  {
    id: "8",
    isSample: true,
    title: "Delivery Driver",
    company: "Island Fresh Logistics",
    contactEmail: "hiring@islandfreshguam.example.com",
    location: "Barrigada, Guam",
    category: "General & Other",
    jobType: "Full-time",
    salary: "$15 - $18 / hour",
    postedAt: "2026-06-29",
    featured: false,
    description:
      "Local delivery company seeks a dependable driver to transport goods to businesses and homes across the island. Steady daytime hours and a friendly team.",
    responsibilities: [
      "Safely deliver packages and goods on scheduled routes",
      "Load and unload the vehicle with care",
      "Confirm deliveries and collect signatures",
      "Keep the vehicle clean and report any issues",
    ],
    requirements: [
      "Valid Guam driver's license with a clean record",
      "Able to lift up to 40 lbs",
      "Punctual, reliable and organized",
      "Familiarity with Guam roads a plus",
    ],
  },
  {
    id: "9",
    isSample: true,
    title: "Guest Services Concierge",
    company: "Tumon Bay Resort & Spa",
    contactEmail: "hr@tumonbayresort.example.com",
    location: "Tumon, Guam",
    category: "Hospitality & Hotels",
    jobType: "Full-time",
    salary: "$15 - $18 / hour",
    postedAt: "2026-06-29",
    featured: false,
    description:
      "Be the go-to problem solver for our resort guests. From booking island tours to restaurant recommendations, you'll help visitors make the most of their stay in Guam.",
    responsibilities: [
      "Assist guests with tours, transport and reservations",
      "Share local knowledge and recommendations",
      "Handle guest requests promptly and courteously",
      "Coordinate with front desk and tour partners",
    ],
    requirements: [
      "Excellent English communication; a second language a plus",
      "Warm, proactive and detail-oriented",
      "Prior hospitality experience preferred",
      "Flexible availability including weekends",
    ],
  },
];

export function getJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}

export function getFeaturedJobs(): Job[] {
  return JOBS.filter((j) => j.featured);
}
