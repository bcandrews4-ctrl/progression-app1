import React, { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { fetchCommunityPosts, insertCommunityPost, deleteCommunityPost, CommunityPost } from "../lib/db";
import { Edit3, Trash2 } from "lucide-react";

interface CommunityFeedProps {
  userId: string;
  userName: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function CommunityFeed({ userId, userName }: CommunityFeedProps) {
  const { c } = useTheme();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchCommunityPosts();
    setPosts(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(postId: string) {
    setDeleting(postId);
    try { await deleteCommunityPost(postId); await load(); }
    catch (e) { console.error("Delete failed:", e); }
    finally { setDeleting(null); }
  }

  async function handleSubmit() {
    if (!draft.trim()) return;
    setSubmitting(true);
    try {
      await insertCommunityPost(userId, userName, draft);
      setDraft("");
      setPostOpen(false);
      await load();
    } catch (e) {
      console.error("Post failed:", e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        style={{
          background: c.cardBg2,
          border: `1px solid ${c.border}`,
          borderRadius: "16px",
          padding: "14px 16px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Community
          </div>
          <button
            onClick={() => setPostOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: `${c.accent}18`, border: `1px solid ${c.accentBorder}`,
              borderRadius: "8px", padding: "4px 10px",
              color: c.accent, fontSize: "12px", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Edit3 size={11} color={c.accent} />
            Post
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: "20px 0", textAlign: "center", fontSize: "13px", color: c.muted }}>
            Loading…
          </div>
        ) : posts.length === 0 ? (
          <div style={{ padding: "20px 0", textAlign: "center", fontSize: "13px", color: c.muted }}>
            No posts yet — be the first to share!
          </div>
        ) : (
          posts.map((post, idx) => (
            <div
              key={post.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "10px 0",
                borderBottom: idx < posts.length - 1 ? `1px solid ${c.border}` : "none",
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: c.accentSoft, border: `1px solid ${c.accentBorder}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: c.accent }}>
                  {post.authorName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: c.text }}>{post.authorName} </span>
                <span style={{ fontSize: "13px", color: c.muted }}>{post.body}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <div style={{ fontSize: "10px", color: c.muted2, paddingTop: "2px" }}>
                  {timeAgo(post.createdAt)}
                </div>
                {post.userId === userId && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deleting === post.id}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: c.muted2, flexShrink: 0, opacity: deleting === post.id ? 0.4 : 1 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New post — centered backdrop card */}
      {postOpen && (
        <div
          onClick={() => { setPostOpen(false); setDraft(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 80,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: "480px",
              background: "#0E0E12", borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "20px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share a win, ask a question, or hype the crew…"
              autoFocus
              rows={5}
              style={{
                width: "100%", background: "rgba(255,255,255,0.05)",
                border: `1px solid ${c.border}`, borderRadius: "12px",
                padding: "14px", fontSize: "16px", color: c.text,
                fontFamily: "inherit", resize: "none", outline: "none",
                boxSizing: "border-box", display: "block", marginBottom: "12px",
              }}
              onFocus={(e) => { e.target.style.borderColor = c.accent; }}
              onBlur={(e) => { e.target.style.borderColor = c.border; }}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !draft.trim()}
              style={{
                width: "100%", padding: "14px",
                background: draft.trim() ? c.accent : "rgba(255,255,255,0.1)",
                color: draft.trim() ? "#fff" : c.muted2,
                border: "none", borderRadius: "12px",
                fontSize: "15px", fontWeight: 700,
                cursor: draft.trim() ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
