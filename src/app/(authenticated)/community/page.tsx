"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ArrowLeft, MessageSquare, Heart, Pin, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  upvotes: number;
}

interface Post {
  id: string;
  title: string;
  content: string;
  category: CategoryKey;
  tags: string[];
  author: string;
  createdAt: string;
  upvotes: number;
  upvotedByUser: boolean;
  pinned: boolean;
  comments: Comment[];
}

type CategoryKey =
  | "daily-life"
  | "therapy"
  | "school"
  | "sensory"
  | "transitions"
  | "celebrations";

type SortMode = "recent" | "popular";

// ── Category Config ─────────────────────────────────────────────────────

const CATEGORIES: Record<
  CategoryKey,
  { icon: string; label: string; description: string; color: string; bgColor: string; borderColor: string }
> = {
  "daily-life": {
    icon: "💡",
    label: "Daily Life Tips",
    description: "Practical strategies for meals, pills, routines...",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  therapy: {
    icon: "🧑‍⚕️",
    label: "Therapy & Services",
    description: "Finding providers, therapy experiences...",
    color: "text-teal-700",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
  },
  school: {
    icon: "🏫",
    label: "School & IEP",
    description: "School accommodations, IEP meetings...",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  sensory: {
    icon: "🎧",
    label: "Sensory & Regulation",
    description: "Sensory tools, meltdown strategies...",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  transitions: {
    icon: "🔄",
    label: "Transitions",
    description: "Life transitions, aging out, new stages...",
    color: "text-rose-700",
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
  },
  celebrations: {
    icon: "🎉",
    label: "Celebrations",
    description: "Wins, milestones, positive moments...",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
};

const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

// ── Helpers ─────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

// ── Seed Data ───────────────────────────────────────────────────────────

function createSeedPosts(): Post[] {
  const now = Date.now();
  const day = 86400000;

  return [
    {
      id: "seed-1",
      title: "IEP meeting tips for first-timers \u2014 everything I wish I knew",
      content: `After going through three IEP meetings now, here's what I wish someone had told me before the first one:\n\n1. **Bring your own notes.** Don't rely on the school's agenda. Write down every concern, every goal you want discussed, and every question.\n\n2. **You can bring someone with you.** A friend, advocate, or even your child's therapist. Having another set of ears is invaluable.\n\n3. **Record the meeting** (with permission). You'll forget half of what was said otherwise.\n\n4. **Don't sign anything on the spot.** You have the right to take the IEP home, review it, and come back with questions.\n\n5. **Use "I" statements.** Instead of "you're not providing enough support," try "I've noticed my child needs more support in..." It keeps things collaborative.\n\n6. **Ask for everything in writing.** Verbal promises don't count.\n\nThe first meeting is always the hardest. It gets easier, I promise. You know your child best \u2014 don't let anyone make you feel otherwise.`,
      category: "school",
      tags: ["IEP", "first-time", "advocacy"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 90 * day).toISOString(),
      upvotes: 89,
      upvotedByUser: false,
      pinned: true,
      comments: [
        {
          id: "c1-1",
          author: "Anonymous Parent",
          content: "This is gold. I wish I had this list before our first meeting. The 'don't sign on the spot' advice alone would have saved us months of frustration.",
          createdAt: new Date(now - 89 * day).toISOString(),
          upvotes: 12,
        },
        {
          id: "c1-2",
          author: "Anonymous Parent",
          content: "I'd add: bring snacks and water. These meetings can run 2+ hours and you need to stay sharp. Also, ask for a copy of the draft IEP before the meeting if possible.",
          createdAt: new Date(now - 88 * day).toISOString(),
          upvotes: 8,
        },
        {
          id: "c1-3",
          author: "Anonymous Parent",
          content: "Recording the meeting was a game-changer for us. My husband couldn't attend and being able to share the recording helped us make decisions together.",
          createdAt: new Date(now - 85 * day).toISOString(),
          upvotes: 15,
        },
        {
          id: "c1-4",
          author: "Anonymous Parent",
          content: "One more tip: request a 'parent concerns' section be added to the IEP. It becomes part of the legal document and they have to address your concerns.",
          createdAt: new Date(now - 80 * day).toISOString(),
          upvotes: 21,
        },
      ],
    },
    {
      id: "seed-2",
      title: "Getting my child to swallow pills \u2014 what finally worked for us",
      content: `We struggled with pill-swallowing for over a year. Our son (7, ASD) would gag, spit out, or refuse entirely. Here's the progression that finally worked:\n\n**Phase 1: Tiny candy sprinkles.** We started with the smallest sprinkles we could find. Just practice swallowing them with water. No pressure, no medication involved. We did this for 2 weeks.\n\n**Phase 2: Mini M&Ms.** Slightly bigger. Same routine. Practiced at dinner time when he was relaxed.\n\n**Phase 3: Tic Tacs.** These are pill-shaped, which helped bridge the gap. He could also taste them, which made it feel like a treat.\n\n**Phase 4: Actual medication.** We started with his smallest pill and used the same routine. Sip of water, pill on tongue, big gulp.\n\n**Key things that helped:**\n- Never forcing it. If he said no, we stopped.\n- Making it a "skill" he was learning, not a chore\n- Celebrating every success (high fives, sticker chart)\n- Consistent time of day\n- Using a straw to drink (something about the suction helped)\n\nIt took about 6 weeks total. Now he takes his pills like a champ.`,
      category: "daily-life",
      tags: ["medication", "tips", "routine"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 45 * day).toISOString(),
      upvotes: 47,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c2-1",
          author: "Anonymous Parent",
          content: "The sprinkles idea is genius! We've been crushing pills into applesauce but he's starting to notice the taste. Going to try this progression.",
          createdAt: new Date(now - 44 * day).toISOString(),
          upvotes: 6,
        },
        {
          id: "c2-2",
          author: "Anonymous Parent",
          content: "Thank you for sharing! Our OT also recommended practicing with cake decorating pearls \u2014 they dissolve quickly if they get stuck, which reduces anxiety.",
          createdAt: new Date(now - 42 * day).toISOString(),
          upvotes: 9,
        },
      ],
    },
    {
      id: "seed-3",
      title: "Our OT journey \u2014 6 months in and here's what changed",
      content: `When we started OT, I honestly didn't know what to expect. Our daughter (5, ASD + SPD) was having meltdowns 4-5 times a day, couldn't tolerate certain textures, and getting dressed was a 45-minute battle.\n\n**6 months later:**\n- Meltdowns are down to maybe 1-2 per day, and they're shorter\n- She can wear jeans now (!!!) \u2014 this was unthinkable before\n- She's started tolerating hair brushing with a specific brush our OT recommended\n- Her body awareness has improved dramatically \u2014 fewer bumps and crashes\n- She can sit through a meal without falling off her chair\n\n**What our OT focuses on:**\n- Sensory diet (specific activities throughout the day)\n- Heavy work before transitions\n- Brushing protocol (Wilbarger)\n- Interoception activities\n- Zone of regulation concepts adapted for her level\n\n**What I wish I knew earlier:**\n- Progress is slow but real. The first 2 months I thought nothing was working.\n- A good OT will teach YOU how to support your child at home. It's not just about the 1-hour session.\n- Insurance coverage varies wildly. Fight for it.\n\nHappy to answer questions if anyone is considering OT or just starting out.`,
      category: "therapy",
      tags: ["OT", "sensory", "progress"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 30 * day).toISOString(),
      upvotes: 35,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c3-1",
          author: "Anonymous Parent",
          content: "This gives me so much hope. We're 2 months in and I was starting to wonder if it's worth the drive and cost. Thank you for sharing your timeline.",
          createdAt: new Date(now - 29 * day).toISOString(),
          upvotes: 5,
        },
        {
          id: "c3-2",
          author: "Anonymous Parent",
          content: "Can you share more about the sensory diet? Our OT gave us one but I'm struggling to fit it into our daily routine.",
          createdAt: new Date(now - 28 * day).toISOString(),
          upvotes: 3,
        },
        {
          id: "c3-3",
          author: "Anonymous Parent",
          content: "The jeans victory is HUGE. We celebrated when our son wore a new shirt without cutting out the tag first. These wins matter so much.",
          createdAt: new Date(now - 25 * day).toISOString(),
          upvotes: 11,
        },
      ],
    },
    {
      id: "seed-4",
      title: "Sensory-friendly birthday party ideas that actually worked",
      content: `My daughter turned 6 last month and for the first time, she actually ENJOYED her birthday party. Here's what we did differently:\n\n**Environment:**\n- Held it at home (familiar space = less anxiety)\n- Kept the guest list to 6 kids (smaller group, manageable noise)\n- Set up a "quiet room" with noise-canceling headphones, weighted blanket, and dim lighting\n- No balloons (popping = meltdown trigger)\n- Used battery-operated candles on the cake\n\n**Activities:**\n- Structured schedule posted on the wall with pictures\n- Sensory bins (kinetic sand, water beads) instead of chaotic party games\n- Individual art stations instead of group activities\n- Optional participation for everything\n\n**Food:**\n- "Build your own" stations (pizza, sundae) so each kid controls what touches their food\n- Her safe foods available alongside party food\n- Paper plates and cups she picked out herself\n\n**What worked best:**\n- Sending a visual schedule to all parents beforehand\n- Having a designated "break buddy" (my sister) who could take her to the quiet room if needed\n- Ending the party after 2 hours (short and sweet)\n\nShe said it was "the best day ever" and I cried happy tears.`,
      category: "sensory",
      tags: ["birthday", "sensory-friendly", "party"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 20 * day).toISOString(),
      upvotes: 52,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c4-1",
          author: "Anonymous Parent",
          content: "The 'no balloons' tip is so important. We learned this the hard way at a family gathering. Battery candles are brilliant too.",
          createdAt: new Date(now - 19 * day).toISOString(),
          upvotes: 7,
        },
        {
          id: "c4-2",
          author: "Anonymous Parent",
          content: "I'm saving this entire post. My son's birthday is next month and I've been dreading it. The 'build your own' food station idea is perfect for picky eaters.",
          createdAt: new Date(now - 18 * day).toISOString(),
          upvotes: 4,
        },
        {
          id: "c4-3",
          author: "Anonymous Parent",
          content: "The quiet room idea is wonderful. We did something similar \u2014 set up a tent with fairy lights as the 'recharge station.' All the kids ended up wanting to use it!",
          createdAt: new Date(now - 15 * day).toISOString(),
          upvotes: 13,
        },
      ],
    },
    {
      id: "seed-5",
      title: "My son just said his first full sentence at age 5",
      content: `I'm sitting here crying as I type this. My son, who was diagnosed at 2.5 and has been mostly non-verbal, just looked at me during dinner and said: "Mommy, I want more chicken please."\n\nA full sentence. Subject, verb, object, AND a polite word.\n\nWe've been doing speech therapy twice a week for 2.5 years. We use AAC (his tablet) daily. There were so many times I wondered if he'd ever speak verbally.\n\nHis speech therapist told us early on: "Communication is the goal, not necessarily speech." And I held onto that. We celebrated every sign, every picture exchange, every tablet request.\n\nBut hearing his voice string those words together... I can't describe the feeling.\n\nTo every parent waiting for that moment \u2014 whether it comes through speech, signs, AAC, or any other way \u2014 your child IS communicating. And you are doing an amazing job supporting them.\n\nI just needed to share this with people who truly understand.`,
      category: "celebrations",
      tags: ["speech", "milestone", "non-verbal"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 14 * day).toISOString(),
      upvotes: 128,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c5-1",
          author: "Anonymous Parent",
          content: "I'm crying reading this. Our daughter is 4 and mostly uses her AAC device. Posts like these give me so much hope. Congratulations to your son and to you for never giving up.",
          createdAt: new Date(now - 13 * day).toISOString(),
          upvotes: 18,
        },
        {
          id: "c5-2",
          author: "Anonymous Parent",
          content: "\"Communication is the goal, not necessarily speech\" \u2014 this is so important. Thank you for sharing this reminder along with your beautiful news.",
          createdAt: new Date(now - 12 * day).toISOString(),
          upvotes: 24,
        },
        {
          id: "c5-3",
          author: "Anonymous Parent",
          content: "MORE CHICKEN PLEASE! What a perfect first sentence. That boy knows what he wants! So happy for your family.",
          createdAt: new Date(now - 10 * day).toISOString(),
          upvotes: 32,
        },
      ],
    },
    {
      id: "seed-6",
      title: "Transitioning from ABA to school \u2014 what to expect",
      content: `Our son did intensive ABA (30 hours/week) from ages 3-5 and just transitioned to full-day kindergarten. Here's what the transition looked like for us:\n\n**3 months before school started:**\n- Met with the school team (teacher, resource teacher, principal)\n- Shared his behavior support plan from ABA\n- Arranged a series of school visits during quiet hours\n- Created a social story about his new school\n\n**1 month before:**\n- Practiced the morning routine (getting dressed, bus simulation)\n- Visited the actual classroom, met his EA\n- Set up a communication book between home and school\n\n**First month of school:**\n- Started with half days for 2 weeks\n- His BCBA consulted with the school team (this was invaluable)\n- We had weekly check-ins with his teacher\n\n**Challenges we didn't expect:**\n- The noise level in the cafeteria was overwhelming\n- Less 1:1 attention than ABA (obviously, but the adjustment was hard)\n- Different behavior expectations than the ABA center\n- Making friends was harder than anticipated\n\n**What helped:**\n- The EA was open to learning from his ABA team\n- We kept some ABA hours after school for the first semester\n- Visual schedule in the classroom\n- A designated quiet space he could request\n\nHe's now in Grade 1 and thriving. The transition was rough but absolutely the right call.`,
      category: "transitions",
      tags: ["ABA", "school", "kindergarten"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 10 * day).toISOString(),
      upvotes: 29,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c6-1",
          author: "Anonymous Parent",
          content: "We're about to start this exact transition. The timeline you laid out is so helpful. Did your ABA center help coordinate with the school?",
          createdAt: new Date(now - 9 * day).toISOString(),
          upvotes: 4,
        },
        {
          id: "c6-2",
          author: "Anonymous Parent",
          content: "The BCBA consulting with the school team is key. Our center offered this as part of the transition plan. If yours doesn't, ask \u2014 many will do it.",
          createdAt: new Date(now - 8 * day).toISOString(),
          upvotes: 6,
        },
      ],
    },
    {
      id: "seed-7",
      title: "Weighted blanket vs compression vest \u2014 our experience with both",
      content: `We've tried both weighted blankets and compression vests for our son (8, ASD + ADHD) and here's our honest comparison:\n\n**Weighted Blanket (15% of body weight):**\n- Great for: Bedtime, calm-down time, TV time\n- Helped with: Falling asleep faster (went from 45min to ~15min), reducing nighttime waking\n- Downsides: Can't use it everywhere, gets hot in summer, needs to be washed carefully\n- Our pick: The Bearaby knitted one (breathable, machine washable)\n\n**Compression Vest:**\n- Great for: School, outings, transitions, grocery store trips\n- Helped with: Focus during seated work, reducing stimming in overwhelming environments, body awareness\n- Downsides: He outgrew it quickly (sizing is tricky), some days he refuses to wear it\n- Our pick: SPIO vest (recommended by our OT)\n\n**Our takeaway:**\nThey serve different purposes. The weighted blanket is our nighttime hero. The compression vest is our "out in the world" tool. We use both.\n\n**Tips:**\n- Always consult your OT for the right weight/compression level\n- Let your child try before you buy (our OT had samples)\n- Some kids prefer deep pressure from a bear hug or being rolled in a blanket \u2014 start there before investing\n- Watch for signs they've had enough (pulling at it, skin redness)\n\nHappy to answer specific questions about either one.`,
      category: "sensory",
      tags: ["weighted-blanket", "compression", "sensory-tools"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 7 * day).toISOString(),
      upvotes: 41,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c7-1",
          author: "Anonymous Parent",
          content: "This is the comparison I've been looking for! Our OT recommended a weighted blanket but I was wondering about compression vests for school. Sounds like we need both!",
          createdAt: new Date(now - 6 * day).toISOString(),
          upvotes: 5,
        },
        {
          id: "c7-2",
          author: "Anonymous Parent",
          content: "The Bearaby knitted blanket is amazing. So much better than the ones with beads. And +1 on the SPIO vest \u2014 it's the only one our daughter will tolerate.",
          createdAt: new Date(now - 5 * day).toISOString(),
          upvotes: 7,
        },
      ],
    },
    {
      id: "seed-8",
      title: "How I organized all our documents for the IEP review",
      content: `After fumbling through our first IEP review with papers everywhere, I created a system that has made every meeting since so much smoother:\n\n**The Binder System:**\nI use a 2-inch binder with the following tabs:\n\n1. **Current IEP** \u2014 the active IEP with my highlighted notes\n2. **Progress Reports** \u2014 all report cards and progress updates from this year\n3. **Assessments** \u2014 psychological, speech, OT assessments (most recent first)\n4. **Communication Log** \u2014 printouts of important emails with the school\n5. **My Notes** \u2014 dated observations of my child at home\n6. **Medical** \u2014 relevant medical reports, medication changes\n7. **Rights & Resources** \u2014 parent rights handbook, relevant policy documents\n\n**Digital backup:**\n- I scan everything into Google Drive with the same folder structure\n- I created a shared folder with our advocate\n- Photos of my child's work that show progress go in a "portfolio" folder\n\n**Before each meeting:**\n- I review the current IEP goals and note which ones are met/not met\n- I prepare a one-page summary of my concerns and requests\n- I share this with the school 3 days before the meeting\n\nThis might seem like overkill, but when the school says "we don't have that assessment on file" and you can pull it out immediately... it's worth every minute of organization.\n\nThe Companion app has been great for tracking some of this too \u2014 the document section is really helpful.`,
      category: "school",
      tags: ["documents", "organization", "IEP"],
      author: "Anonymous Parent",
      createdAt: new Date(now - 3 * day).toISOString(),
      upvotes: 33,
      upvotedByUser: false,
      pinned: false,
      comments: [
        {
          id: "c8-1",
          author: "Anonymous Parent",
          content: "This is exactly what I needed. I've been keeping everything in a messy folder and it's so stressful before meetings. Ordering a binder today!",
          createdAt: new Date(now - 2 * day).toISOString(),
          upvotes: 3,
        },
        {
          id: "c8-2",
          author: "Anonymous Parent",
          content: "The 'share concerns 3 days before' tip is smart. It gives the team time to prepare answers instead of being caught off guard, which makes the meeting more productive for everyone.",
          createdAt: new Date(now - 1 * day).toISOString(),
          upvotes: 8,
        },
      ],
    },
  ];
}

