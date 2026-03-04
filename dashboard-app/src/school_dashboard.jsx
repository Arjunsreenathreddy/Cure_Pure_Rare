import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { calculateDistance } from "./utils/geo";
import { DATA, MAPPING } from "./data";

const locKeys = Object.keys(DATA).sort();

const catLabel = (c) => c?.includes("01_PS") ? "Primary" : c?.includes("02_UPS") ? "Upper Primary" : c?.includes("03_HS") ? "High School" : "Other";
const catColor = (c) => c?.includes("01_PS") ? "#16a34a" : c?.includes("02_UPS") ? "#2563eb" : c?.includes("03_HS") ? "#d97706" : "#6b7280";
const statusRingColor = (s) => { if (!s) return null; const l = s.toLowerCase(); if (l === "rented") return "#a0522d"; if (l === "govtrentfree") return "#0891b2"; if (l.includes("other")) return "#ea580c"; return null; };

const proposedIcon = L.divIcon({
    html: `<svg width="36" height="28" viewBox="0 0 18 14" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))"><rect x="1" y="3" width="16" height="9" rx="1" fill="#dc2626" /><polygon points="9,0 0,4 18,4" fill="#b91c1c" /></svg>`,
    className: "proposed-school-icon",
    iconSize: [36, 28],
    iconAnchor: [18, 14],
});

