(() => {
  const config = window.SEATING_CONFIG || {};
  const query = new URLSearchParams(window.location.search);
  const savedApiUrl = window.localStorage.getItem("seatingSheetApiUrl") || "";
  if (query.get("setup") === "1") {
    const entered = window.prompt("Google Apps Script의 /exec 주소를 붙여넣으세요.", config.sheetApiUrl || savedApiUrl);
    if (entered && /^https:\/\//.test(entered.trim())) window.localStorage.setItem("seatingSheetApiUrl", entered.trim());
    window.history.replaceState({}, "", window.location.pathname);
  }
  if (query.get("sheet") && /^https:\/\//.test(query.get("sheet"))) {
    window.localStorage.setItem("seatingSheetApiUrl", query.get("sheet"));
    window.history.replaceState({}, "", window.location.pathname);
  }
  const sheetApiUrl = config.sheetApiUrl || window.localStorage.getItem("seatingSheetApiUrl") || "";
  const zones = ["가", "나", "다", "라", "마", "바", "사"];
  const names = ["김가은","김도윤","김민지","김서준","김예린","김지훈","박도현","박서연","박지민","이도윤","이서연","이예준","이하은","정민서","최유진"];
  const auditorium = document.querySelector("#auditorium");
  const updatedAt = document.querySelector("#updatedAt");
  const sourceInfo = document.querySelector("#sourceInfo");

  function demoSeats() {
    return zones.flatMap((zone, z) => Array.from({ length: 25 }, (_, i) => {
      const status = (i + z * 3) % 23 === 0 ? "빈자리" : (i + z) % 37 === 0 ? "결석" : "배정";
      return { zone, number: i + 1, seatId: `${zone}-${String(i + 1).padStart(2, "0")}`, name: status === "빈자리" ? "빈자리" : names[(i * 3 + z * 2) % names.length], status };
    }));
  }

  function normalise(raw) {
    const input = Array.isArray(raw) ? raw : raw.seats;
    if (!Array.isArray(input)) throw new Error("좌석 목록이 없습니다.");
    return input.map((row) => {
      const zone = String(row.zone ?? row["구역"] ?? "").trim();
      const rawNumber = row.number ?? row["좌석번호"] ?? row.seatNumber;
      const number = Number(rawNumber);
      return { zone, number, seatId: String(row.seatId ?? `${zone}-${String(number).padStart(2, "0")}`), name: String(row.name ?? row["이름"] ?? "빈자리").trim() || "빈자리", status: String(row.status ?? row["상태"] ?? "배정").trim() || "배정" };
    }).filter((seat) => zones.includes(seat.zone) && Number.isFinite(seat.number));
  }

  function seatHTML(seat) {
    const safe = (text) => String(text).replace(/[&<>\"]/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
    return `<article class="seat" data-status="${safe(seat.status)}" title="${safe(seat.seatId)} · ${safe(seat.name)}"><span class="seat-id">${safe(seat.seatId)}</span><span class="seat-name">${safe(seat.name)}</span></article>`;
  }

  function zoneHTML(zone, seats) {
    const ordered = seats.sort((a,b) => a.number - b.number);
    return `<section class="zone"><h2 class="zone-head"><span class="zone-badge">${zone}</span><span>${zone} 구역</span><span class="zone-note">${ordered.length}석</span></h2><div class="seat-grid">${ordered.map(seatHTML).join("")}</div></section>`;
  }

  function render(seats) {
    const blocks = zones.map((zone) => [zone, seats.filter((seat) => seat.zone === zone)]);
    auditorium.innerHTML = `<div class="zone-row back">${blocks.slice(0,3).map(([z,s]) => zoneHTML(z,s)).join("")}</div><div class="zone-row front">${blocks.slice(3).map(([z,s]) => zoneHTML(z,s)).join("")}</div>`;
  }

  async function load() {
    let seats = demoSeats();
    let label = "예시 명단 · config.js에 API 주소를 넣으면 실제 명단으로 전환됩니다.";
    let time = new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
    if (sheetApiUrl) {
      try {
        const response = await fetch(sheetApiUrl, { cache:"no-store" });
        if (!response.ok) throw new Error("명단을 가져오지 못했습니다.");
        const payload = await response.json();
        seats = normalise(payload);
        time = payload.updatedAt || time;
        label = `스프레드시트 연동 · ${config.refreshSeconds || 8}초마다 자동 갱신`;
      } catch (error) {
        label = "스프레드시트 연결을 확인하세요. 마지막 표시 내용을 유지합니다.";
        console.warn(error);
      }
    }
    render(seats);
    updatedAt.textContent = `마지막 반영 ${time}`;
    sourceInfo.textContent = label;
  }

  document.querySelector("#courseName").textContent = config.courseName || "83동 305호";
  document.querySelector("#sessionLabel").textContent = config.sessionLabel || "좌석 배치도";
  load();
  window.setInterval(load, Math.max(5, Number(config.refreshSeconds) || 8) * 1000);
})();
