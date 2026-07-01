"use client";
import { useState, useRef } from "react";

const PLATFORMS = [
  { id: "facebook",  label: "Facebook",    icon: "ti-brand-facebook",  color: "#1877F2", limit: 63206 },
  { id: "instagram", label: "Instagram",   icon: "ti-brand-instagram", color: "#E1306C", limit: 2200  },
  { id: "twitter",   label: "Twitter / X", icon: "ti-brand-x",         color: "#1DA1F2", limit: 280   },
];

const GOALS     = ["Attract clients","Grow followers","Promote a product","Build brand awareness","Drive website traffic"];
const TONES     = ["Professional","Friendly","Inspirational","Witty","Urgent"];
const FREQS     = ["Daily","3x per week","Weekly"];

const defaultConfig = {
  businessName:"", businessType:"", targetAudience:"",
  goal:"Attract clients", tone:"Professional", language:"English",
  platforms:["facebook","instagram","twitter"],
  frequency:"3x per week", scheduleTime:"09:00", extraContext:"",
};

type Config   = typeof defaultConfig;
type Post     = { platform:string; text:string; imagePrompt:string };
type ScheduleItem = Post & { date:string; time:string; preview:string };

async function callGenerate(platform: string, config: Config, forSchedule = false): Promise<Post> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform, config, forSchedule }),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

function PlatformBadge({ pid, active, onClick }: { pid:string; active:boolean; onClick:(id:string)=>void }) {
  const p = PLATFORMS.find(x => x.id === pid)!;
  return (
    <button onClick={() => onClick(pid)} style={{
      display:"flex", alignItems:"center", gap:6,
      padding:"6px 14px", borderRadius:20,
      border: active ? `1.5px solid ${p.color}` : "0.5px solid var(--color-border-tertiary)",
      background: active ? `${p.color}18` : "var(--color-background-primary)",
      color: active ? p.color : "var(--color-text-secondary)",
      fontWeight: active ? 500 : 400, fontSize:13, cursor:"pointer", transition:"all 0.15s",
    }}>
      <i className={`ti ${p.icon}`} style={{ fontSize:15 }} aria-hidden="true" />
      {p.label}
    </button>
  );
}

