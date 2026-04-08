import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Seed Data ────────────────────────────────────────────────────────────

function createSeedPosts() {
  const now = Date.now();
  const day = 86400000;

  return [
    {
      title: "IEP meeting tips for first-timers \u2014 everything I wish I knew",
      content: `After going through three IEP meetings now, here's what I wish someone had told me before the first one:\n\n1. **Bring your own notes.** Don't rely on the school's agenda. Write down every concern, every goal you want discussed, and every question.\n\n2. **You can bring someone with you.** A friend, advocate, or even your child's therapist. Having another set of ears is invaluable.\n\n3. **Record the meeting** (with permission). You'll forget half of what was said otherwise.\n\n4. **Don't sign anything on the spot.** You have the right to take the IEP home, review it, and come back with questions.\n\n5. **Use "I" statements.** Instead of "you're not providing enough support," try "I've noticed my child needs more support in..." It keeps things collaborative.\n\n6. **Ask for everything in writing.** Verbal promises don't count.\n\nThe first meeting is always the hardest. It gets easier, I promise. You know your child best \u2014 don't let anyone make you feel otherwise.`,
      category: "school",
      tags: ["IEP", "first-time", "advocacy"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 89,
      pinned: true,
      created_at: new Date(now - 90 * day).toISOString(),
      comments: [
        {
          content: "This is gold. I wish I had this list before our first meeting. The 'don't sign on the spot' advice alone would have saved us months of frustration.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 12,
          created_at: new Date(now - 89 * day).toISOString(),
        },
        {
          content: "I'd add: bring snacks and water. These meetings can run 2+ hours and you need to stay sharp. Also, ask for a copy of the draft IEP before the meeting if possible.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 8,
          created_at: new Date(now - 88 * day).toISOString(),
        },
        {
          content: "Recording the meeting was a game-changer for us. My husband couldn't attend and being able to share the recording helped us make decisions together.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 15,
          created_at: new Date(now - 85 * day).toISOString(),
        },
        {
          content: "One more tip: request a 'parent concerns' section be added to the IEP. It becomes part of the legal document and they have to address your concerns.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 21,
          created_at: new Date(now - 80 * day).toISOString(),
        },
      ],
    },
    {
      title: "Getting my child to swallow pills \u2014 what finally worked for us",
      content: `We struggled with pill-swallowing for over a year. Our son (7, ASD) would gag, spit out, or refuse entirely. Here's the progression that finally worked:\n\n**Phase 1: Tiny candy sprinkles.** We started with the smallest sprinkles we could find. Just practice swallowing them with water. No pressure, no medication involved. We did this for 2 weeks.\n\n**Phase 2: Mini M&Ms.** Slightly bigger. Same routine. Practiced at dinner time when he was relaxed.\n\n**Phase 3: Tic Tacs.** These are pill-shaped, which helped bridge the gap. He could also taste them, which made it feel like a treat.\n\n**Phase 4: Actual medication.** We started with his smallest pill and used the same routine. Sip of water, pill on tongue, big gulp.\n\n**Key things that helped:**\n- Never forcing it. If he said no, we stopped.\n- Making it a "skill" he was learning, not a chore\n- Celebrating every success (high fives, sticker chart)\n- Consistent time of day\n- Using a straw to drink (something about the suction helped)\n\nIt took about 6 weeks total. Now he takes his pills like a champ.`,
      category: "daily-life",
      tags: ["medication", "tips", "routine"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 47,
      pinned: false,
      created_at: new Date(now - 45 * day).toISOString(),
      comments: [
        {
          content: "The sprinkles idea is genius! We've been crushing pills into applesauce but he's starting to notice the taste. Going to try this progression.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 6,
          created_at: new Date(now - 44 * day).toISOString(),
        },
        {
          content: "Thank you for sharing! Our OT also recommended practicing with cake decorating pearls \u2014 they dissolve quickly if they get stuck, which reduces anxiety.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 9,
          created_at: new Date(now - 42 * day).toISOString(),
        },
      ],
    },
    {
      title: "Our OT journey \u2014 6 months in and here's what changed",
      content: `When we started OT, I honestly didn't know what to expect. Our daughter (5, ASD + SPD) was having meltdowns 4-5 times a day, couldn't tolerate certain textures, and getting dressed was a 45-minute battle.\n\n**6 months later:**\n- Meltdowns are down to maybe 1-2 per day, and they're shorter\n- She can wear jeans now (!!!) \u2014 this was unthinkable before\n- She's started tolerating hair brushing with a specific brush our OT recommended\n- Her body awareness has improved dramatically \u2014 fewer bumps and crashes\n- She can sit through a meal without falling off her chair\n\n**What our OT focuses on:**\n- Sensory diet (specific activities throughout the day)\n- Heavy work before transitions\n- Brushing protocol (Wilbarger)\n- Interoception activities\n- Zone of regulation concepts adapted for her level\n\n**What I wish I knew earlier:**\n- Progress is slow but real. The first 2 months I thought nothing was working.\n- A good OT will teach YOU how to support your child at home. It's not just about the 1-hour session.\n- Insurance coverage varies wildly. Fight for it.\n\nHappy to answer questions if anyone is considering OT or just starting out.`,
      category: "therapy",
      tags: ["OT", "sensory", "progress"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 35,
      pinned: false,
      created_at: new Date(now - 30 * day).toISOString(),
      comments: [
        {
          content: "This gives me so much hope. We're 2 months in and I was starting to wonder if it's worth the drive and cost. Thank you for sharing your timeline.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 5,
          created_at: new Date(now - 29 * day).toISOString(),
        },
        {
          content: "Can you share more about the sensory diet? Our OT gave us one but I'm struggling to fit it into our daily routine.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 3,
          created_at: new Date(now - 28 * day).toISOString(),
        },
        {
          content: "The jeans victory is HUGE. We celebrated when our son wore a new shirt without cutting out the tag first. These wins matter so much.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 11,
          created_at: new Date(now - 25 * day).toISOString(),
        },
      ],
    },
    {
      title: "Sensory-friendly birthday party ideas that actually worked",
      content: `My daughter turned 6 last month and for the first time, she actually ENJOYED her birthday party. Here's what we did differently:\n\n**Environment:**\n- Held it at home (familiar space = less anxiety)\n- Kept the guest list to 6 kids (smaller group, manageable noise)\n- Set up a "quiet room" with noise-canceling headphones, weighted blanket, and dim lighting\n- No balloons (popping = meltdown trigger)\n- Used battery-operated candles on the cake\n\n**Activities:**\n- Structured schedule posted on the wall with pictures\n- Sensory bins (kinetic sand, water beads) instead of chaotic party games\n- Individual art stations instead of group activities\n- Optional participation for everything\n\n**Food:**\n- "Build your own" stations (pizza, sundae) so each kid controls what touches their food\n- Her safe foods available alongside party food\n- Paper plates and cups she picked out herself\n\n**What worked best:**\n- Sending a visual schedule to all parents beforehand\n- Having a designated "break buddy" (my sister) who could take her to the quiet room if needed\n- Ending the party after 2 hours (short and sweet)\n\nShe said it was "the best day ever" and I cried happy tears.`,
      category: "sensory",
      tags: ["birthday", "sensory-friendly", "party"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 52,
      pinned: false,
      created_at: new Date(now - 20 * day).toISOString(),
      comments: [
        {
          content: "The 'no balloons' tip is so important. We learned this the hard way at a family gathering. Battery candles are brilliant too.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 7,
          created_at: new Date(now - 19 * day).toISOString(),
        },
        {
          content: "I'm saving this entire post. My son's birthday is next month and I've been dreading it. The 'build your own' food station idea is perfect for picky eaters.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 4,
          created_at: new Date(now - 18 * day).toISOString(),
        },
        {
          content: "The quiet room idea is wonderful. We did something similar \u2014 set up a tent with fairy lights as the 'recharge station.' All the kids ended up wanting to use it!",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 13,
          created_at: new Date(now - 15 * day).toISOString(),
        },
      ],
    },
    {
      title: "My son just said his first full sentence at age 5",
      content: `I'm sitting here crying as I type this. My son, who was diagnosed at 2.5 and has been mostly non-verbal, just looked at me during dinner and said: "Mommy, I want more chicken please."\n\nA full sentence. Subject, verb, object, AND a polite word.\n\nWe've been doing speech therapy twice a week for 2.5 years. We use AAC (his tablet) daily. There were so many times I wondered if he'd ever speak verbally.\n\nHis speech therapist told us early on: "Communication is the goal, not necessarily speech." And I held onto that. We celebrated every sign, every picture exchange, every tablet request.\n\nBut hearing his voice string those words together... I can't describe the feeling.\n\nTo every parent waiting for that moment \u2014 whether it comes through speech, signs, AAC, or any other way \u2014 your child IS communicating. And you are doing an amazing job supporting them.\n\nI just needed to share this with people who truly understand.`,
      category: "celebrations",
      tags: ["speech", "milestone", "non-verbal"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 128,
      pinned: false,
      created_at: new Date(now - 14 * day).toISOString(),
      comments: [
        {
          content: "I'm crying reading this. Our daughter is 4 and mostly uses her AAC device. Posts like these give me so much hope. Congratulations to your son and to you for never giving up.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 18,
          created_at: new Date(now - 13 * day).toISOString(),
        },
        {
          content: "\"Communication is the goal, not necessarily speech\" \u2014 this is so important. Thank you for sharing this reminder along with your beautiful news.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 24,
          created_at: new Date(now - 12 * day).toISOString(),
        },
        {
          content: "MORE CHICKEN PLEASE! What a perfect first sentence. That boy knows what he wants! So happy for your family.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 32,
          created_at: new Date(now - 10 * day).toISOString(),
        },
      ],
    },
    {
      title: "Transitioning from ABA to school \u2014 what to expect",
      content: `Our son did intensive ABA (30 hours/week) from ages 3-5 and just transitioned to full-day kindergarten. Here's what the transition looked like for us:\n\n**3 months before school started:**\n- Met with the school team (teacher, resource teacher, principal)\n- Shared his behavior support plan from ABA\n- Arranged a series of school visits during quiet hours\n- Created a social story about his new school\n\n**1 month before:**\n- Practiced the morning routine (getting dressed, bus simulation)\n- Visited the actual classroom, met his EA\n- Set up a communication book between home and school\n\n**First month of school:**\n- Started with half days for 2 weeks\n- His BCBA consulted with the school team (this was invaluable)\n- We had weekly check-ins with his teacher\n\n**Challenges we didn't expect:**\n- The noise level in the cafeteria was overwhelming\n- Less 1:1 attention than ABA (obviously, but the adjustment was hard)\n- Different behavior expectations than the ABA center\n- Making friends was harder than anticipated\n\n**What helped:**\n- The EA was open to learning from his ABA team\n- We kept some ABA hours after school for the first semester\n- Visual schedule in the classroom\n- A designated quiet space he could request\n\nHe's now in Grade 1 and thriving. The transition was rough but absolutely the right call.`,
      category: "transitions",
      tags: ["ABA", "school", "kindergarten"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 29,
      pinned: false,
      created_at: new Date(now - 10 * day).toISOString(),
      comments: [
        {
          content: "We're about to start this exact transition. The timeline you laid out is so helpful. Did your ABA center help coordinate with the school?",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 4,
          created_at: new Date(now - 9 * day).toISOString(),
        },
        {
          content: "The BCBA consulting with the school team is key. Our center offered this as part of the transition plan. If yours doesn't, ask \u2014 many will do it.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 6,
          created_at: new Date(now - 8 * day).toISOString(),
        },
      ],
    },
    {
      title: "Weighted blanket vs compression vest \u2014 our experience with both",
      content: `We've tried both weighted blankets and compression vests for our son (8, ASD + ADHD) and here's our honest comparison:\n\n**Weighted Blanket (15% of body weight):**\n- Great for: Bedtime, calm-down time, TV time\n- Helped with: Falling asleep faster (went from 45min to ~15min), reducing nighttime waking\n- Downsides: Can't use it everywhere, gets hot in summer, needs to be washed carefully\n- Our pick: The Bearaby knitted one (breathable, machine washable)\n\n**Compression Vest:**\n- Great for: School, outings, transitions, grocery store trips\n- Helped with: Focus during seated work, reducing stimming in overwhelming environments, body awareness\n- Downsides: He outgrew it quickly (sizing is tricky), some days he refuses to wear it\n- Our pick: SPIO vest (recommended by our OT)\n\n**Our takeaway:**\nThey serve different purposes. The weighted blanket is our nighttime hero. The compression vest is our "out in the world" tool. We use both.\n\n**Tips:**\n- Always consult your OT for the right weight/compression level\n- Let your child try before you buy (our OT had samples)\n- Some kids prefer deep pressure from a bear hug or being rolled in a blanket \u2014 start there before investing\n- Watch for signs they've had enough (pulling at it, skin redness)\n\nHappy to answer specific questions about either one.`,
      category: "sensory",
      tags: ["weighted-blanket", "compression", "sensory-tools"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 41,
      pinned: false,
      created_at: new Date(now - 7 * day).toISOString(),
      comments: [
        {
          content: "This is the comparison I've been looking for! Our OT recommended a weighted blanket but I was wondering about compression vests for school. Sounds like we need both!",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 5,
          created_at: new Date(now - 6 * day).toISOString(),
        },
        {
          content: "The Bearaby knitted blanket is amazing. So much better than the ones with beads. And +1 on the SPIO vest \u2014 it's the only one our daughter will tolerate.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 7,
          created_at: new Date(now - 5 * day).toISOString(),
        },
      ],
    },
    {
      title: "How I organized all our documents for the IEP review",
      content: `After fumbling through our first IEP review with papers everywhere, I created a system that has made every meeting since so much smoother:\n\n**The Binder System:**\nI use a 2-inch binder with the following tabs:\n\n1. **Current IEP** \u2014 the active IEP with my highlighted notes\n2. **Progress Reports** \u2014 all report cards and progress updates from this year\n3. **Assessments** \u2014 psychological, speech, OT assessments (most recent first)\n4. **Communication Log** \u2014 printouts of important emails with the school\n5. **My Notes** \u2014 dated observations of my child at home\n6. **Medical** \u2014 relevant medical reports, medication changes\n7. **Rights & Resources** \u2014 parent rights handbook, relevant policy documents\n\n**Digital backup:**\n- I scan everything into Google Drive with the same folder structure\n- I created a shared folder with our advocate\n- Photos of my child's work that show progress go in a "portfolio" folder\n\n**Before each meeting:**\n- I review the current IEP goals and note which ones are met/not met\n- I prepare a one-page summary of my concerns and requests\n- I share this with the school 3 days before the meeting\n\nThis might seem like overkill, but when the school says "we don't have that assessment on file" and you can pull it out immediately... it's worth every minute of organization.\n\nThe Companion app has been great for tracking some of this too \u2014 the document section is really helpful.`,
      category: "school",
      tags: ["documents", "organization", "IEP"],
      author_name: "Anonymous Parent",
      is_anonymous: true,
      upvotes: 33,
      pinned: false,
      created_at: new Date(now - 3 * day).toISOString(),
      comments: [
        {
          content: "This is exactly what I needed. I've been keeping everything in a messy folder and it's so stressful before meetings. Ordering a binder today!",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 3,
          created_at: new Date(now - 2 * day).toISOString(),
        },
        {
          content: "The 'share concerns 3 days before' tip is smart. It gives the team time to prepare answers instead of being caught off guard, which makes the meeting more productive for everyone.",
          author_name: "Anonymous Parent",
          is_anonymous: true,
          upvotes: 8,
          created_at: new Date(now - 1 * day).toISOString(),
        },
      ],
    },
  ];
}

async function seedIfEmpty(admin: ReturnType<typeof createAdminClient>) {
  const { count } = await admin
    .from("community_posts")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) return;

  const seeds = createSeedPosts();

  for (const seed of seeds) {
    const { comments, ...postData } = seed;

    const { data: post, error: postError } = await admin
      .from("community_posts")
      .insert({
        title: postData.title,
        content: postData.content,
        category: postData.category,
        tags: postData.tags,
        author_name: postData.author_name,
        is_anonymous: postData.is_anonymous,
        upvotes: postData.upvotes,
        pinned: postData.pinned,
        created_at: postData.created_at,
      })
      .select("id")
      .single();

    if (postError || !post) {
      console.error("Error seeding post:", postError);
      continue;
    }

    if (comments.length > 0) {
      const commentRows = comments.map((c) => ({
        post_id: post.id,
        content: c.content,
        author_name: c.author_name,
        is_anonymous: c.is_anonymous,
        upvotes: c.upvotes,
        created_at: c.created_at,
      }));

      const { error: commentError } = await admin
        .from("community_comments")
        .insert(commentRows);

      if (commentError) {
        console.error("Error seeding comments:", commentError);
      }
    }
  }
}

// ── GET /api/community/posts ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  const admin = createAdminClient();

  // Seed on first load if empty
  await seedIfEmpty(admin);

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "recent";
  const search = searchParams.get("search");

  // Get current user for upvote status
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not authenticated — that's fine, just no upvote status
  }

  // Build query
  let query = admin
    .from("community_posts")
    .select("*");

  if (category) {
    query = query.eq("category", category);
  }

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,content.ilike.%${search}%`
    );
  }

  // Sort: pinned first, then by mode
  if (sort === "popular") {
    query = query.order("pinned", { ascending: false }).order("upvotes", { ascending: false });
  } else {
    query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false });
  }

  const { data: posts, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }

  // Get comment counts for all posts
  const postIds = (posts || []).map((p) => p.id);
  const commentCounts: Record<string, number> = {};

  if (postIds.length > 0) {
    const { data: counts } = await admin
      .from("community_comments")
      .select("post_id")
      .in("post_id", postIds);

    if (counts) {
      for (const row of counts) {
        commentCounts[row.post_id] = (commentCounts[row.post_id] || 0) + 1;
      }
    }
  }

  // Get user's upvotes
  const userUpvotes = new Set<string>();
  if (userId && postIds.length > 0) {
    const { data: upvotes } = await admin
      .from("community_upvotes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds);

    if (upvotes) {
      for (const row of upvotes) {
        userUpvotes.add(row.post_id);
      }
    }
  }

  // Map to response format
  const mapped = (posts || []).map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    category: p.category,
    tags: p.tags || [],
    author: p.author_name,
    createdAt: p.created_at,
    upvotes: p.upvotes,
    upvotedByUser: userUpvotes.has(p.id),
    pinned: p.pinned,
    commentCount: commentCounts[p.id] || 0,
  }));

  return NextResponse.json({ posts: mapped });
}

// ── POST /api/community/posts ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, content, category, tags, isAnonymous } = body;

  if (!title?.trim() || !content?.trim() || !category) {
    return NextResponse.json(
      { error: "Title, content, and category are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const authorName = isAnonymous
    ? "Anonymous Parent"
    : user.user_metadata?.full_name || user.email || "Community Member";

  const { data: post, error } = await admin
    .from("community_posts")
    .insert({
      title: title.trim(),
      content: content.trim(),
      category,
      tags: tags || [],
      author_id: user.id,
      author_name: authorName,
      is_anonymous: isAnonymous ?? true,
      upvotes: 0,
      pinned: false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
      category: post.category,
      tags: post.tags || [],
      author: post.author_name,
      createdAt: post.created_at,
      upvotes: post.upvotes,
      upvotedByUser: false,
      pinned: post.pinned,
      commentCount: 0,
    },
  });
}
