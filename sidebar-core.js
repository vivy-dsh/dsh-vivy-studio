(() => {
  /* The two VIVY groups in the sidebar's global-panel list: `VIVY心核` holds the
     product panels, `VIVY工具` the utility ones (上下文洞察 today).

     The shell has no concept of a panel group — `sidebar.panellist` hands over a
     flat, order-sorted list and the slot contract carries no group field — so
     this is a DOM enhancement of the nav React already owns: one header button
     of our own per group, inserted before that group's first member, a marker
     class and a `data-diva-group` attribute on the members, and one data
     attribute per group on the nav that lets the stylesheet answer "wide or
     rail" and "open or shut". Every write is compared first, so the observers
     below can re-run on any mutation without feeding themselves.

     Membership is read off each row's accessible name on every pass, never off a
     position: which panels are installed and pinned moves, and the groups have to
     follow without a count to update. `心核` takes the remainder, so a panel the
     script has never heard of still lands somewhere sensible; `工具` is the
     allow-list and the reason a row moves between the two groups by name alone.

     The one exception to "touch nothing React made" is the resident row the
     shell files *after* the groups. Panel rows are sorted by a per-plugin
     `order`, and several plugins ship the same one: SurfCore, Superagent and
     自动化任务 all register at 10, so the later registration (自动化任务) renders
     below the first two, and the first header — inserted before the first
     member — would cut it off from 插件, the row it belongs beside. A resident
     row found behind that header is therefore moved back in front of it. That
     insert is idempotent: once the row precedes the header the test fails and
     nothing moves, and the nav observer settles after the one extra pass. */
  const NAV = 'nav[class*="panelList"]'
  const HEAD = "[data-diva-head]"
  const ROW = "diva-core-row"
  /* A product name, not a UI string: the labels stay Chinese in either interface
     language, the same way the wordmark does. The stored state is per group, and
     `心核` keeps the key it has always written, so an upgraded session opens the
     way the reader left it. */
  const GROUPS = [
    { id: "core", label: "VIVY心核", state: "data-diva-core", glyph: "heart" },
    { id: "tools", label: "VIVY工具", state: "data-diva-tools", glyph: "wrench" },
  ]
  /* The rows that keep their own place in the list: the resident plugin and
     automation panels, the character stage, and the More launcher — which is a
     panel row too, and would otherwise be pulled into a group by being neither
     of the first two. `相遇` (dsh-live2d) rides at order -10 so it lands above
     插件; folding it into a group would move it below the resident rows it is
     meant to sit in front of. */
  const KEEP = /^(插件|plugins|自动化任务|automation( tasks)?|相遇|更多|more)$/i
  /* Of those, the launcher closes the list: it belongs after the groups, so it is
     never pulled in front of a header. */
  const TAIL = /^(更多|more)$/i
  /* The rows of `VIVY工具`, by accessible name — the panel label localises, so
     both interface languages are named. Everything else that is not a resident
     row is a `心核` member. */
  const TOOL = /^(上下文洞察|context insights)$/i
  /* Wide is 228px of nav, the rail is 36px. The nav's own box is what gets
     measured because a member row of a shut group is display:none, and a
     display:none row measures 0px — which reads exactly like the rail. */
  const RAIL_MAX_WIDTH = 80
  /* Element.DOCUMENT_POSITION_FOLLOWING, spelled out: the constant is on `Node`,
     which a hardened profile could shadow, and the number is frozen by the DOM
     standard. */
  const FOLLOWING = 4

  const keyOf = (id) => `dsh.vivy.sidebar.${id}.v1`

  const read = (id) => {
    try {
      return localStorage.getItem(keyOf(id)) === "collapsed" ? "collapsed" : "expanded"
    } catch {
      return "expanded"
    }
  }

  const write = (id, value) => {
    try {
      localStorage.setItem(keyOf(id), value)
    } catch {
      /* A profile that refuses storage still gets working groups for the
         session; they just start open every time. */
    }
  }

  /* The shell's own rows, in the order it renders them. A header is a button as
     well, so it is told apart by the module class and never listed here. */
  const rowsOf = (nav) =>
    [...nav.querySelectorAll(":scope > button")].filter((row) => row.className.includes("panelRow"))

  const nameOf = (row) => (row.getAttribute("aria-label") || "").trim()

  const membersOf = (rows) => {
    const members = rows.filter((row) => !KEEP.test(nameOf(row)))
    /* Neither label matched: the interface language is not one this script was
       written against. The plugins launcher is the fixed first entry, so treat
       the first row as resident rather than fold it into a group. */
    if (members.length === rows.length && rows.length > 1) return members.slice(1)
    return members
  }

  const groupOf = (row) => (TOOL.test(nameOf(row)) ? "tools" : "core")

  const SVG_NS = "http://www.w3.org/2000/svg"

  /* One 16px glyph: the shell draws its panel icons at that size in the wide
     layout, and a header is a panel row, so it lines up with them. `viewBox`
     is the coordinate space the path data was drawn in; the box on screen is
     always the 16px the stylesheet gives these classes. */
  const icon = (className, paths, width, viewBox = "0 0 16 16") => {
    const svg = document.createElementNS(SVG_NS, "svg")
    svg.setAttribute("class", className)
    svg.setAttribute("viewBox", viewBox)
    svg.setAttribute("aria-hidden", "true")
    for (const d of paths) {
      const path = document.createElementNS(SVG_NS, "path")
      path.setAttribute("d", d)
      path.setAttribute("fill", "none")
      path.setAttribute("stroke", "currentColor")
      path.setAttribute("stroke-width", String(width))
      path.setAttribute("stroke-linecap", "round")
      path.setAttribute("stroke-linejoin", "round")
      svg.append(path)
    }
    return svg
  }

  /* Each group carries its own mark: the heart is DIVA's, the open-end wrench is
     the tools beside it — jaw and handle are what a 16px slot can still carry.
     The chevron at the far end is the disclosure. */
  const heart = () => icon("diva-core-heart", ["M8 13.2 3.3 8.5A3 3 0 0 1 7.5 4.3l.5.5.5-.5a3 3 0 0 1 4.2 4.2Z"], 1.5)
  /* Lucide's wrench outline, kept in its 24-unit drawing grid so its arcs stay
     exact; the 2-unit stroke lands at 1.33px in the row's 16px slot, a hair
     under the heart's and the chevron's 1.5. */
  const wrench = () => icon(
    "diva-tools-glyph",
    ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
    2,
    "0 0 24 24",
  )
  const chevron = () => icon("diva-core-chevron", ["M4.5 6 8 9.5 11.5 6"], 1.5)
  const glyphOf = (group) => (group.glyph === "heart" ? heart() : wrench())

  /* Re-used across mutations, so the listener is bound exactly once and a
     re-render that drops a header costs one rebuild rather than a duplicate. */
  const ensureHead = (group) => {
    const existing = document.querySelector(`[data-diva-head="${group.id}"]`)
    if (existing !== null) {
      if (existing.dataset.divaCoreBound !== "true") {
        existing.dataset.divaCoreBound = "true"
        existing.addEventListener("click", toggle)
      }
      return existing
    }
    const head = document.createElement("button")
    head.type = "button"
    head.className = "diva-core-head"
    head.dataset.divaHead = group.id
    const label = Object.assign(document.createElement("span"), {
      className: "diva-core-label",
      textContent: group.label,
    })
    /* Glyph, caption, then the disclosure at the row's far edge — the same
       order a panel row reads in, so the header is a peer and not a title. */
    head.append(glyphOf(group), label, chevron())
    head.dataset.divaCoreBound = "true"
    head.addEventListener("click", toggle)
    return head
  }

  /* The header knows which group it opens, so one listener serves both. */
  function toggle(event) {
    const id = event.currentTarget.dataset.divaHead
    write(id, read(id) === "collapsed" ? "expanded" : "collapsed")
    sync()
  }

  const put = (node, name, value) => {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value)
  }

  const follows = (node, reference) => (reference.compareDocumentPosition(node) & FOLLOWING) !== 0

  function sync() {
    const nav = document.querySelector(NAV)
    const heads = [...document.querySelectorAll(HEAD)]
    if (nav === null) {
      for (const head of heads) head.remove()
      return
    }

    const rows = rowsOf(nav)
    const members = membersOf(rows)
    const buckets = new Map(GROUPS.map((group) => [group.id, []]))
    for (const row of members) buckets.get(groupOf(row)).push(row)

    if (members.length === 0) {
      // Every panel is unpinned, or only the resident ones are: nothing to group.
      for (const head of heads) head.remove()
      for (const row of rows) {
        row.classList.remove(ROW)
        delete row.dataset.divaGroup
      }
      for (const group of GROUPS) nav.removeAttribute(group.state)
      nav.removeAttribute("data-diva-rail")
      return
    }

    /* One header per non-empty group, each before that group's first member. A
       group with no member in this install — its plugin removed, its panel
       unpinned — takes its header with it, or it would open onto nothing. */
    const built = []
    for (const group of GROUPS) {
      const own = buckets.get(group.id)
      if (own.length === 0) {
        nav.removeAttribute(group.state)
        for (const head of heads) if (head.dataset.divaHead === group.id) head.remove()
        continue
      }
      const head = ensureHead(group)
      /* The header sits *before* the first member, so the test is its next
         sibling. Testing previousSibling would never match, and re-inserting a
         node that is already in place still queues remove+insert records: the
         nav observer would re-enter on its own edit and the page would never
         yield. */
      if (head.nextSibling !== own[0] || head.parentElement !== nav) nav.insertBefore(head, own[0])
      built.push([group, head])
    }

    /* A resident row the shell filed behind the first header comes back in front
       of it so the groups never split two rows that belong together. Walking
       `rows` in document order keeps the residents' own relative order. */
    const first = built[0][1]
    for (const row of rows) {
      if (!KEEP.test(nameOf(row)) || TAIL.test(nameOf(row))) continue
      if (!follows(row, first)) continue
      nav.insertBefore(row, first)
    }

    /* Only marking: the members stay where the shell put them. */
    const memberOf = new Map()
    for (const group of GROUPS) for (const row of buckets.get(group.id)) memberOf.set(row, group.id)
    for (const row of rows) {
      const id = memberOf.get(row)
      const want = id !== undefined
      if (row.classList.contains(ROW) !== want) row.classList.toggle(ROW, want)
      if (want && row.dataset.divaGroup !== id) row.dataset.divaGroup = id
      if (!want && row.dataset.divaGroup !== undefined) delete row.dataset.divaGroup
    }

    put(nav, "data-diva-rail", String(nav.getBoundingClientRect().width <= RAIL_MAX_WIDTH))
    for (const [group, head] of built) {
      const state = read(group.id)
      put(nav, group.state, state)
      put(head, "aria-expanded", String(state === "expanded"))
    }
    watchNav(nav)
  }

  /* The nav is React's, and React replaces rows, rewrites their class when the
     active panel moves, and settles the rail 150ms after the column starts
     collapsing. Each of those leaves the groups half-built, so all three are
     watched — the writes above are guarded, so a re-run on our own edit costs a
     comparison and nothing else. */
  let navWatched = null
  const navObserver = new MutationObserver(sync)
  const watchNav = (nav) => {
    if (navWatched === nav) return
    navWatched = nav
    navObserver.observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] })
    // The column element is the one that gains `collapsed`; the nav only changes
    // width once that class lands, so this is the rail-settle signal.
    if (nav.parentElement !== null) {
      navObserver.observe(nav.parentElement, { attributes: true, attributeFilter: ["class"] })
    }
  }

  sync()

  let queued = null
  const queue = () => {
    if (queued !== null) return
    queued = setTimeout(() => {
      queued = null
      sync()
    }, 150)
  }
  if (document.body !== null) {
    new MutationObserver(queue).observe(document.body, { childList: true, subtree: true })
  }
  // A dragged or resized column changes the nav's width without touching the DOM.
  addEventListener("resize", queue)
})()