// ── localStorage helpers ────────────────────────────────────────────────

const STORAGE_KEY = "companion-community-posts";

function loadPosts(): Post[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  const seed = createSeedPosts();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function savePosts(posts: Post[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// ── Category Card ───────────────────────────────────────────────────────

function CategoryCard({
  categoryKey,
  isActive,
  onClick,
  postCount,
}: {
  categoryKey: CategoryKey;
  isActive: boolean;
  onClick: () => void;
  postCount: number;
}) {
  const cat = CATEGORIES[categoryKey];
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-xl border p-3 transition-all",
        "hover:shadow-sm hover:-translate-y-0.5",
        isActive
          ? `${cat.bgColor} ${cat.borderColor} ring-1 ring-offset-1 ${cat.borderColor.replace("border-", "ring-")}`
          : "bg-card border-border hover:border-warm-300"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base" aria-hidden="true">
          {cat.icon}
        </span>
        <span className={cn("text-xs font-semibold", isActive ? cat.color : "text-foreground")}>
          {cat.label}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
        {cat.description}
      </p>
      <p className="text-[10px] text-warm-300 mt-1.5">{postCount} post{postCount !== 1 ? "s" : ""}</p>
    </button>
  );
}

// ── Category Badge ──────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: CategoryKey }) {
  const cat = CATEGORIES[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        cat.bgColor,
        cat.color
      )}
    >
      <span aria-hidden="true">{cat.icon}</span>
      {cat.label}
    </span>
  );
}

