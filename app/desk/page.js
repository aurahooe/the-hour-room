"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase";

export default function Desk() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [user, setUser] = useState(undefined);
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, [supabase]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setNotes(data || []));
  }, [supabase, user]);

  async function save(e) {
    e.preventDefault();
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        title: title.trim() || "Untitled slip",
        body: body.trim(),
        is_public: isPublic
      })
      .select()
      .single();
    if (error) {
      setToast(error.message);
      return;
    }
    setNotes((n) => [data, ...n]);
    setTitle("");
    setBody("");
    setIsPublic(false);
    setToast(data.is_public ? "Saved and marked public." : "Saved in the drawer.");
    setTimeout(() => setToast(""), 2400);
  }

  async function togglePublic(note) {
    const next = !note.is_public;
    const { error } = await supabase.from("notes").update({ is_public: next }).eq("id", note.id);
    if (error) {
      setToast(error.message);
      return;
    }
    setNotes((rows) => rows.map((r) => (r.id === note.id ? { ...r, is_public: next } : r)));
  }

  async function remove(id) {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      setToast(error.message);
      return;
    }
    setNotes((rows) => rows.filter((r) => r.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (user === undefined) {
    return (
      <div className="wrap">
        <p className="meta" style={{ padding: 40 }}>Opening the desk…</p>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <Link className="mark" href="/">The <em>Hour</em> Room</Link>
        <div className="nav-links">
          <Link href="/">Street</Link>
          <button className="btn ghost" onClick={signOut} type="button">Sign out</button>
        </div>
      </nav>

      <section className="hero" style={{ paddingBottom: 12 }}>
        <div>
          <div className="kicker">Your drawer</div>
          <h1>Write a slip.</h1>
          <p className="lede">
            Private by default. Flip public when you want it on the street —
            and eligible for the glass this hour.
          </p>
        </div>
      </section>

      <form className="form" onSubmit={save} style={{ marginBottom: 48 }}>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="The piece itself"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <label className="toggle">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Mark public (shows on the street)
        </label>
        <div className="row">
          <button className="btn" type="submit">Save slip</button>
        </div>
      </form>

      <div className="kicker" style={{ marginBottom: 14 }}>In the drawer</div>
      <div className="grid">
        {notes.map((n) => (
          <article className="slip" key={n.id}>
            <h3>{n.title}</h3>
            <p>{n.body.slice(0, 200)}{n.body.length > 200 ? "…" : ""}</p>
            <div className="row">
              <span className="meta">{n.is_public ? "public" : "private"}</span>
              <button className="btn ghost" type="button" onClick={() => togglePublic(n)}>
                {n.is_public ? "Make private" : "Make public"}
              </button>
              <button className="btn ghost" type="button" onClick={() => remove(n.id)}>
                Burn
              </button>
            </div>
          </article>
        ))}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
