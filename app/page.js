"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/supabase";
import { EDITORIALS, editorialFor, formatSlot, hourKey, msUntilNextHour } from "@/lib/hour";

function Shell({ children, user }) {
  return (
    <div className="wrap">
      <nav className="nav">
        <Link className="mark" href="/">The <em>Hour</em> Room</Link>
        <div className="nav-links">
          <Link href="/">Street</Link>
          <Link href="/desk">Desk</Link>
          {user ? (
            <Link href="/desk">{user.email}</Link>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </div>
      </nav>
      {children}
      <footer>
        <span>Public slips sit in the window. Private ones stay in the drawer.</span>
        <span>Rotates on the hour, UTC.</span>
      </footer>
    </div>
  );
}

export default function Home() {
  const supabase = useMemo(() => getBrowserClient(), []);
  const [user, setUser] = useState(null);
  const [feature, setFeature] = useState(null);
  const [publicNotes, setPublicNotes] = useState([]);
  const [left, setLeft] = useState(msUntilNextHour());
  const [hourDeg, setHourDeg] = useState(0);
  const [minDeg, setMinDeg] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setLeft(msUntilNextHour(now));
      setMinDeg(now.getUTCMinutes() * 6);
      setHourDeg((now.getUTCHours() % 12) * 30 + now.getUTCMinutes() * 0.5);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const key = hourKey();
      const slot = new Date();
      slot.setUTCMinutes(0, 0, 0);

      const { data: notes } = await supabase
        .from("notes")
        .select("id, title, body, is_public, created_at, user_id, profiles(handle, display_name)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(24);

      if (cancelled) return;
      setPublicNotes(notes || []);

      const { data: existing } = await supabase
        .from("hours")
        .select("id, slot, headline, editorial, featured_note_id")
        .eq("slot", slot.toISOString())
        .maybeSingle();

      let chosen = existing;
      if (!chosen) {
        const pool = notes || [];
        const pick = pool.length ? pool[Math.abs(hash(key)) % pool.length] : null;
        const [headline, editorial] = editorialFor(key);
        const row = {
          slot: slot.toISOString(),
          headline: pick?.title || headline,
          editorial: pick ? pick.body.slice(0, 280) : editorial,
          featured_note_id: pick?.id || null
        };
        const { data: inserted } = await supabase.from("hours").insert(row).select().maybeSingle();
        chosen = inserted || row;
        if (pick) {
          await supabase.from("notes").update({ featured_at: new Date().toISOString() }).eq("id", pick.id);
        }
      }

      let featuredNote = null;
      if (chosen?.featured_note_id) {
        featuredNote = (notes || []).find((n) => n.id === chosen.featured_note_id) || null;
        if (!featuredNote) {
          const { data } = await supabase
            .from("notes")
            .select("id, title, body, created_at, profiles(handle, display_name)")
            .eq("id", chosen.featured_note_id)
            .maybeSingle();
          featuredNote = data;
        }
      }

      setFeature({
        ...chosen,
        note: featuredNote,
        copy: editorialFor(key)
      });
    }
    load();
    const t = setTimeout(load, msUntilNextHour() + 1200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [supabase]);

  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return (
    <Shell user={user}>
      <section className="hero">
        <div>
          <div className="kicker">Issue {hourKey().replace("T", " · ")}</div>
          <h1>The room changes<br />with the clock.</h1>
          <p className="lede">
            Write at the desk. Mark a slip public and it can sit in the window
            when the next hour turns.
          </p>
        </div>
        <aside className="clock-card">
          <div className="kicker">UTC</div>
          <div className="clock-face" aria-hidden="true">
            <div className="hand hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
            <div className="hand minute" style={{ transform: `rotate(${minDeg}deg)` }} />
            <div className="pivot" />
          </div>
          <div className="countdown">next turn in {mm}:{ss}</div>
        </aside>
      </section>

      <article className="feature">
        <div className="kicker">Under glass this hour</div>
        <h2>{feature?.note?.title || feature?.headline || EDITORIALS[0][0]}</h2>
        <p>
          {feature?.note?.body ||
            feature?.editorial ||
            feature?.copy?.[1] ||
            "The drawer is still empty. Leave a public slip."}
        </p>
        <div className="meta">
          {feature?.note?.profiles?.display_name || feature?.note?.profiles?.handle || "House editor"}
          {" · "}
          {formatSlot(hourKey())}
        </div>
      </article>

      <div className="kicker" style={{ marginBottom: 14 }}>On the street</div>
      <div className="grid">
        {publicNotes.length === 0 && (
          <div className="slip">
            <h3>Nothing public yet</h3>
            <p>Sign in, write something, and flip the public latch.</p>
          </div>
        )}
        {publicNotes.map((n, i) => (
          <article className="slip" key={n.id} style={{ animationDelay: `${i * 40}ms` }}>
            <h3>{n.title}</h3>
            <p>{n.body.slice(0, 180)}{n.body.length > 180 ? "…" : ""}</p>
            <div className="meta">{n.profiles?.display_name || n.profiles?.handle || "anon"}</div>
          </article>
        ))}
      </div>
    </Shell>
  );
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h;
}