function PostCard({ post, onRegen, loading }: { post:Post; onRegen:(pid:string)=>void; loading:boolean }) {
  const [copied, setCopied] = useState(false);
  const p = PLATFORMS.find(x => x.id === post.platform)!;
  const copy = () => { navigator.clipboard.writeText(post.text); setCopied(true); setTimeout(()=>setCopied(false),1500); };

  return (
    <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:12 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <i className={`ti ${p.icon}`} style={{ fontSize:18, color:p.color }} aria-hidden="true" />
          <span style={{ fontWeight:500, fontSize:14 }}>{p.label}</span>
          {post.imagePrompt && (
            <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:"var(--color-background-secondary)", color:"var(--color-text-secondary)" }}>image suggested</span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={copy} style={{ background:"none", border:"0.5px solid var(--color-border-tertiary)", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12, color: copied ? "var(--color-text-success)" : "var(--color-text-secondary)", display:"flex", alignItems:"center", gap:4 }}>
            <i className={`ti ${copied?"ti-check":"ti-copy"}`} style={{ fontSize:13 }} aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
          <button onClick={() => onRegen(post.platform)} disabled={loading} style={{ background:"none", border:"0.5px solid var(--color-border-tertiary)", borderRadius:6, padding:"4px 10px", cursor: loading?"not-allowed":"pointer", fontSize:12, color:"var(--color-text-secondary)", display:"flex", alignItems:"center", gap:4, opacity: loading?0.5:1 }}>
            <i className="ti ti-refresh" style={{ fontSize:13 }} aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
      <p style={{ fontSize:14, lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{post.text}</p>
      {post.imagePrompt && (
        <div style={{ marginTop:12, padding:"8px 12px", background:"var(--color-background-secondary)", borderRadius:8, fontSize:12, color:"var(--color-text-secondary)" }}>
          <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>Image idea: </span>{post.imagePrompt}
        </div>
      )}
      <div style={{ marginTop:8, fontSize:11, color:"var(--color-text-tertiary)" }}>{post.text.length} / {p.limit} chars</div>
    </div>
  );
}

function ScheduleRow({ item }: { item:ScheduleItem }) {
  const p = PLATFORMS.find(x => x.id === item.platform)!;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:10, marginBottom:8 }}>
      <i className={`ti ${p.icon}`} style={{ fontSize:18, color:p.color, flexShrink:0 }} aria-hidden="true" />
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{item.date} · {item.time}</div>
        <div style={{ fontSize:12, color:"var(--color-text-secondary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.preview}</div>
      </div>
      <span style={{ fontSize:11, padding:"3px 8px", borderRadius:10, flexShrink:0, background:"var(--color-background-success)", color:"var(--color-text-success)" }}>Scheduled</span>
    </div>
  );
}

export default function Home() {
  const [tab, setTab]           = useState<"config"|"posts"|"schedule">("config");
  const [config, setConfig]     = useState<Config>(defaultConfig);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [uploadedImage, setUploadedImage] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upd = (k: keyof Config, v: unknown) => setConfig(c => ({ ...c, [k]: v }));

  const togglePlatform = (id: string) =>
    setConfig(c => ({ ...c, platforms: c.platforms.includes(id) ? c.platforms.filter(p=>p!==id) : [...c.platforms, id] }));

  const validate = () => {
    if (!config.businessName.trim()) { setError("Enter your business name first."); return false; }
    if (!config.platforms.length)    { setError("Select at least one platform.");  return false; }
    setError(""); return true;
  };

  const generatePosts = async () => {
    if (!validate()) return;
    setLoading(true); setPosts([]);
    const results = await Promise.all(
      config.platforms.map(pid =>
        callGenerate(pid, config).catch(() => ({ platform:pid, text:"Could not generate. Please retry.", imagePrompt:"" }))
      )
    );
    setPosts(results); setLoading(false); setTab("posts");
  };

  const regenOne = async (pid: string) => {
    setLoading(true);
    const result = await callGenerate(pid, config).catch(() => ({ platform:pid, text:"Could not generate. Please retry.", imagePrompt:"" }));
    setPosts(p => p.map(x => x.platform === pid ? result : x));
    setLoading(false);
  };

  const buildSchedule = async () => {
    if (!validate()) return;
    setLoading(true); setSchedule([]);
    const days = config.frequency === "Daily" ? 7 : config.frequency === "3x per week" ? 3 : 1;
    const base = new Date();
    const items: ScheduleItem[] = [];

    for (let d = 0; d < days; d++) {
      const date = new Date(base); date.setDate(date.getDate() + d);
      const dateStr = date.toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" });
      const results = await Promise.all(
        config.platforms.map(pid =>
          callGenerate(pid, config, true).catch(() => ({ platform:pid, text:"", imagePrompt:"" }))
        )
      );
      results.forEach(r => items.push({ ...r, date:dateStr, time:config.scheduleTime, preview: r.text.slice(0,80)+"…" }));
    }

    setSchedule(items); setLoading(false); setTab("schedule");
  };

  const tabs = [
    { id:"config",   label:"Configure", icon:"ti-settings"  },
    { id:"posts",    label:"Generate",  icon:"ti-wand"      },
    { id:"schedule", label:"Schedule",  icon:"ti-calendar"  },
  ] as const;

  return (
    <main style={{ minHeight:"100vh", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"2rem 1rem" }}>
      <div style={{ width:"100%", maxWidth:680 }}>
        <h1 className="sr-only">PostCraft</h1>

        {/* Header */}
        <div style={{ marginBottom:"1.5rem" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <i className="ti ti-sparkles" style={{ fontSize:24, color:"#7F77DD" }} aria-hidden="true" />
            <span style={{ fontSize:22, fontWeight:500 }}>PostCraft</span>
          </div>
          <p style={{ fontSize:13, color:"var(--color-text-secondary)" }}>
            AI-powered social content — professional posts for every platform, on demand or scheduled.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:2, marginBottom:"1.5rem", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 16px", background:"none", cursor:"pointer",
              border:"none", borderBottom: tab===t.id ? "2px solid #7F77DD" : "2px solid transparent",
              fontWeight: tab===t.id ? 500 : 400,
              color: tab===t.id ? "#7F77DD" : "var(--color-text-secondary)",
              fontSize:13, marginBottom:-1,
            }}>
              <i className={`ti ${t.icon}`} style={{ fontSize:15 }} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>

        {/* CONFIG */}
        {tab === "config" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Business name *</label>
                <input value={config.businessName} onChange={e=>upd("businessName",e.target.value)} placeholder="e.g. Nova Studio" />
              </div>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Business type</label>
                <input value={config.businessType} onChange={e=>upd("businessType",e.target.value)} placeholder="e.g. Photography, Coaching" />
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Target audience</label>
              <input value={config.targetAudience} onChange={e=>upd("targetAudience",e.target.value)} placeholder="e.g. Small business owners aged 25–45" />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Goal</label>
                <select value={config.goal} onChange={e=>upd("goal",e.target.value)}>
                  {GOALS.map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Tone</label>
                <select value={config.tone} onChange={e=>upd("tone",e.target.value)}>
                  {TONES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Language</label>
                <input value={config.language} onChange={e=>upd("language",e.target.value)} placeholder="English, French, Dutch…" />
              </div>
              <div>
                <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Post frequency</label>
                <select value={config.frequency} onChange={e=>upd("frequency",e.target.value)}>
                  {FREQS.map(f=><option key={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:6 }}>Platforms</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {PLATFORMS.map(p=>(
                  <PlatformBadge key={p.id} pid={p.id} active={config.platforms.includes(p.id)} onClick={togglePlatform} />
                ))}
              </div>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Extra context / current campaign</label>
              <textarea value={config.extraContext} onChange={e=>upd("extraContext",e.target.value)}
                placeholder="e.g. Running a 20% discount this week on all services…"
                rows={3} style={{ resize:"vertical" }} />
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, color:"var(--color-text-secondary)", display:"block", marginBottom:4 }}>Brand image (optional)</label>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <button onClick={()=>fileRef.current?.click()} style={{
                  display:"flex", alignItems:"center", gap:6, padding:"6px 14px",
                  borderRadius:8, border:"0.5px solid var(--color-border-tertiary)", cursor:"pointer",
                  background:"var(--color-background-secondary)", fontSize:13, color:"var(--color-text-secondary)"
                }}>
                  <i className="ti ti-upload" style={{ fontSize:14 }} aria-hidden="true" /> Upload image
                </button>
                {uploadedImage && <span style={{ fontSize:12, color:"var(--color-text-success)" }}><i className="ti ti-check" style={{ fontSize:13 }} /> Uploaded</span>}
                <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e=>e.target.files?.[0] && setUploadedImage(URL.createObjectURL(e.target.files[0]))} />
              </div>
              {uploadedImage && <img src={uploadedImage} alt="Brand" style={{ marginTop:8, height:60, borderRadius:8, objectFit:"cover" }} />}
            </div>

            {error && <p style={{ fontSize:13, color:"var(--color-text-danger)", marginBottom:12 }}>{error}</p>}

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={generatePosts} disabled={loading} style={{
                flex:1, padding:"10px 0", borderRadius:8, cursor: loading?"not-allowed":"pointer",
                background:"#7F77DD", border:"none", color:"#fff",
                fontWeight:500, fontSize:14, opacity: loading?0.7:1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8
              }}>
                <i className="ti ti-wand" style={{ fontSize:16 }} aria-hidden="true" />
                {loading ? "Generating…" : "Generate posts now"}
              </button>
              <button onClick={buildSchedule} disabled={loading} style={{
                flex:1, padding:"10px 0", borderRadius:8, cursor: loading?"not-allowed":"pointer",
                background:"none", border:"0.5px solid var(--color-border-secondary)", color:"var(--color-text-primary)",
                fontWeight:500, fontSize:14, opacity: loading?0.7:1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8
              }}>
                <i className="ti ti-calendar" style={{ fontSize:16 }} aria-hidden="true" />
                Build schedule
              </button>
            </div>
          </div>
        )}

        {/* POSTS */}
        {tab === "posts" && (
          <div>
            {loading && (
              <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-secondary)" }}>
                <i className="ti ti-loader-2" style={{ fontSize:30, display:"block", marginBottom:10 }} aria-hidden="true" />
                <span style={{ fontSize:13 }}>Crafting your posts…</span>
              </div>
            )}
            {!loading && posts.length === 0 && (
              <div style={{ textAlign:"center", padding:"4rem 1rem", color:"var(--color-text-secondary)" }}>
                <i className="ti ti-pencil" style={{ fontSize:34, display:"block", marginBottom:10 }} aria-hidden="true" />
                <p style={{ fontSize:14 }}>Configure your brand then click "Generate posts now"</p>
              </div>
            )}
            {posts.map(p => <PostCard key={p.platform} post={p} onRegen={regenOne} loading={loading} />)}
            {posts.length > 0 && !loading && (
              <button onClick={generatePosts} style={{
                width:"100%", padding:"10px 0", borderRadius:8, cursor:"pointer",
                background:"none", border:"0.5px solid var(--color-border-tertiary)",
                color:"var(--color-text-secondary)", fontSize:13,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6
              }}>
                <i className="ti ti-refresh" style={{ fontSize:14 }} aria-hidden="true" />
                Generate new batch
              </button>
            )}
          </div>
        )}

        {/* SCHEDULE */}
        {tab === "schedule" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <span style={{ fontSize:13, color:"var(--color-text-secondary)" }}>
                {schedule.length} posts · {config.frequency}
              </span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:12, color:"var(--color-text-secondary)" }}>Post at</span>
                <input type="time" value={config.scheduleTime} onChange={e=>upd("scheduleTime",e.target.value)} style={{ width:"auto", fontSize:13, padding:"4px 8px" }} />
              </div>
            </div>

            {loading && (
              <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-secondary)" }}>
                <i className="ti ti-loader-2" style={{ fontSize:30, display:"block", marginBottom:10 }} aria-hidden="true" />
                <span style={{ fontSize:13 }}>Building your content calendar…</span>
              </div>
            )}
            {!loading && schedule.length === 0 && (
              <div style={{ textAlign:"center", padding:"4rem 1rem", color:"var(--color-text-secondary)" }}>
                <i className="ti ti-calendar-event" style={{ fontSize:34, display:"block", marginBottom:10 }} aria-hidden="true" />
                <p style={{ fontSize:14 }}>Click "Build schedule" to generate your content calendar</p>
              </div>
            )}
            {schedule.map((item,i) => <ScheduleRow key={i} item={item} />)}
            {schedule.length > 0 && !loading && (
              <button onClick={buildSchedule} style={{
                width:"100%", padding:"10px 0", borderRadius:8, cursor:"pointer", marginTop:8,
                background:"none", border:"0.5px solid var(--color-border-tertiary)",
                color:"var(--color-text-secondary)", fontSize:13,
                display:"flex", alignItems:"center", justifyContent:"center", gap:6
              }}>
                <i className="ti ti-refresh" style={{ fontSize:14 }} aria-hidden="true" />
                Rebuild schedule
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
