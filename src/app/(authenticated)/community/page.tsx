"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ArrowLeft, MessageSquare, Heart, Pin, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  commentCount: number;
}

interface PostDetail {
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

// ── API Helpers ─────────────────────────────────────────────────────────

async function fetchPosts(params: {
  category: CategoryKey | null;
  sort: SortMode;
  search: string;
}): Promise<Post[]> {
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.sort) searchParams.set("sort", params.sort);
  if (params.search) searchParams.set("search", params.search);

  const res = await fetch(`/api/community/posts?${searchParams.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return data.posts;
}

async function fetchPost(id: string): Promise<{ post: PostDetail; comments: Comment[] }> {
  const res = await fetch(`/api/community/posts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

async function createPost(body: {
  title: string;
  content: string;
  category: CategoryKey;
  tags: string[];
  isAnonymous: boolean;
}): Promise<Post> {
  const res = await fetch("/api/community/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create post");
  }
  const data = await res.json();
  return data.post;
}

async function addComment(
  postId: string,
  body: { content: string; isAnonymous: boolean }
): Promise<Comment> {
  const res = await fetch(`/api/community/posts/${postId}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to add comment");
  }
  const data = await res.json();
  return data.comment;
}

async function toggleUpvote(postId: string): Promise<{ upvoted: boolean; upvotes: number }> {
  const res = await fetch(`/api/community/posts/${postId}/upvote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to toggle upvote");
  }
  return res.json();
}

// ── Skeleton Components ────────────────────────────────────────────────

function PostCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0 pt-0.5 gap-1">
          <div className="h-9 w-9 rounded-lg bg-warm-100" />
          <div className="h-3 w-5 rounded bg-warm-100" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full bg-warm-100" />
          </div>
          <div className="h-4 w-3/4 rounded bg-warm-100" />
          <div className="h-3 w-full rounded bg-warm-100" />
          <div className="h-3 w-1/2 rounded bg-warm-100" />
          <div className="flex gap-2 mt-1">
            <div className="h-3 w-16 rounded bg-warm-100" />
            <div className="h-3 w-12 rounded bg-warm-100" />
            <div className="h-3 w-20 rounded bg-warm-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-20 rounded-full bg-warm-100" />
        </div>
        <div className="h-6 w-2/3 rounded bg-warm-100" />
        <div className="flex gap-2">
          <div className="h-3 w-24 rounded bg-warm-100" />
          <div className="h-3 w-16 rounded bg-warm-100" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 w-full rounded bg-warm-100" />
          <div className="h-3 w-full rounded bg-warm-100" />
          <div className="h-3 w-3/4 rounded bg-warm-100" />
          <div className="h-3 w-full rounded bg-warm-100" />
          <div className="h-3 w-1/2 rounded bg-warm-100" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-warm-100" />
        <div className="space-y-3">
          <div className="h-3 w-full rounded bg-warm-100" />
          <div className="h-3 w-2/3 rounded bg-warm-100" />
        </div>
      </div>
    </div>
  );
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
              {post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}
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
  isSubmitting,
}: {
  onSubmit: (post: {
    title: string;
    content: string;
    category: CategoryKey;
    tags: string[];
    isAnonymous: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
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
      isAnonymous: anonymous,
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
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="h-11 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Single Post View ────────────────────────────────────────────────────

function SinglePostView({
  postId,
  onBack,
}: {
  postId: string;
  onBack: () => void;
}) {
  const [commentInput, setCommentInput] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["community-post", postId],
    queryFn: () => fetchPost(postId),
  });

  const upvoteMutation = useMutation({
    mutationFn: () => toggleUpvote(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: () => {
      toast.error("Failed to update upvote");
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      addComment(postId, { content, isAnonymous: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setCommentInput("");
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || commentMutation.isPending) return;
    commentMutation.mutate(commentInput.trim());
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

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm text-warm-400 hover:text-foreground transition-colors p-2 -ml-2 min-h-[44px] rounded-lg hover:bg-warm-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to posts
        </button>
        <PostDetailSkeleton />
      </div>
    );
  }

  const { post, comments } = data;

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
            onClick={() => upvoteMutation.mutate()}
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
            {comments.length} comment{comments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </article>

      {/* Comments */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading text-sm font-semibold text-foreground mb-4">
          Comments ({comments.length})
        </h3>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
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
                  <span className="inline-flex items-center gap-1 text-[11px] text-warm-300 p-1">
                    <Heart className="h-3 w-3" />
                    {comment.upvotes}
                  </span>
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
              disabled={!commentInput.trim() || commentMutation.isPending}
              className="self-end h-11 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              {commentMutation.isPending ? "Sending..." : "Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function CommunityPage() {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const queryClient = useQueryClient();

  // Fetch posts
  const {
    data: posts = [],
    isLoading,
  } = useQuery({
    queryKey: ["community-posts", activeCategory, sortMode, searchQuery],
    queryFn: () =>
      fetchPosts({
        category: activeCategory,
        sort: sortMode,
        search: searchQuery,
      }),
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setShowCreateForm(false);
      toast.success("Post created successfully");
    },
    onError: () => {
      toast.error("Failed to create post");
    },
  });

  // Upvote mutation (from list view)
  const upvoteMutation = useMutation({
    mutationFn: toggleUpvote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
    },
    onError: () => {
      toast.error("Failed to update upvote");
    },
  });

  // Category post counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const key of CATEGORY_KEYS) counts[key] = 0;
    for (const post of posts) counts[post.category]++;
    return counts;
  }, [posts]);

  // ── Single Post View ──────────────────────────────────────────────────
  if (selectedPostId) {
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
          postId={selectedPostId}
          onBack={() => setSelectedPostId(null)}
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
          onSubmit={(data) => createPostMutation.mutate(data)}
          onCancel={() => setShowCreateForm(false)}
          isSubmitting={createPostMutation.isPending}
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
        {isLoading ? (
          <>
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </>
        ) : posts.length === 0 ? (
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
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onSelect={() => setSelectedPostId(post.id)}
              onUpvote={(e) => {
                e.stopPropagation();
                upvoteMutation.mutate(post.id);
              }}
            />
          ))
        )}
      </div>

      {/* Post count */}
      {!isLoading && posts.length > 0 && (
        <p className="text-center text-[11px] text-warm-300 pb-4">
          Showing {posts.length} post
          {posts.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