// Helper to center the map when location changes
function MapController({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

function StatsPanel({ loc }) {
    const s = loc.schools;
    const cats = [
        { code: "01_PS", name: "Primary (PS)", color: "#16a34a", icon: "●" },
        { code: "02_UPS", name: "Upper Primary (UPS)", color: "#2563eb", icon: "◆" },
        { code: "03_HS", name: "High School (HS)", color: "#d97706", icon: "⬠" },
    ];
    const totDilapSch = s.filter(x => x.dilapidated > 0).length;
    const totDilapRooms = s.reduce((a, x) => a + (x.dilapidated || 0), 0);
    const totRented = s.filter(x => x.building_status === "Rented").length;
    const totRentFree = s.filter(x => x.building_status === "GovtRentFree").length;
    const totOther = s.filter(x => (x.building_status || "").toLowerCase().includes("other")).length;

    return (
        <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "12px 16px" }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#d97706" }}>{loc.total_schools}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Schools</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{loc.total_enrollment.toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Enrollment</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 24, fontWeight: 800, color: "#2563eb" }}>{loc.total_teachers}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>Teachers</span>
                </div>
                <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
                {totDilapSch > 0 && <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#dc2626" }}>{totDilapSch}</span>
                    <span style={{ fontSize: 11, color: "#dc2626" }}>Dilapidated ({totDilapRooms} rooms)</span>
                </div>}
                {totRented > 0 && <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#a0522d" }}>{totRented}</span>
                    <span style={{ fontSize: 11, color: "#a0522d" }}>Rented</span>
                </div>}
                {totRentFree > 0 && <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#0891b2" }}>{totRentFree}</span>
                    <span style={{ fontSize: 11, color: "#0891b2" }}>Rent Free</span>
                </div>}
                {totOther > 0 && <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "#ea580c" }}>{totOther}</span>
                    <span style={{ fontSize: 11, color: "#ea580c" }}>Other Dept</span>
                </div>}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
                {cats.map(cat => {
                    const sub = s.filter(x => (x.category || "").includes(cat.code));
                    if (sub.length === 0) return null;
                    const enr = sub.reduce((a, x) => a + x.enr, 0);
                    const teach = sub.reduce((a, x) => a + x.teachers, 0);
                    const dil = sub.filter(x => x.dilapidated > 0).length;
                    const dilR = sub.reduce((a, x) => a + (x.dilapidated || 0), 0);
                    const rent = sub.filter(x => x.building_status === "Rented").length;
                    const rf = sub.filter(x => x.building_status === "GovtRentFree").length;
                    const oth = sub.filter(x => (x.building_status || "").toLowerCase().includes("other")).length;
                    return (
                        <div key={cat.code} style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px solid #f1f5f9" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                                <span style={{ color: cat.color, fontSize: 13 }}>{cat.icon}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>{cat.name}</span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
                                <div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{sub.length}</div><div style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase" }}>Schools</div></div>
                                <div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{enr.toLocaleString()}</div><div style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase" }}>Enrollment</div></div>
                                <div><div style={{ fontSize: 16, fontWeight: 800, color: "#1e293b" }}>{teach}</div><div style={{ fontSize: 8, color: "#94a3b8", textTransform: "uppercase" }}>Teachers</div></div>
                            </div>
                            {(dil > 0 || rent > 0 || rf > 0 || oth > 0) && (
                                <div style={{ display: "flex", gap: 3, marginTop: 6, flexWrap: "wrap" }}>
                                    {dil > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#fef2f2", color: "#dc2626" }}>⚠ {dil} dilapidated ({dilR} rooms)</span>}
                                    {rent > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#fdf4e8", color: "#a0522d" }}>{rent} rented</span>}
                                    {rf > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#ecfeff", color: "#0891b2" }}>{rf} rent free</span>}
                                    {oth > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 3, background: "#fff7ed", color: "#ea580c" }}>{oth} other dept</span>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MapView({ loc, locId, onSelectSchool, selectedSchool, visibleCats }) {
    const iconR = (enr) => Math.max(5, Math.min(12, Math.sqrt(enr) * 0.35 + 2));

    const filteredSchools = useMemo(() => loc.schools.filter(s => {
        if (visibleCats.has("01_PS") && s.category?.includes("01_PS")) return true;
        if (visibleCats.has("02_UPS") && s.category?.includes("02_UPS")) return true;
        if (visibleCats.has("03_HS") && s.category?.includes("03_HS")) return true;
        return false;
    }), [loc, visibleCats]);

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", background: "#fafaf7" }}>
            <MapContainer
                center={[loc.center_lat, loc.center_lng]}
                zoom={14}
                style={{ height: '100%', width: '100%', zIndex: 1 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                <MapController center={[loc.center_lat, loc.center_lng]} zoom={13} />

                {/* Connection lines from proposed school to existing */}
                {filteredSchools.map((s, i) => {
                    const isSel = selectedSchool?.schcd === s.schcd;
                    return (
                        <Polyline
                            key={`ln${i}`}
                            positions={[[loc.center_lat, loc.center_lng], [s.lat, s.lng]]}
                            pathOptions={{
                                color: catColor(s.category),
                                weight: isSel ? 2.5 : 1,
                                opacity: isSel ? 0.7 : 0.25,
                                dashArray: "5 5"
                            }}
                        />
                    );
                })}

                {/* Plot the existing schools */}
                {filteredSchools.map((s, i) => {
                    const r = iconR(s.enr);
                    const isSel = selectedSchool?.schcd === s.schcd;
                    const color = catColor(s.category);
                    const hasDilap = s.dilapidated > 0;
                    const sRing = statusRingColor(s.building_status);

                    return (
                        <div key={`s${i}`}>
                            {/* Inner/outer rings if dilapidated or special building status */}
                            {/* We set interactive={false} so these rings don't block the tooltip hover events */}
                            {hasDilap && (
                                <CircleMarker
                                    center={[s.lat, s.lng]}
                                    radius={r + 4}
                                    pathOptions={{ color: '#ef4444', weight: 2, fillOpacity: 0, dashArray: "4 2.5" }}
                                    interactive={false}
                                />
                            )}
                            {sRing && !hasDilap && (
                                <CircleMarker
                                    center={[s.lat, s.lng]}
                                    radius={r + 4}
                                    pathOptions={{ color: sRing, weight: 2, fillOpacity: 0, dashArray: "4 2.5" }}
                                    interactive={false}
                                />
                            )}
                            {hasDilap && sRing && (
                                <CircleMarker
                                    center={[s.lat, s.lng]}
                                    radius={r + 8}
                                    pathOptions={{ color: sRing, weight: 2, fillOpacity: 0, dashArray: "4 2.5" }}
                                    interactive={false}
                                />
                            )}

                            <CircleMarker
                                center={[s.lat, s.lng]}
                                radius={r}
                                pathOptions={{
                                    color: isSel ? '#1e293b' : 'white',
                                    weight: isSel ? 2 : 1,
                                    fillColor: color,
                                    fillOpacity: 0.9,
                                }}
                                eventHandlers={{
                                    click: () => onSelectSchool(s),
                                }}
                            >
                                <Tooltip direction="top" offset={[0, -r]} opacity={1}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{s.name}</div>
                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                        {catLabel(s.category)} &bull; {s.enr} students
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#0ea5e9', fontWeight: '600' }}>
                                        {calculateDistance(loc.center_lat, loc.center_lng, s.lat, s.lng).toFixed(2)} km from proposed
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#1e293b', marginTop: '2px' }}>
                                        Building: {s.building_status}
                                    </div>
                                    {hasDilap && (
                                        <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
                                            &#9888; {s.dilapidated} dilapidated room{s.dilapidated > 1 ? "s" : ""}
                                        </div>
                                    )}
                                </Tooltip>
                            </CircleMarker>
                        </div>
                    );
                })}

                {/* Plot the proposed new school */}
                <Marker
                    position={[loc.center_lat, loc.center_lng]}
                    icon={proposedIcon}
                />
            </MapContainer>
        </div>
    );
}

function InfoPanel({ school, onClose }) {
    if (!school) return null;
    const color = catColor(school.category); const hasDilap = school.dilapidated > 0; const sRing = statusRingColor(school.building_status);
    const Tag = ({ val }) => { const yes = val?.toLowerCase?.().includes("yes") || val?.toLowerCase?.().includes("available"); return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: yes ? "#dcfce7" : "#fef2f2", color: yes ? "#16a34a" : "#dc2626" }}>{val || "N/A"}</span>; };
    return (
        <div style={{ position: "absolute", bottom: 16, left: 16, background: "white", border: hasDilap ? "2px solid #ef4444" : "1px solid #e2e8f0", borderRadius: 14, padding: "18px 22px", width: 330, zIndex: 2000, boxShadow: "0 10px 40px rgba(0,0,0,0.12)" }}>
            <button onClick={onClose} style={{ position: "absolute", top: 12, right: 14, background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 20 }}>×</button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", pr: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color }}>{catLabel(school.category)}</span>
                {hasDilap && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#fef2f2", color: "#dc2626" }}>⚠ DILAPIDATED</span>}
                {sRing && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "#f0f9ff", color: sRing }}>{school.building_status.toUpperCase()}</span>}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "5px 0 3px", paddingRight: 10 }}>{school.name}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 14 }}>{school.mandal} · <span style={{ color: "#64748b", fontWeight: 600 }}>{school.building_status}</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ v: school.enr, l: "Enrollment", c: "#d97706" }, { v: school.teachers, l: "Teachers", c: "#1e293b" }, { v: `${school.enr_b} / ${school.enr_g}`, l: "Boys / Girls", c: "#1e293b" }, { v: school.class_rooms, l: "Classrooms", c: "#1e293b" }, { v: school.dilapidated, l: "Dilapidated", c: hasDilap ? "#dc2626" : "#16a34a" }, { v: `${school.toilet_boys} / ${school.toilet_girls}`, l: "Toilets B/G", c: "#1e293b" }].map((item, i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 11px" }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: item.c }}>{item.v}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>{item.l}</div>
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>Facilities:</span>
                <Tag val={school.drinking_water} /><Tag val={school.electricity} /><Tag val={school.playground} />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [idx, setIdx] = useState(0);
    const [sidebar, setSidebar] = useState(true);
    const [selSchool, setSelSchool] = useState(null);
    const [visibleCats, setVisibleCats] = useState(new Set(["01_PS", "02_UPS", "03_HS"]));

    const toggleCat = (code) => {
        setVisibleCats(prev => {
            const next = new Set(prev);
            if (next.has(code)) next.delete(code); else next.add(code);
            return next;
        });
    };

    const loc = DATA[locKeys[idx]];
    const goTo = (i) => { setIdx(i); setSelSchool(null); };

    useEffect(() => {
        const h = (e) => { if (e.key === "ArrowLeft") goTo((idx - 1 + locKeys.length) % locKeys.length); if (e.key === "ArrowRight") goTo((idx + 1) % locKeys.length); };
        window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
    }, [idx]);

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui,-apple-system,sans-serif", background: "#f8fafc", color: "#1e293b", overflow: "hidden" }}>
            {sidebar && (
                <div style={{ width: 320, minWidth: 320, background: "white", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", boxShadow: "2px 0 12px rgba(0,0,0,0.04)", zIndex: 10 }}>
                    <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", letterSpacing: "0.14em", textTransform: "uppercase" }}>Government of Telangana</div>
                        <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "4px 0 0" }}>Proposed New Schools</h1>
                        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Infrastructure Planning Dashboard</p>
                        <span style={{ display: "inline-block", background: "#fffbeb", color: "#d97706", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, marginTop: 5, border: "1px solid #fde68a" }}>7 LOCATIONS · PHASE 1</span>
                    </div>
                    <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
                        {locKeys.map((key, i) => {
                            const l = DATA[key]; const active = i === idx;
                            const ld = l.schools.filter(s => s.dilapidated > 0).length;
                            const ng = l.schools.filter(s => s.building_status !== "Govt").length;
                            return (
                                <div key={key} onClick={() => goTo(i)} style={{ padding: "10px 12px", borderRadius: 9, cursor: "pointer", marginBottom: 2, background: active ? "#fffbeb" : "white", border: active ? "1.5px solid #fbbf24" : "1px solid transparent", transition: '0.2s' }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706" }}>{l.id}</span>
                                        <div style={{ display: "flex", gap: 3 }}>
                                            {ld > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#fef2f2", color: "#dc2626" }}>{ld} dilap</span>}
                                            {ng > 0 && <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "#ecfeff", color: "#0891b2" }}>{ng} non-govt</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, lineHeight: 1.3, color: active ? "#1e293b" : "#64748b" }}>{l.name}</div>
                                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, display: "flex", gap: 8 }}>
                                        <span>{l.total_schools} schools</span><span>{l.total_enrollment.toLocaleString()} students</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", background: "white", borderBottom: "1px solid #e2e8f0", minHeight: 48, zIndex: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setSidebar(!sidebar)} style={btnStyle}>☰</button>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{loc.name}</div>
                            <div style={{ fontSize: 10, color: "#94a3b8" }}>{loc.district} · {(MAPPING.mandals[locKeys[idx]] || []).join(", ")}</div>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button onClick={() => goTo((idx - 1 + locKeys.length) % locKeys.length)} style={btnStyle}>◀</button>
                        <span style={{ fontSize: 11, color: "#94a3b8", minWidth: 36, textAlign: "center" }}>{idx + 1}/{locKeys.length}</span>
                        <button onClick={() => goTo((idx + 1) % locKeys.length)} style={btnStyle}>▶</button>
                    </div>
                </div>

                <StatsPanel loc={loc} />

                <div style={{ flex: 1, position: "relative" }}>
                    <MapView loc={loc} locId={locKeys[idx]} onSelectSchool={setSelSchool} selectedSchool={selSchool} visibleCats={visibleCats} />
                    <InfoPanel school={selSchool} onClose={() => setSelSchool(null)} />

                    {/* Interactive Legend with filter toggles */}
                    <div style={{ position: "absolute", top: 10, right: 10, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", zIndex: 2000, maxWidth: 240, userSelect: "none" }}>
                        <div style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 8 }}>FILTER — Click to toggle</div>

                        {/* New school - always visible */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, paddingBottom: 6, borderBottom: "1px solid #f1f5f9" }}>
                            <svg width="18" height="14" viewBox="0 0 18 14"><rect x="1" y="3" width="16" height="9" rx="1" fill="#dc2626" /><polygon points="9,0 0,4 18,4" fill="#b91c1c" /></svg>
                            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 10 }}>Proposed School</span>
                        </div>

                        {/* Toggleable categories */}
                        {[
                            { code: "01_PS", icon: <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#16a34a" stroke="#fff" strokeWidth="0.8" /></svg>, label: "Primary (PS)", color: "#16a34a", count: loc.schools.filter(s => s.category?.includes("01_PS")).length },
                            { code: "02_UPS", icon: <svg width="14" height="14"><polygon points="7,0 14,7 7,14 0,7" fill="#2563eb" stroke="#fff" strokeWidth="0.8" /></svg>, label: "Upper Primary (UPS)", color: "#2563eb", count: loc.schools.filter(s => s.category?.includes("02_UPS")).length },
                            { code: "03_HS", icon: <svg width="14" height="14"><polygon points="7,0.5 13.5,4.5 11,12.5 3,12.5 0.5,4.5" fill="#d97706" stroke="#fff" strokeWidth="0.8" /></svg>, label: "High School (HS)", color: "#d97706", count: loc.schools.filter(s => s.category?.includes("03_HS")).length },
                        ].map(x => {
                            const active = visibleCats.has(x.code);
                            return (
                                <div key={x.code} onClick={() => toggleCat(x.code)} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, padding: "4px 6px", borderRadius: 6, cursor: "pointer", background: active ? "transparent" : "#f8fafc", opacity: active ? 1 : 0.4, transition: "all 0.15s", border: active ? `1.5px solid ${x.color}` : "1.5px solid transparent" }}>
                                    <div style={{ opacity: active ? 1 : 0.3 }}>{x.icon}</div>
                                    <span style={{ color: active ? x.color : "#94a3b8", fontWeight: active ? 600 : 400, flex: 1 }}>{x.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: active ? x.color : "#cbd5e1", background: active ? `${x.color}15` : "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{x.count}</span>
                                </div>
                            );
                        })}

                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8, marginTop: 6 }}>
                            <div style={{ fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.1em", marginBottom: 5 }}>MAP LABELS</div>
                            {[
                                { color: "#ef4444", label: "Dilapidated Ring" },
                                { color: "#a0522d", label: "Rented Ring" },
                                { color: "#0891b2", label: "Govt Rent Free Ring" },
                                { color: "#ea580c", label: "Other Dept Ring" },
                                { color: "#cbd5e1", label: "Connecting Lines" }
                            ].map((x, i) => (
                                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                    <div style={{ width: 12, height: 2, background: x.color, borderRadius: 1, opacity: 0.8 }} />
                                    <span style={{ color: x.color === '#cbd5e1' ? '#64748b' : x.color, fontWeight: 600, fontSize: 10 }}>{x.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const btnStyle = { width: 34, height: 34, borderRadius: 8, background: "white", border: "1px solid #e2e8f0", color: "#475569", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" };
