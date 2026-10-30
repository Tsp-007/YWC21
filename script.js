const $ = (s, r = document) => r.querySelector(s),
        $$ = (s, r = document) => [...r.querySelectorAll(s)];
      const esc = (s) =>
        String(s).replace(
          /[&<>"]/g,
          (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
        );
      const IC = {
        home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
        mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
        slides:
          '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
        moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
        cam: '<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
        camoff:
          '<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10"/><path d="M1 1l22 22"/>',
        left: '<path d="M15 18l-6-6 6-6"/>',
        right: '<path d="M9 18l6-6-6-6"/>',
        full: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
        zin: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>',
        zout: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3M8 11h6"/>',
        vol: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
        mute: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/>',
        edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
        trash: '<path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/>',
      };
      const ic = (n) =>
        `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;
      const setIc = (b, n, t) => {
        b.innerHTML = ic(n) + (t || "");
      };
      $$("[data-ic]").forEach((b) =>
        b.insertAdjacentHTML("afterbegin", ic(b.dataset.ic)),
      );
      const LS = {
        get(k, d) {
          try {
            const v = localStorage.getItem(k);
            return v == null ? d : JSON.parse(v);
          } catch (e) {
            return d;
          }
        },
        set(k, v) {
          try {
            localStorage.setItem(k, JSON.stringify(v));
            return true;
          } catch (e) {
            toast(
              "Couldn’t save to this browser. Storage may be blocked or full.",
            );
            return false;
          }
        },
      };
      function toast(m) {
        const t = document.createElement("div");
        t.className = "toast";
        t.textContent = m;
        $("#toasts").append(t);
        setTimeout(() => t.remove(), 4000);
      }
      /* modal */
      const dlg = $("#dlg");
      $("#dx").onclick = () => dlg.close();
      function openModal(t, h) {
        $("#dtt").textContent = t;
        $("#db").innerHTML = h;
        if (!dlg.open) dlg.showModal();
      }
      function confirmBox(t, yes) {
        openModal(
          "Please confirm",
          `<p>${esc(t)}</p><div class="row"><button class="btn pri" id="cy">Yes, continue</button><button class="btn" id="cn">Cancel</button></div>`,
        );
        $("#cy").onclick = () => {
          dlg.close();
          yes();
        };
        $("#cn").onclick = () => dlg.close();
      }
      /* theme */
      const root = document.documentElement;
      if (LS.get("ps.theme", null)) root.dataset.theme = LS.get("ps.theme");
      $("#theme").onclick = () => {
        const d =
          root.dataset.theme === "dark" ||
          (!root.dataset.theme &&
            matchMedia("(prefers-color-scheme:dark)").matches);
        root.dataset.theme = d ? "light" : "dark";
        LS.set("ps.theme", root.dataset.theme);
      };
      /* camera */
      const camHTML = () =>
        `<div class="card"><div class="row" style="justify-content:space-between"><h2>Camera</h2><label class="sm">Size <input type="range" class="csz" min="50" max="100" value="100" aria-label="Camera preview size"></label></div><div class="cwrap"><div class="vbox"><video playsinline muted autoplay hidden aria-label="Live camera preview"></video><p class="cmsg" role="status" style="margin:0">Camera is off</p></div></div><div class="row"><button class="btn ctog"></button><button class="btn pri cret" hidden>Retry camera</button></div><p class="sm" style="margin-bottom:0">Your camera is used only for this live preview. Nothing is recorded, uploaded, or sent anywhere.</p></div>`;
      function Cam(host) {
        host.innerHTML = camHTML();
        const v = $("video", host),
          msg = $(".cmsg", host),
          tg = $(".ctog", host),
          rt = $(".cret", host),
          wr = $(".cwrap", host);
        let stream = null,
          want = true,
          busy = false;
        const upd = () =>
          stream
            ? setIc(tg, "camoff", "Turn camera off")
            : setIc(tg, "cam", "Turn camera on");
        const show = (t, retry) => {
          v.hidden = true;
          msg.hidden = false;
          msg.textContent = t;
          rt.hidden = !retry;
          upd();
        };
        async function start() {
          if (busy || stream) return;
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
            return show(
              "This browser doesn’t support camera access. Try a recent Chrome, Edge, Firefox or Safari.",
              false,
            );
          busy = true;
          want = true;
          show("Starting camera…", false);
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false,
            });
            v.srcObject = stream;
            v.hidden = false;
            msg.hidden = true;
            rt.hidden = true;
            upd();
          } catch (e) {
            stream = null;
            const n = e && e.name;
            show(
              n === "NotAllowedError" || n === "SecurityError"
                ? "Camera access is blocked. Allow it in your browser’s site settings, then press Retry."
                : n === "NotFoundError"
                  ? "No camera found. Connect one, then press Retry."
                  : "The camera couldn’t start. Another app may be using it. Press Retry.",
              true,
            );
          }
          busy = false;
        }
        function stop() {
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
            stream = null;
          }
          v.srcObject = null;
        }
        tg.onclick = () => {
          if (stream) {
            want = false;
            stop();
            show("Camera is off", false);
          } else start();
        };
        rt.onclick = start;
        $(".csz", host).oninput = (e) =>
          (wr.style.width = e.target.value + "%");
        upd();
        return {
          resume() {
            if (want) start();
          },
          stop() {
            stop();
            if (want) show("Camera paused while you’re away", false);
          },
        };
      }
      const CI = Cam($("#cam-int")),
        CP = Cam($("#cam-pres"));
      addEventListener("pagehide", () => {
        CI.stop();
        CP.stop();
      });
      /* routing */
      const RT = ["home", "interview", "presentation"];
      function go(r) {
        if (!RT.includes(r)) r = "home";
        RT.forEach((x) => ($("#" + x).hidden = x !== r));
        $$(".nb").forEach((b) =>
          b.dataset.go === r
            ? b.setAttribute("aria-current", "page")
            : b.removeAttribute("aria-current"),
        );
        if (location.hash.slice(1) !== r) location.hash = r;
        r === "interview" ? CI.resume() : CI.stop();
        r === "presentation" ? CP.resume() : (CP.stop(), pStop());
        scrollTo(0, 0);
      }
      document.addEventListener("click", (e) => {
        const b = e.target.closest("[data-go]");
        if (b) go(b.dataset.go);
      });
      addEventListener("hashchange", () => go(location.hash.slice(1)));
      /* questions */
      const DEF = [
        [
          "Self-introduction",
          "Tell me about yourself.",
          "How would your friends describe you?",
          "Walk me through your background in two minutes.",
        ],
        [
          "Strengths and Weaknesses",
          "What is your greatest strength?",
          "What is one weakness you are working to improve?",
          "What skill would you most like to develop?",
        ],
        [
          "Personal Experiences",
          "Tell me about a challenge you have overcome.",
          "Describe an experience that changed how you think.",
          "What accomplishment are you most proud of?",
        ],
        [
          "Problem-Solving",
          "Describe a difficult problem you solved and how you approached it.",
          "Tell me about a time you made a decision with incomplete information.",
          "How do you handle a task when you don’t know where to start?",
        ],
        [
          "Leadership and Teamwork",
          "Describe a time when you worked successfully in a team.",
          "Tell me about a time you led others.",
          "How do you handle disagreements with teammates?",
        ],
        [
          "Motivation and Goals",
          "Where do you see yourself in five years?",
          "What keeps you going when things get hard?",
          "What are your short-term goals?",
        ],
        [
          "University Admissions",
          "Why do you want to join this university or organization?",
          "Why did you choose your intended major?",
          "What would you contribute to our campus community?",
        ],
        [
          "Internship and Job Interviews",
          "Why should we choose you?",
          "What interests you about this role?",
          "Tell me about a time you juggled several deadlines.",
        ],
        [
          "Unexpected or Challenging Questions",
          "What makes you different from other candidates?",
          "Tell me about a failure and what you learned from it.",
          "If you could have dinner with anyone, who would it be and why?",
        ],
      ];
      const defaults = () =>
        DEF.flatMap(([c, ...qs], i) =>
          qs.map((q, j) => ({ id: "d" + i + j, c, q })),
        );
      let Q = LS.get("ps.q", null);
      if (!Array.isArray(Q)) Q = defaults();
      let prefs = LS.get("ps.prefs", { src: "all", cat: "all" });
      const saveQ = () => {
        LS.set("ps.q", Q);
        refresh();
      };
      const COL = [
        "#e9e5fb",
        "#dce6f7",
        "#efe3f4",
        "#d9ecf0",
        "#e6e9f7",
        "#f1e6ef",
      ];
      const used = new Set();
      let rot = 0,
        spinning = false,
        cur = [];
      const elig = () =>
        Q.filter(
          (x) =>
            (prefs.src === "all" || (prefs.src === "custom") === !!x.custom) &&
            (prefs.cat === "all" || x.c === prefs.cat),
        );
      function items() {
        const e = elig();
        if (prefs.cat === "all") {
          const m = new Map();
          e.forEach((x) => {
            if (!m.has(x.c)) m.set(x.c, []);
            m.get(x.c).push(x);
          });
          return [...m].map(([l, qs]) => ({ l, qs }));
        }
        return e.map((x) => ({ l: x.q, qs: [x] }));
      }
      function refresh() {
        const cats = [...new Set(Q.map((x) => x.c))];
        if (prefs.cat !== "all" && !cats.includes(prefs.cat)) prefs.cat = "all";
        $("#fc").innerHTML =
          '<option value="all">All categories</option>' +
          cats
            .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
            .join("");
        $("#fc").value = prefs.cat;
        $("#fs").value = prefs.src;
        LS.set("ps.prefs", prefs);
        cur = items();
        const n = cur.length,
          g = $("#wg");
        rot = 0;
        g.style.transition = "none";
        g.style.transform = "rotate(0deg)";
        $("#spin").disabled = !n;
        if (!n) {
          g.innerHTML = "";
          $("#qc").hidden = true;
          $("#qt").textContent =
            "No questions match. Open Manage questions to add one or reset to defaults.";
          $("#next").disabled = true;
          return;
        }
        const a = 360 / n,
          P = (t, r) => [
            150 + r * Math.sin((t * Math.PI) / 180),
            150 - r * Math.cos((t * Math.PI) / 180),
          ];
        g.innerHTML = cur
          .map((s, i) => {
            const t0 = i * a,
              [x0, y0] = P(t0, 140),
              [x1, y1] = P(t0 + a, 140),
              m = n === 1 ? 0 : t0 + a / 2,
              f = COL[i % COL.length],
              fl = m > 180;
            const shape =
              n === 1
                ? `<circle cx="150" cy="150" r="140" fill="${f}"/>`
                : `<path d="M150 150L${x0} ${y0}A140 140 0 ${a > 180 ? 1 : 0} 1 ${x1} ${y1}Z" fill="${f}" stroke="#fff" stroke-width="2"/>`;
            const lab =
              n > 14
                ? String(i + 1)
                : s.l.length > 18
                  ? s.l.slice(0, 17) + "…"
                  : s.l;
            return (
              shape +
              `<text transform="rotate(${fl ? m + 90 : m - 90} 150 150)" x="${fl ? 30 : 270}" y="150" dy=".35em" text-anchor="${fl ? "start" : "end"}" font-size="11" font-weight="600" fill="#1b2238">${esc(lab)}</text>`
            );
          })
          .join("");
      }
      $("#fs").onchange = (e) => {
        prefs.src = e.target.value;
        refresh();
      };
      $("#fc").onchange = (e) => {
        prefs.cat = e.target.value;
        refresh();
      };
      function spin() {
        if (spinning || !cur.length) return;
        let av = cur
          .map((s, i) => ({ i, u: s.qs.filter((q) => !used.has(q.id)) }))
          .filter((x) => x.u.length);
        if (!av.length) {
          used.clear();
          toast("You’ve used every eligible question. Starting over.");
          av = cur.map((s, i) => ({ i, u: s.qs }));
        }
        const p = av[Math.floor(Math.random() * av.length)],
          q = p.u[Math.floor(Math.random() * p.u.length)],
          a = 360 / cur.length,
          off = a * (0.1 + Math.random() * 0.8);
        const want = (360 - (p.i * a + off)) % 360,
          cm = ((rot % 360) + 360) % 360;
        rot += 360 * 5 + ((want - cm + 360) % 360);
        const g = $("#wg"),
          rm = matchMedia("(prefers-reduced-motion:reduce)").matches;
        spinning = true;
        $("#spin").disabled = $("#next").disabled = true;
        g.style.transition = rm
          ? "transform .5s"
          : "transform 4.5s cubic-bezier(.12,.6,.1,1)";
        g.style.transform = `rotate(${rot}deg)`;
        setTimeout(
          () => {
            spinning = false;
            used.add(q.id);
            $("#spin").disabled = false;
            $("#next").disabled = false;
            $("#qc").hidden = false;
            $("#qc").textContent = q.c;
            $("#qt").textContent = q.q;
          },
          rm ? 550 : 4600,
        );
      }
      $("#spin").onclick = spin;
      $("#next").onclick = spin;
      $("#mq").onclick = () => {
        let ed = null;
        openModal(
          "Manage questions",
          `<form id="af" class="row"><input id="aq" required placeholder="New question" aria-label="New question" style="flex:2;min-width:180px"><input id="ac" required list="cl" placeholder="Category" aria-label="Category" style="flex:1;min-width:120px"><datalist id="cl">${[...new Set(Q.map((x) => x.c))].map((c) => `<option value="${esc(c)}">`).join("")}</datalist><button class="btn pri">Add</button></form><div id="ml" style="margin:12px 0"></div><button class="btn" id="rs">Reset to defaults</button>`,
        );
        const list = () => {
          $("#ml").innerHTML = Q.length
            ? Q.map((x) =>
                ed === x.id
                  ? `<div class="qr"><input value="${esc(x.q)}" id="eq" aria-label="Question" style="flex:2"><input value="${esc(x.c)}" id="ec" aria-label="Category" style="flex:1"><button class="btn pri" data-a="s" data-i="${x.id}">Save</button><button class="btn" data-a="x">Cancel</button></div>`
                  : `<div class="qr"><span>${esc(x.q)}<br><span class="badge">${esc(x.c)}</span>${x.custom ? ' <span class="sm">custom</span>' : ""}</span><button class="btn sq" data-a="e" data-i="${x.id}" aria-label="Edit question" title="Edit">${ic("edit")}</button><button class="btn sq" data-a="d" data-i="${x.id}" aria-label="Delete question" title="Delete">${ic("trash")}</button></div>`,
              ).join("")
            : '<p class="sm">No questions yet. Add one above or reset to defaults.</p>';
        };
        list();
        $("#af").onsubmit = (e) => {
          e.preventDefault();
          const q = $("#aq").value.trim(),
            c = $("#ac").value.trim();
          if (!q || !c) return;
          Q.push({
            id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
            c,
            q,
            custom: true,
          });
          $("#aq").value = "";
          saveQ();
          list();
          toast("Question added");
        };
        $("#ml").onclick = (e) => {
          const b = e.target.closest("[data-a]");
          if (!b) return;
          const a = b.dataset.a,
            x = Q.find((y) => y.id === b.dataset.i);
          if (a === "e") ed = x.id;
          else if (a === "x") ed = null;
          else if (a === "d") Q = Q.filter((y) => y !== x);
          else if (a === "s") {
            const q = $("#eq").value.trim(),
              c = $("#ec").value.trim();
            if (!q || !c) return toast("Question and category can’t be empty.");
            x.q = q;
            x.c = c;
            ed = null;
          }
          if (a !== "e" && a !== "x") saveQ();
          list();
        };
        $("#rs").onclick = () =>
          confirmBox(
            "Reset all questions to the defaults? Your custom questions and edits will be removed.",
            () => {
              Q = defaults();
              prefs = { src: "all", cat: "all" };
              used.clear();
              saveQ();
              toast("Questions reset");
            },
          );
      };
      refresh();
      /* timer */
      const T = {
          dur: 300,
          rem: 300000,
          run: false,
          end: 0,
          id: 0,
          mute: LS.get("ps.mute", false),
          ac: null,
        },
        tp = LS.get("ps.timer", { m: "300", min: 5, sec: 0 });
      const fmt = (s) => {
        const h = Math.floor(s / 3600),
          m = Math.floor((s % 3600) / 60),
          x = s % 60,
          p = (n) => String(n).padStart(2, "0");
        return (h ? h + ":" : "") + p(m) + ":" + p(x);
      };
      function tset(m) {
        tp.m = m;
        LS.set("ps.timer", tp);
        $$("#pre .chip").forEach((b) =>
          b.setAttribute("aria-pressed", b.dataset.v === m),
        );
        $("#cf").hidden = m !== "c";
        $("#cm").value = tp.min;
        $("#cs").value = tp.sec;
        T.dur = m === "c" ? tp.min * 60 + tp.sec : +m;
        treset();
      }
      function trender() {
        const lowT = Math.min(10000, T.dur * 200),
          low = T.rem > 0 && T.rem <= lowT && (T.run || T.rem < T.dur * 1000);
        $("#td").textContent = fmt(Math.ceil(T.rem / 1000));
        $("#td").classList.toggle("low", low);
        $("#ts").textContent =
          T.rem === 0 ? "Time’s up!" : low ? "Time is running low" : "";
        $("#tgo").textContent = T.run
          ? "Pause"
          : T.rem > 0 && T.rem < T.dur * 1000
            ? "Resume"
            : "Start";
      }
      function tstop() {
        clearInterval(T.id);
        T.run = false;
      }
      function treset() {
        tstop();
        T.rem = T.dur * 1000;
        trender();
      }
      function beep() {
        if (T.mute || !T.ac) return;
        try {
          [0, 0.35, 0.7].forEach((d) => {
            const o = T.ac.createOscillator(),
              g = T.ac.createGain();
            o.frequency.value = 880;
            g.gain.value = 0.15;
            o.connect(g);
            g.connect(T.ac.destination);
            o.start(T.ac.currentTime + d);
            o.stop(T.ac.currentTime + d + 0.2);
          });
        } catch (e) {}
      }
      function tick() {
        T.rem = Math.max(0, T.end - Date.now());
        if (T.rem === 0) {
          tstop();
          beep();
        }
        trender();
      }
      $("#tgo").onclick = () => {
        if (T.run) {
          T.rem = Math.max(0, T.end - Date.now());
          tstop();
          trender();
          return;
        }
        try {
          T.ac =
            T.ac || new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {}
        if (T.rem <= 0) T.rem = T.dur * 1000;
        if (T.dur <= 0) return;
        T.run = true;
        T.end = Date.now() + T.rem;
        T.id = setInterval(tick, 200);
        trender();
      };
      $("#trs").onclick = treset;
      $("#pre").onclick = (e) => {
        const b = e.target.closest("[data-v]");
        if (b) {
          $("#terr").textContent = "";
          tset(b.dataset.v);
        }
      };
      $("#cf").onsubmit = (e) => {
        e.preventDefault();
        const m = Number($("#cm").value || 0),
          s = Number($("#cs").value || 0),
          er = $("#terr");
        if (
          !Number.isInteger(m) ||
          !Number.isInteger(s) ||
          m < 0 ||
          s < 0 ||
          s > 59 ||
          m > 180
        ) {
          er.textContent = "Enter whole minutes (0–180) and seconds (0–59).";
          return;
        }
        if (m * 60 + s < 1) {
          er.textContent = "The duration must be at least 1 second.";
          return;
        }
        er.textContent = "";
        tp.min = m;
        tp.sec = s;
        tset("c");
      };
      function muteUi() {
        setIc($("#tmu"), T.mute ? "mute" : "vol");
        $("#tmu").setAttribute(
          "aria-label",
          T.mute ? "Unmute timer sound" : "Mute timer sound",
        );
        $("#tmu").title = $("#tmu").getAttribute("aria-label");
      }
      $("#tmu").onclick = () => {
        T.mute = !T.mute;
        LS.set("ps.mute", T.mute);
        muteUi();
      };
      muteUi();
      tset(["60", "300", "600", "c"].includes(tp.m) ? tp.m : "300");
      /* PDF */
      let pdf = null,
        pg = 1,
        zm = 1,
        task = null,
        tok = 0;
      const st = $("#stage"),
        cv = $("#pc"),
        cx = cv.getContext("2d");
      async function render() {
        if (!pdf) return;
        const my = ++tok;
        if (task) {
          try {
            task.cancel();
          } catch (e) {}
        }
        try {
          const page = await pdf.getPage(pg);
          if (my !== tok) return;
          const v0 = page.getViewport({ scale: 1 }),
            fit = Math.min(
              (st.clientWidth - 16) / v0.width,
              (st.clientHeight - 16) / v0.height,
            ),
            dpr = devicePixelRatio || 1,
            sc = Math.max(0.1, fit * zm),
            v = page.getViewport({ scale: sc * dpr });
          cv.width = v.width;
          cv.height = v.height;
          cv.style.width = v.width / dpr + "px";
          cv.style.height = v.height / dpr + "px";
          task = page.render({ canvasContext: cx, viewport: v });
          await task.promise;
        } catch (e) {
          if (!e || e.name !== "RenderingCancelledException")
            $("#perr").textContent = "That page couldn’t be displayed.";
        }
        $("#pi").textContent = `Slide ${pg} of ${pdf.numPages}`;
        $("#zl").textContent = Math.round(zm * 100) + "%";
      }
      function ui() {
        const on = !!pdf;
        cv.hidden = !on;
        $("#dz").hidden = on;
        $("#rep").hidden = $("#rem").hidden = !on;
        ["pp", "pn", "zo", "zi", "zf", "fu"].forEach(
          (i) => ($("#" + i).disabled = !on),
        );
        if (!on) {
          $("#pi").textContent = "Slide 0 of 0";
          $("#fn").textContent = "No PDF loaded";
        }
      }
      async function load(f) {
        const er = $("#perr");
        er.textContent = "";
        if (!f) return;
        if (!(f.type === "application/pdf" || /\.pdf$/i.test(f.name))) {
          er.textContent = "That file isn’t a PDF. Please choose a .pdf file.";
          return;
        }
        if (typeof pdfjsLib === "undefined") {
          er.textContent =
            "The PDF viewer couldn’t load. Check your connection and reload.";
          return;
        }
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        $("#pmsg").textContent =
          f.size > 30e6
            ? "Loading a large file. This may take a moment…"
            : "Loading PDF…";
        try {
          const d = await f.arrayBuffer(),
            doc = await pdfjsLib.getDocument({ data: d }).promise;
          if (pdf) pdf.destroy();
          pdf = doc;
          pg = 1;
          zm = 1;
          $("#fn").textContent = f.name;
          ui();
          await render();
        } catch (e) {
          er.textContent =
            "This PDF couldn’t be opened. It may be corrupted or password protected.";
        }
        $("#pmsg").textContent = "";
        $("#pf").value = "";
      }
      const go2 = (n) => {
        if (pdf && n >= 1 && n <= pdf.numPages) {
          pg = n;
          render();
        }
      };
      $("#pf").onchange = (e) => load(e.target.files[0]);
      $("#rep").onclick = () => $("#pf").click();
      $("#rem").onclick = () => {
        if (pdf) pdf.destroy();
        pdf = null;
        tok++;
        ui();
      };
      ["dragover", "dragenter"].forEach((t) =>
        st.addEventListener(t, (e) => {
          e.preventDefault();
          $("#dz").classList.add("over");
        }),
      );
      ["dragleave", "drop"].forEach((t) =>
        st.addEventListener(t, () => $("#dz").classList.remove("over")),
      );
      st.addEventListener("drop", (e) => {
        e.preventDefault();
        load(e.dataTransfer.files[0]);
      });
      $("#pp").onclick = () => go2(pg - 1);
      $("#pn").onclick = () => go2(pg + 1);
      $("#zi").onclick = () => {
        zm = Math.min(4, zm * 1.25);
        render();
      };
      $("#zo").onclick = () => {
        zm = Math.max(0.3, zm / 1.25);
        render();
      };
      $("#zf").onclick = () => {
        zm = 1;
        render();
      };
      $("#fu").onclick = () => {
        document.fullscreenElement
          ? document.exitFullscreen()
          : st.requestFullscreen &&
            st
              .requestFullscreen()
              .catch(() => toast("Fullscreen isn’t available here."));
      };
      cv.onclick = () => {
        if (document.fullscreenElement) go2(pg + 1);
      };
      document.addEventListener("keydown", (e) => {
        if (
          $("#presentation").hidden ||
          !pdf ||
          /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
          dlg.open
        )
          return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          go2(pg + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go2(pg - 1);
        }
      });
      let rq = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(rq);
        rq = requestAnimationFrame(render);
      }).observe(st);
      ui();
      /* script + teleprompter */
      const sc = $("#script");
      sc.value = LS.get("ps.script", "");
      let sv = 0;
      function cnt() {
        const t = sc.value,
          w = t.trim() ? t.trim().split(/\s+/).length : 0;
        $("#cnt").textContent = `${w} words · ${t.length} characters`;
      }
      sc.oninput = () => {
        cnt();
        clearTimeout(sv);
        sv = setTimeout(() => LS.set("ps.script", sc.value), 300);
      };
      cnt();
      $("#clr").onclick = () => {
        if (!sc.value) return toast("The script is already empty.");
        confirmBox("Erase the whole script? This can’t be undone.", () => {
          sc.value = "";
          LS.set("ps.script", "");
          cnt();
        });
      };
      const pr = $("#prompt");
      let pos = 0,
        run = false,
        last = 0,
        raf = 0,
        speed = LS.get("ps.speed", 40),
        fs = LS.get("ps.fs", 28);
      function pui() {
        const atEnd =
          pr.scrollHeight > pr.clientHeight &&
          pos >= pr.scrollHeight - pr.clientHeight - 1;
        $("#pgo").textContent = run
          ? "Pause"
          : atEnd
            ? "Restart"
            : pos > 1
              ? "Resume"
              : "Start";
        $("#sl").textContent =
          `${speed} px/s · ${speed < 30 ? "Slow" : speed < 70 ? "Normal" : "Fast"}`;
        $("#sp").value = speed;
        pr.style.fontSize = fs + "px";
      }
      function loop(t) {
        if (!run) return;
        const dt = Math.min(t - last, 100) / 1000;
        last = t;
        const max = pr.scrollHeight - pr.clientHeight;
        pos = Math.min(max, pos + speed * dt);
        pr.scrollTop = pos;
        if (pos >= max - 0.5) {
          run = false;
          pui();
          toast("End of script");
          return;
        }
        raf = requestAnimationFrame(loop);
      }
      function pStop() {
        run = false;
        cancelAnimationFrame(raf);
        pui();
      }
      pr.addEventListener("scroll", () => {
        if (!run) {
          pos = pr.scrollTop;
          pui();
        }
      });
      $("#pgo").onclick = () => {
        if (run) return pStop();
        if (!sc.value.trim())
          return toast("Add a script in the Edit tab first.");
        const max = pr.scrollHeight - pr.clientHeight;
        if (pos >= max - 1) {
          pos = 0;
          pr.scrollTop = 0;
        }
        run = true;
        last = performance.now();
        raf = requestAnimationFrame(loop);
        pui();
      };
      $("#prs").onclick = () => {
        pStop();
        pos = 0;
        pr.scrollTop = 0;
        pui();
      };
      $("#sp").oninput = (e) => {
        speed = +e.target.value;
        LS.set("ps.speed", speed);
        pui();
      };
      $("#fm").onclick = () => {
        fs = Math.max(18, fs - 2);
        LS.set("ps.fs", fs);
        pui();
      };
      $("#fp").onclick = () => {
        fs = Math.min(64, fs + 2);
        LS.set("ps.fs", fs);
        pui();
      };
      function tab(tpr) {
        pStop();
        $("#ed").hidden = tpr;
        $("#pt").hidden = !tpr;
        $("#te").setAttribute("aria-pressed", !tpr);
        $("#tt").setAttribute("aria-pressed", tpr);
        if (tpr) {
          pr.innerHTML = "";
          const t = sc.value.trim();
          if (!t) {
            pr.innerHTML =
              '<p style="padding-top:0;color:#a9aec4">Your script is empty. Add text in the Edit tab.</p>';
          } else
            t.split(/\n+/).forEach((l) => {
              const p = document.createElement("p");
              p.textContent = l;
              pr.append(p);
            });
          pos = 0;
          pr.scrollTop = 0;
          pui();
        }
      }
      $("#te").onclick = () => tab(false);
      $("#tt").onclick = () => tab(true);
      $("#tc").onclick = () => {
        const c = !$("#sb").hidden;
        $("#sb").hidden = c;
        if (c) pStop();
        $("#tc").textContent = c ? "Expand" : "Collapse";
        $("#tc").setAttribute("aria-expanded", !c);
      };
      pui();
      go(location.hash.slice(1) || "home");