// ── Post Card ───────────────────────────────────────────────────────────

function PostCard({
  post,
  onSelect,
  onUpvote,
}: {
  post: Post;
  onSelect: () => void;
  onUpvote: (e: React.MouseEvent) => void;
}) {
  const preview =
    post.content.length > 140
      ? post.content.replace(/\*\*/g, "").replace(/\n/g, " ").slice(0, 140) + "..."
      : post.content.replace(/\*\*/g, "").replace(/\n/g, " ");

  return (
    <div
      onClick={onSelect}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex gap-3">
        {/* Upvote column */}
        <div className="flex flex-col items-center shrink-0 pt-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUpvote(e);
            }}
            className={cn(
              "p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg transition-colors",
              post.upvotedByUser
                ? "text-status-blocked bg-status-blocked/10"
                : "text-warm-300 hover:text-status-blocked hover:bg-status-blocked/5"
            )}
            aria-label={post.upvotedByUser ? "Remove upvote" : "Upvote"}
          >
            <Heart
              className="h-4 w-4"
              fill={post.upvotedByUser ? "currentColor" : "none"}
            />
          </button>
          <span
            className={cn(
              "text-xs font-semibold tabular-nums",
              post.upvotedByUser ? "text-status-blocked" : "text-warm-400"
            )}
          >
            {post.upvotes}
          </span>
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.pinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-warm-400">
                <Pin className="h-2.5 w-2.5" />
                Pinned
              </span>
            )}
            <CategoryBadge category={post.category} />
          </div>

          <h3 className="text-sm font-semibold text-foreground leading-snug mb-1 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {preview}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-warm-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>{post.author}</span>
            <span className="text-warm-200">&middot;</span>
            <span>{timeAgo(post.createdAt)}</span>
            <span className="text-warm-200">&middot;</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Post Form ────────────────────────────────────────────────────

function CreatePostForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (post: Omit<Post, "id" | "createdAt" | "upvotes" | "upvotedByUser" | "pinned" | "comments">) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryKey>("daily-life");
  const [content, setContent] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [anonymous, setAnonymous] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      tags,
      author: anonymous ? "Anonymous Parent" : "You",
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-base font-semibold text-foreground">
          Create a Post
        </h2>
        <button
          onClick={onCancel}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-warm-100 transition-colors text-warm-400"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label
            htmlFor="post-title"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Title
          </label>
          <input
            id="post-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What would you like to share?"
            className="w-full h-10 rounded-lg border border-input bg-warm-50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="post-category"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Category
          </label>
          <select
            id="post-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryKey)}
            className="w-full h-10 rounded-lg border border-input bg-warm-50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {CATEGORIES[key].icon} {CATEGORIES[key].label}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div>
          <label
            htmlFor="post-content"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Content
          </label>
          <textarea
            id="post-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience, tips, or question..."
            rows={6}
            className="w-full rounded-lg border border-input bg-warm-50 px-3 py-2.5 text-sm outline-none resize-y focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Tags */}
        <div>
          <label
            htmlFor="post-tags"
            className="block text-xs font-medium text-warm-400 mb-1"
          >
            Tags (comma separated)
          </label>
          <input
            id="post-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g., IEP, sensory, tips"
            className="w-full h-10 rounded-lg border border-input bg-warm-50 px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        {/* Anonymous checkbox */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 rounded border-warm-300 text-primary focus:ring-primary accent-primary"
          />
          <span className="text-sm text-foreground">Post anonymously</span>
          <span className="text-[11px] text-warm-300">(recommended)</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 px-4 rounded-lg text-sm font-medium text-warm-400 hover:bg-warm-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !content.trim()}
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Single Post View ────────────────────────────────────────────────────

function SinglePostView({
  post,
  onBack,
  onUpvotePost,
  onUpvoteComment,
  onAddComment,
}: {
  post: Post;
  onBack: () => void;
  onUpvotePost: () => void;
  onUpvoteComment: (commentId: string) => void;
  onAddComment: (content: string) => void;
}) {
  const [commentInput, setCommentInput] = useState("");

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(commentInput.trim());
    setCommentInput("");
  };

  // Render content with basic markdown bold support
  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (!line.trim()) return <br key={i} />;

      // Bold text
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={j} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={j}>{part}</span>;
      });

      // List items
      if (line.trimStart().startsWith("- ")) {
        return (
          <li key={i} className="ml-4 text-sm text-foreground leading-relaxed list-disc">
            {rendered}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line.trimStart())) {
        return (
          <li key={i} className="ml-4 text-sm text-foreground leading-relaxed list-decimal">
            {rendered}
          </li>
        );
      }

      return (
        <p key={i} className="text-sm text-foreground leading-relaxed">
          {rendered}
        </p>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-warm-400 hover:text-foreground transition-colors p-2 -ml-2 min-h-[44px] rounded-lg hover:bg-warm-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to posts
      </button>

      {/* Post */}
      <article className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.pinned && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warm-100 text-warm-400">
              <Pin className="h-2.5 w-2.5" />
              Pinned
            </span>
          )}
          <CategoryBadge category={post.category} />
        </div>

        <h2 className="font-heading text-lg font-bold text-foreground leading-snug mb-3">
          {post.title}
        </h2>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
          <span>{post.author}</span>
          <span className="text-warm-200">&middot;</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-warm-100 text-warm-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="space-y-1.5 mb-5">{renderContent(post.content)}</div>

        {/* Upvote */}
        <div className="flex items-center gap-3 pt-3 border-t border-border">
          <button
            onClick={onUpvotePost}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors",
              post.upvotedByUser
                ? "text-status-blocked bg-status-blocked/10"
                : "text-warm-400 hover:text-status-blocked hover:bg-status-blocked/5"
            )}
          >
            <Heart
              className="h-4 w-4"
              fill={post.upvotedByUser ? "currentColor" : "none"}
            />
            {post.upvotes}
          </button>
          <span className="text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
            {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </article>

      {/* Comments */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-4">
          Comments ({post.comments.length})
        </h3>

        {post.comments.length > 0 ? (
          <div className="space-y-4">
            {post.comments.map((comment) => (
              <div
                key={comment.id}
                className="border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {comment.author}
                    </span>
                    <span className="text-warm-200">&middot;</span>
                    <span>{timeAgo(comment.createdAt)}</span>
                  </div>
                  <button
                    onClick={() => onUpvoteComment(comment.id)}
                    className="inline-flex items-center gap-1 text-[11px] text-warm-300 hover:text-status-blocked transition-colors p-1"
                    aria-label="Upvote comment"
                  >
                    <Heart className="h-3 w-3" />
                    {comment.upvotes}
                  </button>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts.
          </p>
        )}

        {/* Add comment */}
        <form
          onSubmit={handleSubmitComment}
          className="mt-4 pt-4 border-t border-border"
        >
          <label
            htmlFor="comment-input"
            className="block text-xs font-medium text-warm-400 mb-1.5"
          >
            Add a comment
          </label>
          <div className="flex gap-2">
            <textarea
              id="comment-input"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Share your thoughts..."
              rows={2}
              className="flex-1 rounded-lg border border-input bg-warm-50 px-3 py-2 text-sm outline-none resize-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              className="self-end h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  // Load from localStorage on mount
  useEffect(() => {
    setPosts(loadPosts());
    setLoaded(true);
  }, []);

  // Persist whenever posts change
  useEffect(() => {
    if (loaded) {
      savePosts(posts);
    }
  }, [posts, loaded]);

  // Category post counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of CATEGORY_KEYS) counts[key] = 0;
    for (const post of posts) counts[post.category]++;
    return counts;
  }, [posts]);

  // Filtered + sorted posts
  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Category filter
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort: pinned always first, then by mode
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortMode === "popular") return b.upvotes - a.upvotes;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [posts, activeCategory, searchQuery, sortMode]);

  // Handlers
  const handleUpvotePost = useCallback((postId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              upvotes: p.upvotedByUser ? p.upvotes - 1 : p.upvotes + 1,
              upvotedByUser: !p.upvotedByUser,
            }
          : p
      )
    );
  }, []);

  const handleUpvoteComment = useCallback(
    (postId: string, commentId: string) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.map((c) =>
                  c.id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c
                ),
              }
            : p
        )
      );
    },
    []
  );

  const handleAddComment = useCallback(
    (postId: string, content: string) => {
      const newComment: Comment = {
        id: generateId(),
        author: "Anonymous Parent",
        content,
        createdAt: new Date().toISOString(),
        upvotes: 0,
      };
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, newComment] }
            : p
        )
      );
    },
    []
  );

  const handleCreatePost = useCallback(
    (
      postData: Omit<
        Post,
        "id" | "createdAt" | "upvotes" | "upvotedByUser" | "pinned" | "comments"
      >
    ) => {
      const newPost: Post = {
        ...postData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        upvotes: 0,
        upvotedByUser: false,
        pinned: false,
        comments: [],
      };
      setPosts((prev) => [newPost, ...prev]);
      setShowCreateForm(false);
    },
    []
  );

  // Selected post
  const selectedPost = selectedPostId
    ? posts.find((p) => p.id === selectedPostId) ?? null
    : null;

  // Don't render until localStorage is loaded
  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            👥
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Community
          </h1>
        </div>
        <div className="bg-card border border-border rounded-xl h-64 flex items-center justify-center">
          <span className="text-sm text-warm-300">Loading...</span>
        </div>
      </div>
    );
  }

  // ── Single Post View ──────────────────────────────────────────────────
  if (selectedPost) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden="true">
            👥
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
            Community
          </h1>
        </div>

        <SinglePostView
          post={selectedPost}
          onBack={() => setSelectedPostId(null)}
          onUpvotePost={() => handleUpvotePost(selectedPost.id)}
          onUpvoteComment={(commentId) =>
            handleUpvoteComment(selectedPost.id, commentId)
          }
          onAddComment={(content) =>
            handleAddComment(selectedPost.id, content)
          }
        />
      </div>
    );
  }

  // ── Post List View ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden="true">
              👥
            </span>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              Community
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Connect with other parents, share experiences, and learn from each
            other
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="shrink-0 h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Create Post</span>
        </button>
      </div>

      {/* Moderation Banner */}
      <div className="bg-warm-50 border border-warm-200 rounded-xl px-4 py-3">
        <p className="text-xs text-warm-400 leading-relaxed">
          <span className="font-semibold text-warm-500">
            🛡️ AI-moderated community.
          </span>{" "}
          Share experiences, not medical advice. Be kind and supportive.
        </p>
      </div>

      {/* Create Post Form */}
      {showCreateForm && (
        <CreatePostForm
          onSubmit={handleCreatePost}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {CATEGORY_KEYS.map((key) => (
          <CategoryCard
            key={key}
            categoryKey={key}
            isActive={activeCategory === key}
            postCount={categoryCounts[key]}
            onClick={() =>
              setActiveCategory(activeCategory === key ? null : key)
            }
          />
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warm-300" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts..."
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-warm-50 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Search posts"
          />
        </div>

        <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden shrink-0">
          <button
            onClick={() => setSortMode("recent")}
            className={cn(
              "px-3 py-2 min-h-[40px] text-xs font-medium transition-colors",
              sortMode === "recent"
                ? "bg-primary/10 text-primary"
                : "text-warm-400 hover:bg-warm-50"
            )}
          >
            Recent
          </button>
          <button
            onClick={() => setSortMode("popular")}
            className={cn(
              "px-3 py-2 min-h-[40px] text-xs font-medium transition-colors",
              sortMode === "popular"
                ? "bg-primary/10 text-primary"
                : "text-warm-400 hover:bg-warm-50"
            )}
          >
            Popular
          </button>
        </div>

        {activeCategory && (
          <button
            onClick={() => setActiveCategory(null)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-warm-400 bg-warm-100 hover:bg-warm-200 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear filter
          </button>
        )}
      </div>

      {/* Post List */}
      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <MessageSquare className="h-10 w-10 text-warm-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              No posts found
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? "Try a different search term"
                : activeCategory
                  ? "No posts in this category yet. Be the first to share!"
                  : "Be the first to start a conversation!"}
            </p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onSelect={() => setSelectedPostId(post.id)}
              onUpvote={() => handleUpvotePost(post.id)}
            />
          ))
        )}
      </div>

      {/* Post count */}
      {filteredPosts.length > 0 && (
        <p className="text-center text-[11px] text-warm-300 pb-4">
          Showing {filteredPosts.length} of {posts.length} post
          {posts.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
